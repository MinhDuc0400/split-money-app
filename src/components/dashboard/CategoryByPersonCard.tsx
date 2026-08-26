import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/expenseCategories';
import type { PersonCategorySpending, ExpenseCategory } from '../../types/expense.types';

interface CategoryByPersonCardProps {
    data: PersonCategorySpending[] | null;
    currency: string;
    isLoading: boolean;
    error?: string | null;
}

interface PersonBarDatum {
    memberId: string;
    name: string;
    [category: string]: string | number;
}

function pivotByMember(data: PersonCategorySpending[]): PersonBarDatum[] {
    const byMember = new Map<string, PersonBarDatum>();
    for (const row of data) {
        const existing = byMember.get(row.memberId);
        const entry: PersonBarDatum = existing ?? {
            memberId: row.memberId,
            name: row.name,
            ...Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])),
        };
        entry[row.category] = row.totalCents / 100;
        byMember.set(row.memberId, entry);
    }
    return Array.from(byMember.values());
}

export function CategoryByPersonCard({ data, currency, isLoading, error }: CategoryByPersonCardProps) {
    const chartData = pivotByMember(data ?? []);

    return (
        <SummaryCard title="Category Breakdown per Person">
            {isLoading ? (
                <div className="h-56 rounded-xl bg-muted animate-pulse" />
            ) : error ? (
                <p className="text-sm text-destructive py-8 text-center">Couldn't load category breakdown</p>
            ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this period</p>
            ) : (
                <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value, name) => [
                                    formatAmount(value as number, currency),
                                    CATEGORY_LABELS[name as ExpenseCategory],
                                ]}
                            />
                            {CATEGORY_ORDER.map((category) => (
                                <Bar key={category} dataKey={category} stackId="a" fill={CATEGORY_COLORS[category]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                        {CATEGORY_ORDER.map((category) => {
                            const Icon = CATEGORY_ICONS[category];
                            return (
                                <div key={category} className="flex items-center gap-2 text-xs">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: CATEGORY_COLORS[category] }}
                                    />
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="flex-1 truncate">{CATEGORY_LABELS[category]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </SummaryCard>
    );
}
