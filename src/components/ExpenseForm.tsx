import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { useGroup } from '../context/GroupContext';
import { cn } from '../lib/utils';
import { SplitType, type Split } from '../types';

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
    // Manual amounts for uneven splits: Record<MemberID, AmountString>
    const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(initialData?.manualAmounts || {});

    // Ensure payerId is valid if members change
    useEffect(() => {
        if (members.length > 0 && !members.find(m => m.id === payerId)) {
            setPayerId(members[0].id);
        }
    }, [members, payerId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const totalAmount = parseFloat(amount);
        if (!description || isNaN(totalAmount) || totalAmount <= 0) {
            alert('Please enter a valid description and amount.');
            return;
        }

        let splits: Split[] = [];

        if (splitType === SplitType.EVEN) {
            const splitAmount = totalAmount / members.length;
            splits = members.map(m => ({
                memberId: m.id,
                amount: splitAmount,
                paid: false
            }));
        } else {
            // Validate totals for uneven
            let currentTotal = 0;
            splits = members.map(m => {
                const val = parseFloat(manualAmounts[m.id] || '0');
                currentTotal += val;
                return {
                    memberId: m.id,
                    amount: val,
                    paid: false
                };
            });

            if (Math.abs(currentTotal - totalAmount) > 0.05) {
                alert(`Amounts do not match total! (Sum: ${currentTotal}, Total: ${totalAmount})`);
                return;
            }
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
            {/* Amount and Description */}
            <div className="space-y-4">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <DollarSign className="w-5 h-5" />
                    </span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-secondary/30 text-3xl font-bold text-center py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus={!initialData}
                    />
                </div>

                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this for?"
                    className="w-full bg-transparent border-b border-border py-2 text-lg focus:outline-none focus:border-primary transition-colors text-center"
                />
            </div>

            {/* Payer Selection */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid By</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {members.map(member => (
                        <button
                            key={member.id}
                            type="button"
                            onClick={() => setPayerId(member.id)}
                            className={cn(
                                "flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-lg transition-all border-2",
                                payerId === member.id
                                    ? "bg-primary/10 border-primary"
                                    : "bg-transparent border-transparent hover:bg-secondary/50"
                            )}
                        >
                            <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                                <img src={member.avatar} alt={member.name} />
                            </div>
                            <span className="text-xs font-medium truncate w-full text-center">{member.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Split Type Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-1 rounded-lg">
                {(Object.values(SplitType).filter(t => t === SplitType.EVEN || t === SplitType.UNEVEN) as SplitType[]).map(type => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setSplitType(type)}
                        className={cn(
                            "py-2 px-4 rounded-md text-sm font-medium transition-all",
                            splitType === type ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {type === SplitType.EVEN ? 'Split Evenly' : 'Split Unevenly'}
                    </button>
                ))}
            </div>

            {/* Uneven Split Logic */}
            {splitType === SplitType.UNEVEN && (
                <div className="space-y-3 bg-secondary/20 p-4 rounded-xl">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full overflow-hidden">
                                <img src={member.avatar} alt={member.name} />
                            </div>
                            <span className="flex-1 text-sm">{member.name}</span>
                            <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                <input
                                    type="number"
                                    value={manualAmounts[member.id] || ''}
                                    onChange={(e) => setManualAmounts(prev => ({ ...prev, [member.id]: e.target.value }))}
                                    className="w-full bg-card rounded-md py-1 pl-5 pr-2 text-right text-sm border focus:border-primary focus:outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
                {submitLabel}
            </button>
        </form>
    );
}
