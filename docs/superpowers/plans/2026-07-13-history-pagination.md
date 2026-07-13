# Payment History Cursor Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "fetch all" transaction history with cursor-based infinite scroll: 20 items per page, month headers rendered client-side, IntersectionObserver loads next page on scroll.

**Architecture:** Backend gains `cursor` + `limit` query params and returns a flat `{ items, nextCursor, hasMore }` response. Redux replaces the `TransactionHistoryMap` state with `{ items[], nextCursor, hasMore, isLoadingMore }`. `HistoryList` groups the flat list by month client-side and fires `fetchTransactionsNextPage` when a bottom sentinel enters the viewport.

**Tech Stack:** NestJS + Prisma (backend), React + Redux Toolkit + IntersectionObserver API (frontend).

## Global Constraints

- Default page size: 20 items. Max: 50.
- Cursor format: `base64(JSON.stringify({ date: string, id: string }))`.
- `fetchTransactions` (old thunk) is replaced everywhere by `fetchTransactionsFirstPage`. No call site may keep using the old thunk.
- Socket events call `fetchTransactionsFirstPage` (reset) not next-page.
- Race condition guard: if `isLoadingMore` is true when a socket event fires, set `pendingRefresh: true` in state; dispatch `fetchTransactionsFirstPage` only after the next-page call completes.
- `HistoryList` no longer accepts `TransactionHistoryMap` — it receives the flat Redux `items` array directly.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `money-split-backend/src/expenses/types/expense-responses.type.ts` | **Modify** | Add `PaginatedTransactionHistory` response type |
| `money-split-backend/src/expenses/expenses.service.ts` | **Modify** | Rewrite `getGroupTransactions` to accept `limit`+`cursor`, return flat paginated result |
| `money-split-backend/src/expenses/expenses.controller.ts` | **Modify** | Add `@Query('cursor')` and `@Query('limit')` params to `getTransactions` |
| `money-split-app/src/constants/api.constants.ts` | **Modify** | Update `TRANSACTIONS` helper to accept optional `cursor` + `limit` |
| `money-split-app/src/store/slices/groupSlice.ts` | **Modify** | Replace `transactions: TransactionHistoryMap` state + `fetchTransactions` thunk with paginated state + two new thunks |
| `money-split-app/src/hooks/useGroupEvents.ts` | **Modify** | Use `fetchTransactionsFirstPage`; add `pendingRefresh` guard |
| `money-split-app/src/components/group-detail/HistoryList.tsx` | **Modify** | Accept flat `items[]` + `hasMore` + `isLoadingMore` + `onLoadMore`; group by month client-side; add IntersectionObserver sentinel |
| `money-split-app/src/components/GroupDetail.tsx` | **Modify** | Dispatch `fetchTransactionsFirstPage` on mount; pass flat items + pagination props to `HistoryList` |

---

### Task 1: Backend — response type + paginated service method

**Files:**
- Modify: `money-split-backend/src/expenses/types/expense-responses.type.ts`
- Modify: `money-split-backend/src/expenses/expenses.service.ts`

**Interfaces:**
- Produces: `getGroupTransactions(groupId, userId, limit, cursor?)` returning `PaginatedTransactionHistory`

- [ ] **Step 1: Add `PaginatedTransactionHistory` to the response types file**

In `money-split-backend/src/expenses/types/expense-responses.type.ts`, add after the existing `GroupedTransactionHistory` interface:

