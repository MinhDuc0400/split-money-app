# Undo Delete Expense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Are you sure?" confirmation dialog on expense deletion with an immediate optimistic hide + an 8-second "Undo" toast; the real `DELETE` API call only fires if the grace period expires without undo, and undo works even after navigating away from Group Detail.

**Architecture:** A new ephemeral Redux slice (`pendingDeletesSlice`) tracks in-flight grace-period deletes, keyed by expense ID. A single always-mounted `UndoToastContainer` (rendered inside `App.tsx`'s persistent `<Layout>` children, so it survives route changes) owns the actual `setTimeout` per entry and fires the existing `deleteExpense` thunk when a timer expires. `GroupDetail.tsx` filters its expense/transaction lists against this slice so a pending-delete row disappears immediately, and its delete button now just starts the grace period instead of opening a confirmation modal.

**Tech Stack:** React 19, Redux Toolkit, framer-motion (already a dependency, used for all existing modal/list animations), Tailwind CSS.

## Global Constraints

- No test runner exists in this repo (confirmed: no vitest/jest in `package.json`, no `*.test.*` files). Verification per task is `npx tsc --noEmit`, `npm run lint`, and a manual reasoning/dev-server check — matching how every other task in this codebase's history has been verified.
- This repo's default Node (16, via a bare shell) crashes `npm run lint` with an unrelated `structuredClone`/ESLint-9 incompatibility. Use `source ~/.nvm/nvm.sh && nvm use v22.21.1 && npm run lint` to get a real signal. This is a pre-existing environment quirk, not something to fix as part of this plan.
- Content voice (existing app convention): sentence case, no exclamation marks, no "successfully". Toast text: `"{description} deleted"`; button: `"Undo"` (verb, 1 word); error toast: `"Couldn't delete {description}. Try again."`
- Scope: expense deletion only. Settlement rows also render a delete button today but have no backend delete endpoint — that's a pre-existing, unrelated gap, not touched here.
- `DeleteConfirmationModal.tsx` is NOT deleted — `MemberManager.tsx` still uses it for guest removal, which keeps its confirmation step.
- Motion: use the same `framer-motion` `initial`/`animate`/`exit` + `AnimatePresence` pattern already used throughout this codebase (e.g. `DeleteConfirmationModal.tsx`, `SettlementPlanList.tsx`), ~150-200ms.

---

### Task 1: `pendingDeletesSlice` — ephemeral grace-period state

**Files:**
- Create: `src/store/slices/pendingDeletesSlice.ts`
- Modify: `src/store/index.ts`

**Interfaces:**
- Produces: `PendingDelete` interface (`{ expenseId: string; groupId: string; description: string; expiresAt: number }`), actions `pendingDeleteAdded(payload: PendingDelete)`, `pendingDeleteCancelled(expenseId: string)`, `pendingDeleteResolved(expenseId: string)`, default export reducer, state shape `{ items: Record<string, PendingDelete> }` mounted at `state.pendingDeletes`. Task 2 and Task 3 both depend on these exact names.

- [ ] **Step 1: Create the slice**

```ts
// src/store/slices/pendingDeletesSlice.ts
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
```

(The `eslint-disable-next-line @typescript-eslint/no-dynamic-delete` comments match the existing pattern in `src/store/slices/financeSlice.ts`'s `deleteGroupData` reducer — this codebase already has that lint rule enabled and already suppresses it the same way for dynamic-key deletes.)

- [ ] **Step 2: Register the reducer and blacklist it from persistence**

In `src/store/index.ts`, add the import:

```ts
import pendingDeletesReducer from './slices/pendingDeletesSlice';
```

Change:

```ts
const rootReducer = combineReducers({
    groups: groupReducer,
    finance: financeReducer,
    auth: authReducer,
});
```

to:

```ts
const rootReducer = combineReducers({
    groups: groupReducer,
    finance: financeReducer,
    auth: authReducer,
    pendingDeletes: pendingDeletesReducer,
});
```

Change:

```ts
    blacklist: ['groups', 'finance'],
```

to:

```ts
    blacklist: ['groups', 'finance', 'pendingDeletes'],
```

(Blacklisted because a pending delete's `expiresAt` is a wall-clock timestamp fixed at creation — surviving a page reload would either fire instantly or behave confusingly after a reload gap. `groups`/`finance` are already blacklisted for similar reasons; follow that precedent.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/slices/pendingDeletesSlice.ts src/store/index.ts
git commit -m "feat: add pendingDeletesSlice for undo-delete grace period state"
```

---

### Task 2: `Toast` + `UndoToastContainer` components

**Files:**
- Create: `src/components/Toast.tsx`
- Create: `src/components/UndoToastContainer.tsx`

**Interfaces:**
- Consumes: `state.pendingDeletes.items` and `pendingDeleteCancelled`/`pendingDeleteResolved` from Task 1; the existing `deleteExpense` thunk from `src/store/slices/groupSlice.ts` (signature: `deleteExpense({ groupId: string; expenseId: string }): AsyncThunk` — already used elsewhere in this codebase, e.g. `GroupDetail.tsx`'s old `handleConfirmDelete`); `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`.
- Produces: `Toast({ message, actionLabel?, onAction? })` presentational component; `UndoToastContainer()` (no props) — Task 3 renders this once in `App.tsx`.

- [ ] **Step 1: Create the presentational `Toast`**

```tsx
// src/components/Toast.tsx
import { motion } from 'framer-motion';

interface ToastProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function Toast({ message, actionLabel, onAction }: ToastProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-4 bg-card border border-border shadow-xl px-4 py-3 rounded-xl min-w-[280px] max-w-sm"
        >
            <p className="text-sm text-foreground flex-1">{message}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="text-sm font-semibold text-primary hover:underline shrink-0"
                >
                    {actionLabel}
                </button>
            )}
        </motion.div>
    );
}
```

- [ ] **Step 2: Create `UndoToastContainer`**

```tsx
// src/components/UndoToastContainer.tsx
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from './Toast';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { pendingDeleteCancelled, pendingDeleteResolved } from '../store/slices/pendingDeletesSlice';
import { deleteExpense } from '../store/slices/groupSlice';

