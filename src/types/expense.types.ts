export interface Split {
    memberId: string;
    amount: number; // The amount this person owes for this expense
    paid: boolean; // Tracking payment status might be useful later, but for now we calculate net debts
}

export const SplitType = {
    EVEN: 'even',
    EXACT: 'uneven',
    PERCENTAGE: 'percentage',
    SHARES: 'shares'
} as const;

export type SplitType = typeof SplitType[keyof typeof SplitType];

export interface Expense {
    id: string;
    description: string;
    amount: number;
    currency: string; // Currency code (USD, VND, EUR, etc.)
    payerId: string; // The person who paid
    date: string; // ISO date string
    splitType: SplitType;
    splits: Split[]; // Breakdown of who owes what
    createdAt: number;
}

export interface Transaction {
    from: string;
    to: string;
    amount: number;
    currency: string; // Currency code for this transaction
}
