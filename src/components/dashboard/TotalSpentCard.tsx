import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';
import type { Expense } from '../../types/expense.types';

interface TotalSpentCardProps {
    expenses: Expense[];
    currency: string;
}

export function TotalSpentCard({ expenses, currency }: TotalSpentCardProps) {
    // Calculate total spent per currency
    const totalSpentByCurrency = expenses.reduce<Record<string, number>>((acc, e) => {
        const curr = e.currency || currency;
        acc[curr] = (acc[curr] || 0) + e.amount;
        return acc;
    }, {});

    return (
        <SummaryCard title="Total Spent">
            <div className="space-y-1">
                {Object.keys(totalSpentByCurrency).length === 0 ? (
                    <p className="text-2xl font-bold text-muted-foreground">--</p>
                ) : (
                    Object.entries(totalSpentByCurrency).map(([curr, amount]) => (
                        <p key={curr} className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            {formatAmount(amount, curr)}
                        </p>
                    ))
                )}
            </div>
        </SummaryCard>
    );
}
