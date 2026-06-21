import { useNavigate, useParams } from 'react-router-dom';
import { useGroupEvents } from '../hooks/useGroupEvents';
import { useGroup } from '../context/GroupContext';
import { TotalSpentCard } from './dashboard/TotalSpentCard';
import { BalanceCard } from './dashboard/BalanceCard';
import { GroupDetailsCard } from './dashboard/GroupDetailsCard';
import { QuickStatsCard } from './dashboard/QuickStatsCard';
import { useBalanceCalculations } from './dashboard/useBalanceCalculations';
import { WelcomeView } from './dashboard/WelcomeView';
import { useEffect } from 'react';

export function Dashboard() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    useGroupEvents(id ?? '');
    const { groups, members, expenses, balances, currency, groupName, isLoading, error, activeGroupId, switchGroup } = useGroup();
    const { owedToYou, youOwe } = useBalanceCalculations({ balances });

    // Sync active group with URL
    useEffect(() => {
        if (id && id !== activeGroupId) {
            switchGroup(id);
        }
    }, [id, activeGroupId, switchGroup]);

    const groupExists = groups.some(g => g.id === id);

    if (id && !groupExists && !isLoading) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-2">Group Not Found</h2>
                <p className="text-muted-foreground mb-6">The group you're looking for doesn't exist or you don't have access.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold"
                >
                    Back to Overview
                </button>
            </div>
        );
    }

    if (!isLoading && groups.length === 0) {
        return <WelcomeView />;
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
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl p-6 border border-border/50">
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
