import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GroupMeta } from '../../types';

interface GroupState {
    items: GroupMeta[];
    activeId: string | null;
}

const initialState: GroupState = {
    items: [],
    activeId: null,
};

const groupSlice = createSlice({
    name: 'groups',
    initialState,
    reducers: {
        addGroup: (state, action: PayloadAction<GroupMeta>) => {
            state.items.push(action.payload);
            // Auto-select if it's the first one
            if (!state.activeId) {
                state.activeId = action.payload.id;
            }
        },
        updateGroup: (state, action: PayloadAction<{ id: string; name?: string; currency?: string }>) => {
            const group = state.items.find((g) => g.id === action.payload.id);
            if (group) {
                if (action.payload.name !== undefined) {
                    group.name = action.payload.name;
                }
                if (action.payload.currency !== undefined) {
                    group.currency = action.payload.currency;
                }
            }
        },
        deleteGroup: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter((g) => g.id !== action.payload);
            if (state.activeId === action.payload) {
                state.activeId = state.items.length > 0 ? state.items[0].id : null;
            }
        },
        setActiveGroup: (state, action: PayloadAction<string>) => {
            state.activeId = action.payload;
        },
        setGroups: (state, action: PayloadAction<GroupMeta[]>) => {
            state.items = action.payload;
            if (!state.activeId && action.payload.length > 0) {
                state.activeId = action.payload[0].id;
            }
        }
    },
});

export const { addGroup, updateGroup, deleteGroup, setActiveGroup, setGroups } = groupSlice.actions;
export default groupSlice.reducer;
