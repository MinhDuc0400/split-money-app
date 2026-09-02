export const API_BASE_URL = import.meta.env.VITE_API_URL as string;
export const API_PUBLIC_URL = import.meta.env.VITE_API_PUBLIC_URL as string;

export const API_ENDPOINTS = {
    AUTH: {
        GOOGLE: `${API_PUBLIC_URL}/auth/google`,
        APPLE: `${API_PUBLIC_URL}/auth/apple`,
        LOGOUT: `${API_PUBLIC_URL}/auth/logout`,
        ME: `${API_PUBLIC_URL}/auth/me`,
    },
    GROUPS: {
        BASE: `${API_BASE_URL}/groups`,
        BY_ID: (id: string) => `${API_BASE_URL}/groups/${id}`,
        JOIN: `${API_BASE_URL}/groups/join`,
        EXPENSES: (id: string) => `${API_BASE_URL}/groups/${id}/expenses`,
        TRANSACTIONS: (id: string, cursor?: string, limit = 20) =>
            `${API_BASE_URL}/groups/${id}/transactions?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
        BALANCE_ME: (id: string) => `${API_BASE_URL}/groups/${id}/balances/me`,
        BALANCES: (id: string) => `${API_BASE_URL}/groups/${id}/balances`,
        SETTLEMENTS: (id: string) => `${API_BASE_URL}/groups/${id}/settlements`,
        EXPENSES_BY_CATEGORY: (id: string, currency?: string) =>
            `${API_BASE_URL}/groups/${id}/expenses/by-category${currency ? `?currency=${currency}` : ''}`,
        EXPENSES_BY_PERSON: (id: string, currency?: string, metric?: 'paid' | 'share') => {
            const params = new URLSearchParams();
            if (currency) params.set('currency', currency);
            if (metric) params.set('metric', metric);
            const qs = params.toString();
            return `${API_BASE_URL}/groups/${id}/expenses/by-person${qs ? `?${qs}` : ''}`;
        },
        EXPENSES_BY_PERSON_CATEGORY: (id: string, currency?: string) =>
            `${API_BASE_URL}/groups/${id}/expenses/by-person-category${currency ? `?currency=${currency}` : ''}`,
        EXPENSES_TOP: (id: string, currency?: string, limit?: number) => {
            const params = new URLSearchParams();
            if (currency) params.set('currency', currency);
            if (limit) params.set('limit', String(limit));
            const qs = params.toString();
            return `${API_BASE_URL}/groups/${id}/expenses/top${qs ? `?${qs}` : ''}`;
        },
        EXPENSES_EXPORT: (id: string) => `${API_BASE_URL}/groups/${id}/expenses/export`,
        SETTLE_ALL: (id: string) => `${API_BASE_URL}/groups/${id}/settlements/settle-all`,
        SETTLE_GUEST: (id: string) => `${API_BASE_URL}/groups/${id}/settle-guest`,
        EXPENSE_BY_ID: (groupId: string, expenseId: string) => `${API_BASE_URL}/groups/${groupId}/expenses/${expenseId}`,
        LEAVE: (id: string) => `${API_BASE_URL}/groups/${id}/leave`,
        GUESTS: (id: string) => `${API_BASE_URL}/groups/${id}/guests`,
        GUEST_BY_ID: (groupId: string, guestId: string) => `${API_BASE_URL}/groups/${groupId}/guests/${guestId}`,
    },
    EXPENSES: {
        BASE: `${API_BASE_URL}/expenses`,
        BY_ID: (id: string) => `${API_BASE_URL}/expenses/${id}`,
    },
    BALANCES: {
        SUMMARY: `${API_BASE_URL}/balances/summary`,
    },
    EXCHANGE_RATES: (base: string) => `${API_BASE_URL}/exchange-rates?base=${base}`,
};
