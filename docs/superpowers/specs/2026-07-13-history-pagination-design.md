# Payment History Pagination — Design Spec

**Date:** 2026-07-13
**Status:** Approved

## Problem

The payment history endpoint fetches all expenses and settlements for a group in a single query with no limit. As groups accumulate transactions over time, this becomes slow and renders an unbounded list on the frontend. The UI groups by calendar month, which creates a poor first-load experience when a trip starts late in a month (e.g., July 29 — first open shows 2 days of items and feels empty).

## Solution

Cursor-based infinite scroll with **item count** as the loading unit (not calendar month). The backend returns a flat sorted list of 20 items per page; the frontend groups them by month as a display concern. When the user scrolls near the bottom, the next page is appended. Month headers appear naturally as items arrive, regardless of month boundaries.

## Design Decisions

- **Loading unit:** item count (20 per page), not calendar month — avoids sparse-month UX problem.
- **Month grouping:** frontend-only, computed from the flat loaded list.
- **Cursor encoding:** base64 JSON `{ date: string, id: string }` — stable across concurrent writes since it encodes the last item seen, not an offset.
- **Socket updates:** call `fetchTransactionsFirstPage` (reset + reload first 20) rather than insert-in-place. Simpler, correct — user is actively in the group when these fire.
- **Race condition guard:** socket events that fire while `isLoadingMore` is true are deferred until the next-page call completes, preventing state corruption.
- **Error handling:** failed next-page load shows inline retry; does not clear already-loaded items.

---

## Backend

### Modified endpoint

```
GET /groups/:groupId/transactions?limit=20&cursor=<opaque>
Auth: JWT
```

`cursor` is absent on the first page. `limit` defaults to 20, max 50.

### Cursor format

```ts
base64(JSON.stringify({ date: string, id: string }))
```

`date` is the ISO string of the last item's date. `id` is the last item's UUID. Together they provide a stable position even when two items share the same date.

### Query strategy

Fetch `limit` rows from each table independently:

```sql
-- expenses: where date < cursor.date OR (date = cursor.date AND id > cursor.id)
-- settlements: same condition on createdAt / id
```

Merge both result sets in memory (at most `2 × limit` rows), sort by date desc, take the first `limit` items. Check for item `limit + 1` to set `hasMore`. This avoids a raw SQL UNION while keeping the query simple and indexed.

### Response shape

Replaces the current `GroupedTransactionHistory` (keyed object):

```ts
{
  items: HistoryTransaction[]   // flat, sorted date desc, length ≤ limit
  nextCursor: string | null     // null when hasMore is false
  hasMore: boolean
}
```

`HistoryTransaction` shape is unchanged — same fields as today.

---

## Frontend

### Redux state change

Replace:
```ts
transactions: TransactionHistoryMap  // Record<string, HistoryTransaction[]>
```

With:
```ts
transactions: {
  items: HistoryTransaction[]
  nextCursor: string | null
  hasMore: boolean
  isLoadingMore: boolean
}
```

### Thunks

| Thunk | When called | Effect on state |
|---|---|---|
| `fetchTransactionsFirstPage(groupId)` | Group mount, socket events | Replaces `items`, resets `nextCursor`, `hasMore`, `isLoadingMore: false` |
| `fetchTransactionsNextPage(groupId)` | IntersectionObserver fires | Appends to `items`, updates `nextCursor` and `hasMore` |

The existing `fetchTransactions` thunk is replaced by `fetchTransactionsFirstPage`. All call sites (socket handlers, post-settle, post-expense-delete) use `fetchTransactionsFirstPage`.

### Socket event handling

When `expense_created`, `expense_updated`, `expense_deleted`, or `settlement_updated` fires:
1. If `isLoadingMore` is false → dispatch `fetchTransactionsFirstPage` immediately.
2. If `isLoadingMore` is true → set a `pendingRefresh` flag; dispatch `fetchTransactionsFirstPage` once the next-page call completes.

This prevents the first-page reset from racing with an in-flight next-page append.

### `HistoryList` component

Changes:
- Receives `items: HistoryTransaction[]` (flat) instead of `TransactionHistoryMap`.
- Groups by month client-side: `groupByMonth(items)` — same logic as `groupExpensesByMonth`, applied to the flat list.
- Renders a sentinel `<div ref={sentinelRef} />` after the last month section.
- `IntersectionObserver` on the sentinel: when visible and `hasMore && !isLoadingMore`, dispatches `fetchTransactionsNextPage`.
- Shows a spinner row at the bottom when `isLoadingMore`.
- Shows an inline "Failed to load — retry" link on next-page error (does not clear loaded items).

### `GroupDetail` component

- On mount: dispatches `fetchTransactionsFirstPage` instead of `fetchTransactions`.
- Passes flat `items` to `HistoryList` (no longer passes `TransactionHistoryMap`).
- `pendingDeletes` filter applied on top of loaded items as today.

---

## API constant

```ts
TRANSACTIONS: (id: string, cursor?: string, limit = 20) =>
  `${API_BASE_URL}/groups/${id}/transactions?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
```

---

## Files Modified

| File | Change |
|---|---|
| `money-split-backend/src/expenses/expenses.service.ts` | `getGroupTransactions` accepts `limit` + `cursor`, returns flat paginated response |
| `money-split-backend/src/expenses/expenses.controller.ts` | Add `@Query('limit')` and `@Query('cursor')` params |
| `money-split-backend/src/expenses/types/expense-responses.type.ts` | Add `PaginatedTransactionHistory` response type |
| `money-split-app/src/constants/api.constants.ts` | Update `TRANSACTIONS` to accept cursor + limit |
| `money-split-app/src/store/slices/groupSlice.ts` | Replace `transactions: TransactionHistoryMap` state + `fetchTransactions` thunk with paginated equivalents |
| `money-split-app/src/hooks/useGroupEvents.ts` | Use `fetchTransactionsFirstPage`; add `pendingRefresh` guard |
| `money-split-app/src/components/group-detail/HistoryList.tsx` | Accept flat `items[]`, group by month client-side, add IntersectionObserver sentinel |
| `money-split-app/src/components/GroupDetail.tsx` | Use `fetchTransactionsFirstPage` on mount; pass flat items to HistoryList |

---

## Out of Scope

- Search or filter within history
- Jumping to a specific month (scroll-to-month)
- Prefetching the next page before the sentinel is reached
- Changing the default page size (20 is fixed for now)
