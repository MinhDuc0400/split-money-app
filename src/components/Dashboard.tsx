import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatAmount } from '../lib/currency';
import { cn } from '../lib/utils';

export function Dashboard() {
    const navigate = useNavigate();
    const { members, expenses, balances, currency, groupName } = useGroup();

    // Calculate total spent per currency
    const totalSpentByCurrency = expenses.reduce((acc, e) => {
        const curr = e.currency || currency;
        acc[curr] = (acc[curr] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    // Calculate who owes you and who you owe (placeholder for now - would need user context)
    // For now, we'll show all positive and negative balances
    const owedToYou: Array<{ currency: string; amount: number }> = [];
    const youOwe: Array<{ currency: string; amount: number }> = [];

    // Aggregate balances across all members by currency
    Object.entries(balances).forEach(([curr, currencyBalances]) => {
        let totalPositive = 0;
        let totalNegative = 0;
        
        Object.values(currencyBalances).forEach(balance => {
            if (balance > 0.01) {
                totalPositive += balance;
            } else if (balance < -0.01) {
                totalNegative += Math.abs(balance);
            }
        });

        if (totalPositive > 0.01) {
            owedToYou.push({ currency: curr, amount: totalPositive });
        }
        if (totalNegative > 0.01) {
            youOwe.push({ currency: curr, amount: totalNegative });
        }
    });

    return (
        <div className="space-y-8">
            {/* Group Summary Header */}
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/5 rounded-2xl p-6 border border-border/50">
                <h2 className="text-2xl font-bold mb-2">{groupName}</h2>
                <p className="text-muted-foreground text-sm">Quick Summary</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Spent */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card p-6 rounded-xl shadow-sm border border-border/50"
                >
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-3">Total Spent</p>
                    <div className="space-y-1">
                        {Object.keys(totalSpentByCurrency).length === 0 ? (
                            <p className="text-2xl font-bold text-muted-foreground">--</p>
                        ) : (
                            Object.entries(totalSpentByCurrency).map(([curr, amount]) => (
                                <p key={curr} className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                    {formatAmount(amount, curr)}
                                </p>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* You Are Owed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card p-6 rounded-xl shadow-sm border border-border/50"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider">You Are Owed</p>
                    </div>
                    <div className="space-y-1">
                        {owedToYou.length === 0 ? (
                            <p className="text-xl font-semibold text-muted-foreground">--</p>
                        ) : (
                            owedToYou.map(({ currency: curr, amount }) => (
                                <p key={curr} className="text-xl font-bold text-green-500">
                                    {formatAmount(amount, curr)}
                                </p>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* You Owe */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card p-6 rounded-xl shadow-sm border border-border/50"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider">You Owe</p>
                    </div>
                    <div className="space-y-1">
                        {youOwe.length === 0 ? (
                            <p className="text-xl font-semibold text-muted-foreground">--</p>
                        ) : (
                            youOwe.map(({ currency: curr, amount }) => (
                                <p key={curr} className="text-xl font-bold text-red-500">
                                    {formatAmount(amount, curr)}
                                </p>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Group Details Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl border border-border/50 shadow-sm p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Group Details</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {members.length} {members.length === 1 ? 'member' : 'members'} · {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/group')}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Member Avatars Preview */}
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {members.slice(0, 5).map(m => (
                            <div key={m.id} className="w-10 h-10 rounded-full border-2 border-card overflow-hidden">
                                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {members.length > 5 && (
                            <div className="w-10 h-10 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                                +{members.length - 5}
                            </div>
                        )}
                        {members.length === 0 && (
                            <div className="text-muted-foreground text-sm">No members yet</div>
                        )}
                    </div>
                    {members.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {members.slice(0, 3).map(m => m.name).join(', ')}
                            {members.length > 3 && ` and ${members.length - 3} more`}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-xl border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Active Members</p>
                    <p className="text-2xl font-bold">{members.length}</p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold">{expenses.length}</p>
                </div>
            </div>
        </div>
    );
}
