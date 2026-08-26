import React, { useState, useMemo, useEffect } from 'react';
import { useGroup } from '../context/GroupContext';
import { calculateSplits, isBalanceSettled } from '../lib/accounting';
import { SplitType, ExpenseCategory, type Split, type Payer, type CreateExpenseRequest } from '../types/expense.types';
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_ICONS } from '../lib/expenseCategories';
import { useAppSelector } from '../store/hooks';
import { AmountInput } from './expense-form/AmountInput';
import { PayerSelector } from './expense-form/PayerSelector';
import { MultiPayerSelector } from './expense-form/MultiPayerSelector';
import { SplitTypeSelector } from './expense-form/SplitTypeSelector';
import { SplitEven } from './expense-form/SplitEven';
import { SplitExact } from './expense-form/SplitExact';
import { SplitPercentage } from './expense-form/SplitPercentage';
import { SplitShares } from './expense-form/SplitShares';
import { StepDots } from './expense-form/StepDots';
import { StepNav } from './expense-form/StepNav';
import { parseAmount, isWhatStepValid, isPayerStepValid, isSplitStepValid, getWhatStepHint } from './expense-form/stepValidation';
import { buildReviewSentence } from './expense-form/reviewSentence';
import { removeThousandsSeparator, CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../lib/currency';

interface ExpenseFormProps {
    initialData?: {
        description: string;
        amount: number;
        currency: string;
        payerId?: string;
        payers?: Payer[];
        splitType: SplitType;
        category?: ExpenseCategory;
        splits: Split[];
        manualAmounts: Record<string, string>;
    };
    onSubmit: (data: CreateExpenseRequest) => void;
    groupId?: string;
    submitLabel?: string;
    isSubmitting?: boolean;
}

const STEP_TITLES = ['What was it?', 'Who paid?', 'How to split?', 'Review'];

export function ExpenseForm({ initialData, onSubmit, groupId, submitLabel = 'Add expense', isSubmitting = false }: ExpenseFormProps) {
    const { activeGroupId, groups: groupsMeta, fetchGroupById, isLoading } = useGroup();
    const effectiveGroupId = groupId || activeGroupId;

    const allMembersMap = useAppSelector(state => state.groups.membersByGroupId);

    const members = useMemo(() => {
        return allMembersMap[effectiveGroupId] || [];
    }, [allMembersMap, effectiveGroupId]);

    const groupMeta = useMemo(() => {
        return groupsMeta.find(g => g.id === effectiveGroupId);
    }, [groupsMeta, effectiveGroupId]);

    const groupCurrency = groupMeta?.currency || 'USD';

    useEffect(() => {
        if (effectiveGroupId && members.length === 0) {
            void fetchGroupById(effectiveGroupId);
        }
    }, [effectiveGroupId, members.length, fetchGroupById]);

    // ---- Form state (lives here, above the steps, so navigating never loses it) ----
    const [step, setStep] = useState(0);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || groupCurrency);

    const [isMultiPayer, setIsMultiPayer] = useState(initialData?.payers ? initialData.payers.length > 1 : false);
    const [payers, setPayers] = useState<Payer[]>(() => {
        if (initialData?.payers && initialData.payers.length > 0) return initialData.payers;
        const defaultPayerId = initialData?.payerId || (members[0]?.id || '');
        const defaultAmount = parseAmount(initialData?.amount.toString() || '0');
        return [{ memberId: defaultPayerId, amount: defaultAmount }];
    });

    const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || SplitType.EVEN);
    const [category, setCategory] = useState<ExpenseCategory>(initialData?.category || ExpenseCategory.OTHER);
    const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(initialData?.manualAmounts || {});
    const [percentages, setPercentages] = useState<Record<string, string>>(() => {
        if (initialData?.splitType === SplitType.PERCENTAGE && Array.isArray(initialData.splits)) {
            const obj: Record<string, string> = {};
            initialData.splits.forEach(s => {
                if (s.percentage !== undefined) {
                    obj[s.memberId] = s.percentage.toString();
                }
            });
            return obj;
        }
        return {};
    });
    const [shares, setShares] = useState<Record<string, string>>(() => {
        if (initialData?.splitType === SplitType.SHARES && Array.isArray(initialData.splits)) {
            const obj: Record<string, string> = {};
            initialData.splits.forEach(s => {
                if (s.share !== undefined) {
                    obj[s.memberId] = s.share.toString();
                }
            });
            return obj;
        }
        return {};
    });
    const [included, setIncluded] = useState<Record<string, boolean>>(() => {
        if (initialData && initialData.splitType === SplitType.EVEN && Array.isArray(initialData.splits)) {
            const selected = new Set(initialData.splits.filter(s => (s.amount ?? 0) > 0).map(s => s.memberId));
            const obj: Record<string, boolean> = {};
            members.forEach(m => { obj[m.id] = selected.has(m.id); });
            return obj;
        }
        const obj: Record<string, boolean> = {};
        members.forEach(m => { obj[m.id] = true; });
        return obj;
    });

    // Keep included map in sync when members list changes (new members default to included)
    const [prevMembers, setPrevMembers] = useState(members);
    if (members !== prevMembers) {
        setPrevMembers(members);
        setIncluded(prev => {
            const next: Record<string, boolean> = { ...prev };
            members.forEach(m => {
                if (!(m.id in next)) {
                    next[m.id] = true;
                }
            });
            const validIds = new Set(members.map(m => m.id));
            const filtered: Record<string, boolean> = {};
            Object.keys(next).forEach(id => {
                if (validIds.has(id)) {
                    filtered[id] = next[id];
                }
            });
            return filtered;
        });
    }

    const equalEach = useMemo(() => {
        const total = parseAmount(amount);
        const n = members.reduce((count, m) => count + (included[m.id] ? 1 : 0), 0);
        if (total <= 0 || n === 0) return '0.00';
        return (total / n).toFixed(2);
    }, [amount, members, included]);

    // Sync single payer amount when the main amount field changes
    useEffect(() => {
        if (!isMultiPayer && payers.length === 1) {
            const currentAmount = parseAmount(amount);
            if (payers[0].amount !== currentAmount) {
                setPayers([{ ...payers[0], amount: currentAmount }]);
            }
        }
    }, [amount, isMultiPayer, payers]);

    // ---- Step gating ----
    const canProceed =
        step === 0 ? isWhatStepValid(description, amount)
        : step === 1 ? isPayerStepValid(isMultiPayer, payers, amount)
        : step === 2 ? isSplitStepValid(splitType, amount, members, { included, manualAmounts, percentages, shares })
        : true;

    const goBack = () => {
        setSubmitError(null);
        setStep(s => Math.max(0, s - 1));
    };
    const goNext = () => {
        setSubmitError(null);
        setStep(s => Math.min(3, s + 1));
    };

    const reviewSentence = useMemo(() => {
        const total = parseAmount(amount);
        const activePayers = isMultiPayer ? payers.filter(p => p.amount > 0) : payers.slice(0, 1);
        const payerNames = activePayers.map(p => members.find(m => m.id === p.memberId)?.name ?? 'Someone');

        let participantNames: string[] = [];
        if (splitType === SplitType.EVEN) {
            participantNames = members.filter(m => included[m.id]).map(m => m.name);
        } else if (splitType === SplitType.EXACT) {
            participantNames = members
                .filter(m => (parseFloat(removeThousandsSeparator(manualAmounts[m.id] || '0')) || 0) > 0)
                .map(m => m.name);
        } else if (splitType === SplitType.PERCENTAGE) {
            participantNames = members.filter(m => (parseFloat(percentages[m.id] || '0') || 0) > 0).map(m => m.name);
        } else {
            participantNames = members.filter(m => (parseInt((shares[m.id] || '0').trim() || '0', 10) || 0) > 0).map(m => m.name);
        }

        return buildReviewSentence({ payerNames, totalAmount: total, currency, splitType, participantNames });
    }, [amount, members, payers, isMultiPayer, splitType, included, manualAmounts, percentages, shares, currency]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Enter on an earlier step advances instead of submitting
        if (step < 3) {
            if (canProceed) goNext();
            return;
        }

        const totalAmount = parseAmount(amount);
        if (!description || totalAmount <= 0) {
            setSubmitError('Enter a description and an amount greater than zero.');
            return;
        }
        if (members.length === 0) {
            setSubmitError('This group has no members to split with.');
            return;
        }

        const options: {
            includedMemberIds?: string[];
            manualAmounts: Record<string, number>;
            percentages: Record<string, number>;
            shares: Record<string, number>;
        } = {
            manualAmounts: {},
            percentages: {},
            shares: {}
        };

        if (splitType === SplitType.EVEN) {
            options.includedMemberIds = members.filter(m => included[m.id]).map(m => m.id);
        } else if (splitType === SplitType.EXACT) {
            members.forEach(m => {
                const val = parseFloat(removeThousandsSeparator(manualAmounts[m.id] || '0'));
                options.manualAmounts[m.id] = isNaN(val) ? 0 : val;
            });
        } else if (splitType === SplitType.PERCENTAGE) {
            members.forEach(m => {
                const val = parseFloat(removeThousandsSeparator(percentages[m.id] || '0'));
                options.percentages[m.id] = isNaN(val) ? 0 : val;
            });
        } else if (splitType === SplitType.SHARES) {
            const sharesList = members.map(m => (shares[m.id] || '').trim());
            const invalid = sharesList.some(s => s !== '' && !/^\d+$/.test(s));
            if (invalid) {
                setSubmitError('Shares must be whole numbers (0 or more).');
                return;
            }
            members.forEach(m => {
                const val = (shares[m.id] || '').trim();
                options.shares[m.id] = val === '' ? 0 : parseInt(val, 10);
            });
        }

        const result = calculateSplits(totalAmount, splitType, members, options);
        if (!result.success) {
            setSubmitError(result.error);
            return;
        }

        const payersTotal = payers.reduce((sum, p) => sum + p.amount, 0);
        if (!isBalanceSettled(payersTotal - totalAmount)) {
            setSubmitError(`Payer amounts add up to ${payersTotal.toFixed(2)} but the total is ${totalAmount.toFixed(2)}. Go back and adjust who paid.`);
            return;
        }

        onSubmit({
            description,
            amount: totalAmount,
            currency,
            payers: isMultiPayer ? payers : [{ memberId: payers[0].memberId, amount: totalAmount }],
            splitType,
            category,
            splits: result.splits,
            date: new Date().toISOString()
        });
    };

    if (isLoading && members.length === 0) {
        return (
            <div className="space-y-3 p-2" aria-label="Loading members">
                <div className="h-16 rounded-xl bg-muted animate-pulse" />
                <div className="h-10 rounded-xl bg-muted animate-pulse" />
                <div className="h-10 rounded-xl bg-muted animate-pulse" />
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground">This group has no members yet. Add people from the group's member screen first.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <StepDots current={step} />
                <h3 className="text-center text-sm font-semibold text-muted-foreground">{STEP_TITLES[step]}</h3>
            </div>

            {step === 0 && (
                <div className="space-y-6">
                    <AmountInput
                        amount={amount}
                        setAmount={setAmount}
                        description={description}
                        setDescription={setDescription}
                        currency={currency}
                        autoFocus={!initialData}
                    />

                    {getWhatStepHint(description, amount) && (
                        <p className="text-xs text-muted-foreground text-center -mt-2">
                            {getWhatStepHint(description, amount)}
                        </p>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Currency</label>
                        <select
                            value={currency}
                            onChange={(e) => { setCurrency(e.target.value); }}
                            className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            {CURRENCIES.map(curr => (
                                <option key={curr} value={curr}>
                                    {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Category (optional)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORY_ORDER.map((cat) => {
                                const Icon = CATEGORY_ICONS[cat];
                                const isSelected = category === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => { setCategory(cat); }}
                                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:bg-secondary/50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {CATEGORY_LABELS[cat]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    {isMultiPayer ? (
                        <MultiPayerSelector
                            members={members}
                            payers={payers}
                            setPayers={setPayers}
                            totalAmount={parseAmount(amount)}
                            currency={currency}
                        />
                    ) : (
                        <PayerSelector
                            members={members}
                            payerId={payers[0]?.memberId || ''}
                            setPayerId={(id) => { setPayers([{ memberId: id, amount: parseAmount(amount) }]); }}
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => { setIsMultiPayer(!isMultiPayer); }}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        {isMultiPayer ? 'Use a single payer' : 'Split the payment across multiple people'}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <SplitTypeSelector splitType={splitType} setSplitType={setSplitType} />

                    {splitType === SplitType.EVEN && (
                        <SplitEven members={members} included={included} setIncluded={setIncluded} equalEach={equalEach} currency={currency} />
                    )}
                    {splitType === SplitType.EXACT && (
                        <SplitExact members={members} manualAmounts={manualAmounts} setManualAmounts={setManualAmounts} amount={amount} currency={currency} />
                    )}
                    {splitType === SplitType.PERCENTAGE && (
                        <SplitPercentage members={members} percentages={percentages} setPercentages={setPercentages} amount={amount} />
                    )}
                    {splitType === SplitType.SHARES && (
                        <SplitShares members={members} shares={shares} setShares={setShares} />
                    )}
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 bg-secondary/20 rounded-xl p-5">
                    <p className="text-base leading-relaxed">{reviewSentence}</p>
                    {submitError && (
                        <p className="text-sm text-negative">{submitError}</p>
                    )}
                </div>
            )}

            <StepNav
                canGoBack={step > 0}
                onBack={goBack}
                nextLabel={step === 3 ? (isSubmitting ? 'Saving…' : submitLabel) : 'Next'}
                nextDisabled={!canProceed || isSubmitting}
            />
        </form>
    );
}
