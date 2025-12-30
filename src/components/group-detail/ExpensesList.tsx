import { AnimatePresence } from 'framer-motion';
import { ExpenseListItem } from './ExpenseListItem';
import type { Expense } from '../../types';

interface ExpensesListProps {
    expenses: Expense[];
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    inferSplitType: (expense: Expense) => 'Equal' | 'Exact' | 'Custom';
}

export function ExpensesList({ expenses, currency, getMemberName, onEdit, onDelete, inferSplitType }: ExpensesListProps) {
    return (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">All Expenses</h3>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2">
                {expenses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        No expenses yet. Tap <span className="font-bold">+</span> to add one.
                    </div>
                ) : (
                    <AnimatePresence>
                        {expenses.slice().reverse().map((expense) => (
                            <ExpenseListItem
                                key={expense.id}
                                expense={expense}
                                currency={currency}
                                getMemberName={getMemberName}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                inferSplitType={inferSplitType}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
