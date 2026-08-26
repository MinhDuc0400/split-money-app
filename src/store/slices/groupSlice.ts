import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { GroupMeta, GroupDetail, GroupMember } from '../../types/group.types';
import type { CreateExpenseRequest, UpdateExpenseRequest, Expense, HistoryTransaction, PaginatedHistoryResponse, CategorySpending, PersonSpending, PersonCategorySpending, TopExpenseItem } from '../../types/expense.types';
import type { UserBalanceResponse, GroupSettlement, GroupBalancesResponse, CreateSettlementRequest, ExchangeRatesResponse, SettleAllRequest, SettleGuestRequest } from '../../types/group.types';
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
    transactions: {
        items: HistoryTransaction[];
        nextCursor: string | null;
        hasMore: boolean;
        isLoadingMore: boolean;
        loadMoreError: string | null;
        pendingRefresh: boolean;
    };
    currentUserBalance: UserBalanceResponse | null;
    serverSettlements: GroupSettlement[];
    groupBalances: GroupBalancesResponse | null;
    membersByGroupId: Record<string, Member[]>;
    balanceSummary: Record<string, BalanceSummaryByCurrency> | null;
    exchangeRates: ExchangeRatesResponse | null;
    categorySpending: CategorySpending[] | null;
    categorySpendingLoading: boolean;
    categorySpendingError: string | null;
    spendingByPerson: PersonSpending[] | null;
    spendingByPersonLoading: boolean;
    spendingByPersonError: string | null;
    spendingByPersonCategory: PersonCategorySpending[] | null;
    spendingByPersonCategoryLoading: boolean;
    spendingByPersonCategoryError: string | null;
    topExpenses: TopExpenseItem[] | null;
    topExpensesLoading: boolean;
    topExpensesError: string | null;
    error: string | null;
}

const initialState: GroupState = {
    items: [],
    activeGroup: null,
    activeId: null,
    isLoading: false,
    transactions: {
        items: [],
        nextCursor: null,
        hasMore: false,
        isLoadingMore: false,
        loadMoreError: null,
        pendingRefresh: false,
    },
    currentUserBalance: null,
    serverSettlements: [],
    groupBalances: null,
    membersByGroupId: {},
    balanceSummary: null,
    exchangeRates: null,
    categorySpending: null,
    categorySpendingLoading: false,
    categorySpendingError: null,
    spendingByPerson: null,
    spendingByPersonLoading: false,
    spendingByPersonError: null,
    spendingByPersonCategory: null,
    spendingByPersonCategoryLoading: false,
    spendingByPersonCategoryError: null,
    topExpenses: null,
    topExpensesLoading: false,
    topExpensesError: null,
    error: null,
};

function toMember(m: GroupMember): Member {
    return {
        id: m.id,
        name: m.name,
        avatar: m.avatarUrl ?? undefined,
        userId: m.userId ?? undefined,
        role: m.role,
        isGuest: m.isGuest ?? false,
    };
}

export const fetchGroups = createAsyncThunk('groups/fetchAll', async () => {
    return await api.get<GroupMeta[]>(API_ENDPOINTS.GROUPS.BASE);
});

export const fetchGroupById = createAsyncThunk('groups/fetchById', async (id: string) => {
    return await api.get<GroupDetail>(API_ENDPOINTS.GROUPS.BY_ID(id));
});

export const fetchTransactionsFirstPage = createAsyncThunk('groups/fetchTransactionsFirstPage', async (groupId: string) => {
    return await api.get<PaginatedHistoryResponse>(API_ENDPOINTS.GROUPS.TRANSACTIONS(groupId));
});

export const fetchTransactionsNextPage = createAsyncThunk(
    'groups/fetchTransactionsNextPage',
    async (groupId: string, { getState }) => {
        const state = (getState() as { groups: GroupState }).groups;
        const cursor = state.transactions.nextCursor ?? undefined;
        return await api.get<PaginatedHistoryResponse>(API_ENDPOINTS.GROUPS.TRANSACTIONS(groupId, cursor));
    }
);

export const fetchUserBalance = createAsyncThunk('groups/fetchUserBalance', async (groupId: string) => {
    return await api.get<UserBalanceResponse>(API_ENDPOINTS.GROUPS.BALANCE_ME(groupId));
});

