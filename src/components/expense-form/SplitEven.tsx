import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Member } from '../../types';

interface SplitEvenProps {
    members: Member[];
    included: Record<string, boolean>;
    setIncluded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    equalEach: string;
}

export function SplitEven({ members, included, setIncluded, equalEach }: SplitEvenProps) {
    return (
        <div className="space-y-3 bg-secondary/20 p-4 rounded-xl text-sm">
            <div className="space-y-2">
                {members.map(member => (
                    <label key={member.id} className="flex items-center gap-3 cursor-pointer group hover:bg-secondary/30 p-2 rounded-lg transition-colors -mx-2">
                        <div className={cn(
                            "flex items-center justify-center w-5 h-5 rounded border transition-all duration-200",
                            included[member.id]
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 bg-background group-hover:border-primary/50"
                        )}>
                            {included[member.id] && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </div>
                        <input
                            type="checkbox"
                            checked={!!included[member.id]}
                            onChange={(e) => { setIncluded(prev => ({ ...prev, [member.id]: e.target.checked })); }}
                            className="hidden"
                        />
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                            <img src={member.avatar} alt={member.name} />
                        </div>
                        <span className="flex-1 text-sm">{member.name}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-between text-muted-foreground pt-2 border-t border-border/50">
                <span>
                    Each of <span className="font-semibold text-foreground">{members.reduce((c,m)=>c+(included[m.id]?1:0),0)}</span> selected pays
                </span>
                <span className="font-semibold text-foreground">
                    ${equalEach}
                </span>
            </div>
        </div>
    );
}
