import { authUtils } from './auth';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { params, headers, ...rest } = options;

    // Build URL with query params
    const url = new URL(endpoint);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    const token = authUtils.getToken();
    
    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...rest,
        headers: {
            ...defaultHeaders,
            ...headers,
        },
    };

    const response = await fetch(url.toString(), config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return (await response.json()) as T;
}

export const api = {
    get: <T>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),
    
    put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),
    
    delete: <T>(endpoint: string, options?: RequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