interface ErrorToastEntry {
    id: string;
    message: string;
}

export function UndoToastContainer() {
    const dispatch = useAppDispatch();
    const pendingDeletes = useAppSelector(state => state.pendingDeletes.items);
    const [errorToasts, setErrorToasts] = useState<ErrorToastEntry[]>([]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        Object.values(pendingDeletes).forEach((entry) => {
            if (timers.current[entry.expenseId]) return;

            const delay = Math.max(0, entry.expiresAt - Date.now());
            timers.current[entry.expenseId] = setTimeout(() => {
                delete timers.current[entry.expenseId];
                dispatch(deleteExpense({ groupId: entry.groupId, expenseId: entry.expenseId }))
                    .unwrap()
                    .catch(() => {
                        const errorId = `${entry.expenseId}-${Date.now()}`;
                        setErrorToasts(prev => [...prev, { id: errorId, message: `Couldn't delete ${entry.description}. Try again.` }]);
                        setTimeout(() => {
                            setErrorToasts(prev => prev.filter(t => t.id !== errorId));
                        }, 5000);
                    })
                    .finally(() => {
                        dispatch(pendingDeleteResolved(entry.expenseId));
                    });
            }, delay);
        });

        Object.keys(timers.current).forEach((expenseId) => {
            if (!pendingDeletes[expenseId]) {
                clearTimeout(timers.current[expenseId]);
                delete timers.current[expenseId];
            }
        });
    }, [pendingDeletes, dispatch]);

    useEffect(() => {
        const timersAtMount = timers.current;
        return () => {
            Object.values(timersAtMount).forEach(clearTimeout);
        };
    }, []);

    const handleUndo = (expenseId: string) => {
        const timer = timers.current[expenseId];
        if (timer) {
            clearTimeout(timer);
            delete timers.current[expenseId];
        }
        dispatch(pendingDeleteCancelled(expenseId));
    };

    const entries = Object.values(pendingDeletes);
    if (entries.length === 0 && errorToasts.length === 0) return null;

    return (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col-reverse gap-2 items-center px-4 w-full pointer-events-none">
            <AnimatePresence>
                {entries.map((entry) => (
                    <div key={entry.expenseId} className="pointer-events-auto">
                        <Toast
                            message={`${entry.description} deleted`}
                            actionLabel="Undo"
                            onAction={() => { handleUndo(entry.expenseId); }}
                        />
                    </div>
                ))}
                {errorToasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <Toast message={t.message} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
```

Notes for the implementer:
- `bottom-20 md:bottom-6`: the mobile bottom nav (`src/components/Layout.tsx`) is `fixed bottom-0 ... z-20`; `bottom-20` clears it on mobile, `md:bottom-6` sits low on desktop where there's no bottom nav. This container uses `z-40`, above the nav's `z-20`.
- The imperative `timers` ref (not Redux) is deliberate: Redux holds *what* is pending, this component alone owns the actual `setTimeout` handles as a side effect, matching the design doc.
- `pointer-events-none` on the wrapper + `pointer-events-auto` on each toast lets clicks pass through the empty area around toasts while keeping the toasts themselves clickable.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Nothing imports `UndoToastContainer` yet (Task 3 wires it in), so this only validates the file's own correctness.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx src/components/UndoToastContainer.tsx
git commit -m "feat: add Toast and UndoToastContainer components for delete-undo"
```

---

### Task 3: Wire undo into `App.tsx` and `GroupDetail.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/GroupDetail.tsx`

**Interfaces:**
- Consumes: `UndoToastContainer` (Task 2), `pendingDeleteAdded` (Task 1), `state.pendingDeletes.items` (Task 1).
- Produces: nothing new — this is the integration point; no later task depends on it.

Confirmed by grep: in the current `GroupDetail.tsx`, the `deleteExpense` method destructured from `useGroup()` (line 36) has exactly one call site — inside `handleConfirmDelete` (line 152), which this task removes entirely. It will be unused after this task's edits; remove it from the `useGroup()` destructure (do not leave it as dead code).

- [ ] **Step 1: Mount `UndoToastContainer` in `App.tsx`**

In `src/App.tsx`, add the import:

```tsx
import { UndoToastContainer } from './components/UndoToastContainer';
```

Change the `AppInner` return's `<Layout>` block from:

```tsx
        <Layout onAddExpense={handleOpenAddExpense}>
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/" element={<GlobalDashboard />} />
                    <Route path="/groups" element={<MobileGroupList />} />
                    <Route path="/group/:id" element={<Dashboard />} />
                    <Route path="/group/:id/details" element={<GroupDetail />} />
                    <Route path="/group/:id/members" element={<MemberManager />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
            {isAddExpenseOpen ? (
                <Suspense fallback={null}>
                    <AddExpense onClose={handleCloseAddExpense} />
                </Suspense>
            ) : null}
        </Layout>
```

to:

```tsx
        <Layout onAddExpense={handleOpenAddExpense}>
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/" element={<GlobalDashboard />} />
                    <Route path="/groups" element={<MobileGroupList />} />
                    <Route path="/group/:id" element={<Dashboard />} />
                    <Route path="/group/:id/details" element={<GroupDetail />} />
                    <Route path="/group/:id/members" element={<MemberManager />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
            {isAddExpenseOpen ? (
                <Suspense fallback={null}>
                    <AddExpense onClose={handleCloseAddExpense} />
                </Suspense>
            ) : null}
            <UndoToastContainer />
        </Layout>
```

`UndoToastContainer` renders unconditionally (it returns `null` internally when there's nothing pending). Since `<Layout>` itself never unmounts across route changes (only the `<Routes>` inside it swap pages), and this container sits alongside `<Routes>` as a sibling child of `<Layout>` rather than inside any individual route's page component, it stays mounted — and its timers keep running — no matter which page the user navigates to.

- [ ] **Step 2: Rewire `GroupDetail.tsx`'s delete flow**

In `src/components/GroupDetail.tsx`, add the import:

```tsx
import { pendingDeleteAdded } from '../store/slices/pendingDeletesSlice';
import type { TransactionHistoryMap } from '../types/expense.types';
```

Remove the import (no longer used in this file):

```tsx
import { DeleteConfirmationModal } from './group-detail/DeleteConfirmationModal';
```

Remove these two state declarations:

```tsx
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
```
```tsx
    const [isDeleting, setIsDeleting] = useState(false);
```

Add a selector for pending deletes right after the existing `const dispatch = useAppDispatch();` line:

```tsx
    const pendingDeletes = useAppSelector(state => state.pendingDeletes.items);
```

Replace:

```tsx
    const handleDeleteClick = (id: string) => {
        setDeletingExpenseId(id);
    };

    const handleConfirmDelete = async () => {
        if (deletingExpenseId) {
            setIsDeleting(true);
            try {
                await deleteExpense(deletingExpenseId);
                setDeletingExpenseId(null);
            } finally {
                setIsDeleting(false);
            }
        }
    };
```

with:

```tsx
    const handleDeleteClick = (id: string) => {
        if (!activeGroupId) return;
        const target = expenses.find(e => e.id === id);
        dispatch(pendingDeleteAdded({
            expenseId: id,
            groupId: activeGroupId,
            description: target?.description ?? 'Expense',
            expiresAt: Date.now() + 8000,
        }));
    };
```

Remove `deleteExpense` from the `useGroup()` destructure at the top of the component (it has no remaining callers in this file after the change above — the real delete now happens inside `UndoToastContainer` via the Redux thunk of the same name, imported separately there; this is the `useGroup()` context method, not that thunk, and it would otherwise be flagged as an unused variable).

Add filtered lists right after the existing `memberMap`/`getMemberName`/`getMemberAvatar` block (anywhere before the `return` is fine — place it near where `expenses`/`transactions` are already in scope):

```tsx
    const visibleExpenses = useMemo(
        () => expenses.filter(e => !pendingDeletes[e.id]),
        [expenses, pendingDeletes]
    );
    const visibleTransactions = useMemo(() => {
        const filtered: TransactionHistoryMap = {};
        Object.entries(transactions).forEach(([month, items]) => {
            filtered[month] = items.filter(item => !pendingDeletes[item.id]);
        });
        return filtered;
    }, [transactions, pendingDeletes]);
```

Change the `<HistoryList>` call from:

```tsx
                <HistoryList
                    expenses={expenses}
                    transactions={transactions}
                    currency={currency}
                    getMemberName={getMemberName}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onAddExpense={() => { setIsAddingExpense(true); }}
                />
```

to:

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

Remove the `<DeleteConfirmationModal>` block entirely:

```tsx
            <DeleteConfirmationModal
                isOpen={!!deletingExpenseId}
                onClose={() => setDeletingExpenseId(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
            />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `deleteExpense` (from `useGroup()`) is now unused in this file, TypeScript/ESLint will flag it — remove it from the `useGroup()` destructure at the top of the component in that case.

- [ ] **Step 4: Lint**

Run: `source ~/.nvm/nvm.sh && nvm use v22.21.1 && npm run lint`
Expected: same pre-existing error count as before this task (no new errors in `App.tsx` or `GroupDetail.tsx`).

- [ ] **Step 5: Manual verification**

`npm run dev` (or the docker dev stack), then in a group with at least one expense:
- Click the trash icon on a history row: no confirmation dialog appears; the row disappears immediately; a toast reading `"<description> deleted"` with an "Undo" button appears at the bottom of the screen.
- Click "Undo" within 8 seconds: the row reappears in history, the toast disappears, and no network request was sent (check the Network tab — no `DELETE` call for that expense).
- Delete another expense and let the 8 seconds pass without clicking Undo: the toast disappears on its own, and the expense is now actually gone (refresh the page to confirm it doesn't come back).
- Delete an expense, then immediately navigate to a different group or the dashboard before the 8 seconds pass: the toast should still be visible and "Undo" should still work from the new page.
- Delete two expenses in quick succession: two toasts stack; undoing one doesn't affect the other.
- Confirm `MemberManager.tsx`'s guest-removal flow (unrelated to this feature) still shows its own confirmation dialog as before — `DeleteConfirmationModal` itself wasn't touched.
- Check both light and dark mode, desktop and 375px width, for the toast's appearance and stacking position (it should sit above the mobile bottom nav).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/GroupDetail.tsx
git commit -m "feat: wire delete-undo into GroupDetail, remove confirmation dialog for expense delete"
```

---

## Self-Review

- **Spec coverage:** UX flow (Task 3 step 2 + step 5 verification) ✓. State management design (Task 1) ✓. Components + edge cases — grouping/stacking (`flex-col-reverse` in container), failure handling (`.catch` + error toast), navigate-away persistence (`App.tsx` placement), settlement rows untouched, `DeleteConfirmationModal` preserved for guest removal (Task 3 step 2 explicitly leaves it importable elsewhere) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has complete code.
- **Type consistency:** `PendingDelete` (Task 1) is used identically in Task 2 (`entry.expenseId`, `entry.groupId`, `entry.description`, `entry.expiresAt`) and Task 3 (`pendingDeleteAdded({ expenseId, groupId, description, expiresAt })`) — same field names throughout. Action names (`pendingDeleteAdded`, `pendingDeleteCancelled`, `pendingDeleteResolved`) match between Task 1's exports and Task 2/3's imports.
