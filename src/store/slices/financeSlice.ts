import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Expense } from '../../types/expense.types';
import { SplitType } from '../../types/expense.types';

interface FinanceState {
    // Keyed by Group ID
    expenses: Record<string, Expense[]>;
}

const initialState: FinanceState = {
    expenses: {},
};

const financeSlice = createSlice({
    name: 'finance',
    initialState,
    reducers: {
        removeMemberAndRedistribute: (state, action: PayloadAction<{ groupId: string; memberId: string }>) => {
            const { groupId, memberId } = action.payload;
            if (!state.expenses[groupId]) return;
            state.expenses[groupId] = state.expenses[groupId].map(expense => {
                if (!expense.splits.some(s => s.memberId === memberId)) return expense;
                const newSplits = expense.splits.filter(s => s.memberId !== memberId);
                if (newSplits.length === 0) return { ...expense, splits: [] };
                const newAmountPerPerson = expense.amount / newSplits.length;
                return {
                    ...expense,
                    splitType: SplitType.EVEN,
                    splits: newSplits.map(s => ({ ...s, amount: newAmountPerPerson })),
                };
            });
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
            delete state.expenses[groupId];
        }
    },
});

export const {
    removeMemberAndRedistribute,
    addExpense, updateExpense, deleteExpense, deleteGroupData
} = financeSlice.actions;

export default financeSlice.reducer;
