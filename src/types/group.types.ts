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

export interface GroupMember {
    id: string;
    groupId: string;
    userId: string;
    name: string;
    avatarUrl: string;
    role: string;
    joinedAt: string;
    deletedAt: string | null;
}

export interface GroupDetail {
    id: string;
    name: string;
    inviteCode: string;
    currency: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    members: GroupMember[];
    _count: {
        expenses: number;
    };
}
