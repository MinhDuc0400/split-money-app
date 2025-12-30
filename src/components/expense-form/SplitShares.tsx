import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { Member } from '../../types';

interface SplitSharesProps {
    members: Member[];
    shares: Record<string, string>;
    setShares: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function SplitShares({ members, shares, setShares }: SplitSharesProps) {
    return (
        <div className="space-y-3 bg-secondary/20 p-4 rounded-xl">
            {members.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                        <img src={member.avatar} alt={member.name} />
                    </div>
                    <span className="flex-1 text-sm">{member.name}</span>
                    <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">#</span>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            value={shares[member.id] || ''}
                            onChange={(e) => { setShares(prev => ({ ...prev, [member.id]: e.target.value })); }}
                            className="w-full bg-card rounded-md py-1 pl-5 pr-2 text-right text-sm border focus:border-primary focus:outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>
            ))}
            <SharesSummary shares={shares} members={members} />
        </div>
    );
}

function SharesSummary({ shares, members }: { shares: Record<string, string>; members: Member[] }) {
    const ints = useMemo(() => members.map(m => {
        const raw = (shares[m.id] || '').trim();
        return raw === '' ? 0 : (/^\d+$/.test(raw) ? parseInt(raw, 10) : NaN);
    }), [shares, members]);
    const invalid = ints.some(v => Number.isNaN(v));
    const totalShares = ints.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    const ok = !invalid && totalShares > 0;
    return (
        <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">Total shares</div>
            <div className={cn("font-semibold", ok ? "text-foreground" : "text-destructive")}>{invalid ? 'Invalid' : totalShares}</div>
        </div>
    );
}
