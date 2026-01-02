import React, { useState, useMemo } from 'react';
import { useGroup } from '../context/GroupContext';
import { calculateSplits } from '../lib/accounting';
import { SplitType, type Split } from '../types';
import { AmountInput } from './expense-form/AmountInput';
import { PayerSelector } from './expense-form/PayerSelector';
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
        payerId: string;
        splitType: SplitType;
        splits: Split[];
        manualAmounts: Record<string, string>;
    };
    onSubmit: (data: {
        description: string;
        amount: number;
        currency: string;
        payerId: string;
        splitType: SplitType;
        splits: Split[];
        date: string;
    }) => void;
    submitLabel?: string;
}

export function ExpenseForm({ initialData, onSubmit, submitLabel = 'Add Expense' }: ExpenseFormProps) {
    const { members, currency: groupCurrency } = useGroup();

    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || groupCurrency);
    const [payerId, setPayerId] = useState(initialData?.payerId || (members[0]?.id || ''));
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
            const selected = new Set(initialData.splits.filter(s => s.amount > 0).map(s => s.memberId));
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

    // Ensure payerId is valid if members change
    // Using derived state instead of useEffect to avoid cascading renders
    const validPayerId = members.find(m => m.id === payerId) ? payerId : (members[0]?.id || '');

    // Equal split preview value computed at top-level to avoid conditional hook usage
    const equalEach = useMemo(() => {
        const total = parseFloat(removeThousandsSeparator(amount || '0'));
        const n = members.reduce((count, m) => count + (included[m.id] ? 1 : 0), 0);
        if (!isFinite(total) || n === 0) return '0.00';
        return (total / n).toFixed(2);
    }, [amount, members, included]);

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
            manualAmounts?: Record<string, number>;
            percentages?: Record<string, number>;
            shares?: Record<string, number>;
        } = {};

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

        onSubmit({
            description,
            amount: totalAmount,
            currency,
            payerId: validPayerId,
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

            <PayerSelector 
                members={members}
                payerId={validPayerId}
                setPayerId={setPayerId}
            />

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
