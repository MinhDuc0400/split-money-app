import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { type Expense, type Member, type Transaction, type GroupMeta } from '../types';
import { calculateBalances, calculateSettlements } from '../lib/accounting';

// Redux Imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    addGroup, updateGroup, deleteGroup, setActiveGroup
} from '../store/slices/groupSlice';
import {
    addMember, updateMemberName, removeMember, removeMemberAndRedistribute,
    addExpense, updateExpense, deleteExpense, deleteGroupData
} from '../store/slices/financeSlice';

interface GroupContextType {
    // Current Group Data
    activeGroupId: string;
    groupName: string;
    members: Member[];
    expenses: Expense[];

    // Group Actions
    addMember: (name: string) => void;
    updateMemberName: (id: string, name: string) => void;
    removeMember: (id: string) => void;
    removeMemberAndRedistribute: (id: string) => void;
    addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
    updateExpense: (id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>) => void;
    deleteExpense: (id: string) => void;
    balances: Record<string, number>;
    settlements: Transaction[];
    resetGroup: () => void; // Deprecated or re-implement

    // Multi-Group Management
    groups: GroupMeta[];
    createGroup: (name: string) => void;
    updateGroupName: (id: string, name: string) => void;
    switchGroup: (id: string) => void;
    deleteGroup: (id: string) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    // Redux Selectors
    const groups = useAppSelector(state => state.groups.items);
    const activeGroupId = useAppSelector(state => state.groups.activeId || ''); // Fallback to empty

    const allMembers = useAppSelector(state => state.finance.members);
    const allExpenses = useAppSelector(state => state.finance.expenses);

    // Derived State for Current Group
    const members = useMemo(() => allMembers[activeGroupId] || [], [allMembers, activeGroupId]);
    const expenses = useMemo(() => allExpenses[activeGroupId] || [], [allExpenses, activeGroupId]);

    const activeGroup = groups.find(g => g.id === activeGroupId);
    const groupName = activeGroup?.name || 'Loading...';

    // --- Migration/Initialization Logic ---
    useEffect(() => {
        // Simple check: If Redux is empty but LocalStorage has legacy data, we could migrate.
        // For this refactor, we assume fresh start OR we might want to migrate existing LocalStorage data to Redux on first boot.
        // Let's implement a simple "Create Default Group" if none exists.
        if (groups.length === 0) {
            const defaultGroup: GroupMeta = {
                id: crypto.randomUUID(), // Or 'default'
                name: 'My First Group',
                currency: 'USD',
                createdAt: Date.now()
            };
            dispatch(addGroup(defaultGroup));
        }
    }, [groups.length, dispatch]);


    // --- Wrapped Actions ---

    const handleAddMember = (name: string) => {
        if (!activeGroupId) return;
        const newMember: Member = {
            id: crypto.randomUUID(),
            name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        };
        dispatch(addMember({ groupId: activeGroupId, member: newMember }));
    };

    const handleUpdateMemberName = (id: string, name: string) => {
        if (!activeGroupId) return;
        dispatch(updateMemberName({ groupId: activeGroupId, memberId: id, name }));
    };

    const handleRemoveMember = (id: string) => {
        if (!activeGroupId) return;
        dispatch(removeMember({ groupId: activeGroupId, memberId: id }));
    };

    const handleRemoveMemberAndRedistribute = (id: string) => {
        if (!activeGroupId) return;
        dispatch(removeMemberAndRedistribute({ groupId: activeGroupId, memberId: id }));
    };

    const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
        if (!activeGroupId) return;
        const newExpense: Expense = {
            ...expenseData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };
        dispatch(addExpense({ groupId: activeGroupId, expense: newExpense }));
    };

    const handleUpdateExpense = (id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
        if (!activeGroupId) return;
        dispatch(updateExpense({ groupId: activeGroupId, expenseId: id, data: expenseData }));
    };

    const handleDeleteExpense = (id: string) => {
        if (!activeGroupId) return;
        dispatch(deleteExpense({ groupId: activeGroupId, expenseId: id }));
    };

    const resetGroup = () => {
        // Maybe clear data for this group?
        // For now, let's just ignore or implement a clear action.
        // dispatch(clearGroupData(activeGroupId));
    };

    // --- Group Management ---
    const handleCreateGroup = (name: string) => {
        const newGroup: GroupMeta = {
            id: crypto.randomUUID(),
            name,
            currency: 'USD',
            createdAt: Date.now()
        };
        dispatch(addGroup(newGroup));
    };

    const handleUpdateGroupName = (id: string, name: string) => {
        dispatch(updateGroup({ id, name }));
    };

    const handleSwitchGroup = (id: string) => {
        dispatch(setActiveGroup(id));
    };

    const handleDeleteGroup = (id: string) => {
        dispatch(deleteGroup(id));
        dispatch(deleteGroupData(id)); // Clean up normalized data
    };

    // Derived calculations
    const balances = useMemo(() => calculateBalances(members, expenses), [members, expenses]);
    const settlements = useMemo(() => calculateSettlements(balances), [balances]);

    return (
        <GroupContext.Provider
            value={{
                activeGroupId,
                groupName,
                members,
                expenses,
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
                updateGroupName: handleUpdateGroupName,
                switchGroup: handleSwitchGroup,
                deleteGroup: handleDeleteGroup
            }}
        >
            {children}
        </GroupContext.Provider>
    );
}

export function useGroup() {
    const context = useContext(GroupContext);
    if (context === undefined) {
        throw new Error('useGroup must be used within a GroupProvider');
    }
    return context;
}
