import React from 'react';
import { cn } from '../../lib/utils';
import type { Member } from '../../types';

interface SplitExactProps {
    members: Member[];
    manualAmounts: Record<string, string>;
    setManualAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    amount: string;
}

export function SplitExact({ members, manualAmounts, setManualAmounts, amount }: SplitExactProps) {
    return (
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
            <ExactSummary amount={amount} manualAmounts={manualAmounts} />
        </div>
    );
}

function ExactSummary({ amount, manualAmounts }: { amount: string; manualAmounts: Record<string, string> }) {
    const total = parseFloat(amount || '0');
    const sum = Object.values(manualAmounts).reduce((acc, v) => acc + (parseFloat(v || '0') || 0), 0);
    const ok = Math.round(sum * 100) === Math.round(total * 100);
    return (
        <div className="flex items-center justify-between text-xs mt-1">
            <div className="text-muted-foreground">Sum of exact amounts</div>
            <div className={cn("font-semibold", ok ? "text-foreground" : "text-destructive")}>${sum.toFixed(2)} / ${total.toFixed(2)}</div>
        </div>
    );
}
