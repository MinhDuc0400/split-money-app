import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { HistoryTransaction } from '../../types/expense.types';
import type { GroupMeta, GroupDetail, GroupMember } from '../../types/group.types';
import type { CreateExpenseRequest, UpdateExpenseRequest, Expense, TransactionHistoryMap } from '../../types/expense.types';
import type { UserBalanceResponse, GroupSettlement, GroupBalancesResponse, CreateSettlementRequest } from '../../types/group.types';
import type { Member } from '../../types/member.types';
import { api } from '../../lib/api';
import { API_ENDPOINTS } from '../../constants/api.constants';

interface BalanceSummaryByCurrency {
    totalBalance: number;
    totalOwed: number;
    totalOwing: number;
}

interface GroupState {
    items: GroupMeta[];
    activeGroup: GroupDetail | null;
    activeId: string | null;
    isLoading: boolean;
    transactions: TransactionHistoryMap;
    currentUserBalance: UserBalanceResponse | null;
    serverSettlements: GroupSettlement[];
    groupBalances: GroupBalancesResponse | null;
    membersByGroupId: Record<string, Member[]>;
    balanceSummary: Record<string, BalanceSummaryByCurrency> | null;
    error: string | null;
}

const initialState: GroupState = {
    items: [],
    activeGroup: null,
    activeId: null,
    isLoading: false,
    transactions: {},
    currentUserBalance: null,
    serverSettlements: [],
    groupBalances: null,
    membersByGroupId: {},
    balanceSummary: null,
    error: null,
};

function toMember(m: GroupMember): Member {
    return {
        id: m.id,
        name: m.name,
        avatar: m.avatarUrl ?? undefined,
        userId: m.userId ?? undefined,
        role: m.role,
    };
}

export const fetchGroups = createAsyncThunk('groups/fetchAll', async () => {
    return await api.get<GroupMeta[]>(API_ENDPOINTS.GROUPS.BASE);
});

export const fetchGroupById = createAsyncThunk('groups/fetchById', async (id: string) => {
    return await api.get<GroupDetail>(API_ENDPOINTS.GROUPS.BY_ID(id));
});

export const fetchTransactions = createAsyncThunk('groups/fetchTransactions', async (groupId: string) => {
    return await api.get<TransactionHistoryMap>(API_ENDPOINTS.GROUPS.TRANSACTIONS(groupId));
});

export const fetchUserBalance = createAsyncThunk('groups/fetchUserBalance', async (groupId: string) => {
    return await api.get<UserBalanceResponse>(API_ENDPOINTS.GROUPS.BALANCE_ME(groupId));
});

export const fetchSettlements = createAsyncThunk('groups/fetchSettlements', async (groupId: string) => {
    return await api.get<GroupSettlement[]>(API_ENDPOINTS.GROUPS.SETTLEMENTS(groupId));
});

