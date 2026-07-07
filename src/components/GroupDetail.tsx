import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { LogOut, Trash2 } from 'lucide-react';
import { useGroupEvents } from '../hooks/useGroupEvents';
import { ArrowLeft, Users } from 'lucide-react';
import { SplitType, type Expense, type Split } from '../types/expense.types';
import { SettlementPlanList } from './group-detail/SettlementPlanList';
import { MemberBalancesList } from './group-detail/MemberBalancesList';
import { HistoryList } from './group-detail/HistoryList';
import { EditExpenseModal } from './group-detail/EditExpenseModal';
import { DeleteConfirmationModal } from './group-detail/DeleteConfirmationModal';
import { SettleUpModal } from './group-detail/SettleUpModal';
import { SettleAllModal } from './group-detail/SettleAllModal';
import { InvitationBox } from './group-detail/InvitationBox';
import { AddExpense } from './AddExpense';
import { useBalanceCalculations } from './dashboard/useBalanceCalculations';
import { BalanceCard } from './dashboard/BalanceCard';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { settleAllApi, fetchExchangeRates } from '../store/slices/groupSlice';
import { type GroupSettlement } from '../types/group.types';
import { calculateSettlements, isBalanceSettled } from '../lib/accounting';
import type { Currency } from '../lib/currency';

