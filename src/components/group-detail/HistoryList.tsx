import React, { useMemo } from 'react';
import { HistoryItem } from './HistoryItem';
import { groupExpensesByMonth } from '../../lib/accounting';
import type { Expense, TransactionHistoryMap, HistoryTransaction } from '../../types/expense.types';

interface HistoryListProps {
    expenses: Expense[];
    transactions?: TransactionHistoryMap;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
    expenses,
    transactions,
    currency,
    getMemberName,
    onEdit,
    onDelete,
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
