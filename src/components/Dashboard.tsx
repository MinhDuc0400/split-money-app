import { useState } from 'react';
import { useGroup } from '../context/GroupContext';
import { Receipt, Trash2, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpenseForm } from './ExpenseForm';
import { SplitType } from '../types';

export function Dashboard() {
    const { members, expenses, settlements, deleteExpense, updateExpense } = useGroup();
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';
    const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar;

    const handleEditClick = (id: string) => {
        setEditingExpenseId(id);
    };

    const handleUpdateExpense = (data: any) => {
        if (editingExpenseId) {
            updateExpense(editingExpenseId, data);
            setEditingExpenseId(null);
        }
    };

    const expenseToEdit = expenses.find(e => e.id === editingExpenseId);

    // Prepare initial data for form
    const initialFormData = expenseToEdit ? {
        description: expenseToEdit.description,
        amount: expenseToEdit.amount,
        payerId: expenseToEdit.payerId,
        splitType: expenseToEdit.splitType,
        splits: expenseToEdit.splits,
        manualAmounts: expenseToEdit.splitType === SplitType.UNEVEN
            ? expenseToEdit.splits.reduce((acc, s) => ({ ...acc, [s.memberId]: s.amount.toString() }), {} as Record<string, string>)
            : {}
    } : undefined;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border/50">
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Total Spent</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        ${totalSpent.toFixed(2)}
                    </p>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border/50">
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Active Members</p>
                    <div className="flex -space-x-3 mt-1">
                        {members.slice(0, 5).map(m => (
                            <div key={m.id} className="w-10 h-10 rounded-full border-2 border-card overflow-hidden">
                                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {members.length > 5 && (
                            <div className="w-10 h-10 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                                +{members.length - 5}
                            </div>
                        )}
                        {members.length === 0 && <span className="text-muted-foreground text-sm">--</span>}
                    </div>
                </div>

                {/* Placeholder for future stats */}
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border/50 hidden md:block">
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Your Share</p>
                    <p className="text-xl font-semibold text-muted-foreground">--</p>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border/50 hidden md:block">
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Expenses</p>
                    <p className="text-xl font-semibold">{expenses.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Settlements (Who owes Who) */}
                <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <span>Settlement Plan</span>
                        <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Optimized</span>
                    </h3>
                    <div className="space-y-4">
                        {settlements.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl">
                                <p className="text-muted-foreground">No debts found. Everyone is settled up!</p>
                            </div>
                        ) : (
                            settlements.map((tx, idx) => (
                                <motion.div
                                    key={`${tx.from}-${tx.to}-${tx.amount}`} // Using a composite key as settlements are re-calculated on every render and idx is removed
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                                            <img src={getMemberAvatar(tx.from)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-semibold">{getMemberName(tx.from)}</div>
                                            <div className="text-muted-foreground text-xs">pays {getMemberName(tx.to)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-primary">${tx.amount.toFixed(2)}</div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                        {expenses.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No expenses yet. Tap <span className="font-bold">+</span> to add one.
                            </div>
                        ) : (
                            <AnimatePresence>
                                {expenses.slice().reverse().map((expense) => (
                                    <motion.div
                                        key={expense.id}
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
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    <span className="font-medium text-foreground">{getMemberName(expense.payerId)}</span> paid ${expense.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">{new Date(expense.createdAt).toLocaleDateString()}</span>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleEditClick(expense.id)}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                                    aria-label="Edit expense"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteExpense(expense.id)}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                    aria-label="Delete expense"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingExpenseId && initialFormData && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingExpenseId(null)} />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Edit Expense</h2>
                                <button onClick={() => setEditingExpenseId(null)} className="p-2 hover:bg-secondary rounded-full transaction-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <ExpenseForm
                                initialData={initialFormData}
                                onSubmit={handleUpdateExpense}
                                submitLabel="Update Expense"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
