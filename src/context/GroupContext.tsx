import React, { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { type Member } from '../types/member.types';
import { type Transaction } from '../types/expense.types';
import { type GroupMeta, type GroupDetail, type GroupMember, type UserBalanceResponse, type GroupSettlement, type GroupBalancesResponse, type CreateSettlementRequest } from '../types/group.types';
import { type Expense, type CreateExpenseRequest, type UpdateExpenseRequest, type HistoryTransaction } from '../types/expense.types';
import { calculateBalances, calculateSettlements } from '../lib/accounting';

// Redux Imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchGroups, createGroup, updateGroupApi, deleteGroupApi, setActiveGroup, joinGroup, fetchGroupById, createExpense, updateExpense, deleteExpense, fetchTransactionsFirstPage, fetchUserBalance, fetchSettlements, fetchGroupBalances, createSettlement, fetchBalanceSummary, leaveGroupApi, addGuest, renameGuest, removeGuest
} from '../store/slices/groupSlice';
import { deleteGroupData, removeMemberAndRedistribute } from '../store/slices/financeSlice';

interface GroupContextType {
    // Current Group Data
    activeGroupId: string;
    activeGroup: GroupDetail | null;
    groupName: string;
    currency: string;
    members: Member[];
    expenses: Expense[];
    transactions: {
        items: HistoryTransaction[];
        nextCursor: string | null;
        hasMore: boolean;
        isLoadingMore: boolean;
        loadMoreError: string | null;
        pendingRefresh: boolean;
    };
    currentUserBalance: UserBalanceResponse | null;
    serverSettlements: GroupSettlement[];
    groupBalances: GroupBalancesResponse | null;
    balanceSummary: Record<string, { totalBalance: number; totalOwed: number; totalOwing: number }> | null;
    isLoading: boolean;
    error: string | null;

    // Group Actions
    fetchGroupById: (id: string) => Promise<void>;
    addMember: (name: string) => Promise<void>;
    updateMemberName: (id: string, name: string) => Promise<void>;
    removeMember: (id: string) => Promise<void>;
    removeMemberAndRedistribute: (id: string) => void;
    addExpense: (data: CreateExpenseRequest) => Promise<void>;
    updateExpense: (id: string, expenseData: UpdateExpenseRequest) => void;
    deleteExpense: (id: string) => void;
    settleUp: (data: CreateSettlementRequest) => Promise<void>;
    balances: Record<string, Record<string, number>>; // currency -> memberId -> balance
    settlements: Transaction[];

    // Multi-Group Management
    groups: GroupMeta[];
    createGroup: (name: string, currency: string) => Promise<GroupMeta>;
    updateGroup: (id: string, name: string, currency: string) => void;
    switchGroup: (id: string) => void;
    deleteGroup: (id: string) => Promise<void>;
    joinGroup: (code: string) => Promise<GroupMember>;
    leaveGroup: (id: string) => Promise<void>;
    refreshGroups: () => void;
    overallBalances: Record<string, Record<string, number>>; // Aggregate: currency -> memberId -> balance
    resetGroup: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    // Redux Selectors
    const { items: groups, activeGroup, activeId: activeGroupId, isLoading, error, transactions, currentUserBalance, serverSettlements, groupBalances, balanceSummary } = useAppSelector(state => state.groups);
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

    const allMembers = useAppSelector(state => state.groups.membersByGroupId);
    const allExpenses = useAppSelector(state => state.finance.expenses);

    // Derived State for Current Group
    const members: Member[] = useMemo(() => {
        if (activeGroup?.members) {
            return activeGroup.members.map(m => ({
                id: m.id,
                name: m.name,
                avatar: m.avatarUrl ?? undefined,
                userId: m.userId ?? undefined,
                role: m.role,
                isGuest: m.isGuest ?? false
            }));
        }
        return allMembers[activeGroupId || ''] || [];
    }, [allMembers, activeGroupId, activeGroup]);

    const expenses = useMemo(() => {
        if (activeGroup?.expenses) return activeGroup.expenses;
        return allExpenses[activeGroupId || ''] || [];
    }, [activeGroup, allExpenses, activeGroupId]);

    const currentGroupMeta = groups.find(g => g.id === activeGroupId);
    const groupName = activeGroup?.name || currentGroupMeta?.name || 'Loading...';
    const currency = activeGroup?.currency || currentGroupMeta?.currency || 'USD';

    // --- API Fetch Logic ---
    useEffect(() => {
        if (isAuthenticated) {
            void dispatch(fetchGroups());
            void dispatch(fetchBalanceSummary());
        }
    }, [isAuthenticated, dispatch]);

    // --- Actions ---

    const handleAddMember = async (name: string) => {
        if (!activeGroupId) return;
        await dispatch(addGuest({ groupId: activeGroupId, name })).unwrap();
    };

    const handleUpdateMemberName = async (id: string, name: string) => {
        if (!activeGroupId) return;
        await dispatch(renameGuest({ groupId: activeGroupId, guestId: id, name })).unwrap();
    };

    const handleRemoveMember = async (id: string) => {
        if (!activeGroupId) return;
        await dispatch(removeGuest({ groupId: activeGroupId, guestId: id })).unwrap();
    };

    const handleRemoveMemberAndRedistribute = (id: string) => {
        if (!activeGroupId) return;
        dispatch(removeMemberAndRedistribute({ groupId: activeGroupId, memberId: id }));
    };

