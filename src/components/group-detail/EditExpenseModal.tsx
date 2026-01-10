import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpenseForm } from '../ExpenseForm';
import type { SplitType, Split, Payer, CreateExpenseRequest } from '../../types';

interface EditExpenseModalProps {
    isOpen: boolean;
    initialData?: {
        description: string;
        amount: number;
        currency: string;
        payerId?: string;
        payers?: Payer[];
        splitType: SplitType;
        splits: Split[];
        manualAmounts: Record<string, string>;
    };
    onClose: () => void;
    onSubmit: (data: CreateExpenseRequest) => void;
}

export function EditExpenseModal({ isOpen, initialData, onClose, onSubmit }: EditExpenseModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Edit Expense</h2>
                            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transaction-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <ExpenseForm
                            initialData={initialData}
                            onSubmit={onSubmit}
                            submitLabel="Update Expense"
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
