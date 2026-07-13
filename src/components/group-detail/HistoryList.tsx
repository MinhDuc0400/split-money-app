import React, { useMemo, useRef, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { EmptyState } from '../ui/EmptyState';
import type { HistoryTransaction } from '../../types/expense.types';

function groupTransactionsByMonth(items: HistoryTransaction[]): Record<string, HistoryTransaction[]> {
    const grouped: Record<string, HistoryTransaction[]> = {};
    items.forEach(item => {
        const date = new Date(item.date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!grouped[monthYear]) {
            grouped[monthYear] = [];
        }
        grouped[monthYear].push(item);
    });
    return grouped;
}

interface HistoryListProps {
    items: HistoryTransaction[];
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMoreError: string | null;
    onLoadMore: () => void;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onAddExpense?: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
    items,
    hasMore,
    isLoadingMore,
    loadMoreError,
    onLoadMore,
    currency,
    getMemberName,
    onEdit,
    onDelete,
    onAddExpense,
}) => {
    const sentinelRef = useRef<HTMLDivElement>(null);

    const groupedTransactions = useMemo(() => groupTransactionsByMonth(items), [items]);
    const months = Object.keys(groupedTransactions);

    useEffect(() => {
        if (!hasMore || isLoadingMore) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, onLoadMore]);

    if (!months.length && !isLoadingMore) {
        return (
            <div className="bg-card rounded-3xl border border-border/50">
                <EmptyState
                    icon={Receipt}
                    headline="No expenses yet"
                    body="Add the first expense and Money Split does the math for everyone."
                    actionLabel={onAddExpense ? 'Add expense' : undefined}
                    onAction={onAddExpense}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {months.map((month) => (
                <div key={month} className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2">
                        {month}
                    </h3>
                    <div className="space-y-2">
                        {groupedTransactions[month].map((item) => (
                            <HistoryItem
                                key={item.id}
                                expense={item}
                                currency={currency}
                                getMemberName={getMemberName}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div ref={sentinelRef} />

            {isLoadingMore && (
                <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {loadMoreError && !isLoadingMore && (
                <div className="flex justify-center py-4">
                    <button
                        onClick={onLoadMore}
                        className="text-sm text-destructive underline"
                    >
                        Failed to load — retry
                    </button>
                </div>
            )}
        </div>
    );
};
