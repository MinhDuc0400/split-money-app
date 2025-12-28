import React, { useState, useEffect, useMemo } from 'react';
import { useGroup } from '../context/GroupContext';
import { SplitType, type Split } from '../types';
import { AmountInput } from './expense-form/AmountInput';
import { PayerSelector } from './expense-form/PayerSelector';
import { SplitTypeSelector } from './expense-form/SplitTypeSelector';
import { SplitEven } from './expense-form/SplitEven';
import { SplitExact } from './expense-form/SplitExact';
import { SplitPercentage } from './expense-form/SplitPercentage';
import { SplitShares } from './expense-form/SplitShares';
import { SubmitButton } from './expense-form/SubmitButton';

interface ExpenseFormProps {
    initialData?: {
        description: string;
        amount: number;
        payerId: string;
        splitType: SplitType;
        splits: Split[];
        manualAmounts: Record<string, string>;
    };
    onSubmit: (data: {
        description: string;
        amount: number;
        payerId: string;
        splitType: SplitType;
        splits: Split[];
    }) => void;
    submitLabel?: string;
}

export function ExpenseForm({ initialData, onSubmit, submitLabel = 'Add Expense' }: ExpenseFormProps) {
    const { members } = useGroup();

    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
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
    useEffect(() => {
        setIncluded(prev => {
            const next: Record<string, boolean> = { ...prev };
            members.forEach(m => {
                if (next[m.id] === undefined) next[m.id] = true;
            });
            // Remove keys for members that no longer exist
            Object.keys(next).forEach(id => {
                if (!members.find(m => m.id === id)) delete next[id];
            });
            return next;
        });
    }, [members]);

    // Ensure payerId is valid if members change
    useEffect(() => {
        if (members.length > 0 && !members.find(m => m.id === payerId)) {
            setPayerId(members[0].id);
        }
    }, [members, payerId]);

    // Equal split preview value computed at top-level to avoid conditional hook usage
    const equalEach = useMemo(() => {
        const total = parseFloat(amount || '0');
        const n = members.reduce((count, m) => count + (included[m.id] ? 1 : 0), 0);
        if (!isFinite(total) || n === 0) return '0.00';
        return (total / n).toFixed(2);
    }, [amount, members, included]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const totalAmount = parseFloat(amount);
        if (!description || isNaN(totalAmount) || totalAmount <= 0) {
            alert('Please enter a valid description and amount.');
            return;
        }

        const totalCents = Math.round(totalAmount * 100);
        let splits: Split[] = [];

        if (members.length === 0) {
            alert('Please add members first.');
            return;
        }

        if (splitType === SplitType.EVEN) {
            const participants = members.filter(m => included[m.id]);
            const n = participants.length;
            if (n === 0) {
                alert('Please select at least one participant for this expense.');
                return;
            }
            const base = Math.floor(totalCents / n);
            const remainder = totalCents % n;
            splits = participants.map((m, idx) => ({
                memberId: m.id,
                amount: (base + (idx < remainder ? 1 : 0)) / 100,
                paid: false
            }));
        } else if (splitType === SplitType.EXACT) {
            // Exact amounts must sum exactly to total
            const centsList = members.map(m => Math.round(parseFloat(manualAmounts[m.id] || '0') * 100) || 0);
            const sum = centsList.reduce((a, b) => a + b, 0);
            if (sum !== totalCents) {
                alert(`Exact amounts must sum to ${totalAmount.toFixed(2)}. Currently ${(sum/100).toFixed(2)}.`);
                return;
            }
            splits = members.map((m, idx) => ({
                memberId: m.id,
                amount: centsList[idx] / 100,
                paid: false
            }));
        } else if (splitType === SplitType.PERCENTAGE) {
            // Percentages must sum exactly to 100.00
            const perc = members.map(m => parseFloat(percentages[m.id] || '0'));
            const percSum = perc.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
            // Enforce exact 100 up to two decimals
            if (Math.round(percSum * 100) !== 10000) {
                alert(`Percentages must sum to 100.00%. Currently ${percSum.toFixed(2)}%.`);
                return;
            }
            // Compute amounts with remainder distribution by largest fractional part
            const rawCents = members.map((_, idx) => {
                const p = isNaN(perc[idx]) ? 0 : perc[idx];
                const exact = (totalCents * p) / 100;
                return { base: Math.floor(exact), frac: exact - Math.floor(exact) };
            });
            let assigned = rawCents.reduce((a, b) => a + b.base, 0);
            let rem = totalCents - assigned;
            const order = rawCents
                .map((r, idx) => ({ idx, frac: r.frac }))
                .sort((a, b) => b.frac - a.frac);
            const centsResult = rawCents.map(r => r.base);
            for (let i = 0; i < order.length && rem > 0; i++) {
                centsResult[order[i].idx] += 1;
                rem--;
            }
            splits = members.map((m, idx) => ({ memberId: m.id, amount: centsResult[idx] / 100, paid: false }));
        } else if (splitType === SplitType.SHARES) {
            // Shares must be integers and totalShares > 0
            const sharesList = members.map(m => (shares[m.id] || '').trim());
            const invalid = sharesList.some(s => s !== '' && !/^\d+$/.test(s));
            if (invalid) {
                alert('Shares must be integers (0 or more).');
                return;
            }
            const ints = sharesList.map(s => (s === '' ? 0 : parseInt(s, 10)));
            const totalShares = ints.reduce((a, b) => a + b, 0);
            if (totalShares <= 0) {
                alert('Total shares must be greater than 0.');
                return;
            }
            const rawCents = ints.map(count => {
                const exact = (totalCents * count) / totalShares;
                return { base: Math.floor(exact), frac: exact - Math.floor(exact) };
            });
            let assigned = rawCents.reduce((a, b) => a + b.base, 0);
            let rem = totalCents - assigned;
            const order = rawCents
                .map((r, idx) => ({ idx, frac: r.frac }))
                .sort((a, b) => b.frac - a.frac);
            const centsResult = rawCents.map(r => r.base);
            for (let i = 0; i < order.length && rem > 0; i++) {
                centsResult[order[i].idx] += 1;
                rem--;
            }
            splits = members.map((m, idx) => ({ memberId: m.id, amount: centsResult[idx] / 100, paid: false }));
        }

        onSubmit({
            description,
            amount: totalAmount,
            payerId,
            splitType,
            splits
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
                autoFocus={!initialData}
            />

            <PayerSelector 
                members={members}
                payerId={payerId}
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
