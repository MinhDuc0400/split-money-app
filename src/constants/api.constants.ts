export const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export const API_ENDPOINTS = {
    AUTH: {
        GOOGLE: `${API_BASE_URL}/auth/google`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        ME: `${API_BASE_URL}/auth/me`,
    },
    GROUPS: {
        BASE: `${API_BASE_URL}/groups`,
        BY_ID: (id: string) => `${API_BASE_URL}/groups/${id}`,
        JOIN: `${API_BASE_URL}/groups/join`,
        EXPENSES: (id: string) => `${API_BASE_URL}/groups/${id}/expenses`,
        TRANSACTIONS: (id: string) => `${API_BASE_URL}/groups/${id}/transactions`,
        BALANCE_ME: (id: string) => `${API_BASE_URL}/groups/${id}/balances/me`,
        BALANCES: (id: string) => `${API_BASE_URL}/groups/${id}/balances`,
        SETTLEMENTS: (id: string) => `${API_BASE_URL}/groups/${id}/settlements`,
        EXPENSE_BY_ID: (groupId: string, expenseId: string) => `${API_BASE_URL}/groups/${groupId}/expenses/${expenseId}`,
    },
    EXPENSES: {
        BASE: `${API_BASE_URL}/expenses`,
        BY_ID: (id: string) => `${API_BASE_URL}/expenses/${id}`,
    },
};