    const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
        if (!activeGroupId) return;
        // One key per submit attempt, so a duplicated request at the network
        // layer (retry, flaky connection redelivery) is deduped server-side
        // instead of creating a second expense.
        const idempotencyKey = crypto.randomUUID();
        await dispatch(createExpense({ groupId: activeGroupId, data: expenseData, idempotencyKey })).unwrap();
        // Refresh everything to ensure consistency
        await handleFetchGroupById(activeGroupId);
    };

    const handleUpdateExpense = async (id: string, expenseData: UpdateExpenseRequest) => {
        if (!activeGroupId) return;
        await dispatch(updateExpense({ groupId: activeGroupId, expenseId: id, data: expenseData })).unwrap();
        // Refresh everything to ensure consistency
        await handleFetchGroupById(activeGroupId);
    };

    const handleDeleteExpense = async (id: string) => {
        if (!activeGroupId) return;
        await dispatch(deleteExpense({ groupId: activeGroupId, expenseId: id })).unwrap();
        // Refresh everything to ensure consistency
        await handleFetchGroupById(activeGroupId);
    };

    const handleSettleUp = async (data: CreateSettlementRequest) => {
        if (!activeGroupId) return;
        const idempotencyKey = crypto.randomUUID();
        await dispatch(createSettlement({ groupId: activeGroupId, data, idempotencyKey })).unwrap();
        await handleFetchGroupById(activeGroupId);
        void dispatch(fetchBalanceSummary());
    };

    // --- Group Management ---
    const handleCreateGroup = async (name: string, currency: string) => {
        const newGroup = await dispatch(createGroup({ name, currency })).unwrap();
        void dispatch(fetchGroups());
        return newGroup;
    };

    const handleUpdateGroup = (id: string, name: string, currency: string) => {
        void dispatch(updateGroupApi({ id, name, currency }));
    };

    const handleSwitchGroup = (id: string) => {
        dispatch(setActiveGroup(id));
    };

    const handleDeleteGroup = async (id: string) => {
        await dispatch(deleteGroupApi(id)).unwrap();
        dispatch(deleteGroupData(id));
    };

    const handleJoinGroup = useCallback(async (code: string) => {
        const joinedMember = await dispatch(joinGroup(code)).unwrap();
        void dispatch(fetchGroups());
        return joinedMember;
    }, [dispatch]);

    const handleLeaveGroup = useCallback(async (id: string) => {
        await dispatch(leaveGroupApi(id)).unwrap();
    }, [dispatch]);

    const handleFetchGroupById = useCallback(async (id: string) => {
        await Promise.all([
            dispatch(fetchGroupById(id)).unwrap(),
            dispatch(fetchTransactionsFirstPage(id)).unwrap(),
            dispatch(fetchUserBalance(id)).unwrap(),
            dispatch(fetchSettlements(id)).unwrap(),
            dispatch(fetchGroupBalances(id)).unwrap()
        ]);
    }, [dispatch]);

    const handleRefreshGroups = useCallback(() => {
        void dispatch(fetchGroups());
    }, [dispatch]);

    const handleResetGroup = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    // Derived calculations
    const balances = useMemo(() => calculateBalances(members, expenses), [members, expenses]);
    const settlements = useMemo(() => calculateSettlements(balances), [balances]);

    // Aggregate balances across all groups
    const overallBalances = useMemo(() => {
        const aggregated: Record<string, Record<string, number>> = {};

        groups.forEach(group => {
            const groupMembers = allMembers[group.id] || [];
            const groupExpenses = allExpenses[group.id] || [];
            const groupBalances = calculateBalances(groupMembers, groupExpenses);

            Object.entries(groupBalances).forEach(([curr, currBalances]) => {
                if (!aggregated[curr]) aggregated[curr] = {};
                Object.entries(currBalances).forEach(([memberId, balance]) => {
                    aggregated[curr][memberId] = (aggregated[curr][memberId] || 0) + balance;
                });
            });
        });

        return aggregated;
    }, [groups, allMembers, allExpenses]);

    return (
        <GroupContext.Provider
            value={{
                activeGroupId: activeGroupId || '',
                activeGroup,
                groupName,
                currency,
                members,
                expenses,
                transactions,
                currentUserBalance,
                serverSettlements,
                groupBalances,
                balanceSummary,
                isLoading,
                error,
                fetchGroupById: handleFetchGroupById,
                addMember: handleAddMember,
                updateMemberName: handleUpdateMemberName,
                removeMember: handleRemoveMember,
                removeMemberAndRedistribute: handleRemoveMemberAndRedistribute,
                addExpense: handleAddExpense,
                updateExpense: handleUpdateExpense,
                deleteExpense: handleDeleteExpense,
                settleUp: handleSettleUp,
                balances,
                settlements,
                groups,
                createGroup: handleCreateGroup,
                updateGroup: handleUpdateGroup,
                switchGroup: handleSwitchGroup,
                deleteGroup: handleDeleteGroup,
                joinGroup: handleJoinGroup,
                leaveGroup: handleLeaveGroup,
                refreshGroups: handleRefreshGroups,
                overallBalances,
                resetGroup: handleResetGroup
            }}
        >
            {children}
        </GroupContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGroup() {
    const context = useContext(GroupContext);
    if (context === undefined) {
        throw new Error('useGroup must be used within a GroupProvider');
    }
    return context;
}
