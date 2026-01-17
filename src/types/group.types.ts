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
    expenses: Expense[];
    _count: {
        expenses: number;
    };
}

export interface UserBalanceDetail {
    memberId: string;
    name: string;
    avatarUrl: string;
    amount: number;
}

export interface UserBalanceByCurrency {
    totalOwed: number;
    totalOwe: number;
    details: UserBalanceDetail[];
}

export interface UserBalanceResponse {
    balances: Record<string, UserBalanceByCurrency>;
}

export interface SettlementMember {
    memberId: string;
    name: string;
    avatarUrl: string;
}

export interface GroupSettlement {
    from: SettlementMember;
    to: SettlementMember;
    amount: number;
    currency: string;
}

export interface MemberBalance {
    memberId: string;
    name: string;
    avatarUrl: string;
    balance: number;
}

export type GroupBalancesResponse = Record<string, MemberBalance[]>;

export interface CreateSettlementRequest {
    fromId: string;
    toId: string;
    amount: number;
    currency: string;
    note?: string;
}
