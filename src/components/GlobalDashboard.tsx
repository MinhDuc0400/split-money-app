import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { BalanceCard } from './dashboard/BalanceCard';
import { motion } from 'framer-motion';
import { Users, ChevronRight } from 'lucide-react';
import { WelcomeView } from './dashboard/WelcomeView';
import { isBalanceSettled } from '../lib/accounting';

export const GlobalDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { groups, balanceSummary, isLoading, switchGroup } = useGroup();

    // Derive owed/owing from server-side balance summary (accounts for settlements)
    const owedToYou = balanceSummary
        ? Object.entries(balanceSummary)
            .filter(([, v]) => !isBalanceSettled(v.totalOwed))
            .map(([currency, v]) => ({ currency, amount: v.totalOwed }))
        : [];
    const youOwe = balanceSummary
        ? Object.entries(balanceSummary)
            .filter(([, v]) => !isBalanceSettled(v.totalOwing))
            .map(([currency, v]) => ({ currency, amount: v.totalOwing }))
        : [];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground animate-pulse">Loading overview...</p>
            </div>
        );
    }

    if (groups.length === 0) {
        return <WelcomeView />;
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Aggregate Summary */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-3xl p-8 border border-border/50">
                <h1 className="text-3xl font-bold mb-2">Overall Summary</h1>
                <p className="text-muted-foreground">Combined status across {groups.length} group{groups.length > 1 ? 's' : ''}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <BalanceCard type="owed" balances={owedToYou} />
                    <BalanceCard type="owing" balances={youOwe} delay={0.1} />
                </div>
            </div>

            {/* Groups List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold">Your Groups</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group, index) => (
                        <motion.button
                            key={group.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.01, y: -2 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => {
                                switchGroup(group.id);
                                void navigate(`/group/${group.id}/details`);
                            }}
                            className="flex items-center p-5 bg-card border border-border rounded-2xl text-left hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mr-4">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg truncate">{group.name}</h3>
                                <p className="text-sm text-muted-foreground">Default: {group.currency}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 ml-4" />
                        </motion.button>
                    ))}

                    {/* Simplified Quick Actions that leverage the root route's WelcomeView logic if needed, or we could trigger the GroupSelector modals */}
                    <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 mt-4 text-center">
                        <div className="bg-secondary/20 p-4 rounded-xl border border-border/50">
                            <p className="text-xs text-muted-foreground mb-2">Use the Group Selector (top/sidebar) to Create or Join groups</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
