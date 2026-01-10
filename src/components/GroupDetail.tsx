import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { ArrowLeft, Users } from 'lucide-react';
import { SplitType, type Expense } from '../types';
import { SettlementPlanList } from './group-detail/SettlementPlanList';
import { HistoryList } from './group-detail/HistoryList';
import { EditExpenseModal } from './group-detail/EditExpenseModal';
import { InvitationBox } from './group-detail/InvitationBox';
import { useBalanceCalculations } from './dashboard/useBalanceCalculations';
import { BalanceCard } from './dashboard/BalanceCard';

export function GroupDetail() {
    const navigate = useNavigate();
    const { id: routeId } = useParams<{ id: string }>();
    const {
        members,
        expenses,
        transactions,
        currentUserBalance,
        serverSettlements,
        settlements,
        balances,
        deleteExpense,
        updateExpense,
        currency,
        groupName,
        activeGroup,
        fetchGroupById
    } = useGroup();
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    // Fetch group details on mount or ID change
    useEffect(() => {
        if (routeId) {
            void fetchGroupById(routeId);
        }
    }, [routeId, fetchGroupById]);

    // Personal balance summary - Fetch from server if available, fallback to local calculation
    const localBalances = useBalanceCalculations({ balances });
    const { owedToYou, youOwe } = useMemo(() => {
        if (currentUserBalance && Object.keys(currentUserBalance.balances).length > 0) {
            const owed: Array<{ currency: string; amount: number }> = [];
            const owing: Array<{ currency: string; amount: number }> = [];

            Object.entries(currentUserBalance.balances).forEach(([curr, data]) => {
                if (data.totalOwed > 0.01) {
                    owed.push({ currency: curr, amount: data.totalOwed });
                }
                if (data.totalOwe > 0.01) {
                    owing.push({ currency: curr, amount: data.totalOwe });
                }
            });

            return { owedToYou: owed, youOwe: owing };
        }
        return localBalances;
    }, [currentUserBalance, localBalances]);

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

    const initialFormData = expenseToEdit ? {
        description: expenseToEdit.description,
        amount: expenseToEdit.amount,
        currency: expenseToEdit.currency || currency,
        payerId: expenseToEdit.payers?.[0]?.memberId,
        payers: expenseToEdit.payers,
        splitType: expenseToEdit.splitType,
        splits: expenseToEdit.splits,
        manualAmounts: expenseToEdit.splitType === SplitType.EXACT
            ? expenseToEdit.splits.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.memberId]: (s.amount ?? 0).toString() }), {})
            : {}
    } : undefined;

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">{groupName}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">{members.length} members</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balances & Settlement Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-3xl p-6 border border-border/50">
                        <h3 className="text-lg font-bold mb-6">Your Status</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <BalanceCard type="owed" balances={owedToYou} />
                            <BalanceCard type="owing" balances={youOwe} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h3 className="font-bold">Members</h3>
                            </div>
                            <div className="flex -space-x-2 overflow-hidden px-2">
                                {members.slice(0, 5).map((member, i) => (
                                    <div key={member.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-background bg-secondary overflow-hidden" style={{ zIndex: 10 - i }}>
                                        <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                                    </div>
                                ))}
                                {members.length > 5 && (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-medium ring-2 ring-background">
                                        +{members.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>

                        {activeGroup?.inviteCode && (
                            <InvitationBox inviteCode={activeGroup.inviteCode} />
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <SettlementPlanList
                        settlements={serverSettlements?.length > 0 ? serverSettlements : settlements.map(s => ({
                            from: { memberId: s.from, name: '', avatarUrl: '' },
                            to: { memberId: s.to, name: '', avatarUrl: '' },
                            amount: s.amount,
                            currency: s.currency
                        }))}
                        getMemberName={getMemberName}
                        getMemberAvatar={getMemberAvatar}
                    />
                </div>
            </div>

            {/* History Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold italic tracking-tight">Payment History</h2>
                </div>

                <HistoryList
                    expenses={expenses}
                    transactions={transactions}
                    currency={currency}
                    getMemberName={getMemberName}
                    onEdit={handleEditClick}
                    onDelete={deleteExpense}
                />
            </div>

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
