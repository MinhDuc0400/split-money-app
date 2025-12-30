import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { SplitType, type Expense, type Split } from '../types';
import { SectionTabs } from './group-detail/SectionTabs';
import { MemberBalancesList } from './group-detail/MemberBalancesList';
import { SettlementPlanList } from './group-detail/SettlementPlanList';
import { ExpensesList } from './group-detail/ExpensesList';
import { EditExpenseModal } from './group-detail/EditExpenseModal';

// Helper: infer split type label from expense data when explicit type is unknown or custom
function inferSplitType(expense: Expense): 'Equal' | 'Exact' | 'Custom' {
    try {
        if (!expense || !Array.isArray(expense.splits) || expense.splits.length === 0) return 'Custom';
        const amounts = expense.splits.map((s: Split) => Number(s.amount ?? 0));
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

    const handleUpdateExpense = (data: Omit<Expense, 'id' | 'createdAt'>) => {
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
            ? expenseToEdit.splits.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.memberId]: s.amount.toString() }), {})
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
            <SectionTabs activeSection={activeSection} onSectionChange={setActiveSection} />

            {/* Members Section */}
            {activeSection === 'members' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <MemberBalancesList members={members} balances={balances} />
                    <SettlementPlanList 
                        settlements={settlements} 
                        getMemberName={getMemberName}
                        getMemberAvatar={getMemberAvatar}
                    />
                </motion.div>
            )}

            {/* Payments Section */}
            {activeSection === 'payments' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <ExpensesList
                        expenses={expenses}
                        currency={currency}
                        getMemberName={getMemberName}
                        onEdit={handleEditClick}
                        onDelete={deleteExpense}
                        inferSplitType={inferSplitType}
                    />
                </motion.div>
            )}

            {/* Edit Modal */}
            <EditExpenseModal
                isOpen={!!editingExpenseId && !!initialFormData}
                initialData={initialFormData}
                onClose={() => { setEditingExpenseId(null); }}
                onSubmit={handleUpdateExpense}
            />
        </div>
    );
}
