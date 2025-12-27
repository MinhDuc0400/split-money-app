import { X } from 'lucide-react';
import { useGroup } from '../context/GroupContext';
import { motion } from 'framer-motion';
import { ExpenseForm } from './ExpenseForm';

interface AddExpenseProps {
    onClose: () => void;
}

export function AddExpense({ onClose }: AddExpenseProps) {
    const { addExpense } = useGroup();

    const handleSubmit = (data: any) => {
        addExpense({
            ...data,
            date: new Date().toISOString(),
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">New Expense</h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transaction-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <ExpenseForm onSubmit={handleSubmit} />
            </motion.div>
        </div>
    );
}
