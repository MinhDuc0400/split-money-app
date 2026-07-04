# Money Split — Full Redesign Plan

## Concept

Money Split should feel like a considerate friend doing the math for you — never a spreadsheet, never a bank. The redesign is built on five pillars, each answering a specific problem found during this session's review of the current app:

1. **Guided, not dense.** The current "Add Expense" form crams four split modes, payer selection, and amount entry into one screen. Redesign it as a short step-by-step flow — one decision at a time.
2. **Inclusive of non-users.** The single biggest structural gap found: there is currently no way to split with someone who doesn't have a Google account and the app installed (member management's add/rename controls are disabled stubs with no backing API). The redesign makes "guest" participants — people who exist in a group's ledger without an account — a first-class concept from the start, not an afterthought.
3. **Balances speak plainly.** No screen should require the user to do mental math. Every balance, split, and settlement reads as obviously correct at a glance.
4. **One clear next action per screen.** Restraint — a single primary button per view, everything else secondary.
5. **Warm and human.** Keep the app's existing design tokens (`--positive`/`--negative`/`--primary`/etc. from `src/index.css`) — refine values, don't replace the architecture (lesson from the earlier design-system review).

## Screens in Scope

| # | Screen | Current state | Redesign focus |
|---|---|---|---|
| 1 | Onboarding / first run | Drops straight to an empty dashboard with no guidance | Welcome → sign in → create or join a group, with the invite step teaching guest vs. real-member invites upfront |
| 2 | Global Dashboard | Cross-group balance summary + group list | Simplify to one hero number + scannable group list; single "Add expense" or "Create group" CTA depending on state |
| 3 | Group Dashboard | Per-group balance + quick stats | Same simplification, group-scoped |
| 4 | **Add Expense** (flagship redesign) | One dense form: amount, description, payer(s), split-type tabs, per-split inputs, all visible at once | 4-step guided flow (below) — this is the "user friendly steps to use" centerpiece |
| 5 | Group Detail | Balances, settlement plan, history in one scroll | Keep the three sections but make the settlement plan the visual anchor — it's the answer to "what do I do now" |
| 6 | Settle Up | Modal form | Simple per-transfer confirm, matches the settlement plan card's row-level "Record payment" pattern |
| 7 | Member Management | Add/rename disabled, no guest concept | Two clearly separate paths: "Invite someone with the app" (invite code) vs. "Add a guest" (name only, no account) |
| 8 | Empty / error / loading states | Inconsistent across screens | One consistent pattern: invitation-style empty states, plain-language errors, skeleton loading (not spinners) for anything >300ms |

## Flagship Flow: Add Expense, Step by Step

Replacing the single dense form with four short steps, one primary decision each:

**Step 1 — What was it?**
Description + amount. Currency defaults to the group's currency. Nothing else on screen.

**Step 2 — Who paid?**
Single payer by default (tap an avatar); "split the payment across multiple people" is a secondary, collapsed option — most expenses have one payer, so don't show multi-payer UI until asked for.

**Step 3 — How to split?**
The four modes (Even / Exact / Percentage / Shares) as a segmented control, but only one mode's inputs visible at a time (not all four stacked). Live running total shown inline as the user types, same validation rules as today. Guests created in this group appear in the participant list exactly like real members — no visual distinction beyond a small "guest" tag, since to a group member a guest is just another person, only the underlying account model differs.

**Step 4 — Review & confirm**
A plain-language summary: "Alex paid $60, split evenly between 4 people ($15 each)." One "Add expense" button. Back is always available to previous steps without losing entered data.

Each step shows a slim progress indicator (4 dots, not a percentage bar — this is a 4-step micro-flow, not a long form) and both Back and the single forward action are always in the same place.

## Guest Participants (new capability, cuts across screens)

- On the invite/member screen: "Add a guest" creates a participant with just a name — no email, no invite code, no account. They can be assigned expenses and appear in balances/settlements exactly like a real member.
- A guest's balance is tracked the same as anyone else's; settling up with a guest is recorded by whichever real member manages the group (since the guest has no login to record it themselves).
- Guests are visually identical to members in expense/balance lists (small "guest" tag only, not a different color or reduced-emphasis treatment — they're full participants, not second-class).
- This requires new backend endpoints (guest CRUD, guest balance tracking) — out of scope for the mockup/plan stage, called out explicitly as a backend dependency before this can ship.

## Sequencing

1. **This turn:** concept + plan (this doc) + mockups for the four most representative screens (Onboarding, Global Dashboard, Add Expense flow, Group Detail).
2. **Next, after your feedback:** mockups for the remaining screens (Member Management with guest flow, Settle Up, empty/error states) if the direction lands.
3. **After mockup approval:** a proper implementation plan (file/component structure, backend endpoints needed for guests, migration path from the current single-form Add Expense to the stepped flow) via the same plan-and-execute process used earlier this session.
