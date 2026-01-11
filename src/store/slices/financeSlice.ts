import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Member, Expense } from '../../types';
import { SplitType } from '../../types';

interface FinanceState {
    // Keyed by Group ID
    members: Record<string, Member[]>;
    expenses: Record<string, Expense[]>;
}

const initialState: FinanceState = {
    members: {},
    expenses: {},
};

const financeSlice = createSlice({
    name: 'finance',
    initialState,
    reducers: {
        // --- Member Actions ---
        addMember: (state, action: PayloadAction<{ groupId: string; member: Member }>) => {
            const { groupId, member } = action.payload;
            if (!state.members[groupId]) state.members[groupId] = [];
            state.members[groupId].push(member);
        },
        updateMemberName: (state, action: PayloadAction<{ groupId: string; memberId: string; name: string }>) => {
            const { groupId, memberId, name } = action.payload;
            const member = state.members[groupId]?.find(m => m.id === memberId);
            if (member) member.name = name;
        },
        removeMember: (state, action: PayloadAction<{ groupId: string; memberId: string }>) => {
            const { groupId, memberId } = action.payload;
            if (state.members[groupId]) {
                state.members[groupId] = state.members[groupId].filter(m => m.id !== memberId);
            }
        },
        // Advanced Removal
        removeMemberAndRedistribute: (state, action: PayloadAction<{ groupId: string; memberId: string }>) => {
            const { groupId, memberId } = action.payload;

            // 1. Update expenses
            if (state.expenses[groupId]) {
                state.expenses[groupId] = state.expenses[groupId].map(expense => {
                    // If member wasn't in this expense, ignore
                    if (!expense.splits.some(s => s.memberId === memberId)) return expense;

                    // Remove the member's split
                    const newSplits = expense.splits.filter(s => s.memberId !== memberId);

                    if (newSplits.length === 0) return { ...expense, splits: [] };

                    // Redistribute logic (Simplified: Convert to EVEN for remaining)
                    // This handles both EVEN (re-divide by N-1) and EXACT (ambiguous, so we convert to EVEN)
                    const newAmountPerPerson = expense.amount / newSplits.length;
                    const updatedSplits = newSplits.map(s => ({
                        ...s,
                        amount: newAmountPerPerson
                    }));

                    return { ...expense, splitType: SplitType.EVEN, splits: updatedSplits };
                });
            }

            // 2. Remove member
            if (state.members[groupId]) {
                state.members[groupId] = state.members[groupId].filter(m => m.id !== memberId);
            }
        },

        // --- Expense Actions ---
        addExpense: (state, action: PayloadAction<{ groupId: string; expense: Expense }>) => {
            const { groupId, expense } = action.payload;
            if (!state.expenses[groupId]) state.expenses[groupId] = [];
            state.expenses[groupId].push(expense);
        },
        updateExpense: (state, action: PayloadAction<{ groupId: string; expenseId: string; data: Omit<Expense, 'id' | 'createdAt'> }>) => {
            const { groupId, expenseId, data } = action.payload;
            const list = state.expenses[groupId];
            if (list) {
                const index = list.findIndex(e => e.id === expenseId);
                if (index !== -1) {
                    list[index] = { ...list[index], ...data };
                }
            }
        },
        deleteExpense: (state, action: PayloadAction<{ groupId: string; expenseId: string }>) => {
            const { groupId, expenseId } = action.payload;
            if (state.expenses[groupId]) {
                state.expenses[groupId] = state.expenses[groupId].filter(e => e.id !== expenseId);
            }
        },

        // --- Group Clean Up ---
        deleteGroupData: (state, action: PayloadAction<string>) => {
            const groupId = action.payload;
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete state.members[groupId];
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete state.expenses[groupId];
        }
    },
    extraReducers: (builder) => {
        // We import these thunks from groupSlice, but to avoid circular dependencies 
        // if any exist, we can use the string action types or ensure groupSlice doesn't import financeSlice.
        // For now, we'll assume direct import is fine as they are sibling slices.
        builder.addCase('groups/fetchById/fulfilled', (state, action: any) => {
            const group = action.payload;
            if (group && group.members) {
                state.members[group.id] = group.members.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    avatar: m.avatarUrl
                }));
            }
        });
    }
});

export const {
    addMember, updateMemberName, removeMember, removeMemberAndRedistribute,
    addExpense, updateExpense, deleteExpense, deleteGroupData
} = financeSlice.actions;

export default financeSlice.reducer;
