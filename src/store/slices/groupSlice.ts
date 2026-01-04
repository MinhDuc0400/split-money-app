import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { GroupMeta } from '../../types';
import { api } from '../../lib/api';
import { API_ENDPOINTS } from '../../constants';

interface GroupState {
    items: GroupMeta[];
    activeId: string | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: GroupState = {
    items: [],
    activeId: null,
    isLoading: false,
    error: null,
};

export const fetchGroups = createAsyncThunk('groups/fetchAll', async () => {
    return await api.get<GroupMeta[]>(API_ENDPOINTS.GROUPS.BASE);
});

export const createGroup = createAsyncThunk('groups/create', async (data: { name: string; currency: string }) => {
    return await api.post<GroupMeta>(API_ENDPOINTS.GROUPS.BASE, data);
});

export const updateGroupApi = createAsyncThunk(
    'groups/update',
    async ({ id, name, currency }: { id: string; name: string; currency: string }) => {
        return await api.patch<GroupMeta>(API_ENDPOINTS.GROUPS.BY_ID(id), { name, currency });
    }
);

export const deleteGroupApi = createAsyncThunk('groups/delete', async (id: string) => {
    await api.delete(API_ENDPOINTS.GROUPS.BY_ID(id));
    return id;
});

const groupSlice = createSlice({
    name: 'groups',
    initialState,
    reducers: {
        setActiveGroup: (state, action: PayloadAction<string>) => {
            state.activeId = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Groups
            .addCase(fetchGroups.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchGroups.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload;
                if (!state.activeId && action.payload.length > 0) {
                    state.activeId = action.payload[0].id;
                }
            })
            .addCase(fetchGroups.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch groups';
            })
            // Create Group
            .addCase(createGroup.fulfilled, (state, action) => {
                state.items.push(action.payload);
                if (!state.activeId) {
                    state.activeId = action.payload.id;
                }
            })
            // Update Group
            .addCase(updateGroupApi.fulfilled, (state, action) => {
                const index = state.items.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            // Delete Group
            .addCase(deleteGroupApi.fulfilled, (state, action) => {
                state.items = state.items.filter(g => g.id !== action.payload);
                if (state.activeId === action.payload) {
                    state.activeId = state.items.length > 0 ? state.items[0].id : null;
                }
            });
    },
});

export const { setActiveGroup } = groupSlice.actions;
export default groupSlice.reducer;
