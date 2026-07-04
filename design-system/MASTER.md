# Money Split — Design System (MASTER)

Built on the Claude Design System (CDS) token vocabulary (`@ant/cds` vanilla tokens). Global source of truth. Page-specific deviations live in `design-system/pages/<page>.md` and override these rules where they conflict.

## 1. Brand Principles

Money Split is a calm, trustworthy tool for splitting bills with people you know. It should feel like a considerate friend doing the math for you — never a spreadsheet, never a bank.

- **Calm over flashy.** Financial data deserves clarity, not decoration.
- **Restraint.** One accent-filled action per screen. Everything else is secondary or ghost. "Too cluttered" is the most common design failure — default to the quieter option.
- **Precise.** Tabular figures, consistent decimal alignment, no ambiguous rounding shown to the user.
- **Quiet confidence.** Every balance, split, and settlement should read as obviously correct at a glance.

## 2. Token Mapping (CDS → Money Split)

This app is not a Claude surface — it does not use `--font-voice` (serif) or the `brand` (clay) role, both of which are reserved for Claude's own presence (chat responses, Claude-initiated actions). Money Split maps its own semantics onto CDS's remaining roles:

| CDS role/token | Money Split usage |
|---|---|
| `--page-bg` / `--surface-0` | App background |
| `--surface-1` | In-flow cards (dashboard summary, settlement plan card) |
| `--surface-panel` (`--surface-2`) | Modals: add/edit expense, settle-up sheet |
| `--surface-popover` (`--surface-3`) | Dropdowns, the group switcher menu |
| `--text-primary` / `--text-secondary` / `--text-muted` | Primary text / metadata & captions / placeholders |
| `--fill-accent` / `--bg-accent` / `--text-accent` (blue) | **Primary user actions** — Add expense, Settle up, Create group, Join group. This is the app's one primary action color; `brand` (clay) is never used here. |
| `--fill-success` / `--bg-success` / `--text-success` (green) | "You're owed" balances |
| `--fill-danger` / `--bg-danger` / `--text-danger` (red) | "You owe" balances, destructive actions (delete/leave group, remove member) |
| `--fill-warning` / `--bg-warning` / `--text-warning` (yellow) | Unsettled-balance warnings (e.g. blocking leave/delete) |
| `--border` / `--border-strong` | Default hairlines / emphasized dividers |
| `--font-sans` | All text — no serif anywhere in this app |
| `[data-density]` = `comfortable` | This is a consumer app for friend groups, not a power-user tool — comfortable density throughout, not compact |

**Dark mode**: automatic — every token above flips via `[data-mode="dark"]`. No custom dark-mode overrides needed; this is a direct benefit of building on CDS rather than a hand-rolled palette.

## 3. Typography

`--font-sans` only, per CDS type scale (`--font-size-{caption,footnote,body,code,heading,title}`). One addition specific to this app:

- **Currency amounts, at every size, use `font-variant-numeric: tabular-nums`.** This is the one typographic rule CDS doesn't specify generically but is non-negotiable for a money app — columns of amounts must align.
- Dashboard total: `--font-size-title`, weight 500 (CDS never uses weight 600/700 in UI chrome — two weights only, 400 and 500).
- Section headers: `--font-size-heading`, weight 500.
- Body / list items: `--font-size-body`, weight 400; member names and expense descriptions at weight 500 for emphasis.
- Captions / metadata: `--font-size-caption`, `--text-muted` — never `opacity`, which drifts per-surface.

## 4. Layout Density & Elevation

- **Dense lists (expense history, member list): bordered rows, not rounded cards.** Per CDS restraint rule — reserve `--radius`/card treatment for genuinely bounded objects (the settlement plan card, the dashboard summary), not repeated list rows.
- **At most two floating elevations on screen at once** (`panel` / `popover`) — e.g. the settle-up sheet (`panel`) can open a currency dropdown (`popover`), but never stack a third floating layer; that's a `Dialog`, not another popover.
- Flat in-flow tiles (dashboard cards) use `--radius` + `--surface-1` + `--shadow-sm`-equivalent hairline — no depth stacking beyond that.

## 5. Motion

- CDS durations: `--dur-fast` for hover/press feedback, `--dur-base` for balance/number transitions after settling up (crossfade + `--ease-out`), `--dur-slow` reserved for sheet/modal enter-exit only.
- Respect `prefers-reduced-motion`: crossfade only, no slide/scale.
- One primary animated element per transition.

## 6. Content Voice (CDS content rules, applied to this app)

