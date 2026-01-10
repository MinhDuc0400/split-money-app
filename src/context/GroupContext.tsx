import React, { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { type Expense, type Member, type Transaction, type GroupMeta, type GroupDetail, type GroupMember, type CreateExpenseRequest, type UpdateExpenseRequest } from '../types';
import { calculateBalances, calculateSettlements } from '../lib/accounting';

// Redux Imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchGroups, createGroup, updateGroupApi, deleteGroupApi, setActiveGroup, joinGroup, fetchGroupById, createExpense
} from '../store/slices/groupSlice';
import {
    deleteGroupData
} from '../store/slices/financeSlice';

interface GroupContextType {
    // Current Group Data
    activeGroupId: string;
    activeGroup: GroupDetail | null;
    groupName: string;
    currency: string;
    members: Member[];
    expenses: Expense[];
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
    balances: Record<string, Record<string, number>>; // currency -> memberId -> balance
    settlements: Transaction[];
    resetGroup: () => void; // Deprecated or re-implement

    // Multi-Group Management
    groups: GroupMeta[];
    createGroup: (name: string, currency: string) => Promise<GroupMeta>;
    updateGroup: (id: string, name: string, currency: string) => void;
    switchGroup: (id: string) => void;
    deleteGroup: (id: string) => void;
    joinGroup: (code: string) => Promise<GroupMember>;
    refreshGroups: () => void;
    overallBalances: Record<string, Record<string, number>>; // Aggregate: currency -> memberId -> balance
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    // Redux Selectors
    const { items: groups, activeGroup, activeId: activeGroupId, isLoading, error } = useAppSelector(state => state.groups);
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

    const allMembers = useAppSelector(state => state.finance.members);
    const allExpenses = useAppSelector(state => state.finance.expenses);

    // Derived State for Current Group
    const members: Member[] = useMemo(() => {
        if (activeGroup?.members) {
            return activeGroup.members.map(m => ({
                id: m.id,
                name: m.name,
                avatar: m.avatarUrl
            }));
        }
        return allMembers[activeGroupId || ''] || [];
    }, [allMembers, activeGroupId, activeGroup]);

    const expenses = useMemo(() => allExpenses[activeGroupId || ''] || [], [allExpenses, activeGroupId]);

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

    const handleAddMember = (name: string) => {
        if (!activeGroupId) return;
        const newMember: Member = {
            id: crypto.randomUUID(),
            name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        };
        // TODO: Move to API
        dispatch({ type: 'finance/addMember', payload: { groupId: activeGroupId, member: newMember } });
    };

    const handleUpdateMemberName = (id: string, name: string) => {
        if (!activeGroupId) return;
        // TODO: Move to API
        dispatch({ type: 'finance/updateMemberName', payload: { groupId: activeGroupId, memberId: id, name } });
    };

    const handleRemoveMember = (id: string) => {
        if (!activeGroupId) return;
        // TODO: Move to API
        dispatch({ type: 'finance/removeMember', payload: { groupId: activeGroupId, memberId: id } });
    };

    const handleRemoveMemberAndRedistribute = (id: string) => {
        if (!activeGroupId) return;
        // TODO: Move to API
        dispatch({ type: 'finance/removeMemberAndRedistribute', payload: { groupId: activeGroupId, memberId: id } });
    };

    const handleAddExpense = async (expenseData: CreateExpenseRequest) => {
        if (!activeGroupId) return;
        await dispatch(createExpense({ groupId: activeGroupId, data: expenseData })).unwrap();
        // The slice handles updating the activeGroup count, but we also need to refresh the history
        void dispatch(fetchGroupById(activeGroupId));
    };

    const handleUpdateExpense = (id: string, expenseData: UpdateExpenseRequest) => {
        if (!activeGroupId) return;
        // TODO: Move to API
        dispatch({ type: 'finance/updateExpense', payload: { groupId: activeGroupId, expenseId: id, data: expenseData } });
    };

    const handleDeleteExpense = (id: string) => {
        if (!activeGroupId) return;
        // TODO: Move to API
        dispatch({ type: 'finance/deleteExpense', payload: { groupId: activeGroupId, expenseId: id } });
    };

    const resetGroup = () => {
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
        await dispatch(fetchGroupById(id)).unwrap();
    }, [dispatch]);

    const handleRefreshGroups = useCallback(() => {
        void dispatch(fetchGroups());
    }, [dispatch]);

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
                balances,
                settlements,
                resetGroup,
                groups,
                createGroup: handleCreateGroup,
                updateGroup: handleUpdateGroup,
                switchGroup: handleSwitchGroup,
                deleteGroup: handleDeleteGroup,
                joinGroup: handleJoinGroup,
                refreshGroups: handleRefreshGroups,
                overallBalances
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
