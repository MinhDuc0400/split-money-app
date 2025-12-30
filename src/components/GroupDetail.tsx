import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { Receipt, Trash2, Pencil, X, ArrowLeft, Users, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpenseForm } from './ExpenseForm';
import { SplitType } from '../types';
import { formatAmount } from '../lib/currency';
import { cn } from '../lib/utils';

// Helper: infer split type label from expense data when explicit type is unknown or custom
function inferSplitType(expense: any): 'Equal' | 'Exact' | 'Custom' {
    try {
        if (!expense || !Array.isArray(expense.splits) || expense.splits.length === 0) return 'Custom';
        const amounts = expense.splits.map((s: any) => Number(s.amount ?? 0));
        const total = amounts.reduce((a: number, b: number) => a + b, 0);
        if (total === 0) return 'Custom';
        const avg = total / amounts.length;
        const isEven = amounts.every((a: number) => Math.abs(a - avg) < 0.01);
        return isEven ? 'Equal' : 'Exact';
    } catch {
        return 'Custom';
    }
}

export function GroupDetail() {
    const navigate = useNavigate();
    const { members, expenses, settlements, balances, deleteExpense, updateExpense, currency, groupName } = useGroup();
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'members' | 'payments'>('members');

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
        currency: expenseToEdit.currency || currency,
        payerId: expenseToEdit.payerId,
        splitType: expenseToEdit.splitType,
        splits: expenseToEdit.splits,
        manualAmounts: expenseToEdit.splitType === SplitType.EXACT
            ? expenseToEdit.splits.reduce((acc, s) => ({ ...acc, [s.memberId]: s.amount.toString() }), {} as Record<string, string>)
            : {}
    } : undefined;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">{groupName}</h1>
                    <p className="text-sm text-muted-foreground">Group Details</p>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 bg-secondary/30 p-1 rounded-lg">
                <button
                    onClick={() => setActiveSection('members')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all font-medium text-sm",
                        activeSection === 'members' 
                            ? "bg-card shadow-sm text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Users className="w-4 h-4" />
                    Members
                </button>
                <button
                    onClick={() => setActiveSection('payments')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all font-medium text-sm",
                        activeSection === 'payments' 
                            ? "bg-card shadow-sm text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Wallet className="w-4 h-4" />
                    Payments
                </button>
            </div>

            {/* Members Section */}
            {activeSection === 'members' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Member Balances */}
                    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-6">Member Balances</h3>
                        <div className="space-y-3">
                            {members.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl">
                                    <p className="text-muted-foreground">No members in this group yet.</p>
                                </div>
                            ) : (
                                members.map((member) => {
                                    // Get all balances for this member across currencies
                                    const memberBalances = Object.entries(balances)
                                        .map(([curr, currencyBalances]) => ({
                                            currency: curr,
                                            balance: currencyBalances[member.id] || 0
                                        }))
                                        .filter(({ balance }) => Math.abs(balance) > 0.01);

                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{member.name}</div>
                                                    {memberBalances.length === 0 && (
                                                        <div className="text-xs text-muted-foreground">Settled up</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {memberBalances.length > 0 ? (
                                                    memberBalances.map(({ currency: curr, balance }) => (
                                                        <div key={curr} className={cn("font-bold", balance > 0 ? "text-green-500" : "text-red-500")}>
                                                            {balance > 0 ? 'Gets back ' : 'Owes '}
                                                            {formatAmount(Math.abs(balance), curr)}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-muted-foreground">✓</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Settlement Plan */}
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
                                        key={`${tx.from}-${tx.to}-${tx.amount}`}
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
                                            <div className="font-bold text-lg text-primary">{formatAmount(tx.amount, tx.currency)}</div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Payments Section */}
            {activeSection === 'payments' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Expenses List */}
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
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-medium text-foreground">{getMemberName(expense.payerId)}</span> paid {formatAmount(expense.amount, expense.currency || currency)}
                                                        </p>
                                                        {/* Split type badge */}
                                                        <span
                                                            className="text-[10px] uppercase tracking-wide bg-secondary text-muted-foreground px-2 py-0.5 rounded-md"
                                                            aria-label={`Split type: ${
                                                                expense.splitType === SplitType.EVEN ? 'Equal' :
                                                                expense.splitType === SplitType.EXACT ? 'Exact' :
                                                                expense.splitType === SplitType.PERCENTAGE ? 'Percent' :
                                                                expense.splitType === SplitType.SHARES ? 'Shares' : 'Custom'
                                                            }`}
                                                        >
                                                            {expense.splitType === SplitType.EVEN ? 'Equal' :
                                                             expense.splitType === SplitType.EXACT ? 'Exact' :
                                                             expense.splitType === SplitType.PERCENTAGE ? 'Percent' :
                                                             expense.splitType === SplitType.SHARES ? 'Shares' : inferSplitType(expense)}
                                                        </span>
                                                    </div>
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
                </motion.div>
            )}

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
