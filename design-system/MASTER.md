# Money Split — Design System (MASTER)

> Revision note: the first version of this doc invented a parallel token vocabulary (`--fill-accent`, `--surface-1`, etc.) modeled on the Claude Design System (CDS) naming convention. That was a mistake — the app already has a mature, hand-built token system in `src/index.css` / `tailwind.config.js`, including `--positive`/`--negative`/`--warning` financial semantics. This revision keeps CDS's *principles* (restraint, content voice, accessible defaults) but maps them onto the app's **existing** tokens instead of replacing them.

Global source of truth. Page-specific deviations live in `design-system/pages/<page>.md` and override these rules where they conflict.

## 1. Brand Principles

Money Split is a calm, trustworthy tool for splitting bills with people you know. It should feel like a considerate friend doing the math for you — never a spreadsheet, never a bank.

- **Calm over flashy.** Financial data deserves clarity, not decoration.
- **Restraint.** One filled-`primary` action per screen. Everything else uses `secondary`/`ghost` treatment. "Too cluttered" is the most common failure mode in financial UI.
- **Precise.** Tabular figures, consistent decimal alignment, no ambiguous rounding shown to the user.
- **Quiet confidence.** Every balance, split, and settlement should read as obviously correct at a glance.

## 2. Tokens — use what already exists

Do not introduce new token names. `src/index.css` already defines everything this app needs, in both light and `.dark` variants:

