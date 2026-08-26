export interface SliceCapInput {
    key: string;
    amount: number;
}

export interface CappedSlice extends SliceCapInput {
    isOther: boolean;
}

const MAX_VISIBLE_SLICES = 5;

/**
 * Caps a list of pie-chart slices at MAX_VISIBLE_SLICES by amount, folding
 * everything beyond that into a single "Other" slice. Input order is not
 * assumed sorted; output is sorted descending by amount, with "Other" last.
 * Returns the input unchanged (just sorted) when it already fits.
 */
export function capChartSlices(input: SliceCapInput[]): CappedSlice[] {
    const sorted = [...input].sort((a, b) => b.amount - a.amount);
    if (sorted.length <= MAX_VISIBLE_SLICES + 1) {
        return sorted.map((s) => ({ ...s, isOther: false }));
    }
    const visible = sorted.slice(0, MAX_VISIBLE_SLICES).map((s) => ({ ...s, isOther: false }));
    const rest = sorted.slice(MAX_VISIBLE_SLICES);
    const otherTotal = rest.reduce((sum, s) => sum + s.amount, 0);
    return [...visible, { key: 'other', amount: otherTotal, isOther: true }];
}
