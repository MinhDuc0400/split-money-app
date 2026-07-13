# Guest Member Settlement — Design Spec

**Date:** 2026-07-13
**Status:** Approved

## Problem

Guest members (`GroupMember` with `userId = null`, `isGuest = true`) cannot log in, so they cannot initiate settlements themselves. When a group has debts owed by a guest (e.g., CAM owes Duc $11,423.50 and 374,333đ), the debt sits permanently unsettled unless the app provides an alternative path.

## Solution

Allow the creditor (the authenticated member who is owed money) to mark a guest's debt as received on the guest's behalf — "Mark as received" — directly from the settlement plan. This records a completed settlement without requiring the guest to log in.

## Design Decisions

- **Who can settle a guest debt:** Only the creditor (the member the guest owes money to). Authorization is enforced both in UI (button visibility) and backend (caller must be the `to` member).
- **Granularity:** Per-currency "Mark as received" + "Mark all received" (settle all currencies at once), matching existing behavior for normal members.
- **After settlement:** Guest remains in the group. Removal is a separate manual action by the owner.
- **UI surface:** Inline on the settlement plan (Option A) — no new screens or modals.

## Data Flow

1. Creditor taps "Mark as received" on a guest's settlement row.
2. Frontend calls `POST /groups/:id/settle-guest` with `{ guestMemberId, currency, amount }`.
3. Backend verifies:
   - Caller is a non-deleted member of the group.
   - `guestMemberId` is in the same group, `isGuest: true`, not deleted.
   - Guest has a negative `MemberBalance` for `currency` (guest owes money).
   - `amount ≤ abs(guest.MemberBalance[currency])` — prevents over-settlement flipping the debt.
4. Backend wraps in `withIdempotency()` → calls existing `applySettlementInternal(tx, groupId, guestMemberId, callerMemberId, amount, currency, note)`.
5. `applySettlementInternal` atomically:
   - Creates a `Settlement` record (`fromId = guest`, `toId = caller`, `status = COMPLETED`).
   - Updates `MemberBalance` for both members.
6. Backend emits `settlement_updated` to the group room — all logged-in members update in real time.

History shows "CAM paid Duc Nguyen $X" naturally — no special-casing needed in `HistoryItem`.

## API

### New endpoint

```
POST /groups/:id/settle-guest
Auth: JWT (Bearer)

Body:
{
  guestMemberId: string   // GroupMember.id of the guest
  currency: string        // e.g. "USD", "VND"
  amount: number          // amount to settle (capped server-side at abs(balance))
}

Response: SettleUpResponse (same shape as /settle-up)
```

### Backend validation rules

| Check | Error |
|---|---|
| Caller is active member of group | 403 Forbidden |
| `guestMemberId` is in group, isGuest, not deleted | 404 Not Found |
| Guest balance in currency is negative | 400 Bad Request "Guest has no outstanding debt in this currency" |
| `amount > abs(balance)` | Cap silently to abs(balance) (or 400 — prefer capping) |
| Duplicate request (same idempotency key) | Return first response (idempotency) |

## Frontend Changes

### `SettlementPlanList.tsx`

Add `canSettleOnBehalf` alongside existing `canSettle`:

```ts
const canSettle = currentMemberId === group.fromMemberId;
const canSettleOnBehalf =
    isGuestMember?.(group.fromMemberId) && currentMemberId === group.toMemberId;
```

- When `canSettleOnBehalf`: show "Mark as received" (per-currency) and "Mark all received" (settle-all) buttons.
- When `canSettle` (existing): show "Record payment" and "Settle all" buttons (unchanged).
- Both route through the same `onSettle` / `onSettleAll` callbacks.

### `GroupDetail.tsx`

In `handleSettle` and `handleSettleAll`, detect guest debtor:

```ts
if (isGuestMember(settlement.from.memberId)) {
    dispatch(settleGuest({ groupId, guestMemberId: settlement.from.memberId, currency, amount }));
} else {
    // existing settle-up path
}
```

### `groupSlice.ts`

New thunk `settleGuest(groupId, guestMemberId, currency, amount)`:
- Calls `POST /groups/:id/settle-guest`
- On success: dispatches `fetchGroupBalances`, `fetchTransactions`, `fetchUserBalance` (same as `onSettlementUpdated` socket handler)

### Modal copy changes

`SettleUpModal` / `SettleAllModal` — when settling on behalf of a guest, title changes to:
- "Mark as received from [Guest Name]?" instead of "Record payment to [Name]?"

## Files Modified

| File | Change |
|---|---|
| `money-split-backend/src/settlements/settlements.controller.ts` | Add `POST /groups/:id/settle-guest` route |
| `money-split-backend/src/settlements/settlements.service.ts` | Add `settleGuest()` method with validation + idempotency |
| `money-split-backend/src/settlements/dto/settle-guest.dto.ts` | New DTO: `guestMemberId`, `currency`, `amount` |
| `money-split-app/src/store/slices/groupSlice.ts` | Add `settleGuest` thunk |
| `money-split-app/src/components/group-detail/SettlementPlanList.tsx` | Add `canSettleOnBehalf` + "Mark as received" buttons |
| `money-split-app/src/components/GroupDetail.tsx` | Route guest settle to new thunk in `handleSettle`/`handleSettleAll` |
| `money-split-app/src/components/group-detail/SettleUpModal.tsx` | Update copy for guest context |
| `money-split-app/src/components/group-detail/SettleAllModal.tsx` | Update copy for guest context |

## Out of Scope

- Removing a guest member (separate owner action, already partially built via `DELETE /groups/:id/members/:memberId`)
- Partial amount entry (always settles the full calculated amount shown in the plan)
- Notifying the guest (they have no account/email in scope)
