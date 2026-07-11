import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface PendingDelete {
    expenseId: string;
    groupId: string;
    description: string;
    expiresAt: number;
}

interface PendingDeletesState {
    items: Record<string, PendingDelete>;
}

const initialState: PendingDeletesState = {
    items: {},
};

const pendingDeletesSlice = createSlice({
    name: 'pendingDeletes',
    initialState,
    reducers: {
        pendingDeleteAdded: (state, action: PayloadAction<PendingDelete>) => {
            state.items[action.payload.expenseId] = action.payload;
        },
        pendingDeleteCancelled: (state, action: PayloadAction<string>) => {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete state.items[action.payload];
        },
        pendingDeleteResolved: (state, action: PayloadAction<string>) => {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete state.items[action.payload];
        },
    },
});

export const { pendingDeleteAdded, pendingDeleteCancelled, pendingDeleteResolved } = pendingDeletesSlice.actions;
export default pendingDeletesSlice.reducer;