```typescript
export interface PaginatedTransactionHistory {
  items: TransactionHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

- [ ] **Step 2: Rewrite `getGroupTransactions` in `expenses.service.ts`**

Replace the entire `getGroupTransactions` method (currently lines 370–462) with:

```typescript
async getGroupTransactions(
  groupId: string,
  userId: string,
  limit = 20,
  cursor?: string,
): Promise<PaginatedTransactionHistory> {
  await this.assertActiveMember(groupId, userId);

  const effectiveLimit = Math.min(limit, 50);

  // Decode cursor
  let cursorDate: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8'),
      ) as { date: string; id: string };
      cursorDate = new Date(decoded.date);
      cursorId = decoded.id;
    } catch {
      // ignore malformed cursor — treat as first page
    }
  }

  // Build date filter for both tables
  const dateFilter = cursorDate
    ? {
        OR: [
          { date: { lt: cursorDate } },
          { date: cursorDate, id: { gt: cursorId! } },
        ],
      }
    : {};

  const settlementDateFilter = cursorDate
    ? {
        OR: [
          { createdAt: { lt: cursorDate } },
          { createdAt: cursorDate, id: { gt: cursorId! } },
        ],
      }
    : {};

  // Fetch limit rows from each table (overfetch by 1 to detect hasMore)
  const fetchCount = effectiveLimit + 1;

  const [expenses, settlements] = await Promise.all([
    this.prisma.expense.findMany({
      where: { groupId, deletedAt: null, ...dateFilter },
      include: {
        payers: { include: { member: true } },
        splits: { include: { member: true } },
      },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      take: fetchCount,
    }),
    this.prisma.settlement.findMany({
      where: { groupId, deletedAt: null, ...settlementDateFilter },
      include: { from: true, to: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: fetchCount,
    }),
  ]);

  // Map to unified TransactionHistoryItem
  const expenseItems: TransactionHistoryItem[] = expenses.map((e) => ({
    id: e.id,
    type: 'EXPENSE' as const,
    description: e.description,
    amount: Number(e.amount),
    currency: e.currency,
    date: e.date,
    payers: e.payers.map((p) => ({
      memberId: p.memberId,
      amount: Number(p.amount),
      name: p.member.name,
      avatarUrl: p.member.avatarUrl,
    })),
    receivers: e.splits.map((s) => ({
      memberId: s.memberId,
      amount: Number(s.amount),
      name: s.member.name,
      avatarUrl: s.member.avatarUrl,
    })),
  }));

  const settlementItems: TransactionHistoryItem[] = settlements.map((s) => ({
    id: s.id,
    type: 'SETTLEMENT' as const,
    description: s.note || `${s.from.name} paid ${s.to.name}`,
    amount: Number(s.amount),
    currency: s.currency,
    date: s.createdAt,
    status: s.status,
    from: { memberId: s.fromId, name: s.from.name, avatarUrl: s.from.avatarUrl },
    to: { memberId: s.toId, name: s.to.name, avatarUrl: s.to.avatarUrl },
  }));

  // Merge, sort, take effectiveLimit + 1 to probe hasMore
  const merged = [...expenseItems, ...settlementItems]
    .sort((a, b) => {
      const diff = b.date.getTime() - a.date.getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    })
    .slice(0, fetchCount);

  const hasMore = merged.length > effectiveLimit;
  const items = hasMore ? merged.slice(0, effectiveLimit) : merged;

  // Build next cursor from last item
  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({ date: last.date.toISOString(), id: last.id }),
    ).toString('base64');
  }

  return { items, nextCursor, hasMore };
}
```

Also add the import for `PaginatedTransactionHistory` at the top of `expenses.service.ts`:

```typescript
import {
  // existing imports...
  PaginatedTransactionHistory,
} from './types/expense-responses.type';
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/ducnguyen/code/money-split/money-split-backend
npx tsc --noEmit 2>&1 | grep "expenses.service.ts\|expense-responses"
```

Expected: no errors from these files.

- [ ] **Step 4: Commit**

```bash
cd /Users/ducnguyen/code/money-split/money-split-backend
git add src/expenses/types/expense-responses.type.ts src/expenses/expenses.service.ts
git commit -m "feat(expenses): add cursor pagination to getGroupTransactions"
```

---

### Task 2: Backend — controller query params

**Files:**
- Modify: `money-split-backend/src/expenses/expenses.controller.ts`

**Interfaces:**
- Consumes: `getGroupTransactions(groupId, userId, limit, cursor?)` from Task 1
- Produces: `GET /groups/:groupId/transactions?limit=20&cursor=<token>`

- [ ] **Step 1: Add `@Query` to the `getTransactions` handler**

In `expenses.controller.ts`, add `Query` to the NestJS imports at the top:

```typescript
import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Req, UseGuards, Query,
} from '@nestjs/common';
```

Replace the `getTransactions` handler (lines 93–102) with:

```typescript
@Get('transactions')
@ApiOperation({ summary: 'Get paginated transaction history of a group' })
@ApiResponse({ status: 200, description: 'Returns a page of transactions with cursor.' })
getTransactions(
  @Param('groupId') groupId: string,
  @Req() req: Request,
  @Query('limit') limit?: string,
  @Query('cursor') cursor?: string,
): Promise<PaginatedTransactionHistory> {
  const userId = req.user!.id;
  const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;
  return this.expensesService.getGroupTransactions(
    groupId,
    userId,
    parsedLimit,
    cursor,
  );
}
```

Also update the import to include `PaginatedTransactionHistory` instead of `GroupedTransactionHistory` (or in addition to it if it's used elsewhere):

```typescript
import {
  // existing...
  PaginatedTransactionHistory,
} from './types/expense-responses.type';
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ducnguyen/code/money-split/money-split-backend
npx tsc --noEmit 2>&1 | grep "expenses.controller.ts"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ducnguyen/code/money-split/money-split-backend
git add src/expenses/expenses.controller.ts
git commit -m "feat(expenses): accept cursor + limit query params on transactions endpoint"
```

---

### Task 3: Frontend — API constant + Redux paginated state + thunks

**Files:**
- Modify: `money-split-app/src/constants/api.constants.ts`
- Modify: `money-split-app/src/store/slices/groupSlice.ts`

**Interfaces:**
- Produces:
  - `fetchTransactionsFirstPage(groupId: string)` thunk — replaces `fetchTransactions` everywhere
  - `fetchTransactionsNextPage(groupId: string)` thunk
  - Redux state shape:
    ```ts
    transactions: {
      items: HistoryTransaction[]
      nextCursor: string | null
      hasMore: boolean
      isLoadingMore: boolean
      pendingRefresh: boolean
    }
    ```

- [ ] **Step 1: Update `TRANSACTIONS` API constant**

In `money-split-app/src/constants/api.constants.ts`, replace:

```typescript
TRANSACTIONS: (id: string) => `${API_BASE_URL}/groups/${id}/transactions`,
```

With:

```typescript
TRANSACTIONS: (id: string, cursor?: string, limit = 20) =>
  `${API_BASE_URL}/groups/${id}/transactions?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
```

