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
