import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';
import { getMemberColor } from '../../lib/memberColors';
import type { PersonSpending } from '../../types/expense.types';

interface SpendingByPersonCardProps {
    data: PersonSpending[] | null;
    currency: string;
    metric: 'paid' | 'share';
    onMetricChange: (metric: 'paid' | 'share') => void;
    isLoading: boolean;
    error?: string | null;
}

export function SpendingByPersonCard({ data, currency, metric, onMetricChange, isLoading, error }: SpendingByPersonCardProps) {
    const chartData = (data ?? []).filter((d) => d.totalCents > 0);
    const total = chartData.reduce((sum, d) => sum + d.totalCents, 0);

    return (
        <SummaryCard title="Spending by Person">
            <div className="flex gap-1 mb-4 bg-secondary/50 rounded-full p-1 w-fit">
                <button
                    type="button"
                    onClick={() => onMetricChange('paid')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${metric === 'paid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                    Paid
                </button>
                <button
                    type="button"
                    onClick={() => onMetricChange('share')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${metric === 'share' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                    Share
                </button>
            </div>
            {isLoading ? (
                <div className="h-48 rounded-xl bg-muted animate-pulse" />
            ) : error ? (
                <p className="text-sm text-destructive py-8 text-center">Couldn't load spending by person</p>
            ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this period</p>
            ) : (
                <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="totalCents"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                            >
                                {chartData.map((d) => (
                                    <Cell key={d.memberId} fill={getMemberColor(d.memberId)} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [
                                    formatAmount((value as number) / 100, currency),
                                    name as string,
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                        {chartData.map((d) => {
                            const pct = total > 0 ? Math.round((d.totalCents / total) * 100) : 0;
                            return (
                                <div key={d.memberId} className="flex items-center gap-2 text-xs">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: getMemberColor(d.memberId) }}
                                    />
                                    <span className="flex-1 truncate">{d.name}</span>
                                    <span className="font-bold tabular-nums">{formatAmount(d.totalCents / 100, currency)}</span>
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
