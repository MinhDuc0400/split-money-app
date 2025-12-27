import type { Expense, Member, Transaction } from "../types";

// Calculate net balances for all members
export function calculateBalances(members: Member[], expenses: Expense[]): Record<string, number> {
    const balances: Record<string, number> = {};

    // Initialize balances
    members.forEach(member => {
        balances[member.id] = 0;
    });

    expenses.forEach(expense => {
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

    return balances;
}

// Simplify debts logic (greedy min-cash-flow algorithm)
export function calculateSettlements(balances: Record<string, number>): Transaction[] {
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

    const transactions: Transaction[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        // Round amount to 2 decimals
        const validAmount = Math.round(amount * 100) / 100;

        if (validAmount > 0) {
            transactions.push({
                from: debtor.id,
                to: creditor.id,
                amount: validAmount
            });
        }

        // Update remaining amounts
        debtor.amount += validAmount;
        creditor.amount -= validAmount;

        // Move indices if settled (allow for small float epsilon)
        if (Math.abs(debtor.amount) < 0.01) debtorIndex++;
        if (Math.abs(creditor.amount) < 0.01) creditorIndex++;
    }

    return transactions;
}
