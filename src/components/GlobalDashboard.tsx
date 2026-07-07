import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { Users, ChevronRight, Plus } from 'lucide-react';
import { WelcomeView } from './dashboard/WelcomeView';
import { AddExpense } from './AddExpense';
import { Skeleton } from './ui/Skeleton';
import { isBalanceSettled } from '../lib/accounting';
import { formatAmount } from '../lib/currency';
import { useAppSelector } from '../store/hooks';
import { cn } from '../lib/utils';

export const GlobalDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { groups, balanceSummary, isLoading, switchGroup } = useGroup();
    const membersByGroupId = useAppSelector(state => state.groups.membersByGroupId);
    const [isAddingExpense, setIsAddingExpense] = useState(false);

    if (isLoading && groups.length === 0) {
        return (
            <div className="space-y-8 pb-12">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-14 w-64" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-12 w-40" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
        );
    }

    if (groups.length === 0) {
        return <WelcomeView />;
    }

    // Per-currency nets from the server-side summary (accounts for settlements)
    const currencyBalances = balanceSummary
        ? Object.entries(balanceSummary)
            .map(([currency, v]) => ({ currency, net: v.totalBalance, owed: v.totalOwed, owing: v.totalOwing }))
            .filter(b => !isBalanceSettled(b.net) || !isBalanceSettled(b.owed) || !isBalanceSettled(b.owing))
            .toSorted((a, b) => Math.abs(b.net) - Math.abs(a.net))
        : [];
    const primary = currencyBalances[0];
    const others = currencyBalances.slice(1);

    return (
        <div className="space-y-10 pb-12">
            {/* Hero balance */}
            <section>
                {primary && !isBalanceSettled(primary.net) ? (
                    <>
                        <p className="text-sm text-muted-foreground">{primary.net > 0 ? "You're owed" : 'You owe'}</p>
                        <p className={cn('text-5xl font-bold tabular-nums mt-1', primary.net > 0 ? 'text-positive' : 'text-negative')}>
                            {formatAmount(Math.abs(primary.net), primary.currency)}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">Your balance</p>
                        <p className="text-5xl font-bold mt-1">All settled</p>
                    </>
                )}
                {primary && (
                    <p className="text-sm text-muted-foreground mt-2 tabular-nums">
                        {formatAmount(primary.owed, primary.currency)} owed to you · {formatAmount(primary.owing, primary.currency)} you owe
                    </p>
                )}
                {others.map(b => (
                    <p key={b.currency} className={cn('text-sm mt-1 tabular-nums', b.net > 0 ? 'text-positive' : b.net < 0 ? 'text-negative' : 'text-muted-foreground')}>
                        {isBalanceSettled(b.net) ? `Settled in ${b.currency}` : `${b.net > 0 ? "you're owed" : 'you owe'} ${formatAmount(Math.abs(b.net), b.currency)}`}
                    </p>
                ))}

                <button
                    onClick={() => { setIsAddingExpense(true); }}
                    className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    Add expense
                </button>
            </section>

            {/* Group list — bordered rows, not cards */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold px-1">Your groups</h2>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    {groups.map(group => {
                        const memberCount = membersByGroupId[group.id]?.length;
                        return (
                            <button
                                key={group.id}
                                onClick={() => {
                                    switchGroup(group.id);
                                    void navigate(`/group/${group.id}/details`);
                                }}
                                className="w-full flex items-center gap-4 px-4 py-4 min-h-[44px] text-left border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{group.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {memberCount ? `${memberCount} member${memberCount === 1 ? '' : 's'}` : group.currency}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                            </button>
                        );
                    })}
                </div>
            </section>

            {isAddingExpense && <AddExpense onClose={() => { setIsAddingExpense(false); }} />}
        </div>
    );
};
