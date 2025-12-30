import { cn } from '../../lib/utils';
import { formatAmount } from '../../lib/currency';
import type { Member } from '../../types';

interface MemberBalancesListProps {
    members: Member[];
    balances: Record<string, Record<string, number>>;
}

export function MemberBalancesList({ members, balances }: MemberBalancesListProps) {
    return (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">Member Balances</h3>
            <div className="space-y-3">
                {members.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl">
                        <p className="text-muted-foreground">No members in this group yet.</p>
                    </div>
                ) : (
                    members.map((member) => {
                        // Get all balances for this member across currencies
                        const memberBalances = Object.entries(balances)
                            .map(([curr, currencyBalances]) => ({
                                currency: curr,
                                balance: currencyBalances[member.id] || 0
                            }))
                            .filter(({ balance }) => Math.abs(balance) > 0.01);

                        return (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{member.name}</div>
                                        {memberBalances.length === 0 && (
                                            <div className="text-xs text-muted-foreground">Settled up</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {memberBalances.length > 0 ? (
                                        memberBalances.map(({ currency: curr, balance }) => (
                                            <div key={curr} className={cn("font-bold", balance > 0 ? "text-green-500" : "text-red-500")}>
                                                {balance > 0 ? 'Gets back ' : 'Owes '}
                                                {formatAmount(Math.abs(balance), curr)}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground">✓</div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
