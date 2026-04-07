import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { ArrowLeft, Users } from 'lucide-react';
import { SplitType, type Expense, type Split } from '../types/expense.types';
import { SettlementPlanList } from './group-detail/SettlementPlanList';
import { MemberBalancesList } from './group-detail/MemberBalancesList';
import { HistoryList } from './group-detail/HistoryList';
import { EditExpenseModal } from './group-detail/EditExpenseModal';
import { DeleteConfirmationModal } from './group-detail/DeleteConfirmationModal';
import { SettleUpModal } from './group-detail/SettleUpModal';
import { InvitationBox } from './group-detail/InvitationBox';
import { useBalanceCalculations } from './dashboard/useBalanceCalculations';
import { BalanceCard } from './dashboard/BalanceCard';
import { useAppSelector } from '../store/hooks';
import { type GroupSettlement } from '../types/group.types';

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
        fetchGroupById,
        settleUp
    } = useGroup();
    const authUser = useAppSelector(state => state.auth.user);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
    const [settlingPayment, setSettlingPayment] = useState<GroupSettlement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSettling, setIsSettling] = useState(false);

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

    const memberMap = useMemo(
        () => Object.fromEntries(members.map(m => [m.id, m])),
        [members]
    );
    const getMemberName = useCallback((id: string) => memberMap[id]?.name || 'Unknown', [memberMap]);
    const getMemberAvatar = useCallback((id: string) => memberMap[id]?.avatar, [memberMap]);

    const currentUserMember = useMemo(() => {
        if (!authUser || !members.length) return null;
        return members.find(m => m.userId === authUser.id);
    }, [authUser, members]);

    const handleEditClick = (id: string) => {
        setEditingExpenseId(id);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingExpenseId(id);
    };

    const handleConfirmDelete = async () => {
        if (deletingExpenseId) {
            setIsDeleting(true);
            try {
                await deleteExpense(deletingExpenseId);
                setDeletingExpenseId(null);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleSettleClick = (settlement: GroupSettlement) => {
        setSettlingPayment(settlement);
    };

    const handleConfirmSettle = async (amount: number, note: string) => {
        if (settlingPayment) {
            setIsSettling(true);
            try {
                await settleUp({
                    fromId: settlingPayment.from.memberId,
                    toId: settlingPayment.to.memberId,
                    amount,
                    currency: settlingPayment.currency,
                    note
                });
                setSettlingPayment(null);
            } finally {
                setIsSettling(false);
            }
        }
    };

    const handleUpdateExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
        if (editingExpenseId) {
            await updateExpense(editingExpenseId, data);
            setEditingExpenseId(null);
        }
    };

    const expenseToEdit = useMemo(() => {
        if (!editingExpenseId || !activeGroup?.expenses) return undefined;
        return activeGroup.expenses.find(e => e.id === editingExpenseId);
    }, [activeGroup?.expenses, editingExpenseId]);

    const initialFormData = useMemo(() => {
        if (!expenseToEdit) return undefined;


        const isHistory = 'type' in expenseToEdit;
        const payers = 'payers' in expenseToEdit ? expenseToEdit.payers : [];
        const splitType = 'splitType' in expenseToEdit ? (expenseToEdit.splitType as SplitType) : SplitType.EVEN;
        const splits = 'splits' in expenseToEdit ? (expenseToEdit.splits as Split[]) : [];

        return {
            description: expenseToEdit.description,
            amount: expenseToEdit.amount,
            currency: (expenseToEdit as any).currency || currency,
            payerId: payers.length > 0 ? (payers[0] as any).memberId : (isHistory ? (expenseToEdit as any).payerId : undefined),
            payers: payers as any[],
            splitType,
            splits,
            manualAmounts: splitType === SplitType.EXACT
                ? splits.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.memberId]: (s.amount ?? 0).toString() }), {})
                : {}
        };
    }, [expenseToEdit, currency]);

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
                        onSettle={handleSettleClick}
                        currentMemberId={currentUserMember?.id}
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
                    onDelete={handleDeleteClick}
                />
            </div>

            {/* Edit Modal */}
            <EditExpenseModal
                isOpen={!!editingExpenseId && !!initialFormData}
                initialData={initialFormData}
                onClose={() => { setEditingExpenseId(null); }}
                onSubmit={handleUpdateExpense}
            />

            <DeleteConfirmationModal
                isOpen={!!deletingExpenseId}
                onClose={() => setDeletingExpenseId(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
            />

            {settlingPayment && (
                <SettleUpModal
                    isOpen={!!settlingPayment}
                    onClose={() => setSettlingPayment(null)}
                    onConfirm={handleConfirmSettle}
                    fromMember={{
                        name: getMemberName(settlingPayment.from.memberId),
                        avatar: getMemberAvatar(settlingPayment.from.memberId)
                    }}
                    toMember={{
                        name: getMemberName(settlingPayment.to.memberId),
                        avatar: getMemberAvatar(settlingPayment.to.memberId)
                    }}
                    amount={settlingPayment.amount}
                    currency={settlingPayment.currency}
                    isLoading={isSettling}
                />
            )}
        </div>
    );
}
