import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { TotalSpentCard } from './dashboard/TotalSpentCard';
import { BalanceCard } from './dashboard/BalanceCard';
import { GroupDetailsCard } from './dashboard/GroupDetailsCard';
import { QuickStatsCard } from './dashboard/QuickStatsCard';
import { useBalanceCalculations } from './dashboard/useBalanceCalculations';

export function Dashboard() {
    const navigate = useNavigate();
    const { members, expenses, balances, currency, groupName, isLoading, error } = useGroup();
    const { owedToYou, youOwe } = useBalanceCalculations({ balances });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground animate-pulse">Loading group data...</p>
            </div>
        );
    }

    if (error && members.length === 0) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center">
                <p className="text-destructive font-medium mb-2">Error loading data</p>
                <p className="text-sm text-muted-foreground">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Group Summary Header */}
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/5 rounded-2xl p-6 border border-border/50">
                <h2 className="text-2xl font-bold mb-2">{groupName}</h2>
                <p className="text-muted-foreground text-sm">Quick Summary</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TotalSpentCard expenses={expenses} currency={currency} />
                <BalanceCard type="owed" balances={owedToYou} delay={0.1} />
                <BalanceCard type="owing" balances={youOwe} delay={0.2} />
            </div>

            {/* Group Details Card */}
            <GroupDetailsCard
                members={members}
                expenseCount={expenses.length}
                onViewDetails={() => {
                    void navigate('/group');
                }}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <QuickStatsCard label="Active Members" value={members.length} />
                <QuickStatsCard label="Total Expenses" value={expenses.length} />
            </div>
        </div>
    );
}
