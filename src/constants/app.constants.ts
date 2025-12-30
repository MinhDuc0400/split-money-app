export const AppTab = {
    DASHBOARD: 'dashboard',
    MEMBERS: 'members',
    EXPENSES: 'expenses',
    SETTINGS: 'settings'
} as const;

export type AppTab = typeof AppTab[keyof typeof AppTab];
