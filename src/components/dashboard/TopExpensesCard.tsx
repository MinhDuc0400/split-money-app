import { SummaryCard } from './SummaryCard';
import { formatAmount } from '../../lib/currency';
import { CATEGORY_ICONS } from '../../lib/expenseCategories';
import type { TopExpenseItem } from '../../types/expense.types';

interface TopExpensesCardProps {
    data: TopExpenseItem[] | null;
    currency: string;
    isLoading: boolean;
    error?: string | null;
    onSelect: (expenseId: string) => void;
}

export function TopExpensesCard({ data, currency, isLoading, error, onSelect }: TopExpensesCardProps) {
    return (
        <SummaryCard title="Top Expenses">
            {isLoading ? (
                <div className="h-48 rounded-xl bg-muted animate-pulse" />
            ) : error ? (
                <p className="text-sm text-destructive py-8 text-center">Couldn't load top expenses</p>
            ) : !data || data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet</p>
            ) : (
                <div>
                    {data.map((item, idx) => {
                        const Icon = CATEGORY_ICONS[item.category];
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelect(item.id)}
                                className="w-full flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 text-left hover:bg-secondary/40 transition-colors rounded-lg px-1 -mx-1"
                            >
                                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{item.description}</p>
                                    <p className="text-xs text-muted-foreground truncate">{item.payerNames.join(', ')}</p>
                                </div>
                                <span className="text-sm font-bold tabular-nums shrink-0">{formatAmount(item.amount, currency)}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </SummaryCard>
    );
}
