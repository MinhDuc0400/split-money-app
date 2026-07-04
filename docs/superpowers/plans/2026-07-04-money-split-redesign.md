# Money Split Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Tasks A–G from `design-system/remaining-work.md`: light-mode contrast fix, guest member management, the 4-step Add Expense flow, dashboard/group-detail/settle-up redesigns, and consistent empty/error/loading states.

**Architecture:** React 19 + Redux Toolkit + Tailwind SPA. All screens consume `GroupContext` (`src/context/GroupContext.tsx`), which wraps thunks in `src/store/slices/groupSlice.ts` calling a NestJS backend via `src/lib/api.ts`. The redesign is presentation-layer plus one new data slice concern (guests); split math in `src/lib/accounting.ts` is untouched.

**Tech Stack:** React 19, TypeScript 5.9, Redux Toolkit, Tailwind 3.4, framer-motion, lucide-react, Vite 7.

**Testing reality:** This repo has **no test runner** (no vitest/jest in `package.json`). The spec (`design-system/remaining-work.md` §Verification) defines verification as: `npx tsc --noEmit`, lint, and visual confirmation in the dev server (light + dark, desktop + 375px). Every task ends with those steps instead of a unit-test cycle. Do NOT add a test framework — that is out of scope.

**Backend note:** Guest endpoints already exist in `money-split-backend` commit `88260d7`: `POST /groups/:id/guests`, `PATCH /groups/:id/guests/:guestId`, `DELETE /groups/:id/guests/:guestId` (body `{ name: string }` except DELETE). `GroupMember` has `isGuest: boolean`. Backend tasks B1/B2 (apply migration, verify `findOne` response) live in the backend repo and are NOT part of this plan. If the backend/DB is unreachable during visual verification, verify rendering with whatever data loads, note the gap honestly, and do not fake success.

## Global Constraints

Copied from `design-system/MASTER.md` — every task must obey these:

- Use ONLY existing CSS tokens from `src/index.css` (`--primary`, `--positive`, `--negative`, `--warning`, `--muted`, etc.). Never invent new token names.
- Icons: `lucide-react` only. Never emoji as icons.
- At most ONE `bg-primary`-filled button visible per screen (global chrome like the Layout FAB doesn't count against a page's one primary).
- Every element rendering a currency amount gets Tailwind's `tabular-nums` class.
- Dense lists = bordered rows (`border-b border-border`), not per-row cards. Cards reserved for bounded single objects (settlement plan, dashboard summary, expense sheet).
- Content voice: sentence case everywhere ("Add expense", never "Add Expense"); verb-first buttons 1–3 words; "your" not "my"; errors state what happened then what to do, no "Error:" prefix, no first person; no "successfully", no "please", no exclamation marks; empty states are an invitation (icon + headline + body + verb-first CTA), never a bare "No X yet".
- Touch targets ≥ 44px; icon-only buttons get `aria-label`; motion 150–200ms ease-out (match existing 0.2s accordion timing).
- Loading >300ms = skeleton placeholders (`bg-muted animate-pulse` blocks matching content shape), not spinners. No new loading library.
- The `.dark` token block in `src/index.css` must not change.
- Guests are visually identical to members except a small "Guest" tag — never a color/emphasis difference.
- Commit after each task with a conventional message ending in:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

**Verification commands (every task):**
```bash
npx tsc --noEmit          # expect: no output, exit 0
npm run lint              # expect: no new errors in files you touched
npm run dev               # visual check: light + dark, desktop + 375px viewport
```

**Documented deviation (decided at planning time):** Task D's spec asks each dashboard group row to show "per-group balance or 'Settled'". The server only exposes a cross-group summary (`/balances/summary`); per-group balances require one fetch per group, and local expense math ignores settlements (see the warning comment in `GroupDetail.tsx:88-90`), so it would show wrong numbers. The row shows name + member count (when known) instead. A per-group balance summary endpoint is flagged as a backend follow-up in the final report.

---

### Task 1: Light-mode contrast fix (spec Task A)

**Files:**
- Modify: `src/index.css` (`:root` block only, lines 43–47)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new — same token names, corrected values.

- [ ] **Step 1: Edit the three lightness values**

In `src/index.css`, inside `:root` (NOT `.dark`), change exactly:

```css
    /* 💰 Financial semantics */
    --positive: 158 36% 36%;
    /* user is owed */
    --negative: 12 68% 42%;
    /* user owes */
    --warning: 45 93% 29%;
    /* almost balanced / warnings */
```

(Previous values were 42% / 52% / 47%. Hue and saturation unchanged. The `.dark` block already passes contrast — do not touch it.)

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint` — expect clean.

- [ ] **Step 3: Visual spot-check**

Start dev server. In **light mode**, view the dashboard and a group detail page: positive ("you're owed") and negative ("you owe") amounts should look clearly darker/more saturated than before, not washed out. Toggle dark mode: identical to before (values unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "fix: darken light-mode positive/negative/warning tokens to clear 4.5:1 contrast"
```

---

### Task 2: Guest data layer (spec Task B, part 1 — types, API, thunks, context)

**Files:**
- Modify: `src/types/member.types.ts`
- Modify: `src/types/group.types.ts` (`GroupMember`)
- Modify: `src/constants/api.constants.ts`
- Modify: `src/store/slices/groupSlice.ts`
- Modify: `src/context/GroupContext.tsx`

