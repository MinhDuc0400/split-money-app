import type { Expense, Member, Transaction } from "../types";

// Calculate net balances for all members, grouped by currency
export function calculateBalances(members: Member[], expenses: Expense[]): Record<string, Record<string, number>> {
    const balancesByCurrency: Record<string, Record<string, number>> = {};

    // Group expenses by currency
    const expensesByCurrency: Record<string, Expense[]> = {};
    expenses.forEach(expense => {
        const currency = expense.currency || 'USD'; // Default to USD for backward compatibility
        if (!expensesByCurrency[currency]) {
            expensesByCurrency[currency] = [];
        }
        expensesByCurrency[currency].push(expense);
    });

    // Calculate balances for each currency
    Object.entries(expensesByCurrency).forEach(([currency, currencyExpenses]) => {
        const balances: Record<string, number> = {};

        // Initialize balances for this currency
        members.forEach(member => {
            balances[member.id] = 0;
        });

        currencyExpenses.forEach(expense => {
            const payerId = expense.payerId;
            const amount = expense.amount;

            // Credit the payer
            if (balances[payerId] !== undefined) {
                balances[payerId] += amount;
            }

            // Debit the people who owe (including the payer if they are in the split)
            expense.splits.forEach(split => {
                if (balances[split.memberId] !== undefined) {
                    balances[split.memberId] -= split.amount;
                }
            });
        });

        balancesByCurrency[currency] = balances;
    });

    return balancesByCurrency;
}

// Simplify debts logic (greedy min-cash-flow algorithm) for multi-currency
export function calculateSettlements(balancesByCurrency: Record<string, Record<string, number>>): Transaction[] {
    const allTransactions: Transaction[] = [];

    // Process each currency separately
    Object.entries(balancesByCurrency).forEach(([currency, balances]) => {
        const debtors: { id: string; amount: number }[] = [];
        const creditors: { id: string; amount: number }[] = [];

        Object.entries(balances).forEach(([id, amount]) => {
            // Round to 2 decimal places to avoid floating point issues
            const val = Math.round(amount * 100) / 100;
            if (val < -0.01) debtors.push({ id, amount: val }); // Negative balance means they owe money
            if (val > 0.01) creditors.push({ id, amount: val }); // Positive balance means they are owed money
        });

        // Sort by amount magnitude to optimize (greedy approach)
        debtors.sort((a, b) => a.amount - b.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        let debtorIndex = 0;
        let creditorIndex = 0;

        while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
            const debtor = debtors[debtorIndex];
            const creditor = creditors[creditorIndex];

            const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

            // Round amount to 2 decimals
            const validAmount = Math.round(amount * 100) / 100;

            if (validAmount > 0) {
                allTransactions.push({
                    from: debtor.id,
                    to: creditor.id,
                    amount: validAmount,
                    currency: currency
                });
            }

            // Update remaining amounts
            debtor.amount += validAmount;
            creditor.amount -= validAmount;

            // Move indices if settled (allow for small float epsilon)
            if (Math.abs(debtor.amount) < 0.01) debtorIndex++;
            if (Math.abs(creditor.amount) < 0.01) creditorIndex++;
        }
    });

    return allTransactions;
}
