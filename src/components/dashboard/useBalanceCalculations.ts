import { useMemo } from 'react';
import { isBalanceSettled } from '../../lib/accounting';

interface BalanceCalculationsProps {
    balances: Record<string, Record<string, number>>;
    currentMemberId: string | undefined;
}

/**
 * Computes the *viewing user's own* owed/owe summary from the group-wide
 * per-member balances map. Must isolate currentMemberId's entry — summing
 * every member's balance would show the same aggregate numbers to everyone
 * in the group regardless of who's looking (e.g. a 2-person group would
 * show "owed X / owe X" to both members instead of each seeing their own
 * side of the split).
 */
export function useBalanceCalculations({ balances, currentMemberId }: BalanceCalculationsProps) {
    const { owedToYou, youOwe } = useMemo(() => {
        const owedToYou: Array<{ currency: string; amount: number }> = [];
        const youOwe: Array<{ currency: string; amount: number }> = [];

        if (!currentMemberId) {
            return { owedToYou, youOwe };
        }

        Object.entries(balances).forEach(([curr, currencyBalances]) => {
            const myBalance = currencyBalances[currentMemberId];
            if (myBalance === undefined || isBalanceSettled(myBalance)) {
                return;
            }
            if (myBalance > 0) {
                owedToYou.push({ currency: curr, amount: myBalance });
            } else {
                youOwe.push({ currency: curr, amount: Math.abs(myBalance) });
            }
        });

        return { owedToYou, youOwe };
    }, [balances, currentMemberId]);

    return { owedToYou, youOwe };
}
