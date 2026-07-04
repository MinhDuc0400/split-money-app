import React, { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { EmptyState } from '../ui/EmptyState';
import { groupExpensesByMonth } from '../../lib/accounting';
import type { Expense, TransactionHistoryMap, HistoryTransaction } from '../../types/expense.types';

interface HistoryListProps {
    expenses: Expense[];
    transactions?: TransactionHistoryMap;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onAddExpense?: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
    expenses,
    transactions,
    currency,
    getMemberName,
    onEdit,
    onDelete,
    onAddExpense,
}) => {
    const groupedTransactions = useMemo(() => {
        if (transactions && Object.keys(transactions).length > 0) {
            return transactions;
        }
        return groupExpensesByMonth(expenses);
    }, [expenses, transactions]);

    const months = Object.keys(groupedTransactions);

    if (!months.length && expenses.length === 0) {
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
                        {groupedTransactions[month].map((item: HistoryTransaction | Expense) => (
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
        </div>
    );
};
