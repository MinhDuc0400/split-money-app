import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/expenseCategories';
import { capChartSlices } from '../../lib/chartSlices';
import type { CategorySpending, ExpenseCategory } from '../../types/expense.types';

interface SpendingByCategoryCardProps {
    data: CategorySpending[] | null;
    currency: string;
    isLoading: boolean;
    error?: string | null;
}

interface ChartDatum {
    category: ExpenseCategory;
    amount: number;
}

export function SpendingByCategoryCard({ data, currency, isLoading, error }: SpendingByCategoryCardProps) {
    const chartData: ChartDatum[] = CATEGORY_ORDER.map((category) => {
        const entry = data?.find((d) => d.category === category);
        return entry && entry.totalCents > 0 ? { category, amount: entry.totalCents / 100 } : null;
    }).filter((d): d is ChartDatum => d !== null);

    const cappedData = capChartSlices(chartData.map((d) => ({ key: d.category, amount: d.amount })));

    return (
        <SummaryCard title="Spending by Category">
            {isLoading ? (
                <div className="h-48 rounded-xl bg-muted animate-pulse" />
            ) : error ? (
                <p className="text-sm text-destructive py-8 text-center">Couldn't load spending breakdown</p>
            ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this period</p>
            ) : (
                <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={cappedData}
                                dataKey="amount"
                                nameKey="key"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                            >
                                {cappedData.map((d) => (
                                    <Cell
                                        key={d.key}
                                        fill={d.isOther ? '#94a3b8' : CATEGORY_COLORS[d.key as ExpenseCategory]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [
                                    formatAmount(value as number, currency),
                                    name === 'other' ? 'Other' : CATEGORY_LABELS[name as ExpenseCategory],
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                        {chartData.map((d) => {
                            const Icon = CATEGORY_ICONS[d.category];
                            const total = chartData.reduce((sum, c) => sum + c.amount, 0);
                            const pct = total > 0 ? Math.round((d.amount / total) * 100) : 0;
                            return (
                                <div key={d.category} className="flex items-center gap-2 text-xs">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: CATEGORY_COLORS[d.category] }}
                                    />
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="flex-1 truncate">{CATEGORY_LABELS[d.category]}</span>
                                    <span className="font-bold tabular-nums">{formatAmount(d.amount, currency)}</span>
                                    <span className="text-muted-foreground tabular-nums">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </SummaryCard>
    );
}
