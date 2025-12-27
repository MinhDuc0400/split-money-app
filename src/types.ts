export interface Member {
    id: string;
    name: string;
    avatar?: string; // URL or emoji
}

export interface Split {
    memberId: string;
    amount: number; // The amount this person owes for this expense
    paid: boolean; // Tracking payment status might be useful later, but for now we calculate net debts
}

export const SplitType = {
    EVEN: 'even',
    UNEVEN: 'uneven',
    PERCENTAGE: 'percentage',
    SHARES: 'shares'
} as const;

export type SplitType = typeof SplitType[keyof typeof SplitType];

export interface Expense {
    id: string;
    description: string;
    amount: number;
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
}

// Legacy type, keeping for reference but moving to GroupMeta structure
export interface GroupData {
    id: string;
    name: string;
    currency: string;
    members: Member[];
    expenses: Expense[];
}

export interface GroupMeta {
    id: string;
    name: string;
    currency: string;
    createdAt: number;
}

export const AppTab = {
    DASHBOARD: 'dashboard',
    MEMBERS: 'members',
    EXPENSES: 'expenses',
    SETTINGS: 'settings'
} as const;

export type AppTab = typeof AppTab[keyof typeof AppTab];

export const Theme = {
    DARK: 'dark',
    LIGHT: 'light',
    SYSTEM: 'system'
} as const;

export type Theme = typeof Theme[keyof typeof Theme];
