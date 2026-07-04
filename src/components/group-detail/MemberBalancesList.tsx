import { cn } from '../../lib/utils';
import { formatAmount } from '../../lib/currency';
import { isBalanceSettled } from '../../lib/accounting';
import type { Member } from '../../types/member.types';
import type { GroupBalancesResponse } from '../../types/group.types';
import { Avatar } from '../Avatar';
import { GuestTag } from '../GuestTag';

interface MemberBalancesListProps {
    members: Member[];
    serverBalances: GroupBalancesResponse | null;
}

export function MemberBalancesList({ members, serverBalances }: MemberBalancesListProps) {
    return (
        <div className="bg-card border border-border/50 rounded-3xl overflow-hidden divide-y divide-border/30 shadow-sm">
            {members.map((member) => {
                // Get all balances for this member across currencies from server data
                const memberCurrencyBalances: Array<{ currency: string; balance: number }> = [];

                if (serverBalances) {
                    Object.entries(serverBalances).forEach(([curr, balanceList]) => {
                        const mBalance = balanceList.find(b => b.memberId === member.id);
                        if (mBalance && !isBalanceSettled(mBalance.balance)) {
                            memberCurrencyBalances.push({ currency: curr, balance: mBalance.balance });
                        }
                    });
                }

                return (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-4">
                            <Avatar name={member.name} src={member.avatar} className="w-12 h-12 ring-2 ring-border/20" />
                            <div>
                                <p className="font-bold text-foreground flex items-center gap-2">{member.name}{member.isGuest && <GuestTag />}</p>
                                {memberCurrencyBalances.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">Settled up</p>
                                )}
                            </div>
                        </div>

                        <div className="text-right">
                            {memberCurrencyBalances.map(({ currency: curr, balance }) => (
                                <div
                                    key={curr}
                                    className={cn(
                                        "text-sm font-bold tabular-nums",
                                        balance > 0 ? "text-positive" : "text-negative"
                                    )}
                                >
                                    {balance > 0 ? 'gets back ' : 'owes '}
                                    {formatAmount(Math.abs(balance), curr)}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
