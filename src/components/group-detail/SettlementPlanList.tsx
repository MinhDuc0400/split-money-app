import { motion } from 'framer-motion';
import { formatAmount } from '../../lib/currency';
import type { GroupSettlement } from '../../types/group.types';
import { Avatar } from '../Avatar';
import { GuestTag } from '../GuestTag';

interface SettlementPlanListProps {
    settlements: GroupSettlement[];
    getMemberName: (id: string) => string;
    getMemberAvatar: (id: string) => string | undefined;
    onSettle?: (settlement: GroupSettlement) => void;
    onSettleAll?: (items: GroupSettlement[]) => void;
    currentMemberId?: string;
    isGuestMember?: (id: string) => boolean;
}

interface SettlementGroup {
    key: string;
    fromMemberId: string;
    toMemberId: string;
    items: GroupSettlement[];
}

function groupByPair(settlements: GroupSettlement[]): SettlementGroup[] {
    const groups = new Map<string, SettlementGroup>();
    for (const s of settlements) {
        const key = `${s.from.memberId}-${s.to.memberId}`;
        const existing = groups.get(key);
        if (existing) {
            existing.items.push(s);
        } else {
            groups.set(key, {
                key,
                fromMemberId: s.from.memberId,
                toMemberId: s.to.memberId,
                items: [s],
            });
        }
    }
    return Array.from(groups.values());
}

export function SettlementPlanList({ settlements, getMemberName, getMemberAvatar, onSettle, onSettleAll, currentMemberId, isGuestMember }: SettlementPlanListProps) {
    const groups = groupByPair(settlements);

    return (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span>Settlement plan</span>
                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Optimized</span>
            </h3>
            <div className="space-y-4">
                {groups.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl px-6">
                        <p className="font-medium">Everyone is settled up</p>
                        <p className="text-sm text-muted-foreground mt-1">New expenses will show who pays whom.</p>
                    </div>
                ) : (
                    groups.map((group, idx) => {
                        const first = group.items[0];
                        const fromName = first.from.name || getMemberName(group.fromMemberId);
                        const toName = first.to.name || getMemberName(group.toMemberId);
                        const fromAvatar = first.from.avatarUrl || getMemberAvatar(group.fromMemberId);
                        const canSettle = currentMemberId === group.fromMemberId;

                        return (
                            <motion.div
                                key={group.key}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="rounded-lg border border-border/30 p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={fromName} src={fromAvatar} />
                                        <div className="text-sm">
                                            <div className="font-semibold flex items-center gap-2">
                                                {fromName}
                                                {isGuestMember?.(group.fromMemberId) && <GuestTag />}
                                            </div>
                                            <div className="text-muted-foreground text-xs flex items-center gap-1.5">
                                                pays {toName}
                                                {isGuestMember?.(group.toMemberId) && <GuestTag />}
                                            </div>
                                        </div>
                                    </div>
                                    {canSettle && onSettleAll && group.items.length > 1 && (
                                        <button
                                            onClick={() => onSettleAll(group.items)}
                                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold hover:opacity-90 transition-all active:scale-95"
                                        >
                                            Settle all
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1 pl-[52px]">
                                    {group.items.map((item) => (
                                        <div key={`${item.from.memberId}-${item.to.memberId}-${item.currency}`} className="flex items-center justify-between">
                                            <span className="font-bold text-base text-primary tabular-nums">{formatAmount(item.amount, item.currency)}</span>
                                            {canSettle && onSettle && (
                                                <button
                                                    onClick={() => onSettle(item)}
                                                    className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-full text-[10px] font-semibold transition-all active:scale-95"
                                                >
                                                    Record payment
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
