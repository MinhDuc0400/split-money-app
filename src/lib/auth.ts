import type { User, JWTPayload } from '../types/auth.types';

const TOKEN_KEY = 'splitmoney_auth_token';
const USER_KEY = 'splitmoney_user';
const PENDING_INVITE_KEY = 'splitmoney_pending_invite_code';
// Long enough to cover "click sign-in, go through Google's consent screens,
// come back"; short enough that a stashed code can never survive to an
// unrelated later login.
const PENDING_INVITE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PendingInviteCodeEntry {
    code: string;
    ts: number; // Date.now() at the moment it was stashed
}

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
    setPendingInviteCode: (code: string) => {
        const entry: PendingInviteCodeEntry = { code, ts: Date.now() };
        localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(entry));
    },
    getPendingInviteCode: (): string | null => {
        const raw = localStorage.getItem(PENDING_INVITE_KEY);
        if (!raw) return null;

        try {
            const entry = JSON.parse(raw) as Partial<PendingInviteCodeEntry>;
            if (typeof entry.code !== 'string' || typeof entry.ts !== 'number') {
                localStorage.removeItem(PENDING_INVITE_KEY);
                return null;
            }

            const isExpired = Date.now() - entry.ts > PENDING_INVITE_TTL_MS;
            if (isExpired) {
                localStorage.removeItem(PENDING_INVITE_KEY);
                return null;
            }

            return entry.code;
        } catch {
            localStorage.removeItem(PENDING_INVITE_KEY);
            return null;
        }
    },
    clearPendingInviteCode: () => {
        localStorage.removeItem(PENDING_INVITE_KEY);
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
