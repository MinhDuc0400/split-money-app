import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { Member } from '../../types';

interface SplitPercentageProps {
    members: Member[];
    percentages: Record<string, string>;
    setPercentages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    amount: string;
}

export function SplitPercentage({ members, percentages, setPercentages, amount }: SplitPercentageProps) {
    return (
        <div className="space-y-3 bg-secondary/20 p-4 rounded-xl">
            {members.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                        <img src={member.avatar} alt={member.name} />
                    </div>
                    <span className="flex-1 text-sm">{member.name}</span>
                    <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        <input
                            type="number"
                            value={percentages[member.id] || ''}
                            onChange={(e) => setPercentages(prev => ({ ...prev, [member.id]: e.target.value }))}
                            className="w-full bg-card rounded-md py-1 pl-5 pr-2 text-right text-sm border focus:border-primary focus:outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>
            ))}
            <PercentSummary amount={amount} percentages={percentages} />
        </div>
    );
}

function PercentSummary({ amount, percentages }: { amount: string; percentages: Record<string, string> }) {
    const total = useMemo(() => parseFloat(amount || '0'), [amount]);
    const percSum = useMemo(() => Object.values(percentages).reduce((acc, v) => acc + (parseFloat(v || '0') || 0), 0), [percentages]);
    const ok = Math.round(percSum * 100) === 10000;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">Percent total</div>
                <div className={cn("font-semibold", ok ? "text-foreground" : "text-destructive")}>
                    {percSum.toFixed(2)}% / 100.00%
                </div>
            </div>
            {isFinite(total) && total > 0 && (
                <div className="text-[11px] text-muted-foreground">
                    Preview amounts will be calculated on save.
                </div>
            )}
        </div>
    );
}
