import { useState } from 'react';
import { cn } from '../../lib/utils';
import { removeThousandsSeparator, formatAmount } from '../../lib/currency';
import type { Member } from '../../types/member.types';
import type { Split } from '../../types/expense.types';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }


interface MultiPayerSelectorProps {
    members: Member[];
    payers: WithRequired<Split, 'amount'>[];
    setPayers: (payers: WithRequired<Split, 'amount'>[]) => void;
    totalAmount: number;
    currency: string;
}

export function MultiPayerSelector({ members, payers, setPayers, totalAmount, currency }: MultiPayerSelectorProps) {
    // Local state for input values to keep typing smooth
    const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        payers.forEach(p => {
            initial[p.memberId] = p.amount.toString();
        });
        return initial;
    });

    const payersTotal = payers.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalAmount - payersTotal;

    const handleAmountChange = (memberId: string, value: string) => {
        const cleaned = removeThousandsSeparator(value);
        setInputValues(prev => ({ ...prev, [memberId]: value }));

        const amount = parseFloat(cleaned);
        if (!isNaN(amount)) {
            const existingPayerIndex = payers.findIndex(p => p.memberId === memberId);
            let nextPayers = [...payers];

            if (existingPayerIndex !== -1) {
                if (amount === 0 && nextPayers.length > 1) {
                    nextPayers = nextPayers.filter(p => p.memberId !== memberId);
                } else {
                    nextPayers[existingPayerIndex] = { ...nextPayers[existingPayerIndex], amount };
                }
            } else if (amount > 0) {
                nextPayers.push({ memberId, amount });
            }

            setPayers(nextPayers);
        }
    };

    const toggleMember = (memberId: string) => {
        const existingPayer = payers.find(p => p.memberId === memberId);
        if (existingPayer) {
            if (payers.length > 1) {
                setPayers(payers.filter(p => p.memberId !== memberId));
                setInputValues(prev => {
                    const next = { ...prev };
                    delete next[memberId];
                    return next;
                });
            }
        } else {
            // If adding a member and there's remaining, give them the remaining
            const amountToAdd = remaining > 0 ? remaining : 0;
            setPayers([...payers, { memberId, amount: amountToAdd }]);
            setInputValues(prev => ({ ...prev, [memberId]: amountToAdd.toString() }));
        }
    };

    return (
        <div className="space-y-4 bg-secondary/20 p-4 rounded-2xl border border-border/50">
            <div className="flex justify-between items-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className={cn(
                    "font-bold",
                    Math.abs(remaining) < 0.01 ? "text-positive" : "text-amber-500"
                )}>
                    {Math.abs(remaining) < 0.01
                        ? "Balanced"
                        : `${remaining > 0 ? 'Remaining' : 'Over'}: ${formatAmount(Math.abs(remaining), currency)}`}
                </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {members.map(member => {
                    const payer = payers.find(p => p.memberId === member.id);
                    const isSelected = !!payer;

                    return (
                        <div
                            key={member.id}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all border-2",
                                isSelected ? "bg-card border-primary/50" : "bg-transparent border-transparent hover:bg-secondary/50"
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => toggleMember(member.id)}
                                className="flex items-center gap-3 flex-1 text-left"
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border">
                                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                    </div>
                                    {isSelected && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px]">
                                            ✓
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{member.name}</p>
                                    <p className="text-[10px] text-muted-foreground">Contributor</p>
                                </div>
                            </button>

                            {isSelected && (
                                <div className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-lg border border-border">
                                    <span className="text-xs font-semibold opacity-50">{currency}</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={inputValues[member.id] || ''}
                                        onChange={(e) => handleAmountChange(member.id, e.target.value)}
                                        className="w-20 bg-transparent text-right text-sm font-bold focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