- [ ] **Step 2: Add `PaginatedHistoryResponse` type to frontend types**

In `money-split-app/src/types/expense.types.ts`, add after `TransactionHistoryMap`:

```typescript
export interface PaginatedHistoryResponse {
    items: HistoryTransaction[];
    nextCursor: string | null;
    hasMore: boolean;
}
```

- [ ] **Step 3: Update Redux state shape in `groupSlice.ts`**

Replace the existing `transactions: TransactionHistoryMap` field in `GroupState` interface with:

```typescript
transactions: {
    items: HistoryTransaction[];
    nextCursor: string | null;
    hasMore: boolean;
    isLoadingMore: boolean;
    pendingRefresh: boolean;
};
```

Update `initialState` from:

```typescript
transactions: {},
```

To:

```typescript
transactions: {
    items: [],
    nextCursor: null,
    hasMore: true,
    isLoadingMore: false,
    pendingRefresh: false,
},
```

- [ ] **Step 4: Replace `fetchTransactions` thunk with two new thunks**

Remove:
```typescript
export const fetchTransactions = createAsyncThunk('groups/fetchTransactions', async (groupId: string) => {
    return await api.get<TransactionHistoryMap>(API_ENDPOINTS.GROUPS.TRANSACTIONS(groupId));
});
```

Add in its place:

```typescript
export const fetchTransactionsFirstPage = createAsyncThunk(
    'groups/fetchTransactionsFirstPage',
    async (groupId: string) => {
        return await api.get<PaginatedHistoryResponse>(API_ENDPOINTS.GROUPS.TRANSACTIONS(groupId));
    }
);

export const fetchTransactionsNextPage = createAsyncThunk(
    'groups/fetchTransactionsNextPage',
    async (groupId: string, { getState }) => {
        const state = (getState() as { groups: GroupState }).groups;
        const cursor = state.transactions.nextCursor;
        if (!cursor) return null;
        return await api.get<PaginatedHistoryResponse>(
            API_ENDPOINTS.GROUPS.TRANSACTIONS(groupId, cursor)
        );
    }
);
```

Also add `PaginatedHistoryResponse` to the import from `expense.types`:

```typescript
import type { ..., PaginatedHistoryResponse } from '../../types/expense.types';
```