- **Sentence case everywhere** — buttons, headings, labels. "Add expense", not "Add Expense".
- **No terminal punctuation on labels/headings.** Helper text and empty-state body copy do end with a period.
- **Verb-first buttons, 1–3 words:** "Add expense", "Settle up", "Create group", "Join group" — not "Submit" or "OK".
- **"Your", not "my":** "Your groups", "Your balance" — never "My groups".
- **Errors say what happened, then what to do, no first person, no "Error:" prefix:**
  - "That invite code doesn't exist. Check it and try again." — not "Error: invalid invite code"
  - "You have an unsettled balance. Settle up before leaving the group." — not "Error: cannot leave group"
- **No "successfully", no "please", no exclamation marks:** "Expense added" — not "Your expense was successfully added!"
- **Empty states are an invitation, not an apology:** "Start your first group" / one-line body / verb CTA "Create group" — not "No groups yet."
- **Disabled controls need a visible reason, not just a tooltip** (tooltips don't appear on touch): the add/rename-member controls (no backing API yet) show a persistent caption below the control — "Adding members isn't supported yet." — rather than relying on hover-only text.

## 7. Core Components (app-specific, on CDS tokens)

### Balance Chip
The most-repeated element (dashboard, group list, member list) — must be instantly scannable.
- Shape: pill (`--radius: 999px` override), no shadow — flat fill only.
- Positive: `--bg-success` background, `--text-success` text, `+` prefix, tabular-nums.
- Negative: `--bg-danger` background, `--text-danger` text, `−` prefix, tabular-nums.
- Settled: `--surface-1` background, `--text-secondary` text, explicit "Settled" label — never a blank/empty chip.
- Balance is never conveyed by color alone: every chip pairs color with a `+`/`−` sign or "you're owed"/"you owe" text.

### Split-Mode Selector
Segmented control (Even / Exact / Percentage / Shares) — all four visible at once, not a dropdown, since there are only four and comparing them matters.
- Selected segment: `--fill-accent` background, `--on-accent` text.
- Unselected: `--surface-1` background, `--text-secondary` text.
- Live validation inline below the control as the user types (e.g. running percentage total) — not deferred to submit.

### Expense List Item (bordered row, not a card)
- Left: avatar (`--radius: 999px`, 40px, `--fill-control` fallback background with initials).
- Center: description (`--text-primary`, weight 500) + payer/split summary (`--text-muted`, caption size).
- Right: amount, tabular-nums, colored `--text-success`/`--text-danger` by whether it affects the current user's balance.
- `border-bottom: 1px solid var(--border)` between rows, no per-row card/shadow. Full-width tap target ≥ 44px height.

### Settlement Plan Card (the one card in a list context — genuinely bounded, one plan)
- `--surface-1`, `--radius`, one row per suggested transfer: `<from avatar> → <to avatar>  <amount>`.
- Arrow via Tabler `ti-arrow-right` icon (SVG), never emoji.
- Per-row CTA "Record payment" (`--fill-accent`, secondary-style per CDS default unless it's the screen's one primary action) — paired with its specific transfer, never one ambiguous global button.

### Member Avatar
- 40px default, 32px in dense lists, 56px on the member-management screen.
- Fallback: initials on `--fill-control` background.
- Owner indicator: a small glyph badge (not color-only) using `--text-accent`.

## 8. Accessibility Checklist

- [ ] Body text ≥ 16px (`--font-size-body`), CDS tokens are pre-vetted for 4.5:1 contrast in both modes.
- [ ] Balance/status information always paired with text or icon, never color alone.
- [ ] Touch targets ≥ 44×44px, 8px minimum spacing between adjacent targets.
- [ ] `--focus-shadow` visible on every interactive element, keyboard-navigable in DOM order.
- [ ] `prefers-reduced-motion` respected.
- [ ] Currency amounts use `tabular-nums`.
- [ ] Every icon-only button has an `aria-label`.
- [ ] Both themes verified independently via `[data-mode]` — CDS tokens flip automatically, but app-specific choices (e.g. chip fills) must still be checked in both.

## 9. Anti-Patterns (avoid)

- Using `brand`/clay for any app action — that role is reserved for Claude's own presence and would misrepresent whose action it is.
- More than one `--fill-accent` (primary) button visible on a screen at once.
- Wrapping every list row in a rounded card with its own shadow — dense lists use bordered rows.
- Neon/saturated red-green — CDS's `success`/`danger` role tokens are already tuned for accessible contrast; don't override with raw hex.
- Emoji as icons — Tabler outline icons only.
- Hover-only disabled-state explanations — always pair with visible caption text.
- Exclamation marks, "successfully", "please" in any UI copy.
