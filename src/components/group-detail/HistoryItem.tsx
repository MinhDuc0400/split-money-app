import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { formatAmount } from '../../lib/currency';
import { type Expense } from '../../types';

interface HistoryItemProps {
    expense: Expense;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
    expense,
    currency,
    getMemberName,
    onEdit,
    onDelete,
}) => {
    const isRepayment = expense.description.toLowerCase().includes('repayment') || expense.description.toLowerCase().includes('settled');

    const payerNames = expense.payers?.length > 0
        ? expense.payers.map(p => getMemberName(p.memberId))
        : [getMemberName(expense.payerId || '')];

    const displayPayer = payerNames.length > 1
        ? (payerNames.length > 2 ? `${payerNames.slice(0, 2).join(', ')} and ${payerNames.length - 2} more` : payerNames.join(' & '))
        : payerNames[0];

    // For regular expenses, we might want to show who it was for
    const payerIds = new Set(expense.payers?.map(p => p.memberId) || [expense.payerId]);
    const receivers = expense.splits
        .filter(s => !payerIds.has(s.memberId) && (s.amount ?? 0) > 0)
        .map(s => getMemberName(s.memberId));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center justify-between p-4 bg-card hover:bg-secondary/30 rounded-2xl border border-border/50 transition-all"
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRepayment ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                    {isRepayment ? <ArrowRight className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>

                <div>
                    <p className="font-semibold text-sm">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">{displayPayer}</span>
                        {isRepayment ? ' paid ' : ' paid for '}
                        <span className="font-medium text-foreground">
                            {receivers.length > 0 ? (receivers.length > 2 ? `${receivers.slice(0, 2).join(', ')} and ${receivers.length - 2} more` : receivers.join(', ')) : 'themselves'}
                        </span>
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="font-bold text-sm">{formatAmount(expense.amount, expense.currency || currency)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(expense.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                        onClick={() => onEdit(expense.id)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(expense.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
