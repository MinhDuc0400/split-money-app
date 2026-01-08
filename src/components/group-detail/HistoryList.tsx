import React, { useMemo } from 'react';
import { HistoryItem } from './HistoryItem';
import { groupExpensesByMonth } from '../../lib/accounting';
import type { Expense } from '../../types';

interface HistoryListProps {
    expenses: Expense[];
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
    expenses,
    currency,
    getMemberName,
    onEdit,
    onDelete,
}) => {
    const groupedExpenses = useMemo(() => groupExpensesByMonth(expenses), [expenses]);
    const months = Object.keys(groupedExpenses);

    if (expenses.length === 0) {
        return (
            <div className="bg-card rounded-3xl border border-border/50 p-12 text-center">
                <p className="text-muted-foreground">No history yet. Add an expense to get started!</p>
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
                        {groupedExpenses[month].map((expense) => (
                            <HistoryItem
                                key={expense.id}
                                expense={expense}
                                currency={currency}
                                getMemberName={getMemberName}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
