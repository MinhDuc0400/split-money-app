import React from 'react';
import { cn } from '../../lib/utils';
import type { Member } from '../../types/member.types';
import { getCurrencySymbol, formatCurrencyInput, removeThousandsSeparator } from '../../lib/currency';
import { Avatar } from '../Avatar';
import { GuestTag } from '../GuestTag';

interface SplitExactProps {
    members: Member[];
    manualAmounts: Record<string, string>;
    setManualAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    amount: string;
    currency: string;
}

export function SplitExact({ members, manualAmounts, setManualAmounts, amount, currency }: SplitExactProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const handleAmountChange = (memberId: string, value: string) => {
        const formatted = formatCurrencyInput(value);
        setManualAmounts(prev => ({ ...prev, [memberId]: formatted }));
    };

    return (
        <div className="space-y-3 bg-secondary/20 p-4 rounded-xl">
            {members.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                    <Avatar name={member.name} src={member.avatar} className="w-6 h-6" />
                    <span className="flex-1 text-sm flex items-center gap-2">{member.name}{member.isGuest && <GuestTag />}</span>
                    <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencySymbol}</span>
                        <input
                            type="text"
                            value={manualAmounts[member.id] || ''}
                            onChange={(e) => { handleAmountChange(member.id, e.target.value); }}
                            className="w-full bg-card rounded-md py-1 pl-5 pr-2 text-right text-sm border focus:border-primary focus:outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>
            ))}
            <ExactSummary amount={amount} manualAmounts={manualAmounts} currency={currency} />
        </div>
    );
}

function ExactSummary({ amount, manualAmounts, currency }: { amount: string; manualAmounts: Record<string, string>; currency: string }) {
    const currencySymbol = getCurrencySymbol(currency);
    // Parse formatted amounts by removing thousands separators
    const total = parseFloat(removeThousandsSeparator(amount || '0'));
    const sum = Object.values(manualAmounts).reduce((acc, v) => {
        const cleaned = removeThousandsSeparator(v || '0');
        return acc + (parseFloat(cleaned) || 0);
    }, 0);
    const ok = Math.round(sum * 100) === Math.round(total * 100);
    return (
        <div className="flex items-center justify-between text-xs mt-1">
            <div className="text-muted-foreground">Sum of exact amounts</div>
            <div className={cn("font-semibold", ok ? "text-foreground" : "text-destructive")}>
                {currencySymbol}{sum.toFixed(2)} / {currencySymbol}{total.toFixed(2)}
            </div>
        </div>
    );
}
