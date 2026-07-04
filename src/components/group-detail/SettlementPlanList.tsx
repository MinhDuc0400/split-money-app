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
    currentMemberId?: string;
    isGuestMember?: (id: string) => boolean;
}

export function SettlementPlanList({ settlements, getMemberName, getMemberAvatar, onSettle, currentMemberId, isGuestMember }: SettlementPlanListProps) {
    return (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span>Settlement Plan</span>
                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Optimized</span>
            </h3>
            <div className="space-y-4">
                {settlements.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl px-6">
                        <p className="font-medium">Everyone is settled up</p>
                        <p className="text-sm text-muted-foreground mt-1">New expenses will show who pays whom.</p>
                    </div>
                ) : (
                    settlements.map((tx, idx) => {
                        const fromName = tx.from.name || getMemberName(tx.from.memberId);
                        const toName = tx.to.name || getMemberName(tx.to.memberId);
                        const fromAvatar = tx.from.avatarUrl || getMemberAvatar(tx.from.memberId);

                        return (
                            <motion.div
                                key={`${tx.from.memberId}-${tx.to.memberId}-${tx.amount}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar name={fromName} src={fromAvatar} />
                                    <div className="text-sm">
                                        <div className="font-semibold flex items-center gap-2">
                                            {fromName}
                                            {isGuestMember?.(tx.from.memberId) && <GuestTag />}
                                        </div>
                                        <div className="text-muted-foreground text-xs flex items-center gap-1.5">
                                            pays {toName}
                                            {isGuestMember?.(tx.to.memberId) && <GuestTag />}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="font-bold text-lg text-primary tabular-nums">{formatAmount(tx.amount, tx.currency)}</div>
                                    {onSettle && currentMemberId === tx.from.memberId && (
                                        <button
                                            onClick={() => onSettle(tx)}
                                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-full text-xs font-semibold transition-all active:scale-95"
                                        >
                                            Record payment
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
