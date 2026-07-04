import { SplitType, type Split, type Expense, type Member, type Transaction } from "../types";

export type SplitCalculationResult =
    | { success: true; splits: Split[] }
    | { success: false; error: string };

// ---------- Helpers ----------

// Balances within this tolerance are treated as settled (avoids floating-point noise).
export const BALANCE_EPSILON = 0.01;

export function isBalanceSettled(amount: number): boolean {
    return Math.abs(amount) < BALANCE_EPSILON;
}

// ---------- Balances ----------

export function calculateBalances(
    members: Member[],
    expenses: Expense[]
): Record<string, Record<string, number>> {
    const balancesByCurrency: Record<string, Record<string, number>> = {};
    const expensesByCurrency: Record<string, Expense[]> = {};

    expenses.forEach(expense => {
        const currency = expense.currency || "USD";
        (expensesByCurrency[currency] ??= []).push(expense);
    });

    Object.entries(expensesByCurrency).forEach(([currency, currencyExpenses]) => {
        const balances: Record<string, number> = {};
        members.forEach(m => (balances[m.id] = 0));

        currencyExpenses.forEach(expense => {
            const amountCents = Math.round(expense.amount * 100);

            if (expense.payers && expense.payers.length > 0) {
                expense.payers.forEach(payer => {
                    balances[payer.memberId] += Math.round(payer.amount * 100);
                });
            } else if (expense.payerId) {
                // Fallback for legacy data
                balances[expense.payerId] += amountCents;
            }

            expense.splits.forEach(split => {
                balances[split.memberId] -= Math.round((split.amount || 0) * 100);
            });
        });

        Object.keys(balances).forEach(id => (balances[id] /= 100));
        balancesByCurrency[currency] = balances;
    });

    return balancesByCurrency;
}

// ---------- Settlements ----------

export function calculateSettlements(
    balancesByCurrency: Record<string, Record<string, number>>
): Transaction[] {
    const all: Transaction[] = [];

    Object.entries(balancesByCurrency).forEach(([currency, balances]) => {
        let debtors: { id: string; amount: number }[] = [];
        let creditors: { id: string; amount: number }[] = [];

        Object.entries(balances).forEach(([id, amount]) => {
            const cents = Math.round(amount * 100);
            if (cents < 0) debtors.push({ id, amount: cents });
            if (cents > 0) creditors.push({ id, amount: cents });
        });

        debtors = debtors.toSorted((a, b) => a.amount - b.amount);
        creditors = creditors.toSorted((a, b) => b.amount - a.amount);

        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            const d = debtors[i];
            const c = creditors[j];
            const amountCents = Math.min(Math.abs(d.amount), c.amount);

            all.push({
                from: d.id,
                to: c.id,
                amount: amountCents / 100,
                currency
            });

            d.amount += amountCents;
            c.amount -= amountCents;

            if (d.amount === 0) i++;
            if (c.amount === 0) j++;
        }
    });

    return all;
}

// ---------- Splits ----------

export function calculateSplits(
    totalAmount: number,
    splitType: SplitType,
    members: Member[],
    options: {
        includedMemberIds?: string[];
        manualAmounts?: Record<string, number>;
        percentages?: Record<string, number>;
        shares?: Record<string, number>;
    }
): SplitCalculationResult {
    const totalCents = Math.round(totalAmount * 100);

    if (isNaN(totalCents) || totalCents <= 0)
        return { success: false, error: "Total amount must be greater than 0." };

    if (!members?.length)
        return { success: false, error: "No members provided." };

    let splits: Split[] = [];

    switch (splitType) {
        case SplitType.EVEN: {
            const included = new Set(options.includedMemberIds || members.map(m => m.id));
            const participants = members.filter(m => included.has(m.id));

            if (!participants.length)
                return { success: false, error: "Please select at least one participant." };


            splits = participants.map((m) => ({
                memberId: m.id
            }));
            break;
        }

        case SplitType.EXACT: {
            const cents = members.map(m =>
                Math.round((options.manualAmounts?.[m.id] || 0) * 100)
            );
            const sum = cents.reduce((a, b) => a + b, 0);

            if (sum !== totalCents)
                return {
                    success: false,
                    error: `Exact amounts must sum to ${totalAmount.toFixed(2)}. Currently ${(sum / 100).toFixed(2)}.`
                };

            splits = members.filter(m => (options.manualAmounts?.[m.id] || 0) > 0).map((m) => ({
                memberId: m.id,
                amount: (options.manualAmounts?.[m.id] || 0)
            }));
            break;
        }

        case SplitType.PERCENTAGE: {
            const percentages = members.map(m => options.percentages?.[m.id] || 0);
            const sum = percentages.reduce((a, b) => a + b, 0);

            if (Math.round(sum * 100) !== 10000)
                return {
                    success: false,
                    error: `Percentages must sum to 100.00%. Currently ${sum.toFixed(2)}%.`
                };


            splits = members.filter(m => (options.percentages?.[m.id] || 0) > 0).map((m) => ({
                memberId: m.id,
                percentage: options.percentages?.[m.id] || 0
            }));
            break;
        }

        case SplitType.SHARES: {
            const shares = members.map(m => options.shares?.[m.id] || 0);

            if (shares.some(s => !Number.isInteger(s) || s < 0))
                return { success: false, error: "Shares must be non-negative integers." };

            const totalShares = shares.reduce((a, b) => a + b, 0);
            if (totalShares <= 0)
                return { success: false, error: "Total shares must be greater than 0." };


            splits = members.filter(m => (options.shares?.[m.id] || 0) > 0).map((m) => ({
                memberId: m.id,
                share: options.shares?.[m.id] || 0
            }));
            break;
        }

        default:
            return { success: false, error: "Invalid split type." };
    }

    return { success: true, splits };
}
// ---------- History Grouping ----------

export function groupExpensesByMonth(expenses: Expense[]): Record<string, Expense[]> {
    const grouped: Record<string, Expense[]> = {};

    // Sort expenses by date descending
    const sortedExpenses = [...expenses].sort((a, b) => b.createdAt - a.createdAt);

    sortedExpenses.forEach(expense => {
        const date = new Date(expense.createdAt);
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!grouped[monthYear]) {
            grouped[monthYear] = [];
        }
        grouped[monthYear].push(expense);
    });

    return grouped;
}
