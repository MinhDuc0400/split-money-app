import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';

interface BalanceCardProps {
    type: 'owed' | 'owing';
    balances: Array<{ currency: string; amount: number }>;
    delay?: number;
}

export const BalanceCard = React.memo(function BalanceCard({ type, balances, delay = 0 }: BalanceCardProps) {
    const isOwed = type === 'owed';
    const icon = isOwed ? <TrendingUp className="w-4 h-4 text-positive" /> : <TrendingDown className="w-4 h-4 text-negative" />;
    const title = isOwed ? 'You Are Owed' : 'You Owe';
    const colorClass = isOwed ? 'text-positive' : 'text-negative';

    return (
        <SummaryCard title={title} icon={icon} delay={delay}>
            <div className="space-y-1">
                {balances.length === 0 ? (
                    <p className="text-xl font-semibold text-muted-foreground">--</p>
                ) : (
                    balances.map(({ currency, amount }) => (
                        <p key={currency} className={`text-xl font-bold ${colorClass}`}>
                            {formatAmount(amount, currency)}
                        </p>
                    ))
                )}
            </div>
        </SummaryCard>
    );
});
