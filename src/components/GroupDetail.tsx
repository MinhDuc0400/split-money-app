import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { ArrowLeft, Users } from 'lucide-react';
import { SplitType, type Expense } from '../types';
import { SettlementPlanList } from './group-detail/SettlementPlanList';
import { MemberBalancesList } from './group-detail/MemberBalancesList';
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
        groupBalances,
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
            <div className="bg-card/50 backdrop-blur-sm sticky top-0 z-30 -mx-4 px-4 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-secondary rounded-full transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{groupName}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase tracking-wider">{members.length} members</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-2 sm:px-0">
                    {activeGroup?.inviteCode && (
                        <InvitationBox inviteCode={activeGroup.inviteCode} />
                    )}
                </div>
            </div>

            {/* Main Content Splitwise-style */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Balances & Members */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Your Balance Summary - Compact */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <BalanceCard type="owed" balances={owedToYou} />
                        </div>
                        <div className="flex-1">
                            <BalanceCard type="owing" balances={youOwe} />
                        </div>
                    </div>

                    {/* Member Balances List (Splitwise style) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-lg">Group Balances</h3>
                            </div>
                        </div>

                        <MemberBalancesList members={members} serverBalances={groupBalances} />
                    </div>
                </div>

                {/* Right Column: Settlements */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
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
