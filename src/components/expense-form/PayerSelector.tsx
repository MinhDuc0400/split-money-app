import { cn } from '../../lib/utils';
import type { Member } from '../../types/member.types';

interface PayerSelectorProps {
    members: Member[];
    payerId: string;
    setPayerId: (id: string) => void;
}

export function PayerSelector({ members, payerId, setPayerId }: PayerSelectorProps) {
    return (
        <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {members.map(member => (
                    <button
                        key={member.id}
                        type="button"
                        onClick={() => { setPayerId(member.id); }}
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
    );
}
