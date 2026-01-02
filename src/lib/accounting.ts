import { SplitType, type Split, type Expense, type Member, type Transaction } from "../types";

export type SplitCalculationResult =
    | { success: true; splits: Split[] }
    | { success: false; error: string };

// ---------- Helpers ----------

// Allocate "totalCents" proportionally based on numeric weights
function allocateByWeights(weights: number[], totalCents: number): number[] {
    const raw = weights.map(w => {
        const exact = (totalCents * w) / weights.reduce((a, b) => a + b, 0);
        return { base: Math.floor(exact), frac: exact - Math.floor(exact) };
    });

    const assigned = raw.reduce((a, b) => a + b.base, 0);
    let rem = totalCents - assigned;

    const order = raw
        .map((r, idx) => ({ idx, frac: r.frac }))
        .sort((a, b) => b.frac - a.frac);

    const cents = raw.map(r => r.base);
    for (let i = 0; i < order.length && rem > 0; i++, rem--) {
        cents[order[i].idx] += 1;
    }

    return cents;
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
            balances[expense.payerId] += amountCents;

            expense.splits.forEach(split => {
                balances[split.memberId] -= Math.round(split.amount * 100);
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
        const debtors: { id: string; amount: number }[] = [];
        const creditors: { id: string; amount: number }[] = [];

        Object.entries(balances).forEach(([id, amount]) => {
            const cents = Math.round(amount * 100);
            if (cents < 0) debtors.push({ id, amount: cents });
            if (cents > 0) creditors.push({ id, amount: cents });
        });

        debtors.sort((a, b) => a.amount - b.amount);
        creditors.sort((a, b) => b.amount - a.amount);

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

            const base = Math.floor(totalCents / participants.length);
            const remainder = totalCents % participants.length;

            splits = participants.map((m, i) => ({
                memberId: m.id,
                amount: (base + (i < remainder ? 1 : 0)) / 100,
                paid: false
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

            splits = members.map((m, i) => ({
                memberId: m.id,
                amount: cents[i] / 100,
                paid: false
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

            const cents = allocateByWeights(percentages, totalCents);

            splits = members.map((m, i) => ({
                memberId: m.id,
                amount: cents[i] / 100,
                paid: false
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

            const cents = allocateByWeights(shares, totalCents);

            splits = members.map((m, i) => ({
                memberId: m.id,
                amount: cents[i] / 100,
                paid: false
            }));
            break;
        }

        default:
            return { success: false, error: "Invalid split type." };
    }

    return { success: true, splits };
}
