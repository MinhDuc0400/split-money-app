// Distinct, colorblind-tolerant hues for person-keyed charts (currently only
// the Spending by Person donut). Deliberately separate from CATEGORY_COLORS
// in expenseCategories.ts — that palette is for category-keyed charts and
// this one is for member-keyed charts; the two never need to agree with
// each other.
const MEMBER_COLOR_PALETTE = [
    '#f97316', '#3b82f6', '#8b5cf6', '#eab308', '#ec4899',
    '#14b8a6', '#06b6d4', '#ef4444', '#64748b', '#a855f7',
    '#0ea5e9', '#84cc16',
];

// Deterministic per memberId (a stable UUID), so the same member always
// gets the same color across page loads with no server-side storage. Two
// members can collide onto the same color in a large group — an accepted
// cosmetic limitation of a small fixed palette, same tradeoff CATEGORY_COLORS
// already accepts.
export function getMemberColor(memberId: string): string {
    let hash = 0;
    for (let i = 0; i < memberId.length; i++) {
        hash = (hash * 31 + memberId.charCodeAt(i)) | 0;
    }
    return MEMBER_COLOR_PALETTE[Math.abs(hash) % MEMBER_COLOR_PALETTE.length];
}
