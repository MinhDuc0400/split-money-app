# Expose Member Management Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users an actual way to reach `/group/:id/members` (the `MemberManager` screen, which already has the full guest-management feature: invite-code and add-a-guest paths, guest rename/remove) — today the route exists and works, but zero UI element navigates to it on any device.

**Architecture:** Two small, independent additions to existing files. No new routes, no new data logic — `MemberManager` and the guest feature underneath it are already complete and were verified working in the prior redesign session (commits `7454fa1`, `dc030de`, `24e56bc` on this branch). This is purely a navigation-affordance gap.

**Tech Stack:** React 19, react-router-dom v7, Tailwind, lucide-react — same as the rest of the app, no new dependencies.

## Global Constraints

- Content voice: sentence case, verb-first buttons 1-3 words ("Manage members", not "Members" alone if it reads as a noun-only label — "Manage members" is clearer as an action).
- One `bg-primary`-filled button per screen — `GroupDetail.tsx`'s new button must NOT be primary-filled; it's a secondary action (an outline/ghost treatment, matching the existing `Delete group`/`Leave group` buttons' visual weight in that same header row, not competing with any primary CTA).
- Icons: `lucide-react` only. `Users` is already imported in both files touched below — reuse it, don't add a second icon for the same concept.
- Touch targets ≥ 44px, icon+label buttons already in this header meet that; match their sizing.
- No test runner exists in this repo. Verification is `npx tsc --noEmit`, `npm run lint`, and a manual check via the dev server (light + dark, desktop + 375px).

---

### Task 1: Add a "Manage members" button to Group Detail's header (primary fix — works on every device)

**Files:**
- Modify: `src/components/GroupDetail.tsx:249-288` (header block)

**Interfaces:**
- Consumes: `useNavigate` (already imported at `src/components/GroupDetail.tsx:2`), `activeGroup.id` / `routeId` (already in scope), `Users` icon (already imported at `src/components/GroupDetail.tsx:6`).
- Produces: nothing new — this is a leaf UI change, no other task depends on it.

- [ ] **Step 1: Add the button to the header's action row**

In `src/components/GroupDetail.tsx`, the header's right-hand action row currently reads:

```tsx
                <div className="flex items-center gap-3 px-2 sm:px-0">
                    {activeGroup?.inviteCode && (
                        <InvitationBox inviteCode={activeGroup.inviteCode} />
                    )}
                    {isOwner ? (
```

Change it to:

```tsx
                <div className="flex items-center gap-3 px-2 sm:px-0">
                    {activeGroup?.inviteCode && (
                        <InvitationBox inviteCode={activeGroup.inviteCode} />
                    )}
                    <button
                        onClick={() => { void navigate(`/group/${routeId}/members`); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground border border-border hover:bg-secondary rounded-xl transition-colors"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Manage members
                    </button>
                    {isOwner ? (
```

(`routeId` is already destructured at the top of the component from `useParams<{ id: string }>()` — confirm this before editing; if the component instead uses `activeGroup?.id` elsewhere for this kind of link, use that identifier instead for consistency, but `routeId` is what the component is keyed on for its own `fetchGroupById` call.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: same 24 pre-existing errors as before this change, none new, none in `GroupDetail.tsx` beyond what already existed there.

- [ ] **Step 4: Manual verification**

`npm run dev`, open any group's detail page (`/group/:id/details`):
- A "Manage members" button appears in the header next to the invite-code box, before Delete/Leave group.
- Clicking it navigates to `/group/:id/members` and renders `MemberManager` (the two-path add UI, guest tags, etc. from the prior session's work).
- Check at 375px width — the header already wraps to a column (`flex-col sm:flex-row`), confirm the new button doesn't cause horizontal overflow or crowd the Delete/Leave button.
- Check dark mode.

- [ ] **Step 5: Commit**

```bash
git add src/components/GroupDetail.tsx
git commit -m "fix: add Manage members entry point to Group Detail header

The MemberManager route (/group/:id/members) and its full guest-
management feature (built in the prior session) had zero UI element
navigating to it on any device — only reachable by typing the URL
directly. This is the primary fix since it works on mobile and
desktop alike."
```

---

### Task 2: Restore the desktop sidebar "Members" link

**Files:**
- Modify: `src/components/Layout.tsx:140-159` (the dead, commented-out nav block)

**Interfaces:**
- Consumes: `useNavigate`, `useLocation` (already imported), `activeGroupId` — **not currently destructured in `Layout.tsx`**; check `useGroup()`'s return value is already destructured there (it currently only pulls `groups, switchGroup` per the existing `const { groups, switchGroup } = useGroup();` line) and add `activeGroupId` to that destructure.
- Produces: nothing new — leaf UI change.

This is a secondary, desktop-only convenience (Task 1 alone already makes the feature reachable everywhere) — restoring it is worthwhile since the code was clearly intended to ship, but do not block on it if `activeGroupId` turns out to be unreliable here (see Step 1 note).

- [ ] **Step 1: Add `activeGroupId` to the existing `useGroup()` destructure**

In `src/components/Layout.tsx`, find:

```tsx
    const { groups, switchGroup } = useGroup();
```

Change to:

```tsx
    const { groups, switchGroup, activeGroupId } = useGroup();
```

- [ ] **Step 2: Replace the dead block with a working, minimal version**

The current commented-out block (inside the `<nav>` element, after the group list) is:

```tsx
                    {/* {activeGroupId && (
                        <>
                            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/50 mt-2">
                                Current View
                            </div>

                            <button
                                onClick={() => { void navigate(`/group/${activeGroupId}`); }}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", location.pathname === `/group/${activeGroupId}` ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                <span className="font-medium">Dashboard</span>
                            </button>
                            <button
                                onClick={() => { void navigate(`/group/${activeGroupId}/members`); }}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", location.pathname.includes('/members') ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                            >
                                <Users className="w-5 h-5" />
                                <span className="font-medium">Members</span>
                            </button>
                        </>
                    )} */}
```

Replace it with (dropping the redundant "Dashboard" sub-link — clicking a group in the list above already navigates to its details page, so a nested duplicate link adds no value; and dropping the unused `LayoutDashboard` icon rather than adding an import for it):

```tsx
                    {activeGroupId && (
                        <>
                            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/50 mt-2">
                                Current group
                            </div>

                            <button
                                onClick={() => { void navigate(`/group/${activeGroupId}/members`); }}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", location.pathname.includes('/members') ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                            >
                                <Users className="w-5 h-5" />
                                <span className="font-medium">Manage members</span>
                            </button>
                        </>
                    )}
```

`Users` and `cn` are already imported in this file; no new imports needed.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: same 24 pre-existing errors, none new.

- [ ] **Step 5: Manual verification**

`npm run dev`, desktop width (≥768px so the sidebar is visible):
- With a group active (visit any group's detail page), a "Current group" section appears in the sidebar below the group list, with a "Manage members" link.
- Clicking it navigates to `/group/:id/members` and highlights as active while there.
- Switching to a different group updates which group's members link would be shown (via `activeGroupId`).
- At 375px (sidebar hidden), confirm this doesn't affect anything — Task 1's header button is what mobile users rely on.
- Check dark mode.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "fix: restore dead sidebar link to group member management

This block existed in the codebase already but was wrapped in a JSX
comment, so it never rendered. Restored it (dropping the redundant
nested Dashboard link, which duplicated the group list's own
navigation) as a desktop convenience alongside Task 1's header button."
```

---

## Self-Review Notes

- **Spec coverage:** The user's report was "the guest-add logic lives at /group/:id/members but nothing navigates there." Task 1 fixes this unconditionally (works on every device, is the actual requirement). Task 2 restores a pre-existing but dead desktop affordance — a nice-to-have, not required for the core fix, called out as such in its own section.
- **No placeholders:** Both tasks show the exact before/after code, exact commit messages, exact verification commands.
- **Type consistency:** Task 1 uses `routeId` (matches `GroupDetail.tsx`'s own `useParams` destructure already in scope). Task 2 uses `activeGroupId` from `useGroup()`, matching the type already exposed by `GroupContextType.activeGroupId: string` (see `src/context/GroupContext.tsx`) — no new types introduced.