And remove `TransactionHistoryMap` from that same import (it's no longer used in this file).

- [ ] **Step 5: Replace the `fetchTransactions` reducer cases**

Remove the three `.addCase(fetchTransactions.pending/fulfilled/rejected, ...)` blocks.

Add:

```typescript
// fetchTransactionsFirstPage
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
    state.transactions.pendingRefresh = false;
})
.addCase(fetchTransactionsFirstPage.rejected, (state, action) => {
    state.isLoading = false;
    state.error = action.error.message || 'Failed to fetch transactions';
})
// fetchTransactionsNextPage
.addCase(fetchTransactionsNextPage.pending, (state) => {
    state.transactions.isLoadingMore = true;
})
.addCase(fetchTransactionsNextPage.fulfilled, (state, action) => {
    state.transactions.isLoadingMore = false;
    if (action.payload) {
        state.transactions.items = [
            ...state.transactions.items,
            ...action.payload.items,
        ];
        state.transactions.nextCursor = action.payload.nextCursor;
        state.transactions.hasMore = action.payload.hasMore;
    }
    // Fire deferred refresh if a socket event arrived during load
    if (state.transactions.pendingRefresh) {
        state.transactions.pendingRefresh = false;
        // Caller (useGroupEvents) watches this flag and dispatches firstPage
    }
})
.addCase(fetchTransactionsNextPage.rejected, (state, action) => {
    state.transactions.isLoadingMore = false;
    state.transactions.loadMoreError = action.error.message || 'Failed to load more';
})
```

Note: add `loadMoreError: string | null` to the `transactions` state shape and `loadMoreError: null` to `initialState.transactions`.

- [ ] **Step 6: Fix inline socket reducers that reference `state.transactions` as a map**

Search `groupSlice.ts` for any code that does `state.transactions[groupId]` (the old map pattern). Remove or no-op those blocks — the paginated list is refreshed via `fetchTransactionsFirstPage` on socket events, not patched inline.

Specifically, in `socketExpenseUpdated` and `socketExpenseDeleted` reducers, remove the `state.transactions[groupId]` mutation blocks (they will be a no-op since `state.transactions` is now an object with `items[]`, not a map).

- [ ] **Step 7: Type-check**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
npx tsc --noEmit 2>&1 | grep "groupSlice\|expense.types\|api.constants"
```

Expected: no errors from these files.

- [ ] **Step 8: Commit**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
git add src/constants/api.constants.ts src/types/expense.types.ts src/store/slices/groupSlice.ts
git commit -m "feat(store): replace fetchTransactions with cursor-paginated thunks"
```

---

### Task 4: `useGroupEvents` — swap to `fetchTransactionsFirstPage` with pendingRefresh guard

**Files:**
- Modify: `money-split-app/src/hooks/useGroupEvents.ts`

**Interfaces:**
- Consumes: `fetchTransactionsFirstPage(groupId)` from Task 3
- Consumes: `state.groups.transactions.isLoadingMore` and `state.groups.transactions.pendingRefresh` from Task 3

- [ ] **Step 1: Update imports and socket handlers**

In `useGroupEvents.ts`, replace:

```typescript
import {
    fetchTransactions,
    ...
} from '../store/slices/groupSlice';
```

With:

```typescript
import {
    fetchTransactionsFirstPage,
    fetchTransactionsNextPage,
    setPendingRefresh,
    ...
} from '../store/slices/groupSlice';
```

Also add the selector at the top of the hook body:

```typescript
const { isLoadingMore, pendingRefresh } = useSelector(
    (state: RootState) => state.groups.transactions
);
```

- [ ] **Step 2: Update `refreshDerivedExpenseViews` with pendingRefresh guard**

Replace:

```typescript
const refreshDerivedExpenseViews = () => {
    dispatch(fetchTransactions(groupId));
    dispatch(fetchGroupBalances(groupId));
    dispatch(fetchUserBalance(groupId));
};
```

With:

```typescript
const refreshDerivedExpenseViews = () => {
    if (isLoadingMore) {
        // Mark for refresh once next-page load completes (reducer clears the flag)
        dispatch(setPendingRefresh());
    } else {
        dispatch(fetchTransactionsFirstPage(groupId));
    }
    dispatch(fetchGroupBalances(groupId));
    dispatch(fetchUserBalance(groupId));
};
```

- [ ] **Step 3: Add effect that fires deferred refresh when pendingRefresh clears**

Add inside the `useEffect` (after the socket event registrations):

```typescript
// When a next-page load completes and pendingRefresh was set,
// fire the deferred first-page refresh.
if (pendingRefresh && !isLoadingMore) {
    dispatch(fetchTransactionsFirstPage(groupId));
}
```

- [ ] **Step 4: Add `setPendingRefresh` action to groupSlice**

In `groupSlice.ts`, add inside the `reducers` object (alongside other sync reducers):

```typescript
setPendingRefresh: (state) => {
    state.transactions.pendingRefresh = true;
},
```

Export it:

```typescript
export const { ..., setPendingRefresh } = groupsSlice.actions;
```

- [ ] **Step 5: Update `onSettlementUpdated` handler**

In `useGroupEvents.ts`, the `onSettlementUpdated` handler currently calls `dispatch(fetchTransactions(groupId))` directly. Change it to use `refreshDerivedExpenseViews()` instead (which already contains the guard).

- [ ] **Step 6: Type-check**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
npx tsc --noEmit 2>&1 | grep "useGroupEvents"
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
git add src/hooks/useGroupEvents.ts src/store/slices/groupSlice.ts
git commit -m "feat(events): use fetchTransactionsFirstPage with pendingRefresh guard"
```

---

### Task 5: `HistoryList` — flat items, month grouping, IntersectionObserver sentinel

**Files:**
- Modify: `money-split-app/src/components/group-detail/HistoryList.tsx`

**Interfaces:**
- Consumes: `items: HistoryTransaction[]`, `hasMore: boolean`, `isLoadingMore: boolean`, `loadMoreError: string | null`, `onLoadMore: () => void`
- Note: `expenses: Expense[]` and `transactions?: TransactionHistoryMap` props are **removed**

- [ ] **Step 1: Rewrite `HistoryList`**

Replace the entire file content with:

```tsx
import React, { useMemo, useEffect, useRef } from 'react';
import { Receipt } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { EmptyState } from '../ui/EmptyState';
import type { HistoryTransaction } from '../../types/expense.types';

interface HistoryListProps {
    items: HistoryTransaction[];
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMoreError: string | null;
    onLoadMore: () => void;
    currency: string;
    getMemberName: (id: string) => string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onAddExpense?: () => void;
}

function groupByMonth(items: HistoryTransaction[]): Record<string, HistoryTransaction[]> {
    const grouped: Record<string, HistoryTransaction[]> = {};
    for (const item of items) {
        const date = new Date(item.date);
        const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    }
    return grouped;
}

export const HistoryList: React.FC<HistoryListProps> = ({
    items,
    hasMore,
    isLoadingMore,
    loadMoreError,
    onLoadMore,
    currency,
    getMemberName,
    onEdit,
    onDelete,
    onAddExpense,
}) => {
    const sentinelRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver fires onLoadMore when sentinel enters viewport
    useEffect(() => {
        if (!hasMore || isLoadingMore) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) onLoadMore();
            },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, onLoadMore]);

    const grouped = useMemo(() => groupByMonth(items), [items]);
    const months = Object.keys(grouped);

    if (!months.length && !isLoadingMore) {
        return (
            <div className="bg-card rounded-3xl border border-border/50">
                <EmptyState
                    icon={Receipt}
                    headline="No expenses yet"
                    body="Add the first expense and Money Split does the math for everyone."
                    actionLabel={onAddExpense ? 'Add expense' : undefined}
                    onAction={onAddExpense}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {months.map((month) => (
                <div key={month} className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2">
                        {month}
                    </h3>
                    <div className="space-y-2">
                        {grouped[month].map((item) => (
                            <HistoryItem
                                key={item.id}
                                expense={item}
                                currency={currency}
                                getMemberName={getMemberName}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {isLoadingMore && (
                <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            )}

            {loadMoreError && !isLoadingMore && (
                <div className="text-center py-3">
                    <span className="text-sm text-destructive">{loadMoreError} — </span>
                    <button
                        onClick={onLoadMore}
                        className="text-sm text-primary underline"
                    >
                        retry
                    </button>
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
npx tsc --noEmit 2>&1 | grep "HistoryList"
```

Expected: no errors from HistoryList itself (GroupDetail will show errors until Task 6).

- [ ] **Step 3: Commit**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
git add src/components/group-detail/HistoryList.tsx
git commit -m "feat(history-list): flat items + IntersectionObserver infinite scroll"
```

---

### Task 6: `GroupDetail` — wire pagination props to `HistoryList`

**Files:**
- Modify: `money-split-app/src/components/GroupDetail.tsx`

**Interfaces:**
- Consumes: `fetchTransactionsFirstPage`, `fetchTransactionsNextPage` from Task 3
- Consumes: `HistoryList` props shape from Task 5

- [ ] **Step 1: Update imports in `GroupDetail.tsx`**

Replace:

```typescript
import { settleAllApi, fetchExchangeRates, settleGuestApi } from '../store/slices/groupSlice';
```

With:

```typescript
import { settleAllApi, fetchExchangeRates, settleGuestApi, fetchTransactionsFirstPage, fetchTransactionsNextPage } from '../store/slices/groupSlice';
```

- [ ] **Step 2: Read pagination state from Redux**

Add after the existing `useAppSelector` calls:

```typescript
const transactionItems = useAppSelector(state => state.groups.transactions.items);
const transactionsHasMore = useAppSelector(state => state.groups.transactions.hasMore);
const transactionsIsLoadingMore = useAppSelector(state => state.groups.transactions.isLoadingMore);
const transactionsLoadMoreError = useAppSelector(state => state.groups.transactions.loadMoreError ?? null);
```

- [ ] **Step 3: Replace `fetchGroupById` mount effect with `fetchTransactionsFirstPage`**

Find the `useEffect` that calls `fetchGroupById(routeId)` on mount. After it (or within the same effect), add:

```typescript
useEffect(() => {
    if (routeId) {
        dispatch(fetchTransactionsFirstPage(routeId));
    }
}, [routeId, dispatch]);
```

Remove any existing `fetchTransactions` call on mount (from the old context or previous effect).

- [ ] **Step 4: Add `handleLoadMore` callback**

Add after the other `handle*` functions:

```typescript
const handleLoadMore = useCallback(() => {
    if (activeGroupId && transactionsHasMore && !transactionsIsLoadingMore) {
        void dispatch(fetchTransactionsNextPage(activeGroupId));
    }
}, [activeGroupId, transactionsHasMore, transactionsIsLoadingMore, dispatch]);
```

- [ ] **Step 5: Update `<HistoryList>` JSX**

Replace the existing `<HistoryList>` usage:

```tsx
<HistoryList
    expenses={visibleExpenses}
    transactions={visibleTransactions}
    currency={currency}
    getMemberName={getMemberName}
    onEdit={handleEditClick}
    onDelete={handleDeleteClick}
    onAddExpense={() => { setIsAddingExpense(true); }}
/>
```

With:

```tsx
<HistoryList
    items={transactionItems.filter(item => !pendingDeletes[item.id])}
    hasMore={transactionsHasMore}
    isLoadingMore={transactionsIsLoadingMore}
    loadMoreError={transactionsLoadMoreError}
    onLoadMore={handleLoadMore}
    currency={currency}
    getMemberName={getMemberName}
    onEdit={handleEditClick}
    onDelete={handleDeleteClick}
    onAddExpense={() => { setIsAddingExpense(true); }}
/>
```

- [ ] **Step 6: Remove unused variables**

Remove `visibleExpenses` and `visibleTransactions` useMemos if they are no longer referenced anywhere else in `GroupDetail`. Check by running tsc.

- [ ] **Step 7: Type-check — expect zero errors**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no errors (all files clean).

- [ ] **Step 8: Commit**

```bash
cd /Users/ducnguyen/code/money-split/money-split-app
git add src/components/GroupDetail.tsx
git commit -m "feat(group-detail): wire paginated transaction state to HistoryList"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Start backend**

```bash
cd /Users/ducnguyen/code/money-split/money-split-backend
npm run start:dev
```

- [ ] **Step 2: Verify first page loads correctly**

Open the group with the long history (screenshot shows many items). Confirm:
- History tab shows the 20 most recent items on load (not all items)
- Month headers appear correctly even if a page spans two months
- No blank screen or errors in browser console

- [ ] **Step 3: Verify infinite scroll**

Scroll to the bottom of the history list. Confirm:
- Spinner appears briefly
- Next 20 items append below
- Month headers continue correctly across page boundary

- [ ] **Step 4: Verify "load more" stops when exhausted**

Scroll all the way to the bottom until all items are loaded. Confirm:
- Spinner disappears
- No further network requests fire
- Sentinel is still present but observer does nothing

- [ ] **Step 5: Verify real-time update resets to first page**

In a second browser tab, add a new expense to the same group. Confirm:
- The history list in the first tab resets to the first page
- New expense appears at the top

- [ ] **Step 6: Verify cursor amount cap smoke test**

```bash
curl "http://localhost:3000/groups/<groupId>/transactions?limit=2" \
  -H "Authorization: Bearer <token>"
```

Expected: `{ items: [...2 items...], nextCursor: "<base64>", hasMore: true }`

Then:

```bash
curl "http://localhost:3000/groups/<groupId>/transactions?limit=2&cursor=<nextCursor>" \
  -H "Authorization: Bearer <token>"
```

Expected: next 2 items, different from first response.

- [ ] **Step 7: Push both repos**

```bash
cd /Users/ducnguyen/code/money-split/money-split-backend && git push
cd /Users/ducnguyen/code/money-split/money-split-app && git push
```
