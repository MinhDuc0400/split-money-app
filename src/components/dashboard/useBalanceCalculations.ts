import { useMemo } from 'react';
import { isBalanceSettled } from '../../lib/accounting';

interface BalanceCalculationsProps {
    balances: Record<string, Record<string, number>>;
}

export function useBalanceCalculations({ balances }: BalanceCalculationsProps) {
    const { owedToYou, youOwe } = useMemo(() => {
        const owedToYou: Array<{ currency: string; amount: number }> = [];
        const youOwe: Array<{ currency: string; amount: number }> = [];

        // Aggregate balances across all members by currency
        Object.entries(balances).forEach(([curr, currencyBalances]) => {
            let totalPositive = 0;
            let totalNegative = 0;

            Object.values(currencyBalances).forEach(balance => {
                if (isBalanceSettled(balance)) return;
                if (balance > 0) {
                    totalPositive += balance;
                } else {
                    totalNegative += Math.abs(balance);
                }
            });

            if (!isBalanceSettled(totalPositive)) {
                owedToYou.push({ currency: curr, amount: totalPositive });
            }
            if (!isBalanceSettled(totalNegative)) {
                youOwe.push({ currency: curr, amount: totalNegative });
            }
        });

        return { owedToYou, youOwe };
    }, [balances]);

    return { owedToYou, youOwe };
}
