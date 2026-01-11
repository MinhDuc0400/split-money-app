import { cn } from '../../lib/utils';
import { formatAmount } from '../../lib/currency';
import type { Member } from '../../types';
import type { GroupBalancesResponse } from '../../types/group.types';

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
                        if (mBalance && Math.abs(mBalance.balance) > 0.01) {
                            memberCurrencyBalances.push({ currency: curr, balance: mBalance.balance });
                        }
                    });
                }

                return (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full ring-2 ring-border/20 bg-secondary overflow-hidden shrink-0">
                                <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">{member.name}</p>
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
                                        "text-sm font-bold",
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
