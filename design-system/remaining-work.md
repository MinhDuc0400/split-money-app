# Remaining Work: Money Split Redesign

This is the durable, self-contained task list for finishing the redesign. A fresh session with no memory of prior conversation can execute this by reading only the files referenced below — do not require any other context.

## Reference files (read these first, they are the source of truth)

- `design-system/MASTER.md` — token rules, component specs, content voice, accessibility checklist. Every task below must follow it.
- `design-system/redesign-plan.md` — the five design pillars, the full screen inventory, and the flagship Add Expense step-by-step flow spec.
- Backend guest endpoints are already implemented and committed in `money-split-backend` (commit `88260d7`): `POST /groups/:id/guests`, `PATCH /groups/:id/guests/:guestId`, `DELETE /groups/:id/guests/:guestId`, each taking `{ name: string }` (except DELETE). `GroupMember` now has an `isGuest: boolean` field (`true` for guests, `false` for real members).

## Outstanding backend work (money-split-backend repo)

**B1. Apply the pending migration.**
`prisma/migrations/20260704120000_add_guest_member/migration.sql` adds the `is_guest` column but has not been applied to the real database — the Neon instance was unreachable (`P1001`) when this was written. Run `npx prisma migrate deploy` once connectivity is confirmed (`npx prisma db pull --print` should succeed first). If still unreachable, this is a Neon project/network issue outside the codebase, not a code task — check the Neon dashboard for a suspended/paused project before assuming a config bug.

