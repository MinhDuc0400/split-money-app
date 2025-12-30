import { Receipt, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatAmount } from '../../lib/currency';
import { SplitType, type Expense } from '../../types';

interface ExpenseListItemProps {
    expense: Expense;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    inferSplitType: (expense: Expense) => 'Equal' | 'Exact' | 'Custom';
}

export function ExpenseListItem({ expense, currency, getMemberName, onEdit, onDelete, inferSplitType }: ExpenseListItemProps) {
    const getSplitTypeLabel = () => {
        if (expense.splitType === SplitType.EVEN) return 'Equal';
        if (expense.splitType === SplitType.EXACT) return 'Exact';
        if (expense.splitType === SplitType.PERCENTAGE) return 'Percent';
        if (expense.splitType === SplitType.SHARES) return 'Shares';
        return inferSplitType(expense);
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
            transition={{ duration: 0.2 }}
            className="group p-4 rounded-xl hover:bg-secondary/40 transition-all border border-transparent hover:border-border/50 flex items-center justify-between overflow-hidden"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Receipt className="w-6 h-6" />
                </div>
                <div>
                    <p className="font-semibold text-base line-clamp-1">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{getMemberName(expense.payerId)}</span> paid {formatAmount(expense.amount, expense.currency || currency)}
                        </p>
                        {/* Split type badge */}
                        <span
                            className="text-[10px] uppercase tracking-wide bg-secondary text-muted-foreground px-2 py-0.5 rounded-md"
                            aria-label={`Split type: ${getSplitTypeLabel()}`}
                        >
                            {getSplitTypeLabel()}
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-right flex items-center gap-4">
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                    {new Date(expense.createdAt).toLocaleDateString()}
                </span>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                        onClick={() => { onEdit(expense.id); }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                        aria-label="Edit expense"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { onDelete(expense.id); }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        aria-label="Delete expense"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
