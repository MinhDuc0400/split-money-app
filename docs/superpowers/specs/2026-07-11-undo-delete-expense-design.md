# Undo Delete Expense — Design

## Problem

Clicking the trash icon on an expense history row shows an "Are you sure?" confirmation modal (`DeleteConfirmationModal`), then immediately calls the backend's soft-delete (`deleteExpense` thunk → `DELETE /groups/:id/expenses/:expenseId`), which also reverses the expense's balance effects. Clients report mis-clicking this button. A confirmation dialog is friction without being a great safety net (users click through dialogs on autopilot); this replaces it with an undo pattern instead.

## Goal

Clicking delete removes the row immediately (no confirmation dialog) and shows an "Undo" toast for 8 seconds. The real `DELETE` API call is deferred until the grace period expires with no undo. Undo must work even if the user navigates away from Group Detail before the timer ends (e.g. switches to a different group or the dashboard) — the pending delete and its toast persist app-wide.

Scoped to expense deletion only. Settlement rows in history also render a delete button today, but there is no backend endpoint to delete a settlement — that path is already non-functional and out of scope for this feature. `DeleteConfirmationModal` itself is not removed; it's still used by `MemberManager.tsx` for guest removal, which keeps its confirmation step (no undo applies there).

## Why "delay the delete" over "delete then restore"

The backend's `deleteExpense` is a soft delete that also reverses `MemberBalance` effects (see `money-split-backend/src/groups/groups.service.ts`'s `reverseExpenseEffects`). A true restore-after-delete would need a new backend endpoint that un-reverses those effects, correctly handling any other balance-affecting action that happened in the interim (a new expense, a settlement) — real complexity for a mis-click safety net. Delaying the API call entirely needs zero backend changes: the expense is never touched until the grace period truly expires, so "undo" is just "never send the request."

## Architecture

```
GroupDetail.tsx (click delete)
  → dispatch pendingDeleteAdded({ expenseId, groupId, description })
  → row disappears (filtered out of what's passed to HistoryList)

UndoToastContainer (always mounted in App.tsx, sibling to <Layout>)
  → reads state.pendingDeletes
  → owns one setTimeout per entry
  → renders one UndoToast per entry, stacked
  → on "Undo" click: clearTimeout, dispatch pendingDeleteCancelled (no API call)
  → on timer fire: dispatch deleteExpense(existing thunk) → dispatch pendingDeleteResolved
    → on failure: dispatch pendingDeleteResolved anyway (row reappears, since it
      was never removed from the real expenses data) + show a short error toast
```

Because `UndoToastContainer` is mounted once at the `AppInner` level in `App.tsx` (the same level that already renders `<AddExpense>` as a persistent sibling to `<Layout>` — see `App.tsx`'s `AppInner`, where `isAddExpenseOpen && <AddExpense />` sits outside `<Layout>{...}</Layout>` but inside the same return, so it isn't affected by `<Routes>` swapping pages), it never unmounts when the user navigates between routes. Any `GroupDetail.tsx` instance (for whichever group is currently being viewed) independently filters its own expense list against the same global `pendingDeletes` state, so a pending-delete row stays hidden even if you leave and come back to that group's page while the timer is still running.

## State: new `pendingDeletesSlice.ts`

```ts
interface PendingDelete {
    expenseId: string;
    groupId: string;
    description: string; // for toast text, e.g. "Dinner deleted"
    expiresAt: number;    // Date.now() + 8000 at creation, fixed
}
// state shape: Record<string, PendingDelete>  (keyed by expenseId)
```

Actions:
- `pendingDeleteAdded(payload: PendingDelete)` — start the grace period for one expense.
- `pendingDeleteCancelled(expenseId: string)` — undo; removes the entry, no side effect.
- `pendingDeleteResolved(expenseId: string)` — removes the entry after the real delete has been attempted (success or failure).

No thunks in this slice — it's pure ephemeral UI state. The container dispatches the *existing* `deleteExpense` thunk from `groupSlice.ts` when a timer fires; this slice only tracks "is X currently in its grace period."

Registered in `store/index.ts`'s `rootReducer` alongside `groups`/`finance`/`auth`. Not persisted (add to `persistConfig.blacklist`, matching how `groups`/`finance` are already blacklisted) — a pending delete surviving a page reload would be confusing (the timer's wall-clock `expiresAt` would already be in the past or nonsensical after a reload gap).

## Components

**`GroupDetail.tsx`:**
- Remove `deletingExpenseId`, `isDeleting` state and the `<DeleteConfirmationModal>` render for expenses (its only caller here).
- `handleDeleteClick(id)` becomes: look up the expense's `description` from `expenses`, dispatch `pendingDeleteAdded({ expenseId: id, groupId: activeGroupId, description, expiresAt: Date.now() + 8000 })`.
- Before passing `expenses`/`transactions` to `HistoryList`, filter out any entry whose `id` is a key in `state.pendingDeletes` (a `useAppSelector` + `useMemo`).

**New `src/components/UndoToast.tsx`** — single toast, presentational:
- Props: `description: string`, `onUndo: () => void`, `expiresAt: number` (for an optional shrinking progress bar — nice-to-have, not required).
- Content: `"{description} deleted"` + a verb-first "Undo" button. Sentence case, no exclamation marks, matches MASTER.md §7.

**New `src/components/UndoToastContainer.tsx`** — owns timers:
- `useAppSelector` on `state.pendingDeletes`, renders one `UndoToast` per entry in a fixed-position stack (`bottom-center`, above the mobile bottom-nav's z-index).
- For each entry, a `useEffect` sets a `setTimeout` firing at `expiresAt - Date.now()`; on fire, dispatches `deleteExpense({ groupId, expenseId })`, then `pendingDeleteResolved(expenseId)` regardless of success/failure. On failure (`.unwrap()` throws), additionally show a short-lived error toast: `"Couldn't delete {description}. Try again."` (a separate, simpler local toast, not part of the `pendingDeletes` slice, since it's not undo-able — just an FYI).
- "Undo" button: `clearTimeout` for that entry, dispatch `pendingDeleteCancelled(expenseId)`.

**`App.tsx`:** render `<UndoToastContainer />` as an always-present sibling to `<Layout>` (same pattern as the existing conditional `<AddExpense>`, but unconditional — the container itself decides whether it has anything to show).

## Content Voice

- Toast: `"{description} deleted"`, e.g. `"Dinner deleted"`. No exclamation mark, no "successfully."
- Button: `"Undo"` (verb, 1 word).
- Error toast: `"Couldn't delete {description}. Try again."` — states what happened, what to do, no first person, no "Error:" prefix.

## Out of Scope

- Settlement deletion (no backend endpoint exists; unrelated pre-existing gap).
- A general-purpose/reusable toast system for other notifications — this is scoped to delete-undo only. If the app wants toasts elsewhere later, that's a separate design.
- Backend changes of any kind.
