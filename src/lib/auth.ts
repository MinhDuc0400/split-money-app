import type { User, JWTPayload } from '../types/auth.types';

const TOKEN_KEY = 'splitmoney_auth_token';
const USER_KEY = 'splitmoney_user';

let cachedToken: string | null = localStorage.getItem(TOKEN_KEY);
let cachedUser: User | null = (() => {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
})();

export const authUtils = {
    setToken: (token: string) => {
        cachedToken = token;
        localStorage.setItem(TOKEN_KEY, token);
    },
    getToken: () => {
        return cachedToken;
    },
    clearToken: () => {
        cachedToken = null;
        localStorage.removeItem(TOKEN_KEY);
    },
    setUser: (user: User) => {
        cachedUser = user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    getUser: (): User | null => {
        return cachedUser;
    },
    clearUser: () => {
        cachedUser = null;
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