**B2. Surface `isGuest` in read responses.**
`GroupsService.findOne()` (`src/groups/groups.service.ts`) already includes `members` on the group response — since `isGuest` is now a real column, Prisma will include it automatically with no code change needed. Verify this by checking the response shape includes `isGuest` for each member (write a quick test or inspect `findOne`'s include block if in doubt — do not assume, confirm).

## Frontend work (split-money-app repo), in this exact order

### Task A — Fix light-mode contrast (mechanical, do first, lowest risk)

File: `src/index.css`, the `:root` block (light mode; `.dark` block already passes and must not change).

Change exactly these three lightness values (keep hue and saturation unchanged):

```css
--positive: 158 36% 36%;   /* was 42% */
--negative: 12 68% 42%;    /* was 52% */
--warning: 45 93% 29%;     /* was 47% */
```

These values were computed to clear 4.5:1 contrast against `--background`/`--card` (see `design-system/MASTER.md` §2 for the derivation). After changing, spot-check by rendering `GlobalDashboard`, `GroupDetail`, and any warning banner in light mode — text should look clearly darker/more saturated than before, not washed out.

### Task B — Wire up guest management in Member Management

Files: `src/components/MemberManager.tsx`, `src/components/member-manager/AddMemberForm.tsx`, `src/components/member-manager/MemberListItem.tsx`, `src/context/GroupContext.tsx` (or wherever API calls are dispatched from — check existing `addMember`/`updateMemberName`/`removeMember` wiring first).

1. Replace the currently-disabled "add member" control with the two-path UI from the mockup in this session (invite-code path vs. add-a-guest path), matching `design-system/MASTER.md`'s Member Management component spec.
2. Add-a-guest calls `POST /groups/:id/guests` with `{ name }`.
3. Rename (for guests only — real members' names come from their Google profile and are not renamed here) calls `PATCH /groups/:id/guests/:guestId`.
4. Remove-guest calls `DELETE /groups/:id/guests/:guestId`; surface the "unsettled balance" 403 error using the content-voice rule from `MASTER.md` §7 ("This guest has an unsettled balance. Settle up before removing them." — already the exact string the backend returns, display it as-is, do not rewrite it).
5. Show a small "guest" tag (not a color/emphasis difference) next to guest members everywhere a member name renders: `MemberListItem`, expense payer/split pickers, balance chips, settlement plan rows. Use the `Member` type's `isGuest` field — add it to `src/types/member.types.ts` if not already present, and thread it through the same mapping functions that already thread `role` (added earlier this session in `groupSlice.ts`'s `toMember()` and `GroupContext.tsx`'s member mapping — follow that exact pattern for `isGuest`).

### Task C — Redesign Add Expense as a 4-step flow (the flagship change)

Files: `src/components/ExpenseForm.tsx` (currently one dense form — restructure into steps, do not just add CSS `display:none` toggling without changing the component structure) and its children under `src/components/expense-form/`.

Exact steps, matching the interactive mockup shown this session and `redesign-plan.md`'s "Flagship Flow" section:

1. **Step 1 — What was it?** Description + amount only.
2. **Step 2 — Who paid?** Single payer by default (tap an avatar, including guests); "split the payment across multiple people" as a secondary expandable option revealing the existing multi-payer UI.
3. **Step 3 — How to split?** The existing four-mode segmented control (Even/Exact/Percentage/Shares), but render only the selected mode's inputs, not all four stacked. Keep using `calculateSplits` from `src/lib/accounting.ts` unchanged — this is a presentation restructure, not a calculation change.
4. **Step 4 — Review & confirm.** Plain-language sentence per `MASTER.md` §7 content voice (e.g. "Alex paid $60, split evenly between 4 people ($15 each)."), then the single "Add expense" submit button.

Requirements for all four steps:
- 4-dot progress indicator (not a percentage bar).
- Back and the single forward action always in the same screen position.
- Form state must persist across Back/Next — do not remount the form and lose entered values when navigating between steps.
- Editing an existing expense reuses the same 4-step component, pre-filled, with "Save changes" replacing "Add expense" on step 4 — do not maintain two separate forms.

### Task D — Redesign Global Dashboard

File: `src/components/GlobalDashboard.tsx`.

One hero balance number (largest text on the page) + a scannable group list (avatar/icon, name, member count, per-group balance or "Settled"), single primary CTA ("Add expense" if the user has groups, "Create group" if not) — matching the dashboard mockup shown this session. Remove any competing secondary CTAs from the fold.

### Task E — Redesign Group Detail

File: `src/components/GroupDetail.tsx` and `src/components/group-detail/*`.

Reorder so the settlement plan (`SettlementPlanList`) renders above the member balances list and expense history, not below — it is the answer to "what do I do now" and should be the first thing seen after the header. Per-row "Record payment" button stays paired with its specific transfer (already correct per the existing component; do not change that part).

### Task F — Redesign Settle Up

File: `src/components/group-detail/SettleUpModal.tsx`.

Simplify to: from/to avatars, amount (pre-filled from the settlement plan row that opened it), optional note, Cancel/Record payment buttons — matching the settle-up mockup. This should already be close to the existing implementation; confirm it matches the mockup's simplicity rather than rebuilding from scratch.

### Task G — Empty / error / loading states

Apply across the app, per `MASTER.md` §7 and the states mockup shown this session:
- Empty states: icon + one-line headline + one-line body + verb-first CTA button (e.g. "Start your first group" / "Add a group to start splitting expenses with friends." / "Create group"). Never a bare "No X yet" with no action.
- Errors: plain language, states what happened and what to do, no "Error:" prefix, no first person. Reuse existing error strings where the backend already returns clear messages (e.g. the guest-removal unsettled-balance message from Task B) rather than rewrapping them.
- Loading: skeleton placeholders (gray blocks matching the eventual content's shape) for anything expected to take >300ms, not a spinner. Do not introduce a new loading-state library — build with existing Tailwind utility classes (`bg-muted animate-pulse` or similar, matching the app's existing patterns).

## Verification, every task

For each task: run `npx tsc --noEmit` (frontend) or the equivalent backend typecheck, run the relevant test suite, and — since these are all UI-observable changes — start the dev server and visually confirm against the mockups shown this session (or the descriptions above if mockups aren't available in the new session) in both light and dark mode, desktop and a mobile viewport (375px). Do not mark a task done on typecheck/tests alone when it changes rendered UI.

## Suggested execution approach

This is a large, multi-task frontend effort with one small backend follow-up (B1, which may be blocked on external DB access). Use `superpowers:writing-plans` to turn Tasks A–G above into a fully-specified implementation plan (exact component code, file structure) before executing, then `superpowers:subagent-driven-development` to execute it task-by-task with review gates — the same process used earlier in this project. Task A has no dependencies and should go first since it's mechanical and de-risks nothing else. Task C (the flagship flow) is the largest single task and may warrant its own sub-plan.
