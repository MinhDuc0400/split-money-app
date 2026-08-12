import {
    UtensilsCrossed,
    Car,
    Home,
    Zap,
    Film,
    ShoppingBag,
    Plane,
    HeartPulse,
    MoreHorizontal,
    type LucideIcon,
} from 'lucide-react';
import { ExpenseCategory } from '../types/expense.types';

export const CATEGORY_ORDER: ExpenseCategory[] = [
    ExpenseCategory.FOOD,
    ExpenseCategory.TRANSPORT,
    ExpenseCategory.RENT,
    ExpenseCategory.UTILITIES,
    ExpenseCategory.ENTERTAINMENT,
    ExpenseCategory.SHOPPING,
    ExpenseCategory.TRAVEL,
    ExpenseCategory.HEALTH,
    ExpenseCategory.OTHER,
];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    FOOD: 'Food',
    TRANSPORT: 'Transport',
    RENT: 'Rent',
    UTILITIES: 'Utilities',
    ENTERTAINMENT: 'Entertainment',
    SHOPPING: 'Shopping',
    TRAVEL: 'Travel',
    HEALTH: 'Health',
    OTHER: 'Other',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
    FOOD: UtensilsCrossed,
    TRANSPORT: Car,
    RENT: Home,
    UTILITIES: Zap,
    ENTERTAINMENT: Film,
    SHOPPING: ShoppingBag,
    TRAVEL: Plane,
    HEALTH: HeartPulse,
    OTHER: MoreHorizontal,
};

// Distinct, colorblind-tolerant hues for the dashboard donut chart and its legend.
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
    FOOD: '#f97316',
    TRANSPORT: '#3b82f6',
    RENT: '#8b5cf6',
    UTILITIES: '#eab308',
    ENTERTAINMENT: '#ec4899',
    SHOPPING: '#14b8a6',
    TRAVEL: '#06b6d4',
    HEALTH: '#ef4444',
    OTHER: '#64748b',
};
