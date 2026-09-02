import { authUtils } from './auth';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
    onUnauthorized = handler;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...rest } = options;

    // Build URL with query params if any
    let finalUrl = url;
    if (params) {
        const searchParams = new URLSearchParams(params);
        finalUrl += `?${searchParams.toString()}`;
    }

    // Get token from authUtils
    const token = authUtils.getToken();

    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, {
        headers: {
            ...defaultHeaders,
            ...headers,
        },
        ...rest,
    });

    if (!response.ok) {
        if (response.status === 401) {
            onUnauthorized?.();
            // The App component will notice isAuthenticated is false and redirect to /login
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    // Handle 204 No Content or empty body
    if (response.status === 204) {
        return {} as T;
    }

    const text = await response.text();
    if (!text) {
        return {} as T;
    }

    return JSON.parse(text) as T;
}

async function requestBlob(url: string, options: RequestOptions = {}): Promise<Blob> {
    const { params, headers, ...rest } = options;

    let finalUrl = url;
    if (params) {
        const searchParams = new URLSearchParams(params);
        finalUrl += `?${searchParams.toString()}`;
    }

    const token = authUtils.getToken();
    const defaultHeaders: Record<string, string> = {};
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, {
        headers: { ...defaultHeaders, ...headers },
        ...rest,
    });

    if (!response.ok) {
        if (response.status === 401) {
            onUnauthorized?.();
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.blob();
}

export const api = {
    get: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'GET' }),
    post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
        request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
        request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'DELETE' }),
    getBlob: (url: string, options?: RequestOptions) => requestBlob(url, { ...options, method: 'GET' }),
};
