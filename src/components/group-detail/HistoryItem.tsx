import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { formatAmount } from '../../lib/currency';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/expenseCategories';
import { type Expense, type HistoryTransaction, type Payer, type Split } from '../../types/expense.types';


interface HistoryItemProps {
    expense: Expense | HistoryTransaction;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

const isHistoryTransaction = (item: Expense | HistoryTransaction): item is HistoryTransaction => {
    return 'type' in item;
};

export const HistoryItem: React.FC<HistoryItemProps> = ({
    expense,
    currency,
    getMemberName,
    onEdit,
    onDelete,
}) => {
    const isHistory = isHistoryTransaction(expense);
    const isSettlement = isHistory && expense.type === 'SETTLEMENT';
    const isRepayment = isSettlement ||
        expense.description.toLowerCase().includes('repayment') ||
        expense.description.toLowerCase().includes('settled');

    // Settlements use from/to directly — expenses use payers/splits
    const displayPayer = isSettlement && isHistory && expense.from
        ? expense.from.name
        : (() => {
            const payerNames = expense.payers && expense.payers.length > 0
                ? expense.payers.map((p: Payer | { name: string; memberId: string }) => ('name' in p ? p.name : getMemberName(p.memberId)))
                : [getMemberName(isHistory ? (expense.payerId ?? '') : '')];
            return payerNames.length > 2
                ? `${payerNames.slice(0, 2).join(', ')} and ${payerNames.length - 2} more`
                : payerNames.join(' & ');
        })();

    const receivers: string[] = isSettlement && isHistory && expense.to
        ? [expense.to.name]
        : (() => {
            const payerIds = new Set(expense.payers?.map((p: Payer | { memberId: string }) => p.memberId) || (isHistory ? [expense.payerId] : []));
            const splits = (!isHistory && expense.splits) || [];
            return (splits as Split[])
                .filter((s: Split) => !payerIds.has(s.memberId) && (s.amount ?? 0) > 0)
                .map((s: Split) => getMemberName(s.memberId));
        })();

    // Fallback date handling
    const displayDate = !isHistory
        ? new Date(expense.createdAt)
        : (expense.date ? new Date(expense.date) : new Date());

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center justify-between p-4 bg-card hover:bg-secondary/30 rounded-2xl border border-border/50 transition-all"
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRepayment ? 'bg-positive/10 text-positive' : 'bg-primary/10 text-primary'}`}>
                    {isRepayment ? <ArrowRight className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>

                <div>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                        {expense.description}
                        {!isSettlement && expense.category && (
                            <span
                                title={CATEGORY_LABELS[expense.category]}
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-secondary text-muted-foreground shrink-0"
                            >
                                {(() => {
                                    const CategoryIcon = CATEGORY_ICONS[expense.category];
                                    return <CategoryIcon className="w-2.5 h-2.5" />;
                                })()}
                            </span>
                        )}
                    </p>
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
                    <p className="text-[10px] text-muted-foreground">{displayDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
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
