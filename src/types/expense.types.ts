export interface Split {
    memberId: string;
    amount?: number; // The amount this person owes for this expense
    share?: number;
    percentage?: number;
    paid?: boolean; // Tracking payment status might be useful later, but for now we calculate net debts
}

export interface Payer {
    memberId: string;
    amount: number;
}

export const SplitType = {
    EVEN: 'EVEN',
    EXACT: 'EXACT',
    PERCENTAGE: 'PERCENTAGE',
    SHARES: 'SHARES'
} as const;

export type SplitType = typeof SplitType[keyof typeof SplitType];

export interface Expense {
    id: string;
    description: string;
    amount: number;
    currency: string; // Currency code (USD, VND, EUR, etc.)
    payerId?: string; // Legacy: the single person who paid (to be replaced by payers)
    payers: Payer[]; // The people who paid
    date: string; // ISO date string
    splitType: SplitType;
    splits: Split[]; // Breakdown of who owes what
    createdAt: number;
}

export interface CreateExpenseRequest {
    description: string;
    amount: number;
    splitType: SplitType;
    currency: string;
    payers: Payer[];
    splits: Split[];
    date: string;
}

export type UpdateExpenseRequest = Partial<CreateExpenseRequest>;

export interface Transaction {
    from: string;
    to: string;
    amount: number;
    currency: string; // Currency code for this transaction
}
