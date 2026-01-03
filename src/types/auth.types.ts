export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface JWTPayload {
    sub?: string;
    id?: string;
    email: string;
    name: string;
    picture?: string;
    iat?: number;
    exp?: number;
}
