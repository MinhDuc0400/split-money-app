import type { Member } from './member.types';
import type { Expense } from './expense.types';

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
