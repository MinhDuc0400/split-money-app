import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/expenseCategories';
import type { CategorySpending, ExpenseCategory } from '../../types/expense.types';

interface SpendingByCategoryCardProps {
    data: CategorySpending[] | null;
    currency: string;
    isLoading: boolean;
}

interface ChartDatum {
    category: ExpenseCategory;
    amount: number;
}

export function SpendingByCategoryCard({ data, currency, isLoading }: SpendingByCategoryCardProps) {
    const chartData: ChartDatum[] = CATEGORY_ORDER.map((category) => {
        const entry = data?.find((d) => d.category === category);
        return entry && entry.totalCents > 0 ? { category, amount: entry.totalCents / 100 } : null;
    }).filter((d): d is ChartDatum => d !== null);

    return (
        <SummaryCard title="Spending by Category">
            {isLoading ? (
                <div className="h-48 rounded-xl bg-muted animate-pulse" />
            ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this period</p>
            ) : (
                <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="amount"
                                nameKey="category"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                            >
                                {chartData.map((d) => (
                                    <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [
                                    formatAmount(value as number, currency),
                                    CATEGORY_LABELS[name as ExpenseCategory],
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                        {chartData.map((d) => {
                            const Icon = CATEGORY_ICONS[d.category];
                            return (
                                <div key={d.category} className="flex items-center gap-2 text-xs">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: CATEGORY_COLORS[d.category] }}
                                    />
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="flex-1 truncate">{CATEGORY_LABELS[d.category]}</span>
                                    <span className="font-bold tabular-nums">{formatAmount(d.amount, currency)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </SummaryCard>
    );
}