export const fetchSettlements = createAsyncThunk('groups/fetchSettlements', async (groupId: string) => {
    return await api.get<GroupSettlement[]>(API_ENDPOINTS.GROUPS.SETTLEMENTS(groupId));
});

export const fetchGroupBalances = createAsyncThunk('groups/fetchBalances', async (groupId: string) => {
    return await api.get<GroupBalancesResponse>(API_ENDPOINTS.GROUPS.BALANCES(groupId));
});

export const fetchSpendingByCategory = createAsyncThunk(
    'groups/fetchSpendingByCategory',
    async ({ groupId, currency }: { groupId: string; currency?: string }) => {
        return await api.get<CategorySpending[]>(API_ENDPOINTS.GROUPS.EXPENSES_BY_CATEGORY(groupId, currency));
    }
);

export const fetchSpendingByPerson = createAsyncThunk(
    'groups/fetchSpendingByPerson',
    async ({ groupId, currency, metric }: { groupId: string; currency?: string; metric?: 'paid' | 'share' }) => {
        return await api.get<PersonSpending[]>(API_ENDPOINTS.GROUPS.EXPENSES_BY_PERSON(groupId, currency, metric));
    }
);

export const fetchSpendingByPersonCategory = createAsyncThunk(
    'groups/fetchSpendingByPersonCategory',
    async ({ groupId, currency }: { groupId: string; currency?: string }) => {
        return await api.get<PersonCategorySpending[]>(API_ENDPOINTS.GROUPS.EXPENSES_BY_PERSON_CATEGORY(groupId, currency));
    }
);

export const fetchTopExpenses = createAsyncThunk(
    'groups/fetchTopExpenses',
    async ({ groupId, currency, limit }: { groupId: string; currency?: string; limit?: number }) => {
        return await api.get<TopExpenseItem[]>(API_ENDPOINTS.GROUPS.EXPENSES_TOP(groupId, currency, limit));
    }
);

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
    async ({ groupId, data, idempotencyKey }: { groupId: string; data: CreateExpenseRequest; idempotencyKey?: string }) => {
        return await api.post<Expense>(API_ENDPOINTS.GROUPS.EXPENSES(groupId), data, {
            headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        });
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
    async ({ groupId, data, idempotencyKey }: { groupId: string; data: CreateSettlementRequest; idempotencyKey?: string }) => {
        return await api.post<GroupSettlement>(API_ENDPOINTS.GROUPS.SETTLEMENTS(groupId), data, {
            headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        });
    }
);

export const fetchExchangeRates = createAsyncThunk(
    'groups/fetchExchangeRates',
    async (baseCurrency: string) => {
        return await api.get<ExchangeRatesResponse>(API_ENDPOINTS.EXCHANGE_RATES(baseCurrency));
    }
);

export const settleAllApi = createAsyncThunk(
    'groups/settleAll',
    async ({ groupId, data, idempotencyKey }: { groupId: string; data: SettleAllRequest; idempotencyKey: string }) => {
        return await api.post<{ settlements: GroupSettlement[] }>(API_ENDPOINTS.GROUPS.SETTLE_ALL(groupId), data, {
            headers: { 'Idempotency-Key': idempotencyKey },
        });
    }
);

export const settleGuestApi = createAsyncThunk(
    'groups/settleGuest',
    async (
        { groupId, data, idempotencyKey }: { groupId: string; data: SettleGuestRequest; idempotencyKey?: string },
        { dispatch }
    ) => {
        const headers: Record<string, string> = {};
        if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
        const result = await api.post<{ settlements: GroupSettlement[] }>(
            API_ENDPOINTS.GROUPS.SETTLE_GUEST(groupId),
            data,
            { headers }
        );
        dispatch(fetchGroupBalances(groupId));
        dispatch(fetchUserBalance(groupId));
        dispatch(fetchTransactionsFirstPage(groupId));
        return result;
    }
);

export const addGuest = createAsyncThunk(
    'groups/addGuest',
    async ({ groupId, name }: { groupId: string; name: string }) => {
        return await api.post<GroupMember>(API_ENDPOINTS.GROUPS.GUESTS(groupId), { name });
    }
);

