// TaskFlow - Frontend API Client
// Typed fetch wrapper for the Node.js + Express backend
//
// Responsibilities:
// - Attach the JWT bearer token to every protected request
// - Normalize errors into ApiError (status + message)
// - Clear the stored token automatically on 401 (expired/invalid session)
// - Match the backend's response shapes exactly

export type Priority = 'Low' | 'Medium' | 'High';
export type Status = 'To Do' | 'In Progress' | 'Done';

export interface User {
    id: number;
    name: string;
    email: string;
    created_at?: string;
}

export interface Task {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    priority: Priority;
    status: Status;
    due_date: string | null;
    created_at: string;
}

// Values collected from the create/edit form
export interface TaskFormValues {
    title: string;
    description: string;
    priority: Priority;
    status: Status;
    due_date: string; // '' means "no due date"
}

export interface DashboardStats {
    total_tasks: number;
    todo_count: number;
    in_progress_count: number;
    done_count: number;
    high_priority_count: number;
}

export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}

// Error carrying the HTTP status so callers can react (401 -> logout, 400 -> show message)
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

const TOKEN_KEY = 'taskflow_token';

export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => getToken() !== null;

// Core request helper
async function request<T>(
    path: string,
    options: { method?: string; body?: unknown } = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(`/api${path}`, {
            method: options.method || 'GET',
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
    } catch {
        throw new ApiError('Could not reach the server. Please try again.', 0);
    }

    // Session is no longer valid - drop the token so guards can redirect
    if (response.status === 401) {
        clearToken();
    }

    let data: unknown = null;
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        const message =
            data && typeof data === 'object' && 'message' in data
                ? String((data as { message: unknown }).message)
                : `Request failed (${response.status})`;
        throw new ApiError(message, response.status);
    }

    return data as T;
}

// ------------------------------------------------------------
// Authentication
// ------------------------------------------------------------
export const authApi = {
    async register(name: string, email: string, password: string): Promise<AuthResponse> {
        const data = await request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: { name, email, password },
        });
        setToken(data.token);
        return data;
    },

    async login(email: string, password: string): Promise<AuthResponse> {
        const data = await request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        setToken(data.token);
        return data;
    },

    me(): Promise<User> {
        return request<User>('/auth/me');
    },
};

// ------------------------------------------------------------
// Tasks
// ------------------------------------------------------------
export const tasksApi = {
    list(): Promise<Task[]> {
        return request<Task[]>('/tasks');
    },

    create(values: TaskFormValues): Promise<Task> {
        return request<Task>('/tasks', {
            method: 'POST',
            body: {
                title: values.title,
                description: values.description,
                priority: values.priority,
                status: values.status,
                due_date: values.due_date || null,
            },
        });
    },

    update(id: number, values: Partial<TaskFormValues>): Promise<Task> {
        const body: Record<string, unknown> = { ...values };
        if ('due_date' in body) {
            body.due_date = body.due_date || null;
        }
        return request<Task>(`/tasks/${id}`, { method: 'PUT', body });
    },

    remove(id: number): Promise<{ message: string }> {
        return request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' });
    },

    search(params: { query?: string; status?: string; priority?: string }): Promise<Task[]> {
        const search = new URLSearchParams();
        if (params.query) search.set('query', params.query);
        if (params.status && params.status !== 'All') search.set('status', params.status);
        if (params.priority && params.priority !== 'All') search.set('priority', params.priority);
        const qs = search.toString();
        return request<Task[]>(`/tasks/search${qs ? `?${qs}` : ''}`);
    },

    stats(): Promise<DashboardStats> {
        return request<DashboardStats>('/dashboard/stats');
    },
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
export const logout = (): void => {
    clearToken();
};

// True when the error means "session expired / not authenticated"
export const isAuthError = (error: unknown): boolean =>
    error instanceof ApiError && error.status === 401;

// User-friendly message for any thrown error
export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string =>
    error instanceof ApiError ? error.message : fallback;
