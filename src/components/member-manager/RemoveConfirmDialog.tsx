import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { formatAmount } from '../../lib/currency';

interface RemoveConfirmDialogProps {
    isOpen: boolean;
    memberName: string;
    balances: Array<{ currency: string; balance: number }>;
    onConfirm: (mode: 'redistribute') => void;
    onCancel: () => void;
}

export function RemoveConfirmDialog({ isOpen, memberName, balances, onConfirm, onCancel }: RemoveConfirmDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-card w-full max-w-sm rounded-xl p-6 relative z-10 shadow-xl border border-border"
                    >
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            Unsettled Balance
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-bold text-foreground">{memberName}</span> has unsettled balances:
                        </p>
                        <div className="mb-4 space-y-1">
                            {balances.map(({ currency, balance }) => (
                                <div key={currency} className={cn("text-sm font-bold", balance > 0 ? "text-green-500" : "text-red-500")}>
                                    {balance > 0 ? '+' : ''}{formatAmount(Math.abs(balance), currency)}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mb-6 bg-secondary/50 p-3 rounded-lg">
                            Removing them now will leave the group's math incorrect unless you redistribute their expenses.
                        </p>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => { onConfirm('redistribute'); }}
                                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
                            >
                                Redistribute & Remove
                            </button>
                            <button
                                onClick={onCancel}
                                className="w-full bg-secondary text-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-secondary/80"
                            >
                                Cancel (Settle First)
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