export const fetchGroupBalances = createAsyncThunk('groups/fetchBalances', async (groupId: string) => {
    return await api.get<GroupBalancesResponse>(API_ENDPOINTS.GROUPS.BALANCES(groupId));
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

export const joinGroup = createAsyncThunk('groups/join', async (inviteCode: string) => {
    return await api.post<GroupMember>(API_ENDPOINTS.GROUPS.JOIN, { inviteCode });
});

export const createExpense = createAsyncThunk(
    'groups/createExpense',
    async ({ groupId, data }: { groupId: string; data: CreateExpenseRequest }) => {
        return await api.post<Expense>(API_ENDPOINTS.GROUPS.EXPENSES(groupId), data);
    }
);

export const updateExpense = createAsyncThunk(
    'groups/updateExpense',
    async ({ groupId, expenseId, data }: { groupId: string; expenseId: string; data: UpdateExpenseRequest }) => {
        return await api.patch<Expense>(API_ENDPOINTS.GROUPS.EXPENSE_BY_ID(groupId, expenseId), data);
    }
);

export const deleteExpense = createAsyncThunk(
    'groups/deleteExpense',
    async ({ groupId, expenseId }: { groupId: string; expenseId: string }) => {
        await api.delete(API_ENDPOINTS.GROUPS.EXPENSE_BY_ID(groupId, expenseId));
        return { groupId, expenseId };
    }
);

export const fetchBalanceSummary = createAsyncThunk('groups/fetchBalanceSummary', async () => {
    return await api.get<{ byCurrency: Record<string, { totalBalance: number; totalOwed: number; totalOwing: number }> }>(API_ENDPOINTS.BALANCES.SUMMARY);
});

export const leaveGroupApi = createAsyncThunk('groups/leave', async (id: string) => {
    await api.delete(API_ENDPOINTS.GROUPS.LEAVE(id));
    return id;
});

export const createSettlement = createAsyncThunk(
    'groups/createSettlement',
    async ({ groupId, data }: { groupId: string; data: CreateSettlementRequest }) => {
        return await api.post<GroupSettlement>(API_ENDPOINTS.GROUPS.SETTLEMENTS(groupId), data);
    }
);

const groupSlice = createSlice({
    name: 'groups',
    initialState,
    reducers: {
        setActiveGroup: (state, action: PayloadAction<string>) => {
            state.activeId = action.payload;
        },
        // Socket real-time reducers
        socketExpenseAdded: (state, action: PayloadAction<Expense & { groupId: string }>) => {
            const expense = action.payload;
            if (state.activeGroup && state.activeGroup.id === expense.groupId) {
                const exists = state.activeGroup.expenses.some(e => e.id === expense.id);
                if (!exists) {
                    state.activeGroup.expenses.unshift(expense);
                    state.activeGroup._count.expenses += 1;
                }
            }
        },
        socketExpenseUpdated: (state, action: PayloadAction<Expense & { groupId: string }>) => {
            const expense = action.payload;
            if (state.activeGroup && state.activeGroup.id === expense.groupId) {
                const index = state.activeGroup.expenses.findIndex(e => e.id === expense.id);
                if (index !== -1) {
                    state.activeGroup.expenses[index] = expense;
                }
            }
        },
        socketExpenseDeleted: (state, action: PayloadAction<{ expenseId: string; groupId: string }>) => {
            const { expenseId, groupId } = action.payload;
            if (state.activeGroup && state.activeGroup.id === groupId) {
                state.activeGroup.expenses = state.activeGroup.expenses.filter(e => e.id !== expenseId);
                state.activeGroup._count.expenses = Math.max(0, state.activeGroup._count.expenses - 1);
            }
        },
        socketSettlementAdded: (state, action: PayloadAction<{ groupId: string; settlement: import('../../types/group.types').GroupSettlement }>) => {
            const { groupId, settlement } = action.payload;
            if (state.activeGroup && state.activeGroup.id === groupId) {
                state.serverSettlements.push(settlement);
            }
        },
        socketMemberJoined: (state, action: PayloadAction<import('../../types/group.types').GroupMember>) => {
            const member = action.payload;
            if (state.activeGroup && state.activeGroup.id === member.groupId) {
                const exists = state.activeGroup.members.some(m => m.id === member.id);
                if (!exists) {
                    state.activeGroup.members.push(member);
                }
            }
            // Keep membersByGroupId in sync so expense form picks up the new member immediately
            const list = state.membersByGroupId[member.groupId];
            if (list && !list.some(m => m.id === member.id)) {
                list.push(toMember(member));
            }
        },
        socketMemberLeft: (state, action: PayloadAction<{ memberId: string; groupId: string }>) => {
            const { memberId, groupId } = action.payload;
            if (state.activeGroup && state.activeGroup.id === groupId) {
                state.activeGroup.members = state.activeGroup.members.filter(m => m.id !== memberId);
            }
            const list = state.membersByGroupId[groupId];
            if (list) {
                state.membersByGroupId[groupId] = list.filter(m => m.id !== memberId);
            }
        },
        socketGroupUpdated: (state, action: PayloadAction<import('../../types/group.types').GroupMeta>) => {
            const updated = action.payload;
            const index = state.items.findIndex(g => g.id === updated.id);
            if (index !== -1) {
                state.items[index] = { ...state.items[index], ...updated };
            }
            if (state.activeGroup && state.activeGroup.id === updated.id) {
                state.activeGroup = { ...state.activeGroup, ...updated };
            }
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
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete state.membersByGroupId[action.payload];
            })
            // Join Group
            .addCase(joinGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(joinGroup.fulfilled, (state, action) => {
                state.isLoading = false;
                // The API returns a GroupMember object which contains the groupId
                const { groupId } = action.payload;
                state.activeId = groupId;
                // Note: We might need to refresh state.items (GroupMeta[]) to include the new group
            })
            .addCase(joinGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to join group';
            })
            // Fetch Group By Id
            .addCase(fetchGroupById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchGroupById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.activeGroup = action.payload;
                state.activeId = action.payload.id;
                state.membersByGroupId[action.payload.id] = action.payload.members.map(toMember);
            })
            .addCase(fetchGroupById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch group details';
            })
            // Create Expense
            .addCase(createExpense.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createExpense.fulfilled, (state, action) => {
                state.isLoading = false;
                // After adding an expense, we should ideally refresh the group details
                // to get the updated expense count and history.
                // However, for immediate UI update, we could also append to a local history if we had one.
                // Since activeGroup doesn't have the full expense list (only _count), 
                // the full details are likely fetched elsewhere or we need to update _count.
                if (state.activeGroup && state.activeGroup.id === action.meta.arg.groupId) {
                    state.activeGroup._count.expenses += 1;
                }
            })
            .addCase(createExpense.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to create expense';
            })
            // Update Expense
            .addCase(updateExpense.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateExpense.fulfilled, (state, action) => {
                state.isLoading = false;
                // Update the transaction in the history map if it exists
                const { groupId } = action.meta.arg;
                const updatedExpense = action.payload;
                if (state.transactions[groupId]) {
                    const index = state.transactions[groupId].findIndex(t => t.id === updatedExpense.id);
                    if (index !== -1) {
                        // Note: HistoryTransaction might have a slightly different structure than Expense
                        // But for now let's assume we need to refresh or if they match, update it.
                        // Actually, HistoryTransaction has 'payers' with 'name', which 'Expense' might not have in the same way.
                        // It's safer to just clear or mark for refresh, but let's try to update the basic fields.
                        state.transactions[groupId][index] = {
                            ...state.transactions[groupId][index],
                            description: updatedExpense.description,
                            amount: updatedExpense.amount,
                            currency: updatedExpense.currency,
                            date: updatedExpense.date,
                        };
                    }
                }
            })
            .addCase(updateExpense.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to update expense';
            })
            // Delete Expense
            .addCase(deleteExpense.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteExpense.fulfilled, (state, action) => {
                state.isLoading = false;
                const { groupId, expenseId } = action.payload;
                if (state.transactions[groupId]) {
                    state.transactions[groupId] = state.transactions[groupId].filter(t => t.id !== expenseId);
                }
                if (state.activeGroup && state.activeGroup.id === groupId) {
                    state.activeGroup._count.expenses = Math.max(0, state.activeGroup._count.expenses - 1);
                }
            })
            .addCase(deleteExpense.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to delete expense';
            })
            // Fetch Transactions
            .addCase(fetchTransactions.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTransactions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.transactions = action.payload;
            })
            .addCase(fetchTransactions.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch transactions';
            })
            // Fetch User Balance
            .addCase(fetchUserBalance.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserBalance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentUserBalance = action.payload;
            })
            .addCase(fetchUserBalance.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch user balance';
            })
            // Fetch Settlements
            .addCase(fetchSettlements.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchSettlements.fulfilled, (state, action) => {
                state.isLoading = false;
                state.serverSettlements = action.payload;
            })
            .addCase(fetchSettlements.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch settlements';
            })
            // Fetch Group Balances
            .addCase(fetchGroupBalances.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchGroupBalances.fulfilled, (state, action) => {
                state.isLoading = false;
                state.groupBalances = action.payload;
            })
            .addCase(fetchGroupBalances.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch group balances';
            })
            // Fetch Balance Summary (cross-group totals)
            .addCase(fetchBalanceSummary.fulfilled, (state, action) => {
                state.balanceSummary = action.payload.byCurrency;
            })
            // Leave Group
            .addCase(leaveGroupApi.fulfilled, (state, action) => {
                state.items = state.items.filter(g => g.id !== action.payload);
                if (state.activeId === action.payload) {
                    state.activeId = state.items.length > 0 ? state.items[0].id : null;
                    state.activeGroup = null;
                }
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete state.membersByGroupId[action.payload];
            })
            // Create Settlement
            .addCase(createSettlement.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createSettlement.fulfilled, (state, action) => {
                state.isLoading = false;
                state.serverSettlements.push(action.payload);
            })
            .addCase(createSettlement.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to create settlement';
            });
    },
});

export const {
    setActiveGroup,
    socketExpenseAdded,
    socketExpenseUpdated,
    socketExpenseDeleted,
    socketSettlementAdded,
    socketMemberJoined,
    socketMemberLeft,
    socketGroupUpdated,
} = groupSlice.actions;
export default groupSlice.reducer;