**Interfaces:**
- Consumes: backend guest endpoints (see Backend note).
- Produces (later tasks rely on these exact names):
  - `Member.isGuest?: boolean` (on `src/types/member.types.ts`)
  - Context `addMember(name: string): Promise<void>` — creates a guest
  - Context `updateMemberName(id: string, name: string): Promise<void>` — renames a guest (PATCH guests endpoint; UI must only call it for guests)
  - Context `removeMember(id: string): Promise<void>` — deletes a guest (DELETE guests endpoint; rejects with the backend's 403 message on unsettled balance)
  - Thunks `addGuest`, `renameGuest`, `removeGuest` exported from `groupSlice.ts`

- [ ] **Step 1: Extend the types**

`src/types/member.types.ts` — full new content:

```ts
export interface Member {
    id: string;
    name: string;
    avatar?: string; // URL or emoji
    userId?: string;
    role?: string;
    isGuest?: boolean;
}
```

`src/types/group.types.ts` — change `GroupMember` to (guests have no Google account, so `userId`/`avatarUrl` are nullable):

```ts
export interface GroupMember {
    id: string;
    groupId: string;
    userId: string | null;
    name: string;
    avatarUrl: string | null;
    role: string;
    isGuest: boolean;
    joinedAt: string;
    deletedAt: string | null;
}
```

- [ ] **Step 2: Add guest endpoints**

In `src/constants/api.constants.ts`, inside `GROUPS`, after the `LEAVE` line add:

```ts
        GUESTS: (id: string) => `${API_BASE_URL}/groups/${id}/guests`,
        GUEST_BY_ID: (groupId: string, guestId: string) => `${API_BASE_URL}/groups/${groupId}/guests/${guestId}`,
```

- [ ] **Step 3: Add thunks and reducers in `groupSlice.ts`**

Update `toMember()` to thread `isGuest` (same pattern as `role`):

```ts
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
```

After the `createSettlement` thunk, add:

```ts
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
```

In `extraReducers`, after the `createSettlement` cases, add (use `action.meta.arg` for the groupId so we don't depend on the response echoing it):

```ts
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
            })
```

Do NOT add `pending`/`rejected` handlers that flip the global `isLoading` — guest mutations surface their errors locally in the UI (Task 3), and a global spinner for a rename would be wrong.

- [ ] **Step 4: Wire `GroupContext.tsx`**

Import the new thunks (extend the existing import from `groupSlice`):

```ts
import {
    fetchGroups, createGroup, updateGroupApi, deleteGroupApi, setActiveGroup, joinGroup, fetchGroupById, createExpense, updateExpense, deleteExpense, fetchTransactions, fetchUserBalance, fetchSettlements, fetchGroupBalances, createSettlement, fetchBalanceSummary, leaveGroupApi, addGuest, renameGuest, removeGuest
} from '../store/slices/groupSlice';
```

In the `members` memo (line ~70), thread `isGuest` and fix the now-nullable `avatarUrl`/`userId`:

```ts
            return activeGroup.members.map(m => ({
                id: m.id,
                name: m.name,
                avatar: m.avatarUrl ?? undefined,
                userId: m.userId ?? undefined,
                role: m.role,
                isGuest: m.isGuest ?? false
            }));
```

Replace the two no-op handlers and `handleRemoveMember` (lines ~102–109) with:

```ts
    const handleAddMember = async (name: string) => {
        if (!activeGroupId) return;
        await dispatch(addGuest({ groupId: activeGroupId, name })).unwrap();
    };

    const handleUpdateMemberName = async (id: string, name: string) => {
        if (!activeGroupId) return;
        await dispatch(renameGuest({ groupId: activeGroupId, guestId: id, name })).unwrap();
    };

    const handleRemoveMember = async (id: string) => {
        if (!activeGroupId) return;
        await dispatch(removeGuest({ groupId: activeGroupId, guestId: id })).unwrap();
    };
```

Update the `GroupContextType` interface signatures to match:

```ts
    addMember: (name: string) => Promise<void>;
    updateMemberName: (id: string, name: string) => Promise<void>;
    removeMember: (id: string) => Promise<void>;
```

Leave `removeMemberAndRedistribute` and the `financeSlice` local-removal actions untouched (Task 3 stops using them from MemberManager, but other code may reference them; deleting is not required).

Note on errors: `unwrap()` rejects with a **serialized error object**, not an `Error` instance — the backend message is on `.message`. UI catch blocks (Task 3) must read it as `(err as { message?: string }).message`.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`. Fix any fallout from the nullable `GroupMember.userId`/`avatarUrl` (e.g. `GroupDetail.tsx` compares `m.userId === authUser.id` — still fine with `undefined`; check `SocketManager`/`useGroupEvents` usages if the compiler flags them).

- [ ] **Step 6: Commit**

```bash
git add src/types/member.types.ts src/types/group.types.ts src/constants/api.constants.ts src/store/slices/groupSlice.ts src/context/GroupContext.tsx
git commit -m "feat: add guest member data layer (types, endpoints, thunks, context wiring)"
```

---

### Task 3: Member Management UI with guests (spec Task B, part 2)

**Files:**
- Create: `src/components/GuestTag.tsx`
- Create: `src/components/Avatar.tsx`
- Create: `src/components/member-manager/AddGuestForm.tsx`
- Delete: `src/components/member-manager/AddMemberForm.tsx`
- Modify: `src/components/MemberManager.tsx` (full rewrite below)
- Modify: `src/components/member-manager/MemberListItem.tsx` (full rewrite below)

**Interfaces:**
- Consumes: context `addMember`/`updateMemberName`/`removeMember` from Task 2; `Member.isGuest`; existing `InvitationBox` (`src/components/group-detail/InvitationBox.tsx`, prop `inviteCode: string`); context `activeGroup` (has `inviteCode`).
- Produces (Task 4 relies on these): `GuestTag` — no-prop component rendering the small "Guest" chip; `Avatar` — `{ name: string; src?: string | null; className?: string }` with initials fallback (guests have no avatar URL).

- [ ] **Step 1: Create `src/components/GuestTag.tsx`**

```tsx
export function GuestTag() {
    return (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Guest
        </span>
    );
}
```

- [ ] **Step 2: Create `src/components/Avatar.tsx`**

Per MASTER §8: fallback is initials on `bg-muted`.

```tsx
import { cn } from '../lib/utils';

interface AvatarProps {
    name: string;
    src?: string | null;
    className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
    const initials = name
        .split(' ')
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className={cn('w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0', className)}>
            {src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xs font-semibold text-muted-foreground">{initials || '?'}</span>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Create `src/components/member-manager/AddGuestForm.tsx`**

```tsx
import { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface AddGuestFormProps {
    onAddGuest: (name: string) => Promise<void>;
}

export function AddGuestForm({ onAddGuest }: AddGuestFormProps) {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onAddGuest(trimmed);
            setName('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="flex gap-2">
            <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); }}
                placeholder="Guest's name"
                disabled={isSubmitting}
                className="flex-1 bg-secondary/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                aria-label="Add guest"
                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <UserPlus className="w-5 h-5" />
            </button>
        </form>
    );
}
```

Delete `src/components/member-manager/AddMemberForm.tsx` (`git rm`).

- [ ] **Step 4: Rewrite `src/components/member-manager/MemberListItem.tsx`**

Guests get rename + remove controls; real members get neither (their names come from Google; they leave via Group Detail). Full new content:

```tsx
import { useState } from 'react';
import { Trash2, Pencil, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { formatAmount } from '../../lib/currency';
import { isBalanceSettled } from '../../lib/accounting';
import { Avatar } from '../Avatar';
import { GuestTag } from '../GuestTag';
import type { Member } from '../../types/member.types';

interface MemberListItemProps {
    member: Member;
    balances: Record<string, Record<string, number>>;
    onUpdateName: (id: string, name: string) => Promise<void>;
    onRemove: (id: string) => void;
}

export function MemberListItem({ member, balances, onUpdateName, onRemove }: MemberListItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(member.name);
    const isGuest = member.isGuest ?? false;

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditName(member.name);
    };

    const handleSaveEdit = () => {
        if (editName.trim()) {
            void onUpdateName(member.id, editName.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName(member.name);
    };

    const memberBalances = Object.entries(balances)
        .map(([curr, currencyBalances]) => ({
            currency: curr,
            balance: currencyBalances[member.id] || 0
        }))
        .filter(({ balance }) => !isBalanceSettled(balance));

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 group hover:bg-secondary/50 transition-colors"
        >
            {isEditing ? (
                <div className="flex-1 flex gap-2 items-center mr-2">
                    <input
                        value={editName}
                        onChange={e => { setEditName(e.target.value); }}
                        className="bg-card border border-primary/50 rounded px-2 py-1 text-sm flex-1 focus:outline-none"
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                        }}
                    />
                    <button onClick={handleSaveEdit} aria-label="Save name" className="p-1 text-positive hover:bg-positive/10 rounded">
                        <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancelEdit} aria-label="Cancel rename" className="p-1 text-muted-foreground hover:bg-secondary rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={member.name} src={member.avatar} />
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        {isGuest && <GuestTag />}
                        {isGuest && (
                            <button
                                onClick={handleStartEdit}
                                aria-label={`Rename ${member.name}`}
                                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-0.5">
                            {memberBalances.map(({ currency, balance }) => (
                                <span key={currency} className={cn("text-xs font-medium tabular-nums", balance > 0 ? "text-positive" : "text-negative")}>
                                    {balance > 0 ? '+' : '−'}{formatAmount(Math.abs(balance), currency)}
                                </span>
                            ))}
                        </div>

                        {isGuest && (
                            <button
                                onClick={() => { onRemove(member.id); }}
                                aria-label={`Remove ${member.name}`}
                                className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </motion.div>
    );
}
```

- [ ] **Step 5: Rewrite `src/components/MemberManager.tsx`**

Two-path add UI, error banner surfacing backend messages verbatim, guest remove confirmation. Full new content:

```tsx
import { useState } from 'react';
import { useGroup } from '../context/GroupContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AddGuestForm } from './member-manager/AddGuestForm';
import { MemberListItem } from './member-manager/MemberListItem';
import { ResetConfirmDialog } from './member-manager/ResetConfirmDialog';
import { InvitationBox } from './group-detail/InvitationBox';

function errorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        return (err as { message: string }).message;
    }
    return fallback;
}

export function MemberManager() {
    const { members, balances, activeGroup, addMember, updateMemberName, removeMember, resetGroup } = useGroup();
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const handleAddGuest = async (name: string) => {
        setActionError(null);
        try {
            await addMember(name);
        } catch (err) {
            setActionError(errorMessage(err, "That guest couldn't be added. Try again."));
        }
    };

    const handleRename = async (id: string, name: string) => {
        setActionError(null);
        try {
            await updateMemberName(id, name);
        } catch (err) {
            setActionError(errorMessage(err, "That name couldn't be saved. Try again."));
        }
    };

    const handleConfirmRemove = async () => {
        if (!removeCandidate) return;
        setIsRemoving(true);
        setActionError(null);
        try {
            await removeMember(removeCandidate);
        } catch (err) {
            // The backend's 403 message ("This guest has an unsettled balance. Settle up
            // before removing them.") is already in content voice — show it as-is.
            setActionError(errorMessage(err, "That guest couldn't be removed. Try again."));
        } finally {
            setIsRemoving(false);
            setRemoveCandidate(null);
        }
    };

    const handleReset = () => {
        resetGroup();
        setShowResetConfirm(false);
    };

    const candidateName = members.find(m => m.id === removeCandidate)?.name || '';

    return (
        <div className="space-y-6">
            {actionError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{actionError}</p>
                    <button onClick={() => { setActionError(null); }} aria-label="Dismiss error" className="shrink-0 text-destructive/70 hover:text-destructive transition-colors">✕</button>
                </div>
            )}

            {/* Add people — two paths: real members join with the invite code, guests are added by name */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 space-y-6">
                <h2 className="text-lg font-semibold">Add people</h2>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Invite someone with the app</h3>
                    <p className="text-xs text-muted-foreground">They sign in with Google and join with this code.</p>
                    {activeGroup?.inviteCode && <InvitationBox inviteCode={activeGroup.inviteCode} />}
                </div>

                <div className="border-t border-border pt-5 space-y-2">
                    <h3 className="text-sm font-medium">Add a guest</h3>
                    <p className="text-xs text-muted-foreground">Guests don't need an account. You track their share for them.</p>
                    <AddGuestForm onAddGuest={handleAddGuest} />
                </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h2 className="text-lg font-semibold mb-4">Group members</h2>
                <div className="space-y-2">
                    <AnimatePresence>
                        {members.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8 text-muted-foreground text-sm"
                            >
                                Share the invite code or add a guest to start splitting expenses.
                            </motion.div>
                        )}

                        {members.map((member) => (
                            <MemberListItem
                                key={member.id}
                                member={member}
                                balances={balances}
                                onUpdateName={handleRename}
                                onRemove={(id) => { setRemoveCandidate(id); }}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Guest remove confirmation */}
            <AnimatePresence>
                {removeCandidate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setRemoveCandidate(null); }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card w-full max-w-sm rounded-2xl p-6 relative z-10 border border-border/50 shadow-2xl space-y-4"
                        >
                            <h3 className="text-lg font-semibold">Remove {candidateName}?</h3>
                            <p className="text-sm text-muted-foreground">Their past expenses stay in the history.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setRemoveCandidate(null); }}
                                    disabled={isRemoving}
                                    className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { void handleConfirmRemove(); }}
                                    disabled={isRemoving}
                                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isRemoving ? 'Removing…' : 'Remove guest'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Danger zone */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-4">Danger zone</h3>

                {!showResetConfirm ? (
                    <button
                        onClick={() => { setShowResetConfirm(true); }}
                        className="w-full border border-destructive/50 text-destructive hover:bg-destructive/10 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                        Reset all app data
                    </button>
                ) : (
                    <ResetConfirmDialog
                        onConfirm={handleReset}
                        onCancel={() => { setShowResetConfirm(false); }}
                    />
                )}
            </div>
        </div>
    );
}
```

Notes: `RemoveConfirmDialog` and the `removeMemberAndRedistribute` context call are no longer used here — leave the files/context API in place, just drop the imports from this file. Check where `MemberManager` is rendered (grep for `<MemberManager`) — if the parent passes props that no longer exist, fix the call site.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`.

- [ ] **Step 7: Visual verification**

Dev server, member management screen (both themes, desktop + 375px):
- Two clearly labeled paths: invite code + "Add a guest" form.
- Add a guest → appears in the list with a "Guest" tag and initials avatar.
- Rename (pencil) and remove (trash) appear only on guest rows.
- Removing a guest with an unsettled balance shows the backend's 403 message verbatim in the error banner.

- [ ] **Step 8: Commit**

```bash
git add -A src/components
git commit -m "feat: guest management UI — two-path add, guest rename/remove, error surfacing"
```

---

### Task 4: Guest tag everywhere members render (spec Task B, part 3)

**Files:**
- Modify: `src/components/expense-form/PayerSelector.tsx`
- Modify: `src/components/expense-form/MultiPayerSelector.tsx`
- Modify: `src/components/expense-form/SplitEven.tsx`
- Modify: `src/components/expense-form/SplitExact.tsx`
- Modify: `src/components/expense-form/SplitPercentage.tsx`
- Modify: `src/components/expense-form/SplitShares.tsx`
- Modify: `src/components/group-detail/MemberBalancesList.tsx`
- Modify: `src/components/group-detail/SettlementPlanList.tsx`
- Modify: `src/components/GroupDetail.tsx` (pass one new prop)

**Interfaces:**
- Consumes: `GuestTag` and `Avatar` from Task 3; `Member.isGuest`.
- Produces: `SettlementPlanList` gains prop `isGuestMember?: (id: string) => boolean`.

The pattern, applied uniformly: wherever a member's name renders, append `{member.isGuest && <GuestTag />}` immediately after the name; wherever a raw `<img src={member.avatar}>` renders, replace with `<Avatar name={member.name} src={member.avatar} className="…" />` keeping the original size classes (guests have no avatar URL — the raw `<img>` renders broken for them).

- [ ] **Step 1: `PayerSelector.tsx`**

Replace the avatar div + name span inside the map with:

```tsx
                        <Avatar name={member.name} src={member.avatar} className="w-8 h-8" />
                        <span className="text-xs font-medium truncate w-full text-center">{member.name}</span>
                        {member.isGuest && <GuestTag />}
```

Imports: `import { Avatar } from '../Avatar';` and `import { GuestTag } from '../GuestTag';`

- [ ] **Step 2: `MultiPayerSelector.tsx`**

Replace the inner avatar `div` (the `w-10 h-10 rounded-full…` wrapper with `<img>`) with `<Avatar name={member.name} src={member.avatar} />` (keep the `relative` parent and the selected-check badge). Replace the name block with:

```tsx
                                <div>
                                    <p className="text-sm font-semibold flex items-center gap-2">{member.name}{member.isGuest && <GuestTag />}</p>
                                    <p className="text-[10px] text-muted-foreground">Contributor</p>
                                </div>
```

Also replace the `✓` emoji in the selected badge with lucide's `Check` (`<Check className="w-3 h-3" strokeWidth={3} />`) — emoji-as-icon is an anti-pattern (MASTER §10).

- [ ] **Step 3: The four split components**

In each of `SplitEven.tsx`, `SplitExact.tsx`, `SplitPercentage.tsx`, `SplitShares.tsx`: replace the `w-6 h-6 rounded-full overflow-hidden` + `<img>` block with `<Avatar name={member.name} src={member.avatar} className="w-6 h-6" />`, and change the name span to:

```tsx
                    <span className="flex-1 text-sm flex items-center gap-2">{member.name}{member.isGuest && <GuestTag />}</span>
```

- [ ] **Step 4: `MemberBalancesList.tsx`**

Replace the avatar wrapper with `<Avatar name={member.name} src={member.avatar} className="w-12 h-12 ring-2 ring-border/20" />`. Change the name line to:

```tsx
                                <p className="font-bold text-foreground flex items-center gap-2">{member.name}{member.isGuest && <GuestTag />}</p>
```

Add `tabular-nums` to the per-currency balance `div`'s className (join the existing `text-sm font-bold` classes).

- [ ] **Step 5: `SettlementPlanList.tsx`**

Add to props:

```tsx
    isGuestMember?: (id: string) => boolean;
```

Replace the from-avatar `div`+`img` with `<Avatar name={fromName} src={fromAvatar} />`. Update the name block:

```tsx
                                    <div className="text-sm">
                                        <div className="font-semibold flex items-center gap-2">
                                            {fromName}
                                            {isGuestMember?.(tx.from.memberId) && <GuestTag />}
                                        </div>
                                        <div className="text-muted-foreground text-xs flex items-center gap-1.5">
                                            pays {toName}
                                            {isGuestMember?.(tx.to.memberId) && <GuestTag />}
                                        </div>
                                    </div>
```

Add `tabular-nums` to the amount `div` (`font-bold text-lg text-primary`).

- [ ] **Step 6: `GroupDetail.tsx` — pass the lookup**

On the `<SettlementPlanList>` usage add:

```tsx
                        isGuestMember={(id) => memberMap[id]?.isGuest ?? false}
```

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`.

- [ ] **Step 8: Visual verification**

With a group containing at least one guest: guest tag appears in the expense-form payer picker, multi-payer list, all four split inputs, group balances list, and settlement plan rows. Guests show initials avatars; real members still show their Google photos. No color/emphasis difference beyond the tag.

- [ ] **Step 9: Commit**

```bash
git add src/components
git commit -m "feat: show guest tag and initials avatars everywhere members render"
```

---

### Task 5: Add Expense step primitives (spec Task C, part 1)

**Files:**
- Create: `src/components/expense-form/StepDots.tsx`
- Create: `src/components/expense-form/StepNav.tsx`
- Create: `src/components/expense-form/stepValidation.ts`
- Create: `src/components/expense-form/reviewSentence.ts`

**Interfaces:**
- Consumes: `SplitType`, `Payer` from `src/types/expense.types.ts`; `Member` from `src/types/member.types.ts`; `removeThousandsSeparator`, `formatAmount` from `src/lib/currency.ts`; `isBalanceSettled` from `src/lib/accounting.ts`.
- Produces (Task 6 relies on these exact signatures):
  - `StepDots({ current, total = 4 }: { current: number; total?: number })`
  - `StepNav({ canGoBack, onBack, nextLabel, nextDisabled, isSubmit, onNext }: StepNavProps)`
  - `parseAmount(amount: string): number`
  - `isWhatStepValid(description: string, amount: string): boolean`
  - `isPayerStepValid(isMultiPayer: boolean, payers: Payer[], amount: string): boolean`
  - `isSplitStepValid(splitType: SplitType, amount: string, members: Member[], state: { included: Record<string, boolean>; manualAmounts: Record<string, string>; percentages: Record<string, string>; shares: Record<string, string> }): boolean`
  - `buildReviewSentence({ payerNames, totalAmount, currency, splitType, participantNames }): string`

- [ ] **Step 1: Create `StepDots.tsx`**

4-dot progress indicator (spec: dots, not a percentage bar):

```tsx
import { cn } from '../../lib/utils';

interface StepDotsProps {
    current: number; // 0-based
    total?: number;
}

export function StepDots({ current, total = 4 }: StepDotsProps) {
    return (
        <div className="flex items-center justify-center gap-2" role="img" aria-label={`Step ${current + 1} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
                <span
                    key={i}
                    className={cn(
                        'h-2 w-2 rounded-full transition-colors duration-200',
                        i === current ? 'bg-primary' : i < current ? 'bg-primary/40' : 'bg-muted'
                    )}
                />
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Create `StepNav.tsx`**

Back and the single forward action always in the same screen position; Back stays `invisible` (not removed) on step 1 so the forward button never shifts:

```tsx
import { cn } from '../../lib/utils';

interface StepNavProps {
    canGoBack: boolean;
    onBack: () => void;
    nextLabel: string;
    nextDisabled: boolean;
    isSubmit: boolean;
    onNext?: () => void;
}

export function StepNav({ canGoBack, onBack, nextLabel, nextDisabled, isSubmit, onNext }: StepNavProps) {
    return (
        <div className="flex items-center justify-between gap-3 pt-2">
            <button
                type="button"
                onClick={onBack}
                className={cn(
                    'px-5 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors',
                    !canGoBack && 'invisible'
                )}
            >
                Back
            </button>
            <button
                type={isSubmit ? 'submit' : 'button'}
                onClick={isSubmit ? undefined : onNext}
                disabled={nextDisabled}
                className={cn(
                    'flex-1 max-w-[240px] bg-primary text-primary-foreground py-3 px-6 rounded-xl font-semibold transition-all',
                    nextDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/90 active:scale-[0.98]'
                )}
            >
                {nextLabel}
            </button>
        </div>
    );
}
```

- [ ] **Step 3: Create `stepValidation.ts`**

Ports the gating logic from the old `SubmitButton.tsx`, fixed to strip thousands separators (the old component parsed `amount` raw — a latent bug for amounts like "1,000"):

```ts
import { SplitType, type Payer } from '../../types/expense.types';
import type { Member } from '../../types/member.types';
import { removeThousandsSeparator } from '../../lib/currency';
import { isBalanceSettled } from '../../lib/accounting';

export function parseAmount(amount: string): number {
    const value = parseFloat(removeThousandsSeparator(amount || '0'));
    return isFinite(value) ? value : 0;
}

export function isWhatStepValid(description: string, amount: string): boolean {
    return description.trim().length > 0 && parseAmount(amount) > 0;
}

export function isPayerStepValid(isMultiPayer: boolean, payers: Payer[], amount: string): boolean {
    if (!isMultiPayer) return !!payers[0]?.memberId;
    const total = parseAmount(amount);
    const payersTotal = payers.reduce((sum, p) => sum + p.amount, 0);
    return payers.length > 0 && isBalanceSettled(payersTotal - total);
}

interface SplitState {
    included: Record<string, boolean>;
    manualAmounts: Record<string, string>;
    percentages: Record<string, string>;
    shares: Record<string, string>;
}

export function isSplitStepValid(splitType: SplitType, amount: string, members: Member[], state: SplitState): boolean {
    const total = parseAmount(amount);
    if (total <= 0 || members.length === 0) return false;

    if (splitType === SplitType.EVEN) {
        return members.some(m => state.included[m.id]);
    }
    if (splitType === SplitType.EXACT) {
        const sum = members.reduce(
            (acc, m) => acc + (parseFloat(removeThousandsSeparator(state.manualAmounts[m.id] || '0')) || 0),
            0
        );
        return Math.round(sum * 100) === Math.round(total * 100);
    }
    if (splitType === SplitType.PERCENTAGE) {
        const sum = members.reduce((acc, m) => acc + (parseFloat(state.percentages[m.id] || '0') || 0), 0);
        return Math.round(sum * 100) === 10000;
    }
    // SHARES
    const list = members.map(m => (state.shares[m.id] || '').trim());
    if (list.some(s => s !== '' && !/^\d+$/.test(s))) return false;
    const totalShares = list.reduce((acc, s) => acc + (s === '' ? 0 : parseInt(s, 10)), 0);
    return totalShares > 0;
}
```

- [ ] **Step 4: Create `reviewSentence.ts`**

Plain-language summary per MASTER §7 (e.g. "Alex paid $60.00, split evenly between 4 people ($15.00 each).")

```ts
import { SplitType } from '../../types/expense.types';
import { formatAmount } from '../../lib/currency';

function listNames(names: string[]): string {
    if (names.length === 0) return 'Someone';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export function buildReviewSentence({
    payerNames,
    totalAmount,
    currency,
    splitType,
    participantNames,
}: {
    payerNames: string[];
    totalAmount: number;
    currency: string;
    splitType: SplitType;
    participantNames: string[];
}): string {
    const payers = listNames(payerNames);
    const amount = formatAmount(totalAmount, currency);
    const n = participantNames.length;

    if (n === 1) {
        return `${payers} paid ${amount} for ${participantNames[0]}.`;
    }

    if (splitType === SplitType.EVEN) {
        const each = formatAmount(totalAmount / n, currency);
        return `${payers} paid ${amount}, split evenly between ${n} people (${each} each).`;
    }

    const how =
        splitType === SplitType.EXACT ? 'by exact amounts'
        : splitType === SplitType.PERCENTAGE ? 'by percentage'
        : 'by shares';
    return `${payers} paid ${amount}, split ${how} between ${n} people.`;
}
```

- [ ] **Step 5: Typecheck + lint, then commit**

Run: `npx tsc --noEmit && npm run lint` (the four new files compile; nothing imports them yet).

```bash
git add src/components/expense-form/StepDots.tsx src/components/expense-form/StepNav.tsx src/components/expense-form/stepValidation.ts src/components/expense-form/reviewSentence.ts
git commit -m "feat: add expense-form step primitives (dots, nav, validation, review sentence)"
```

---

### Task 6: Restructure ExpenseForm into the 4-step flow (spec Task C, part 2 — flagship)

**Files:**
- Modify: `src/components/ExpenseForm.tsx` (full rewrite below)
- Delete: `src/components/expense-form/SubmitButton.tsx` (replaced by StepNav + stepValidation)
- Modify: `src/components/group-detail/EditExpenseModal.tsx` (title + submit label)
- Modify: `src/components/AddExpense.tsx` (title copy)
- Modify: `src/components/Layout.tsx` (button copy)

**Interfaces:**
- Consumes: everything Task 5 produced; existing `AmountInput`, `PayerSelector`, `MultiPayerSelector`, `SplitTypeSelector`, `SplitEven/Exact/Percentage/Shares`; `calculateSplits` from `src/lib/accounting.ts` **unchanged** (presentation restructure only).
- Produces: `ExpenseForm` keeps its exact existing props (`initialData`, `onSubmit`, `groupId`, `submitLabel`) so `AddExpense` and `EditExpenseModal` keep working — only the default `submitLabel` changes to `'Add expense'`. Edit mode reuses the same component pre-filled, with "Save changes" on step 4.

Key requirements this rewrite satisfies: all form state stays in the parent component (steps are conditionally rendered children, so Back/Next never loses values); 4-dot indicator; Back/forward in fixed positions; only the selected split mode's inputs render; `alert()` calls replaced with inline errors on the review step.

- [ ] **Step 1: Rewrite `src/components/ExpenseForm.tsx`**

Full new content:

```tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGroup } from '../context/GroupContext';
import { calculateSplits, isBalanceSettled } from '../lib/accounting';
import { SplitType, type Split, type Payer, type CreateExpenseRequest } from '../types/expense.types';
import { useAppSelector } from '../store/hooks';
import { AmountInput } from './expense-form/AmountInput';
import { PayerSelector } from './expense-form/PayerSelector';
import { MultiPayerSelector } from './expense-form/MultiPayerSelector';
import { SplitTypeSelector } from './expense-form/SplitTypeSelector';
import { SplitEven } from './expense-form/SplitEven';
import { SplitExact } from './expense-form/SplitExact';
import { SplitPercentage } from './expense-form/SplitPercentage';
import { SplitShares } from './expense-form/SplitShares';
import { StepDots } from './expense-form/StepDots';
import { StepNav } from './expense-form/StepNav';
import { parseAmount, isWhatStepValid, isPayerStepValid, isSplitStepValid } from './expense-form/stepValidation';
import { buildReviewSentence } from './expense-form/reviewSentence';
import { removeThousandsSeparator, CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../lib/currency';

interface ExpenseFormProps {
    initialData?: {
        description: string;
        amount: number;
        currency: string;
        payerId?: string;
        payers?: Payer[];
        splitType: SplitType;
        splits: Split[];
        manualAmounts: Record<string, string>;
    };
    onSubmit: (data: CreateExpenseRequest) => void;
    groupId?: string;
    submitLabel?: string;
}

const STEP_TITLES = ['What was it?', 'Who paid?', 'How to split?', 'Review'];

export function ExpenseForm({ initialData, onSubmit, groupId, submitLabel = 'Add expense' }: ExpenseFormProps) {
    const { activeGroupId, groups: groupsMeta, fetchGroupById, isLoading } = useGroup();
    const effectiveGroupId = groupId || activeGroupId;

    const allMembersMap = useAppSelector(state => state.groups.membersByGroupId);

    const members = useMemo(() => {
        return allMembersMap[effectiveGroupId] || [];
    }, [allMembersMap, effectiveGroupId]);

    const groupMeta = useMemo(() => {
        return groupsMeta.find(g => g.id === effectiveGroupId);
    }, [groupsMeta, effectiveGroupId]);

    const groupCurrency = groupMeta?.currency || 'USD';

    useEffect(() => {
        if (effectiveGroupId && members.length === 0) {
            void fetchGroupById(effectiveGroupId);
        }
    }, [effectiveGroupId, members.length, fetchGroupById]);

    // ---- Form state (lives here, above the steps, so navigating never loses it) ----
    const [step, setStep] = useState(0);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || groupCurrency);

    const [isMultiPayer, setIsMultiPayer] = useState(initialData?.payers ? initialData.payers.length > 1 : false);
    const [payers, setPayers] = useState<Payer[]>(() => {
        if (initialData?.payers && initialData.payers.length > 0) return initialData.payers;
        const defaultPayerId = initialData?.payerId || (members[0]?.id || '');
        const defaultAmount = parseAmount(initialData?.amount.toString() || '0');
        return [{ memberId: defaultPayerId, amount: defaultAmount }];
    });

    const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || SplitType.EVEN);
    const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(initialData?.manualAmounts || {});
    const [percentages, setPercentages] = useState<Record<string, string>>(() => {
        if (initialData?.splitType === SplitType.PERCENTAGE && Array.isArray(initialData.splits)) {
            const obj: Record<string, string> = {};
            initialData.splits.forEach(s => {
                if (s.percentage !== undefined) {
                    obj[s.memberId] = s.percentage.toString();
                }
            });
            return obj;
        }
        return {};
    });
    const [shares, setShares] = useState<Record<string, string>>(() => {
        if (initialData?.splitType === SplitType.SHARES && Array.isArray(initialData.splits)) {
            const obj: Record<string, string> = {};
            initialData.splits.forEach(s => {
                if (s.share !== undefined) {
                    obj[s.memberId] = s.share.toString();
                }
            });
            return obj;
        }
        return {};
    });
    const [included, setIncluded] = useState<Record<string, boolean>>(() => {
        if (initialData && initialData.splitType === SplitType.EVEN && Array.isArray(initialData.splits)) {
            const selected = new Set(initialData.splits.filter(s => (s.amount ?? 0) > 0).map(s => s.memberId));
            const obj: Record<string, boolean> = {};
            members.forEach(m => { obj[m.id] = selected.has(m.id); });
            return obj;
        }
        const obj: Record<string, boolean> = {};
        members.forEach(m => { obj[m.id] = true; });
        return obj;
    });

    // Keep included map in sync when members list changes (new members default to included)
    const [prevMembers, setPrevMembers] = useState(members);
    if (members !== prevMembers) {
        setPrevMembers(members);
        setIncluded(prev => {
            const next: Record<string, boolean> = { ...prev };
            members.forEach(m => {
                if (!(m.id in next)) {
                    next[m.id] = true;
                }
            });
            const validIds = new Set(members.map(m => m.id));
            const filtered: Record<string, boolean> = {};
            Object.keys(next).forEach(id => {
                if (validIds.has(id)) {
                    filtered[id] = next[id];
                }
            });
            return filtered;
        });
    }

    const equalEach = useMemo(() => {
        const total = parseAmount(amount);
        const n = members.reduce((count, m) => count + (included[m.id] ? 1 : 0), 0);
        if (total <= 0 || n === 0) return '0.00';
        return (total / n).toFixed(2);
    }, [amount, members, included]);

    // Sync single payer amount when the main amount field changes
    useEffect(() => {
        if (!isMultiPayer && payers.length === 1) {
            const currentAmount = parseAmount(amount);
            if (payers[0].amount !== currentAmount) {
                setPayers([{ ...payers[0], amount: currentAmount }]);
            }
        }
    }, [amount, isMultiPayer, payers]);

    // ---- Step gating ----
    const canProceed =
        step === 0 ? isWhatStepValid(description, amount)
        : step === 1 ? isPayerStepValid(isMultiPayer, payers, amount)
        : step === 2 ? isSplitStepValid(splitType, amount, members, { included, manualAmounts, percentages, shares })
        : true;

    const goBack = () => {
        setSubmitError(null);
        setStep(s => Math.max(0, s - 1));
    };
    const goNext = () => {
        setSubmitError(null);
        setStep(s => Math.min(3, s + 1));
    };

    const reviewSentence = useMemo(() => {
        const total = parseAmount(amount);
        const activePayers = isMultiPayer ? payers.filter(p => p.amount > 0) : payers.slice(0, 1);
        const payerNames = activePayers.map(p => members.find(m => m.id === p.memberId)?.name ?? 'Someone');

        let participantNames: string[] = [];
        if (splitType === SplitType.EVEN) {
            participantNames = members.filter(m => included[m.id]).map(m => m.name);
        } else if (splitType === SplitType.EXACT) {
            participantNames = members
                .filter(m => (parseFloat(removeThousandsSeparator(manualAmounts[m.id] || '0')) || 0) > 0)
                .map(m => m.name);
        } else if (splitType === SplitType.PERCENTAGE) {
            participantNames = members.filter(m => (parseFloat(percentages[m.id] || '0') || 0) > 0).map(m => m.name);
        } else {
            participantNames = members.filter(m => (parseInt((shares[m.id] || '0').trim() || '0', 10) || 0) > 0).map(m => m.name);
        }

        return buildReviewSentence({ payerNames, totalAmount: total, currency, splitType, participantNames });
    }, [amount, members, payers, isMultiPayer, splitType, included, manualAmounts, percentages, shares, currency]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Enter on an earlier step advances instead of submitting
        if (step < 3) {
            if (canProceed) goNext();
            return;
        }

        const totalAmount = parseAmount(amount);
        if (!description || totalAmount <= 0) {
            setSubmitError('Enter a description and an amount greater than zero.');
            return;
        }
        if (members.length === 0) {
            setSubmitError('This group has no members to split with.');
            return;
        }

        const options: {
            includedMemberIds?: string[];
            manualAmounts: Record<string, number>;
            percentages: Record<string, number>;
            shares: Record<string, number>;
        } = {
            manualAmounts: {},
            percentages: {},
            shares: {}
        };

        if (splitType === SplitType.EVEN) {
            options.includedMemberIds = members.filter(m => included[m.id]).map(m => m.id);
        } else if (splitType === SplitType.EXACT) {
            members.forEach(m => {
                const val = parseFloat(removeThousandsSeparator(manualAmounts[m.id] || '0'));
                options.manualAmounts[m.id] = isNaN(val) ? 0 : val;
            });
        } else if (splitType === SplitType.PERCENTAGE) {
            members.forEach(m => {
                const val = parseFloat(removeThousandsSeparator(percentages[m.id] || '0'));
                options.percentages[m.id] = isNaN(val) ? 0 : val;
            });
        } else if (splitType === SplitType.SHARES) {
            const sharesList = members.map(m => (shares[m.id] || '').trim());
            const invalid = sharesList.some(s => s !== '' && !/^\d+$/.test(s));
            if (invalid) {
                setSubmitError('Shares must be whole numbers (0 or more).');
                return;
            }
            members.forEach(m => {
                const val = (shares[m.id] || '').trim();
                options.shares[m.id] = val === '' ? 0 : parseInt(val, 10);
            });
        }

        const result = calculateSplits(totalAmount, splitType, members, options);
        if (!result.success) {
            setSubmitError(result.error);
            return;
        }

        const payersTotal = payers.reduce((sum, p) => sum + p.amount, 0);
        if (!isBalanceSettled(payersTotal - totalAmount)) {
            setSubmitError(`Payer amounts add up to ${payersTotal.toFixed(2)} but the total is ${totalAmount.toFixed(2)}. Go back and adjust who paid.`);
            return;
        }

        onSubmit({
            description,
            amount: totalAmount,
            currency,
            payers: isMultiPayer ? payers : [{ memberId: payers[0].memberId, amount: totalAmount }],
            splitType,
            splits: result.splits,
            date: new Date().toISOString()
        });
    };

    if (isLoading && members.length === 0) {
        return (
            <div className="space-y-3 p-2" aria-label="Loading members">
                <div className="h-16 rounded-xl bg-muted animate-pulse" />
                <div className="h-10 rounded-xl bg-muted animate-pulse" />
                <div className="h-10 rounded-xl bg-muted animate-pulse" />
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground">This group has no members yet. Add people from the group's member screen first.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <StepDots current={step} />
                <h3 className="text-center text-sm font-semibold text-muted-foreground">{STEP_TITLES[step]}</h3>
            </div>

            {step === 0 && (
                <div className="space-y-6">
                    <AmountInput
                        amount={amount}
                        setAmount={setAmount}
                        description={description}
                        setDescription={setDescription}
                        currency={currency}
                        autoFocus={!initialData}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Currency</label>
                        <select
                            value={currency}
                            onChange={(e) => { setCurrency(e.target.value); }}
                            className="w-full bg-secondary/50 rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            {CURRENCIES.map(curr => (
                                <option key={curr} value={curr}>
                                    {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    {isMultiPayer ? (
                        <MultiPayerSelector
                            members={members}
                            payers={payers}
                            setPayers={setPayers}
                            totalAmount={parseAmount(amount)}
                            currency={currency}
                        />
                    ) : (
                        <PayerSelector
                            members={members}
                            payerId={payers[0]?.memberId || ''}
                            setPayerId={(id) => { setPayers([{ memberId: id, amount: parseAmount(amount) }]); }}
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => { setIsMultiPayer(!isMultiPayer); }}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        {isMultiPayer ? 'Use a single payer' : 'Split the payment across multiple people'}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <SplitTypeSelector splitType={splitType} setSplitType={setSplitType} />

                    {splitType === SplitType.EVEN && (
                        <SplitEven members={members} included={included} setIncluded={setIncluded} equalEach={equalEach} />
                    )}
                    {splitType === SplitType.EXACT && (
                        <SplitExact members={members} manualAmounts={manualAmounts} setManualAmounts={setManualAmounts} amount={amount} currency={currency} />
                    )}
                    {splitType === SplitType.PERCENTAGE && (
                        <SplitPercentage members={members} percentages={percentages} setPercentages={setPercentages} amount={amount} />
                    )}
                    {splitType === SplitType.SHARES && (
                        <SplitShares members={members} shares={shares} setShares={setShares} />
                    )}
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 bg-secondary/20 rounded-xl p-5">
                    <p className="text-base leading-relaxed">{reviewSentence}</p>
                    {submitError && (
                        <p className="text-sm text-negative">{submitError}</p>
                    )}
                </div>
            )}

            <StepNav
                canGoBack={step > 0}
                onBack={goBack}
                nextLabel={step === 3 ? submitLabel : 'Next'}
                nextDisabled={!canProceed}
                isSubmit={step === 3}
                onNext={goNext}
            />
        </form>
    );
}
```

Then `git rm src/components/expense-form/SubmitButton.tsx`.

- [ ] **Step 2: Update the wrappers' copy**

`EditExpenseModal.tsx`: change `<h2 className="text-xl font-bold">Edit Expense</h2>` → `Edit expense`, and `submitLabel="Update Expense"` → `submitLabel="Save changes"`.

`AddExpense.tsx`: `New Expense` → `Add expense`; `Change Group` → `Change group`.

`Layout.tsx`: sidebar button text `Add Expense` → `Add expense` (line ~169); `New / Join Group` → `Create or join group` (line ~137).

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`. (`payers` uses the `Payer` type where `MultiPayerSelector` expects `WithRequired<Split, 'amount'>[]` — this already matched before the rewrite; if the compiler complains it's a pre-existing mismatch, keep the same typing the old file used.)

- [ ] **Step 4: Visual verification (the flagship — be thorough)**

Both themes, desktop + 375px:
1. Open Add expense → step 1 shows ONLY description/amount/currency, 4 dots with the first active, Back invisible but Next in its fixed place.
2. Next disabled until description + amount entered.
3. Step 2: avatar row, one tap selects a payer (guests included); "Split the payment across multiple people" expands the multi-payer UI; Back → step 1 still has the values; Next → values still in step 2.
4. Step 3: segmented control; only the selected mode's inputs render; switching modes keeps other modes' entered values (state persists).
5. Step 4: plain-language sentence matches the choices, e.g. "Alex paid $60.00, split evenly between 4 people ($15.00 each)."; single "Add expense" button; a validation failure (e.g. exact amounts not summing) shows inline, no browser alert.
6. Submit → expense created and appears in history.
7. Edit an existing expense from history → the SAME 4-step component opens pre-filled, step 4 says "Save changes", saving updates the expense.

- [ ] **Step 5: Commit**

```bash
git add -A src/components
git commit -m "feat: restructure add expense into 4-step guided flow with review step"
```

---

### Task 7: Global Dashboard redesign (spec Task D)

**Files:**
- Create: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/GlobalDashboard.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `balanceSummary` (`Record<currency, { totalBalance; totalOwed; totalOwing }>`), `groups`, `switchGroup` from context; `membersByGroupId` from the store; `AddExpense` modal component; `WelcomeView` for zero groups.
- Produces: `Skeleton({ className }: { className?: string })` — reused by Task 10.

- [ ] **Step 1: Create `src/components/ui/Skeleton.tsx`**

```tsx
import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('rounded-xl bg-muted animate-pulse', className)} />;
}
```

- [ ] **Step 2: Rewrite `src/components/GlobalDashboard.tsx`**

One hero balance number (largest text on the page), scannable bordered-row group list, single primary CTA. Full new content:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { Users, ChevronRight, Plus } from 'lucide-react';
import { WelcomeView } from './dashboard/WelcomeView';
import { AddExpense } from './AddExpense';
import { Skeleton } from './ui/Skeleton';
import { isBalanceSettled } from '../lib/accounting';
import { formatAmount } from '../lib/currency';
import { useAppSelector } from '../store/hooks';
import { cn } from '../lib/utils';

export const GlobalDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { groups, balanceSummary, isLoading, switchGroup } = useGroup();
    const membersByGroupId = useAppSelector(state => state.groups.membersByGroupId);
    const [isAddingExpense, setIsAddingExpense] = useState(false);

    if (isLoading && groups.length === 0) {
        return (
            <div className="space-y-8 pb-12">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-14 w-64" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-12 w-40" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
        );
    }

    if (groups.length === 0) {
        return <WelcomeView />;
    }

    // Per-currency nets from the server-side summary (accounts for settlements)
    const currencyBalances = balanceSummary
        ? Object.entries(balanceSummary)
            .map(([currency, v]) => ({ currency, net: v.totalBalance, owed: v.totalOwed, owing: v.totalOwing }))
            .filter(b => !isBalanceSettled(b.net) || !isBalanceSettled(b.owed) || !isBalanceSettled(b.owing))
            .toSorted((a, b) => Math.abs(b.net) - Math.abs(a.net))
        : [];
    const primary = currencyBalances[0];
    const others = currencyBalances.slice(1);

    return (
        <div className="space-y-10 pb-12">
            {/* Hero balance */}
            <section>
                {primary && !isBalanceSettled(primary.net) ? (
                    <>
                        <p className="text-sm text-muted-foreground">{primary.net > 0 ? "You're owed" : 'You owe'}</p>
                        <p className={cn('text-5xl font-bold tabular-nums mt-1', primary.net > 0 ? 'text-positive' : 'text-negative')}>
                            {formatAmount(Math.abs(primary.net), primary.currency)}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">Your balance</p>
                        <p className="text-5xl font-bold mt-1">All settled</p>
                    </>
                )}
                {primary && (
                    <p className="text-sm text-muted-foreground mt-2 tabular-nums">
                        {formatAmount(primary.owed, primary.currency)} owed to you · {formatAmount(primary.owing, primary.currency)} you owe
                    </p>
                )}
                {others.map(b => (
                    <p key={b.currency} className={cn('text-sm mt-1 tabular-nums', b.net > 0 ? 'text-positive' : b.net < 0 ? 'text-negative' : 'text-muted-foreground')}>
                        {isBalanceSettled(b.net) ? `Settled in ${b.currency}` : `${b.net > 0 ? "you're owed" : 'you owe'} ${formatAmount(Math.abs(b.net), b.currency)}`}
                    </p>
                ))}

                <button
                    onClick={() => { setIsAddingExpense(true); }}
                    className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    Add expense
                </button>
            </section>

            {/* Group list — bordered rows, not cards */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold px-1">Your groups</h2>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    {groups.map(group => {
                        const memberCount = membersByGroupId[group.id]?.length;
                        return (
                            <button
                                key={group.id}
                                onClick={() => {
                                    switchGroup(group.id);
                                    void navigate(`/group/${group.id}/details`);
                                }}
                                className="w-full flex items-center gap-4 px-4 py-4 min-h-[44px] text-left border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{group.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {memberCount ? `${memberCount} member${memberCount === 1 ? '' : 's'}` : group.currency}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                            </button>
                        );
                    })}
                </div>
            </section>

            {isAddingExpense && <AddExpense onClose={() => { setIsAddingExpense(false); }} />}
        </div>
    );
};
```

(This removes the old `BalanceCard` pair, the gradient summary card, and the "Use the Group Selector…" hint box — the fold now has exactly one CTA. Per-group balances are intentionally not shown; see the Documented deviation in the header.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`. If `BalanceCard` is now unused only by this file, leave the component (GroupDetail still uses it).

- [ ] **Step 4: Visual verification**

Both themes, desktop + 375px: hero number is the largest text on the page; secondary owed/owing line beneath; exactly one filled-primary button in the fold ("Add expense" — it opens the modal); group rows are bordered rows with icon/name/sub-line/chevron; empty-group state still shows WelcomeView.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Skeleton.tsx src/components/GlobalDashboard.tsx
git commit -m "feat: redesign global dashboard — hero balance, bordered group rows, single CTA"
```

---

### Task 8: Group Detail reorder (spec Task E)

**Files:**
- Modify: `src/components/GroupDetail.tsx` (JSX layout section only, lines ~304–357)

**Interfaces:**
- Consumes: existing `SettlementPlanList`, `MemberBalancesList`, `HistoryList`, `BalanceCard` — no signature changes.
- Produces: nothing new.

- [ ] **Step 1: Reorder the main content**

Replace the block from `{/* Main Content Splitwise-style */}` through the end of the History section (the `<div className="grid …">…</div>` plus the History `<div className="space-y-6">…</div>`) with a single-column flow where the settlement plan is the first thing after the header/alerts:

```tsx
            {/* Settlement plan first — it answers "what do I do now" */}
            <SettlementPlanList
                settlements={settlementPlan}
                getMemberName={getMemberName}
                getMemberAvatar={getMemberAvatar}
                isGuestMember={(id) => memberMap[id]?.isGuest ?? false}
                onSettle={handleSettleClick}
                currentMemberId={currentUserMember?.id}
            />

            {/* Your balance summary */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <BalanceCard type="owed" balances={owedToYou} />
                </div>
                <div className="flex-1">
                    <BalanceCard type="owing" balances={youOwe} />
                </div>
            </div>

            {/* Member balances */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">Group balances</h3>
                    </div>
                </div>
                <MemberBalancesList members={members} serverBalances={groupBalances} />
            </div>

            {/* History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold tracking-tight">Payment history</h2>
                </div>

                <HistoryList
                    expenses={expenses}
                    transactions={transactions}
                    currency={currency}
                    getMemberName={getMemberName}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                />
            </div>
```

(Removes the 12-column grid and the sticky right column; the settlement card is now full-width at the top. Also fixes copy: "Group Balances" → "Group balances", "Payment History" italic → "Payment history" plain. Keep the `isGuestMember` prop added in Task 4 — shown here so the block is copy-pasteable.)

Also in the header (same file): `Delete Group` → `Delete group`, `Quit Group` → `Leave group`, `Deleting...` → `Deleting…`, `Leaving...` → `Leaving…`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`.

- [ ] **Step 3: Visual verification**

Both themes, desktop + 375px: after the sticky header, the settlement plan card is the first content; each transfer row keeps its own "Record payment"/"Settle" button (renamed in Task 9); balances and history follow below; no horizontal scroll at 375px.

- [ ] **Step 4: Commit**

```bash
git add src/components/GroupDetail.tsx
git commit -m "feat: put settlement plan first on group detail"
```

---

### Task 9: Settle Up simplification (spec Task F)

**Files:**
- Modify: `src/components/group-detail/SettleUpModal.tsx`
- Modify: `src/components/group-detail/SettlementPlanList.tsx` (row button label)

**Interfaces:**
- Consumes: existing `SettleUpModalProps` — unchanged. `Avatar` from Task 3.
- Produces: nothing new.

The existing modal already matches the mockup's shape (from/to avatars, pre-filled amount, optional note, two buttons) — this is a refinement, not a rebuild.

- [ ] **Step 1: Refine `SettleUpModal.tsx`**

Exact edits:
1. Title: `Settle Up` → `Record payment`.
2. Close button: add `aria-label="Close"`.
3. Both avatar blocks: replace the `div`+`img` with `<Avatar name={fromMember.name} src={fromMember.avatar} className="w-16 h-16 border-2 border-primary/20" />` (and the `toMember` equivalent) — guests have no avatar URL.
4. Amount input: add `tabular-nums` to its className.
5. Note label: remove `uppercase tracking-wider` classes so it reads "Note (optional)" in sentence case; change `font-bold` → `font-medium`.
6. Confirm button: `Confirm Payment` → `Record payment` (keep the `Check` icon and loading spinner).

- [ ] **Step 2: Rename the row button in `SettlementPlanList.tsx`**

`Settle` → `Record payment` (the per-row button, line ~55). Drop the `uppercase tracking-widest` classes and bump the text size so it stays legible: className becomes `px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-full text-xs font-semibold transition-all active:scale-95`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`.

- [ ] **Step 4: Visual verification**

Open a settlement row's "Record payment": modal shows from/to (initials for guests), amount pre-filled from that row, editable, optional note, Cancel + "Record payment". Confirming records the settlement and the plan refreshes. Note: the settle-up modal keeps its own filled-primary confirm — inside a modal layer that's the screen's one primary action.

- [ ] **Step 5: Commit**

```bash
git add src/components/group-detail/SettleUpModal.tsx src/components/group-detail/SettlementPlanList.tsx
git commit -m "feat: align settle-up modal and row buttons with record-payment copy"
```

---

### Task 10: Empty / error / loading states + content-voice sweep (spec Task G)

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/group-detail/HistoryList.tsx`
- Modify: `src/components/GroupDetail.tsx` (empty-history CTA wiring + error copy)
- Modify: `src/components/group-detail/SettlementPlanList.tsx` (empty state)
- Modify: `src/components/AddExpense.tsx` (search-empty copy)
- Modify: `src/components/dashboard/WelcomeView.tsx` (copy only)

**Interfaces:**
- Consumes: `Skeleton` from Task 7 (already applied to GlobalDashboard and ExpenseForm loading states in Tasks 6–7).
- Produces: `EmptyState({ icon, headline, body, actionLabel?, onAction? })`.

- [ ] **Step 1: Create `src/components/ui/EmptyState.tsx`**

Icon + one-line headline + one-line body + verb-first CTA:

```tsx
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    headline: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon: Icon, headline, body, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">{headline}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">{body}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-5 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 2: History empty state with a real CTA**

`HistoryList.tsx`: add optional prop `onAddExpense?: () => void`. Replace the empty branch with:

```tsx
    if (!months.length && expenses.length === 0) {
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
```

Imports: `import { Receipt } from 'lucide-react';` and `import { EmptyState } from '../ui/EmptyState';`

`GroupDetail.tsx`: add `const [isAddingExpense, setIsAddingExpense] = useState(false);`, pass `onAddExpense={() => { setIsAddingExpense(true); }}` to `<HistoryList>`, and render `{isAddingExpense && <AddExpense onClose={() => { setIsAddingExpense(false); }} />}` next to the other modals (`import { AddExpense } from './AddExpense';`). This CTA is inside the empty card, so the page still has one primary per visible state.

- [ ] **Step 3: Settlement plan empty state**

`SettlementPlanList.tsx` empty branch ("No debts found. Everyone is settled up!") becomes a calm status (a settled group is good news, not an error, and needs no CTA):

```tsx
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl px-6">
                        <p className="font-medium">Everyone is settled up</p>
                        <p className="text-sm text-muted-foreground mt-1">New expenses will show who pays whom.</p>
                    </div>
```

- [ ] **Step 4: Error copy fixes in `GroupDetail.tsx`**

- `'You have unsettled balances. Please settle up before leaving the group.'` → `'You have an unsettled balance. Settle up before leaving the group.'`
- `'All members must settle their balances before the group can be deleted.'` → `"Balances aren't settled. Everyone needs to settle up before the group can be deleted."`

- [ ] **Step 5: Remaining copy sweep**

- `AddExpense.tsx`: `No groups found` → `No groups match your search.`
- `WelcomeView.tsx`: `Create New Group` → `Create a group` (both the card heading and the modal heading/title), `Join Existing Group` → `Join a group`, `Get Started` → `Get started`, `Enter Code` → `Enter code`, `Group Name` label → `Group name`, `Primary Currency` label → `Primary currency`.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`.

- [ ] **Step 7: Visual verification (full pass, spec §Verification)**

Both themes, desktop + 375px, walk every changed screen:
- New group with no expenses → history shows icon + "No expenses yet" + working "Add expense" CTA.
- Settled group → settlement card shows the calm settled state, no exclamation marks anywhere in the app's UI copy.
- Dashboard hard-refresh → skeletons (no spinners) while loading.
- Leave-group with unsettled balance → new error copy.
- Spot-check MASTER §9: no horizontal scroll at 375px, focus rings visible when tabbing, amounts aligned (`tabular-nums`).

- [ ] **Step 8: Commit**

```bash
git add -A src/components
git commit -m "feat: consistent empty/error/loading states and content-voice copy sweep"
```

---

## Final acceptance checklist (run after Task 10)

- [ ] `npx tsc --noEmit` and `npm run lint` clean; `npm run build` succeeds.
- [ ] Spec Task A: three light-mode token values updated, `.dark` untouched.
- [ ] Spec Task B: guest add/rename/remove hit the real endpoints; 403 message shown verbatim; guest tag visible in member list, payer/split pickers, balance rows, settlement rows.
- [ ] Spec Task C: 4 steps, dot indicator, fixed nav positions, state survives Back/Next, only selected split mode rendered, review sentence, edit mode reuses the component with "Save changes", `calculateSplits` unchanged (`git diff main -- src/lib/accounting.ts` is empty).
- [ ] Spec Task D: hero number, bordered group rows, one primary CTA, competing CTAs gone.
- [ ] Spec Task E: settlement plan renders first after the header.
- [ ] Spec Task F: settle-up modal is from/to + amount + note + Cancel/"Record payment".
- [ ] Spec Task G: empty states are invitations, errors are plain language, loading is skeletons.
- [ ] Report the two flagged follow-ups to the user: (1) backend per-group balance summary endpoint for dashboard rows; (2) backend B1 migration status (out of this repo's scope).
