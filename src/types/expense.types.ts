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

export const ExpenseCategory = {
    FOOD: 'FOOD',
    TRANSPORT: 'TRANSPORT',
    RENT: 'RENT',
    UTILITIES: 'UTILITIES',
    ENTERTAINMENT: 'ENTERTAINMENT',
    SHOPPING: 'SHOPPING',
    TRAVEL: 'TRAVEL',
    HEALTH: 'HEALTH',
    OTHER: 'OTHER'
} as const;

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

export interface Expense {
    id: string;
    description: string;
    amount: number;
    currency: string; // Currency code (USD, VND, EUR, etc.)
    payers: Payer[]; // The people who paid
    date: string; // ISO date string
    splitType: SplitType;
    category?: ExpenseCategory; // Optional — defaults to OTHER server-side
    splits: Split[]; // Breakdown of who owes what
    createdAt: number;
    payerId?: string; // Legacy support
}

export interface CreateExpenseRequest {
    description: string;
    amount: number;
    splitType: SplitType;
    category?: ExpenseCategory;
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
export interface HistoryMember {
    memberId: string;
    name: string;
    avatarUrl?: string | null;
}

export interface HistoryTransaction {
    id: string;
    type: 'EXPENSE' | 'SETTLEMENT';
    description: string;
    amount: number;
    currency: string;
    date: string;
    // EXPENSE fields
    payerId?: string;
    payers?: {
        memberId: string;
        amount: number;
        name: string;
    }[];
    splitType?: SplitType;
    category?: ExpenseCategory;
    splits?: Split[];
    // SETTLEMENT fields
    from?: HistoryMember;
    to?: HistoryMember;
}

export type TransactionHistoryMap = Record<string, HistoryTransaction[]>;

export interface PaginatedHistoryResponse {
    items: HistoryTransaction[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface CategorySpending {
    category: ExpenseCategory;
    totalCents: number;
}

export interface PersonSpending {
    memberId: string;
    name: string;
    totalCents: number;
}

export interface PersonCategorySpending {
    memberId: string;
    name: string;
    category: ExpenseCategory;
    totalCents: number;
}

export interface TopExpenseItem {
    id: string;
    description: string;
    amount: number;
    currency: string;
    category: ExpenseCategory;
    date: string;
    payerNames: string[];
}
