import type { User, JWTPayload } from '../types/auth.types';

const TOKEN_KEY = 'splitmoney_auth_token';
const USER_KEY = 'splitmoney_user';

export const authUtils = {
    setToken: (token: string) => {
        localStorage.setItem(TOKEN_KEY, token);
    },
    getToken: () => {
        return localStorage.getItem(TOKEN_KEY);
    },
    clearToken: () => {
        localStorage.removeItem(TOKEN_KEY);
    },
    setUser: (user: User) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    getUser: (): User | null => {
        const user = localStorage.getItem(USER_KEY);
        try {
            return user ? (JSON.parse(user) as User) : null;
        } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            return null;
        }
    },
    clearUser: () => {
        localStorage.removeItem(USER_KEY);
    },
    decodeToken: (token: string): JWTPayload | null => {
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;

            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload) as JWTPayload;
        } catch (error) {
            console.error('Failed to decode token', error);
            return null;
        }
    },
};
