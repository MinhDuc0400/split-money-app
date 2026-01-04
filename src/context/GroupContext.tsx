import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { type Expense, type Member, type Transaction, type GroupMeta } from '../types';
import { calculateBalances, calculateSettlements } from '../lib/accounting';

// Redux Imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchGroups, createGroup, updateGroupApi, deleteGroupApi, setActiveGroup, joinGroup
} from '../store/slices/groupSlice';
import {
    deleteGroupData
} from '../store/slices/financeSlice';

interface GroupContextType {
    // Current Group Data
    activeGroupId: string;
    groupName: string;
    currency: string;
    members: Member[];
    expenses: Expense[];
    isLoading: boolean;
    error: string | null;

    // Group Actions
    addMember: (name: string) => void;
    updateMemberName: (id: string, name: string) => void;
    removeMember: (id: string) => void;
    removeMemberAndRedistribute: (id: string) => void;
    addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
    updateExpense: (id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>) => void;
    deleteExpense: (id: string) => void;
    balances: Record<string, Record<string, number>>; // currency -> memberId -> balance
    settlements: Transaction[];
    resetGroup: () => void; // Deprecated or re-implement

    // Multi-Group Management
    groups: GroupMeta[];
    createGroup: (name: string, currency: string) => void;
    updateGroup: (id: string, name: string, currency: string) => void;
    switchGroup: (id: string) => void;
    deleteGroup: (id: string) => void;
    joinGroup: (code: string) => Promise<void>;
    refreshGroups: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    // Redux Selectors
    const { items: groups, activeId: activeGroupId, isLoading, error } = useAppSelector(state => state.groups);
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

    const allMembers = useAppSelector(state => state.finance.members);
    const allExpenses = useAppSelector(state => state.finance.expenses);

    // Derived State for Current Group
    const members = useMemo(() => allMembers[activeGroupId || ''] || [], [allMembers, activeGroupId]);
    const expenses = useMemo(() => allExpenses[activeGroupId || ''] || [], [allExpenses, activeGroupId]);

    const activeGroup = groups.find(g => g.id === activeGroupId);
    const groupName = activeGroup?.name || 'Loading...';
    const currency = activeGroup?.currency || 'USD';

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

    const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
        if (!activeGroupId) return;
        const newExpense: Expense = {
            ...expenseData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };
        // TODO: Move to API
        dispatch({ type: 'finance/addExpense', payload: { groupId: activeGroupId, expense: newExpense } });
    };

    const handleUpdateExpense = (id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
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
    const handleCreateGroup = (name: string, currency: string) => {
        void dispatch(createGroup({ name, currency }));
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

    const handleJoinGroup = async (code: string) => {
        await dispatch(joinGroup(code)).unwrap();
    };

    const handleRefreshGroups = () => {
        void dispatch(fetchGroups());
    };

    // Derived calculations
    const balances = useMemo(() => calculateBalances(members, expenses), [members, expenses]);
    const settlements = useMemo(() => calculateSettlements(balances), [balances]);

    return (
        <GroupContext.Provider
            value={{
                activeGroupId: activeGroupId || '',
                groupName,
                currency,
                members,
                expenses,
                isLoading,
                error,
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
                refreshGroups: handleRefreshGroups
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
