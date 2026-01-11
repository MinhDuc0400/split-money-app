import React, { useState, useMemo, useEffect } from 'react';
import { useGroup } from '../context/GroupContext';
import { calculateSplits } from '../lib/accounting';
import { SplitType, type Split, type Payer, type CreateExpenseRequest } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { AmountInput } from './expense-form/AmountInput';
import { PayerSelector } from './expense-form/PayerSelector';
import { MultiPayerSelector } from './expense-form/MultiPayerSelector';
import { SplitTypeSelector } from './expense-form/SplitTypeSelector';
import { SplitEven } from './expense-form/SplitEven';
import { SplitExact } from './expense-form/SplitExact';
import { SplitPercentage } from './expense-form/SplitPercentage';
import { SplitShares } from './expense-form/SplitShares';
import { SubmitButton } from './expense-form/SubmitButton';
import { removeThousandsSeparator, CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../lib/currency';

interface ExpenseFormProps {
    initialData?: {
        description: string;
        amount: number;
        currency: string;
        payerId?: string;
        payers?: Payer[];
        splitType: SplitType;
        splits: Split[];
        manualAmounts: Record<string, string>;
    };
    onSubmit: (data: CreateExpenseRequest) => void;
    groupId?: string;
    submitLabel?: string;
}

export function ExpenseForm({ initialData, onSubmit, groupId, submitLabel = 'Add Expense' }: ExpenseFormProps) {
    const { activeGroupId, groups: groupsMeta, fetchGroupById } = useGroup();
    const effectiveGroupId = groupId || activeGroupId;

    const dispatch = useAppDispatch();
    const allMembersMap = useAppSelector(state => state.finance.members);

    // Get members for the specific group
    const members = useMemo(() => {
        return allMembersMap[effectiveGroupId] || [];
    }, [allMembersMap, effectiveGroupId]);

    const groupMeta = useMemo(() => {
        return groupsMeta.find(g => g.id === effectiveGroupId);
    }, [groupsMeta, effectiveGroupId]);

    const groupCurrency = groupMeta?.currency || 'USD';

    // Fetch members if they are missing for this group
    useEffect(() => {
        if (effectiveGroupId && members.length === 0) {
            void fetchGroupById(effectiveGroupId);
        }
    }, [effectiveGroupId, members.length, fetchGroupById]);

    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || groupCurrency);

    // Multiple payers state - default to false for new expenses
    const [isMultiPayer, setIsMultiPayer] = useState(initialData?.payers ? initialData.payers.length > 1 : false);
    const [payers, setPayers] = useState<Payer[]>(() => {
        if (initialData?.payers && initialData.payers.length > 0) return initialData.payers;
        // Default to a single payer (usually the first member of the group)
        const defaultPayerId = initialData?.payerId || (members[0]?.id || '');
        const defaultAmount = parseFloat(removeThousandsSeparator(amount || '0')) || 0;
        return [{ memberId: defaultPayerId, amount: defaultAmount }];
    });

    const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || SplitType.EVEN);
    // Exact amounts: Record<MemberID, AmountString>
    const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(initialData?.manualAmounts || {});
    // Percentages per member (as string to keep input fidelity)
    const [percentages, setPercentages] = useState<Record<string, string>>({});
    // Shares per member (as string to allow empty state, but will be validated as integers)
    const [shares, setShares] = useState<Record<string, string>>({});
    // Included members for Equal split (checkboxes)
    const [included, setIncluded] = useState<Record<string, boolean>>(() => {
        // If editing an equal-split expense, preselect members present in splits with amount > 0
        if (initialData && initialData.splitType === SplitType.EVEN && Array.isArray(initialData.splits)) {
            const selected = new Set(initialData.splits.filter(s => (s.amount ?? 0) > 0).map(s => s.memberId));
            const obj: Record<string, boolean> = {};
            members.forEach(m => { obj[m.id] = selected.has(m.id); });
            return obj;
        }
        // Default: everyone included
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
            // Remove keys for members that no longer exist
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

    // Equal split preview value computed at top-level to avoid conditional hook usage
    const equalEach = useMemo(() => {
        const total = parseFloat(removeThousandsSeparator(amount || '0'));
        const n = members.reduce((count, m) => count + (included[m.id] ? 1 : 0), 0);
        if (!isFinite(total) || n === 0) return '0.00';
        return (total / n).toFixed(2);
    }, [amount, members, included]);

    // Sync single payer amount when the main amount field changes
    // This ensures that switching to Multiple Payers later has the correct initial amount
    useEffect(() => {
        if (!isMultiPayer && payers.length === 1) {
            const currentAmount = parseFloat(removeThousandsSeparator(amount || '0')) || 0;
            if (payers[0].amount !== currentAmount) {
                setPayers([{ ...payers[0], amount: currentAmount }]);
            }
        }
    }, [amount, isMultiPayer, payers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const totalAmount = parseFloat(removeThousandsSeparator(amount));
        if (!description || isNaN(totalAmount) || totalAmount <= 0) {
            alert('Please enter a valid description and amount.');
            return;
        }

        if (members.length === 0) {
            alert('Please add members first.');
            return;
        }

        // Prepare data for calculation
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
            options.manualAmounts = {};
            members.forEach(m => {
                const val = parseFloat(removeThousandsSeparator(manualAmounts[m.id] || '0'));
                options.manualAmounts[m.id] = isNaN(val) ? 0 : val;
            });
        } else if (splitType === SplitType.PERCENTAGE) {
            options.percentages = {};
            members.forEach(m => {
                const val = parseFloat(removeThousandsSeparator(percentages[m.id] || '0'));
                options.percentages[m.id] = isNaN(val) ? 0 : val;
            });
        } else if (splitType === SplitType.SHARES) {
            // Strict integer validation for UI
            const sharesList = members.map(m => (shares[m.id] || '').trim());
            const invalid = sharesList.some(s => s !== '' && !/^\d+$/.test(s));
            if (invalid) {
                alert('Shares must be integers (0 or more).');
                return;
            }

            options.shares = {};
            members.forEach(m => {
                const val = (shares[m.id] || '').trim();
                options.shares[m.id] = val === '' ? 0 : parseInt(val, 10);
            });
        }

        const result = calculateSplits(totalAmount, splitType, members, options);

        if (!result.success) {
            alert(result.error);
            return;
        }

        const splits = result.splits;

        // Final validation of payers
        const payersTotal = payers.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(payersTotal - totalAmount) > 0.01) {
            alert(`The sum of payer amounts (${payersTotal.toFixed(2)}) must equal the total amount (${totalAmount.toFixed(2)}).`);
            return;
        }

        onSubmit({
            description,
            amount: totalAmount,
            currency,
            payers: isMultiPayer ? payers : [{ memberId: payers[0].memberId, amount: totalAmount }],
            splitType,
            splits,
            date: new Date().toISOString()
        });
    };

    if (members.length === 0) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground mb-4">Add members before creating an expense.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <AmountInput
                amount={amount}
                setAmount={setAmount}
                description={description}
                setDescription={setDescription}
                currency={currency}
                autoFocus={!initialData}
            />

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

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid By</label>
                    <button
                        type="button"
                        onClick={() => setIsMultiPayer(!isMultiPayer)}
                        className="text-xs font-medium text-primary hover:underline"
                    >
                        {isMultiPayer ? 'Select Single Payer' : 'Multiple Payers'}
                    </button>
                </div>

                {isMultiPayer ? (
                    <MultiPayerSelector
                        members={members}
                        payers={payers}
                        setPayers={setPayers}
                        totalAmount={parseFloat(removeThousandsSeparator(amount || '0'))}
                        currency={currency}
                    />
                ) : (
                    <PayerSelector
                        members={members}
                        payerId={payers[0]?.memberId || ''}
                        setPayerId={(id) => setPayers([{ memberId: id, amount: parseFloat(removeThousandsSeparator(amount || '0')) }])}
                    />
                )}
            </div>

            <SplitTypeSelector
                splitType={splitType}
                setSplitType={setSplitType}
            />

            {splitType === SplitType.EVEN && (
                <SplitEven
                    members={members}
                    included={included}
                    setIncluded={setIncluded}
                    equalEach={equalEach}
                />
            )}

            {splitType === SplitType.EXACT && (
                <SplitExact
                    members={members}
                    manualAmounts={manualAmounts}
                    setManualAmounts={setManualAmounts}
                    amount={amount}
                    currency={currency}
                />
            )}

            {splitType === SplitType.PERCENTAGE && (
                <SplitPercentage
                    members={members}
                    percentages={percentages}
                    setPercentages={setPercentages}
                    amount={amount}
                />
            )}

            {splitType === SplitType.SHARES && (
                <SplitShares
                    members={members}
                    shares={shares}
                    setShares={setShares}
                />
            )}

            <SubmitButton
                splitType={splitType}
                amount={amount}
                manualAmounts={manualAmounts}
                percentages={percentages}
                shares={shares}
                included={included}
                members={members}
            >
                {submitLabel}
            </SubmitButton>
        </form>
    );
}
