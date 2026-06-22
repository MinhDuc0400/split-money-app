import React, { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { type Member } from '../types/member.types';
import { type Transaction } from '../types/expense.types';
import { type GroupMeta, type GroupDetail, type GroupMember, type UserBalanceResponse, type GroupSettlement, type GroupBalancesResponse, type CreateSettlementRequest } from '../types/group.types';
import { type Expense, type CreateExpenseRequest, type UpdateExpenseRequest, type TransactionHistoryMap } from '../types/expense.types';
import { calculateBalances, calculateSettlements } from '../lib/accounting';

// Redux Imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchGroups, createGroup, updateGroupApi, deleteGroupApi, setActiveGroup, joinGroup, fetchGroupById, createExpense, updateExpense, deleteExpense, fetchTransactions, fetchUserBalance, fetchSettlements, fetchGroupBalances, createSettlement
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
    transactions: TransactionHistoryMap;
    currentUserBalance: UserBalanceResponse | null;
    serverSettlements: GroupSettlement[];
    groupBalances: GroupBalancesResponse | null;
    isLoading: boolean;
    error: string | null;

    // Group Actions
    fetchGroupById: (id: string) => Promise<void>;
    addMember: (name: string) => void;
    updateMemberName: (id: string, name: string) => void;
    removeMember: (id: string) => void;
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
    deleteGroup: (id: string) => void;
    joinGroup: (code: string) => Promise<GroupMember>;
    refreshGroups: () => void;
    overallBalances: Record<string, Record<string, number>>; // Aggregate: currency -> memberId -> balance
    resetGroup: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    // Redux Selectors
    const { items: groups, activeGroup, activeId: activeGroupId, isLoading, error, transactions, currentUserBalance, serverSettlements, groupBalances } = useAppSelector(state => state.groups);
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

    const allMembers = useAppSelector(state => state.groups.membersByGroupId);
    const allExpenses = useAppSelector(state => state.finance.expenses);

    // Derived State for Current Group
    const members: Member[] = useMemo(() => {
        if (activeGroup?.members) {
            return activeGroup.members.map(m => ({
                id: m.id,
                name: m.name,
                avatar: m.avatarUrl,
                userId: m.userId
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
        }
    }, [isAuthenticated, dispatch]);

    // --- Actions ---

    // TODO: wire to API — member mutations are not yet backed by a REST endpoint
    const handleAddMember = (_name: string) => { /* no-op until API exists */ };
    const handleUpdateMemberName = (_id: string, _name: string) => { /* no-op until API exists */ };

    const handleRemoveMember = (id: string) => {
        if (!activeGroupId) return;
        dispatch(removeMemberAndRedistribute({ groupId: activeGroupId, memberId: id }));
    };

    const handleRemoveMemberAndRedistribute = (id: string) => {
        if (!activeGroupId) return;
        dispatch(removeMemberAndRedistribute({ groupId: activeGroupId, memberId: id }));
    };

    const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
        if (!activeGroupId) return;
        await dispatch(createExpense({ groupId: activeGroupId, data: expenseData })).unwrap();
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
        await dispatch(createSettlement({ groupId: activeGroupId, data })).unwrap();
        // Refresh everything to ensure consistency
        await handleFetchGroupById(activeGroupId);
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

    const handleDeleteGroup = (id: string) => {
        void dispatch(deleteGroupApi(id)).then(() => {
            dispatch(deleteGroupData(id)); // Clean up normalized data
        });
    };

    const handleJoinGroup = useCallback(async (code: string) => {
        const joinedMember = await dispatch(joinGroup(code)).unwrap();
        void dispatch(fetchGroups());
        return joinedMember;
    }, [dispatch]);

    const handleFetchGroupById = useCallback(async (id: string) => {
        await Promise.all([
            dispatch(fetchGroupById(id)).unwrap(),
            dispatch(fetchTransactions(id)).unwrap(),
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