| Existing token | Usage |
|---|---|
| `--background` / `--foreground` | App canvas / primary text |
| `--card` / `--card-foreground` | Card surfaces (settlement plan card, dashboard summary) |
| `--popover` / `--popover-foreground` | Dropdowns, group switcher menu |
| `--primary` / `--primary-foreground` | **The one primary action per screen** — Add expense, Settle up, Create group, Join group |
| `--secondary` / `--muted` / `--accent` | Secondary buttons, inactive segments, subtle backgrounds |
| `--destructive` / `--destructive-foreground` | Delete/leave-group actions |
| `--positive` | "You're owed" — already commented `/* user is owed */` |
| `--negative` | "You owe" — already commented `/* user owes */`. Note it shares nearly the same hue (~12°) as `--destructive`, which is intentional and fine (both read as "warm alert") but means negative-balance text should never be the only thing distinguishing an owe-chip from a destructive-button — pair with the layout/context, not color alone. |
| `--warning` | Near-settled / caution states (e.g. only one member's balance is unsettled in an otherwise-settled group) |
| `--border` / `--input` / `--ring` | Dividers, input borders, focus rings |
| `--radius` (`1rem`) | Keep as-is — already rounder/friendlier than a typical fintech app, which suits the "friend, not a bank" principle |

**One open decision for you, not silently changed:** `--background` is currently a cool neutral (`220 33% 98%`, blue-grey). A warmer background (cream/parchment) would read closer to "considerate friend" than "utility software," but changing it is an app-wide visual shift, not a docs-only tweak — flag as a candidate follow-up, don't change without sign-off.

**Confirmed accessibility defect (light mode only) — fix the values, don't rename the tokens:**

| Token | Current light-mode L | Contrast vs background/card | Required L for 4.5:1 |
|---|---|---|---|
| `--positive` | 42% | 3.57 / 3.75 — fails | ≤ 36% |
| `--negative` | 52% | 3.85 / 4.05 — fails | ≤ 42% |
| `--warning` | 47% | 1.89 / 1.98 — fails badly | ≤ 29% |

Dark mode already passes comfortably (7.06–12.0 across all three) — this is light-mode-only. Lower each token's lightness to the value in the table (keep hue/saturation as-is) wherever the color renders as text directly on `--background` or `--card`. If a lighter tint is wanted for large decorative use (e.g. a chart bar), keep a separate non-text usage — don't reuse the text token for backgrounds.

## 3. Icons

**Use `lucide-react`** — already a dependency, already used in 24 files across the app. Do not introduce Tabler, Heroicons, or any other icon set; that would mean two icon languages in one app.

## 4. Typography

Keep the app's existing font stack (`font-sans` per `body { @apply ... font-sans }`) — no change needed. Add one rule this app didn't have explicitly:

- **Currency amounts, at every size, use `font-variant-numeric: tabular-nums`.** Non-negotiable for a money app — columns of amounts must align. Add as a Tailwind utility (`tabular-nums` is already a built-in Tailwind class) applied wherever a balance or amount renders.

## 5. Layout Density

- **Dense lists (expense history, member list) use bordered rows** (`border-b border-border`), not a `card` wrapper per row. Reserve `card` for genuinely bounded single objects: the settlement plan, the dashboard summary, the add/edit-expense sheet.
- At most two floating layers open at once (e.g. a settle-up sheet with a currency `popover` inside it) — a third floating layer means it should be a full dialog, not a nested popover.

## 6. Motion

- Micro-interactions: 150–200ms, `ease-out` in / `ease-in` out (matches the existing `accordion-down`/`accordion-up` keyframe timing of 0.2s already in `tailwind.config.js` — stay consistent with that, don't introduce a different duration scale).
- Balance/number changes (e.g. after settling up): crossfade + slight upward slide, not an abrupt swap.
- Respect `prefers-reduced-motion` — crossfade only, no slide/scale.

## 7. Content Voice

- **Sentence case everywhere** — buttons, headings, labels. "Add expense", not "Add Expense".
- **Verb-first buttons, 1–3 words:** "Add expense", "Settle up", "Create group" — not "Submit" or "OK".
- **"Your", not "my":** "Your groups", "Your balance".
- **Errors say what happened, then what to do, no first person:**
  - "That invite code doesn't exist. Check it and try again."
  - "You have an unsettled balance. Settle up before leaving the group."
- **No "successfully", no "please", no exclamation marks:** "Expense added" — not "Your expense was successfully added!"
- **Empty states are an invitation:** "Start your first group" + one-line body + verb CTA — not "No groups yet."
- **Disabled controls need a visible reason, not just a hover tooltip** (tooltips don't reach touch users): the add/rename-member controls (no backing API yet) already correctly show a persistent caption — keep that pattern for any future disabled state.

## 8. Core Components (app-specific, on existing tokens)

### Balance Chip
Pill shape (`rounded-full`), flat fill, no shadow.
- Positive: `bg-positive/10 text-positive`, `+` prefix, `tabular-nums`.
- Negative: `bg-negative/10 text-negative`, `−` prefix, `tabular-nums`.
- Settled: `bg-muted text-muted-foreground`, explicit "Settled" label — never a blank chip.
- Never color-only: every chip pairs color with a sign or "you're owed"/"you owe" text.

### Split-Mode Selector
Segmented control (Even / Exact / Percentage / Shares), all four visible — not a dropdown.
- Selected: `bg-primary text-primary-foreground`.
- Unselected: `bg-muted text-muted-foreground`.
- Live validation inline below as the user types (e.g. running percentage total).

### Expense List Item (bordered row)
- Left: avatar (`rounded-full`, 40px, `lucide-react` fallback icon or initials on `bg-muted`).
- Center: description (`font-medium`) + payer/split summary (`text-muted-foreground text-sm`).
- Right: amount, `tabular-nums`, `text-positive`/`text-negative` by whether it affects the current user.
- `border-b border-border` between rows, no per-row card/shadow. Tap target ≥ 44px height.

### Settlement Plan Card
- `bg-card`, `rounded-[var(--radius)]`, one row per transfer: `<from avatar> → <to avatar>  <amount>`.
- Arrow via `lucide-react`'s `ArrowRight`, never emoji.
- Per-row "Record payment" button paired with its specific transfer — never one ambiguous global button.

### Member Avatar
- 40px default, 32px in dense lists, 56px on the member-management screen.
- Fallback: initials on `bg-muted`.
- Owner indicator: a small glyph badge (e.g. `lucide-react`'s `Star`, `text-primary`) — not color-only.

## 9. Accessibility Checklist (web-scoped — this is a responsive web app, not a native mobile app)

- [ ] Body text ≥ 16px, contrast ≥ 4.5:1 — **light-mode `--positive`/`--negative`/`--warning` currently fail this against `--background`/`--card` (see §2 table); apply the corrected lightness values before shipping.**
- [ ] Balance/status info always paired with text or icon, never color alone.
- [ ] Touch targets ≥ 44×44px, 8px minimum spacing.
- [ ] Focus rings (`--ring`) visible on every interactive element, keyboard tab order matches visual order.
- [ ] `prefers-reduced-motion` respected.
- [ ] Currency amounts use `tabular-nums`.
- [ ] Every icon-only button has an `aria-label`.
- [ ] Both `.dark` and light verified independently — don't assume light-mode contrast carries over.
- [ ] Responsive at 375px, 768px, 1024px, 1440px; no horizontal scroll on mobile.

## 10. Anti-Patterns (avoid)

- Inventing new CSS variable names when an existing token already covers the case.
- Introducing a second icon library alongside `lucide-react`.
- More than one `primary`-filled button visible on a screen at once.
- Wrapping every list row in a card with its own shadow — dense lists use bordered rows.
- Emoji as icons.
- Hover-only disabled-state explanations — always pair with visible caption text.
- Exclamation marks, "successfully", "please" in UI copy.