export const renameGuest = createAsyncThunk(
    'groups/renameGuest',
    async ({ groupId, guestId, name }: { groupId: string; guestId: string; name: string }) => {
        return await api.patch<GroupMember>(API_ENDPOINTS.GROUPS.GUEST_BY_ID(groupId, guestId), { name });
    }
);

export const removeGuest = createAsyncThunk(
    'groups/removeGuest',
    async ({ groupId, guestId }: { groupId: string; guestId: string }) => {
        await api.delete(API_ENDPOINTS.GROUPS.GUEST_BY_ID(groupId, guestId));
        return { groupId, guestId };
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
        setPendingRefresh: (state, action: PayloadAction<boolean>) => {
            state.transactions.pendingRefresh = action.payload;
        },
        socketGroupUpdated: (state, action: PayloadAction<import('../../types/group.types').GroupMeta>) => {
            const updated = action.payload;
            const index = state.items.findIndex(g => g.id === updated.id);
            if (index !== -1) {
                state.items[index] = { ...state.items[index], ...updated };
            }
            if (state.activeGroup && state.activeGroup.id === updated.id) {
                state.activeGroup = { ...state.activeGroup, ...(updated as unknown as import('../../types/group.types').GroupDetail) };
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
                const updatedExpense = action.payload;
                const index = state.transactions.items.findIndex(t => t.id === updatedExpense.id);
                if (index !== -1) {
                    state.transactions.items[index] = {
                        ...state.transactions.items[index],
                        description: updatedExpense.description,
                        amount: updatedExpense.amount,
                        currency: updatedExpense.currency,
                        date: updatedExpense.date,
                    };
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
                state.transactions.items = state.transactions.items.filter(t => t.id !== expenseId);
                if (state.activeGroup && state.activeGroup.id === groupId) {
                    state.activeGroup._count.expenses = Math.max(0, state.activeGroup._count.expenses - 1);
                }
            })
            .addCase(deleteExpense.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to delete expense';
            })
            // Fetch Transactions (first page — reset)
            .addCase(fetchTransactionsFirstPage.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchTransactionsFirstPage.fulfilled, (state, action) => {
                state.isLoading = false;
                state.transactions.items = action.payload.items;
                state.transactions.nextCursor = action.payload.nextCursor;
                state.transactions.hasMore = action.payload.hasMore;
                state.transactions.isLoadingMore = false;
                state.transactions.loadMoreError = null;
                state.transactions.pendingRefresh = false;
            })
            .addCase(fetchTransactionsFirstPage.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch transactions';
            })
            // Fetch Transactions (next page — append)
            .addCase(fetchTransactionsNextPage.pending, (state) => {
                state.transactions.isLoadingMore = true;
                state.transactions.loadMoreError = null;
            })
            .addCase(fetchTransactionsNextPage.fulfilled, (state, action) => {
                state.transactions.isLoadingMore = false;
                state.transactions.items = [...state.transactions.items, ...action.payload.items];
                state.transactions.nextCursor = action.payload.nextCursor;
                state.transactions.hasMore = action.payload.hasMore;
            })
            .addCase(fetchTransactionsNextPage.rejected, (state, action) => {
                state.transactions.isLoadingMore = false;
                state.transactions.loadMoreError = action.error.message || 'Failed to load more';
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
            // Fetch Spending By Category
            .addCase(fetchSpendingByCategory.pending, (state) => {
                state.categorySpendingLoading = true;
                state.categorySpendingError = null;
            })
            .addCase(fetchSpendingByCategory.fulfilled, (state, action) => {
                state.categorySpendingLoading = false;
                state.categorySpending = action.payload;
                state.categorySpendingError = null;
            })
            .addCase(fetchSpendingByCategory.rejected, (state, action) => {
                state.categorySpendingLoading = false;
                state.categorySpending = null;
                state.categorySpendingError = action.error.message || 'Failed to fetch spending by category';
            })
            // Fetch Spending By Person
            .addCase(fetchSpendingByPerson.pending, (state) => {
                state.spendingByPersonLoading = true;
                state.spendingByPersonError = null;
            })
            .addCase(fetchSpendingByPerson.fulfilled, (state, action) => {
                state.spendingByPersonLoading = false;
                state.spendingByPerson = action.payload;
                state.spendingByPersonError = null;
            })
            .addCase(fetchSpendingByPerson.rejected, (state, action) => {
                state.spendingByPersonLoading = false;
                state.spendingByPerson = null;
                state.spendingByPersonError = action.error.message || 'Failed to fetch spending by person';
            })
            // Fetch Spending By Person And Category
            .addCase(fetchSpendingByPersonCategory.pending, (state) => {
                state.spendingByPersonCategoryLoading = true;
                state.spendingByPersonCategoryError = null;
            })
            .addCase(fetchSpendingByPersonCategory.fulfilled, (state, action) => {
                state.spendingByPersonCategoryLoading = false;
                state.spendingByPersonCategory = action.payload;
                state.spendingByPersonCategoryError = null;
            })
            .addCase(fetchSpendingByPersonCategory.rejected, (state, action) => {
                state.spendingByPersonCategoryLoading = false;
                state.spendingByPersonCategory = null;
                state.spendingByPersonCategoryError = action.error.message || 'Failed to fetch category breakdown per person';
            })
            // Fetch Top Expenses
            .addCase(fetchTopExpenses.pending, (state) => {
                state.topExpensesLoading = true;
                state.topExpensesError = null;
            })
            .addCase(fetchTopExpenses.fulfilled, (state, action) => {
                state.topExpensesLoading = false;
                state.topExpenses = action.payload;
                state.topExpensesError = null;
            })
            .addCase(fetchTopExpenses.rejected, (state, action) => {
                state.topExpensesLoading = false;
                state.topExpenses = null;
                state.topExpensesError = action.error.message || 'Failed to fetch top expenses';
            })
            // Fetch Balance Summary (cross-group totals)
            .addCase(fetchBalanceSummary.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchBalanceSummary.fulfilled, (state, action) => {
                state.isLoading = false;
                state.balanceSummary = action.payload.byCurrency;
            })
            .addCase(fetchBalanceSummary.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch balance summary';
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
            })
            // Fetch Exchange Rates
            .addCase(fetchExchangeRates.fulfilled, (state, action) => {
                state.exchangeRates = action.payload;
            })
            // Settle All
            .addCase(settleAllApi.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(settleAllApi.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(settleAllApi.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to settle all';
            })
            // Guests
            .addCase(addGuest.fulfilled, (state, action) => {
                const member = action.payload;
                const { groupId } = action.meta.arg;
                if (state.activeGroup && state.activeGroup.id === groupId) {
                    if (!state.activeGroup.members.some(m => m.id === member.id)) {
                        state.activeGroup.members.push(member);
                    }
                }
                const list = state.membersByGroupId[groupId];
                if (list && !list.some(m => m.id === member.id)) {
                    list.push(toMember(member));
                }
            })
            .addCase(renameGuest.fulfilled, (state, action) => {
                const member = action.payload;
                const { groupId, guestId } = action.meta.arg;
                if (state.activeGroup && state.activeGroup.id === groupId) {
                    const i = state.activeGroup.members.findIndex(m => m.id === guestId);
                    if (i !== -1) state.activeGroup.members[i] = { ...state.activeGroup.members[i], ...member };
                }
                const list = state.membersByGroupId[groupId];
                if (list) {
                    const i = list.findIndex(m => m.id === guestId);
                    if (i !== -1) list[i] = { ...list[i], name: member.name };
                }
            })
            .addCase(removeGuest.fulfilled, (state, action) => {
                const { groupId, guestId } = action.payload;
                if (state.activeGroup && state.activeGroup.id === groupId) {
                    state.activeGroup.members = state.activeGroup.members.filter(m => m.id !== guestId);
                }
                const list = state.membersByGroupId[groupId];
                if (list) {
                    state.membersByGroupId[groupId] = list.filter(m => m.id !== guestId);
                }
            });
    },
});

export const {
    setActiveGroup,
    setPendingRefresh,
    socketExpenseAdded,
    socketExpenseUpdated,
    socketExpenseDeleted,
    socketSettlementAdded,
    socketMemberJoined,
    socketMemberLeft,
    socketGroupUpdated,
} = groupSlice.actions;
export default groupSlice.reducer;
