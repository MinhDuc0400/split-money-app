import { cn } from '../../lib/utils';
import type { Member } from '../../types/member.types';
import { Avatar } from '../Avatar';
import { GuestTag } from '../GuestTag';

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
                            "flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-lg transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                            payerId === member.id
                                ? "bg-primary/10 border-primary"
                                : "bg-transparent border-transparent hover:bg-secondary/50"
                        )}
                    >
                        <Avatar name={member.name} src={member.avatar} className="w-8 h-8" />
                        <span className="text-xs font-medium truncate w-full text-center">{member.name}</span>
                        {member.isGuest && <GuestTag />}
                    </button>
                ))}
            </div>
        </div>
    );
}
