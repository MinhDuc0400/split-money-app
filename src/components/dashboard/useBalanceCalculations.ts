import { useMemo } from 'react';

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
                if (balance > 0.01) {
                    totalPositive += balance;
                } else if (balance < -0.01) {
                    totalNegative += Math.abs(balance);
                }
            });

            if (totalPositive > 0.01) {
                owedToYou.push({ currency: curr, amount: totalPositive });
            }
            if (totalNegative > 0.01) {
                youOwe.push({ currency: curr, amount: totalNegative });
            }
        });

        return { owedToYou, youOwe };
    }, [balances]);

    return { owedToYou, youOwe };
}