export function GroupDetail() {
    const navigate = useNavigate();
    const { id: routeId } = useParams<{ id: string }>();
    useGroupEvents(routeId ?? '');
    const {
        members,
        expenses,
        transactions,
        currentUserBalance,
        groupBalances,
        balances,
        deleteExpense,
        updateExpense,
        currency,
        groupName,
        activeGroup,
        activeGroupId,
        fetchGroupById,
        settleUp,
        leaveGroup,
        deleteGroup,
    } = useGroup();
    const authUser = useAppSelector(state => state.auth.user);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
    const [settlingPayment, setSettlingPayment] = useState<GroupSettlement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSettling, setIsSettling] = useState(false);
    const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [leaveError, setLeaveError] = useState<string | null>(null);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
    const [settlingAllItems, setSettlingAllItems] = useState<GroupSettlement[] | null>(null);
    const [isSettlingAll, setIsSettlingAll] = useState(false);
    const [settleAllError, setSettleAllError] = useState<string | null>(null);
    const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
    const dispatch = useAppDispatch();
    const exchangeRates = useAppSelector((state) => state.groups.exchangeRates);
    const [isAddingExpense, setIsAddingExpense] = useState(false);

    // Always fetch with base=USD - the scheduled backend job only ever caches
    // rates with USD as the base (see Task 2), so this must not depend on
    // displayCurrency. SettleAllModal's convert() computes arbitrary
    // cross-rates (rate(A->B) = rates[B]/rates[A]) from this single table,
    // regardless of which currency the user picks to view the total in.
    useEffect(() => {
        dispatch(fetchExchangeRates('USD'));
    }, [dispatch]);

    // Fetch group details on mount or ID change
    useEffect(() => {
        if (routeId) {
            void fetchGroupById(routeId);
        }
    }, [routeId, fetchGroupById]);

    const currentMemberId = useMemo(
        () => members.find(m => m.userId === authUser?.id)?.id,
        [members, authUser],
    );

    // Personal balance summary - prefer server data, fallback to local calculation
    const localBalances = useBalanceCalculations({ balances, currentMemberId });
    const { owedToYou, youOwe } = useMemo(() => {
        if (currentUserBalance && Object.keys(currentUserBalance.balances).length > 0) {
            const owed: Array<{ currency: string; amount: number }> = [];
            const owing: Array<{ currency: string; amount: number }> = [];

            Object.entries(currentUserBalance.balances).forEach(([curr, data]) => {
                if (!isBalanceSettled(data.totalOwed)) {
                    owed.push({ currency: curr, amount: data.totalOwed });
                }
                if (!isBalanceSettled(data.totalOwe)) {
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

    // Settlement plan derived from server-side member balances.
    // groupBalances is re-fetched after every settle-up so this stays accurate —
    // no fallback to local expense-math that doesn't account for settlements.
    const settlementPlan = useMemo((): GroupSettlement[] => {
        if (!groupBalances) return [];
        const balanceInput: Record<string, Record<string, number>> = {};
        for (const [currency, memberBalances] of Object.entries(groupBalances)) {
            balanceInput[currency] = {};
            for (const m of memberBalances) {
                balanceInput[currency][m.memberId] = m.balance;
            }
        }
        return calculateSettlements(balanceInput).map(t => ({
            from: { memberId: t.from, name: getMemberName(t.from), avatarUrl: getMemberAvatar(t.from) ?? '' },
            to: { memberId: t.to, name: getMemberName(t.to), avatarUrl: getMemberAvatar(t.to) ?? '' },
            amount: t.amount,
            currency: t.currency,
        }));
    }, [groupBalances, getMemberName, getMemberAvatar]);

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

    const handleSettleAllClick = (items: GroupSettlement[]) => {
        setSettlingAllItems(items);
    };

    const handleConfirmSettleAll = async () => {
        if (!settlingAllItems || settlingAllItems.length === 0) return;
        if (!activeGroupId) return;
        setIsSettlingAll(true);
        try {
            await dispatch(settleAllApi({
                groupId: activeGroupId,
                data: {
                    fromId: settlingAllItems[0].from.memberId,
                    toId: settlingAllItems[0].to.memberId,
                    items: settlingAllItems.map((i) => ({ currency: i.currency, amount: i.amount })),
                },
                idempotencyKey: crypto.randomUUID(),
            })).unwrap();
            setSettlingAllItems(null);
            setSettleAllError(null);
            await fetchGroupById(activeGroupId);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to settle all';
            setSettleAllError(msg);
        } finally {
            setIsSettlingAll(false);
        }
    };

    // Default to "not settled" (blocking) until real balance data has loaded,
    // rather than optimistically allowing leave/delete on incomplete data.
    const isSettledUp = useMemo(() => {
        if (!currentUserBalance) return false;
        return Object.values(currentUserBalance.balances).every(
            b => isBalanceSettled(b.totalOwed) && isBalanceSettled(b.totalOwe)
        );
    }, [currentUserBalance]);

    const isGroupFullySettled = useMemo(() => {
        if (!groupBalances) return false;
        return Object.values(groupBalances).every(members =>
            members.every(m => isBalanceSettled(m.balance))
        );
    }, [groupBalances]);

    const isOwner = currentUserMember?.role === 'OWNER';

    const handleLeaveGroup = async () => {
        if (!activeGroup) return;
        if (!isSettledUp) {
            setLeaveError('You have an unsettled balance. Settle up before leaving the group.');
            return;
        }
        setIsLeavingGroup(true);
        try {
            await leaveGroup(activeGroup.id);
            navigate('/');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to leave group';
            setLeaveError(msg);
        } finally {
            setIsLeavingGroup(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!activeGroup) return;
        if (!isGroupFullySettled) {
            setDeleteGroupError("Balances aren't settled. Everyone needs to settle up before the group can be deleted.");
            return;
        }
        setIsDeletingGroup(true);
        try {
            await deleteGroup(activeGroup.id);
            navigate('/');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete group';
            setDeleteGroupError(msg);
        } finally {
            setIsDeletingGroup(false);
        }
    };

    const handleUpdateExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
        if (editingExpenseId && !isUpdatingExpense) {
            setIsUpdatingExpense(true);
            try {
                await updateExpense(editingExpenseId, data);
                setEditingExpenseId(null);
            } finally {
                setIsUpdatingExpense(false);
            }
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
                    <button
                        onClick={() => { void navigate(`/group/${routeId}/members`); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary rounded-xl transition-colors"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Manage members
                    </button>
                    {isOwner ? (
                        <button
                            onClick={() => void handleDeleteGroup()}
                            disabled={isDeletingGroup}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive border border-destructive/30 hover:bg-destructive/10 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDeletingGroup ? 'Deleting…' : 'Delete group'}
                        </button>
                    ) : (
                        <button
                            onClick={() => void handleLeaveGroup()}
                            disabled={isLeavingGroup}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive border border-destructive/30 hover:bg-destructive/10 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            {isLeavingGroup ? 'Leaving…' : 'Leave group'}
                        </button>
                    )}
                </div>
            </div>

            {/* Action error alerts */}
            {leaveError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{leaveError}</p>
                    <button onClick={() => setLeaveError(null)} className="shrink-0 text-destructive/70 hover:text-destructive transition-colors">✕</button>
                </div>
            )}
            {deleteGroupError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{deleteGroupError}</p>
                    <button onClick={() => setDeleteGroupError(null)} className="shrink-0 text-destructive/70 hover:text-destructive transition-colors">✕</button>
                </div>
            )}

            {/* Settlement plan first — it answers "what do I do now" */}
            <SettlementPlanList
                settlements={settlementPlan}
                getMemberName={getMemberName}
                getMemberAvatar={getMemberAvatar}
                isGuestMember={(id) => memberMap[id]?.isGuest ?? false}
                onSettle={handleSettleClick}
                onSettleAll={handleSettleAllClick}
                currentMemberId={currentUserMember?.id}
            />

            {/* Your balance summary */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <BalanceCard type="owed" balances={owedToYou} />
                </div>
                <div className="flex-1">
                    <BalanceCard type="owing" balances={youOwe} />
                </div>
            </div>

            {/* Member balances */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">Group balances</h3>
                    </div>
                </div>
                <MemberBalancesList members={members} serverBalances={groupBalances} />
            </div>

            {/* History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold tracking-tight">Payment history</h2>
                </div>

                <HistoryList
                    expenses={expenses}
                    transactions={transactions}
                    currency={currency}
                    getMemberName={getMemberName}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onAddExpense={() => { setIsAddingExpense(true); }}
                />
            </div>

            {/* Edit Modal */}
            <EditExpenseModal
                isOpen={!!editingExpenseId && !!initialFormData}
                initialData={initialFormData}
                onClose={() => { setEditingExpenseId(null); }}
                onSubmit={handleUpdateExpense}
                isSubmitting={isUpdatingExpense}
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

            {settlingAllItems && (
                <SettleAllModal
                    isOpen={!!settlingAllItems}
                    onClose={() => { setSettlingAllItems(null); setSettleAllError(null); }}
                    onConfirm={handleConfirmSettleAll}
                    items={settlingAllItems}
                    fromMember={{
                        name: getMemberName(settlingAllItems[0].from.memberId),
                        avatar: getMemberAvatar(settlingAllItems[0].from.memberId),
                    }}
                    toMember={{
                        name: getMemberName(settlingAllItems[0].to.memberId),
                        avatar: getMemberAvatar(settlingAllItems[0].to.memberId),
                    }}
                    displayCurrency={displayCurrency}
                    onDisplayCurrencyChange={setDisplayCurrency}
                    rates={exchangeRates?.rates ?? {}}
                    ratesBase={exchangeRates?.base ?? 'USD'}
                    isLoading={isSettlingAll}
                    error={settleAllError}
                />
            )}

            {isAddingExpense && <AddExpense onClose={() => { setIsAddingExpense(false); }} />}
        </div>
    );
}
