// TaskFlow - API client tests
// Verifies token handling, headers, error normalization, and 401 behavior

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    ApiError,
    authApi,
    clearToken,
    getToken,
    setToken,
    tasksApi,
} from './api';
import { jsonResponse, stubFetch, stubNetworkFailure } from '../test/mockFetch';

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Token storage', () => {
    test('stores and clears the JWT', () => {
        expect(getToken()).toBeNull();
        setToken('abc123');
        expect(getToken()).toBe('abc123');
        clearToken();
        expect(getToken()).toBeNull();
    });
});

describe('authApi.login', () => {
    test('POSTs credentials and stores the returned token', async () => {
        const fetchSpy = stubFetch(() =>
            jsonResponse({
                message: 'Logged in successfully',
                token: 'jwt-token',
                user: { id: 1, name: 'Demo User', email: 'demo@taskflow.dev' },
            })
        );

        const res = await authApi.login('demo@taskflow.dev', 'demo123');

        expect(res.token).toBe('jwt-token');
        expect(getToken()).toBe('jwt-token');

        const [url, init] = fetchSpy.mock.calls[0];
        expect(String(url)).toBe('/api/auth/login');
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toEqual({
            email: 'demo@taskflow.dev',
            password: 'demo123',
        });
    });

    test('throws ApiError with the server message on failure', async () => {
        stubFetch(() => jsonResponse({ message: 'Invalid email or password' }, 401));

        await expect(authApi.login('x@y.co', 'wrong')).rejects.toMatchObject({
            name: 'ApiError',
            status: 401,
            message: 'Invalid email or password',
        });
        expect(getToken()).toBeNull();
    });
});

describe('authApi.register', () => {
    test('POSTs name, email, password and stores the token', async () => {
        const fetchSpy = stubFetch(() =>
            jsonResponse({
                message: 'User registered successfully',
                token: 'new-token',
                user: { id: 7, name: 'New User', email: 'new@user.dev' },
            }, 201)
        );

        await authApi.register('New User', 'new@user.dev', 'secret1');

        expect(getToken()).toBe('new-token');
        expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/auth/register');
        expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
            name: 'New User',
            email: 'new@user.dev',
            password: 'secret1',
        });
    });
});

describe('Authenticated requests', () => {
    test('attaches the Bearer token to task requests', async () => {
        setToken('jwt-token');
        const fetchSpy = stubFetch(() => jsonResponse([]));

        await tasksApi.list();

        const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer jwt-token');
        expect(headers['Content-Type']).toBe('application/json');
    });

    test('clears the token and throws on 401 (expired session)', async () => {
        setToken('expired-token');
        stubFetch(() =>
            jsonResponse({ message: 'Session expired, please log in again' }, 401)
        );

        await expect(tasksApi.list()).rejects.toBeInstanceOf(ApiError);
        expect(getToken()).toBeNull();
    });

    test('normalizes network failures into ApiError with status 0', async () => {
        stubNetworkFailure();

        try {
            await tasksApi.list();
            expect.unreachable('should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).status).toBe(0);
            expect((error as ApiError).message).toMatch(/reach the server/i);
        }
    });
});

describe('tasksApi', () => {
    test('create sends due_date as null when the field is empty', async () => {
        setToken('jwt-token');
        const fetchSpy = stubFetch(() =>
            jsonResponse(
                {
                    id: 10,
                    title: 'New task',
                    priority: 'Medium',
                    status: 'To Do',
                    due_date: null,
                },
                201
            )
        );

        await tasksApi.create({
            title: 'New task',
            description: '',
            priority: 'Medium',
            status: 'To Do',
            due_date: '',
        });

        const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
        expect(body.due_date).toBeNull();
        expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });

    test('update sends only the provided fields', async () => {
        setToken('jwt-token');
        const fetchSpy = stubFetch(() =>
            jsonResponse({ id: 3, status: 'Done' })
        );

        await tasksApi.update(3, { status: 'Done' });

        expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/tasks/3');
        expect(fetchSpy.mock.calls[0][1]?.method).toBe('PUT');
        expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
            status: 'Done',
        });
    });

    test('remove issues a DELETE request', async () => {
        setToken('jwt-token');
        const fetchSpy = stubFetch(() =>
            jsonResponse({ message: 'Task removed' })
        );

        const res = await tasksApi.remove(5);

        expect(res.message).toBe('Task removed');
        expect(String(fetchSpy.mock.calls[0][0])).toBe('/api/tasks/5');
        expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
    });

    test('search encodes query parameters and skips "All" filters', async () => {
        setToken('jwt-token');
        const fetchSpy = stubFetch(() => jsonResponse([]));

        await tasksApi.search({
            query: 'bug fix',
            status: 'All',
            priority: 'High',
        });

        const url = String(fetchSpy.mock.calls[0][0]);
        expect(url).toContain('/api/tasks/search?');
        expect(url).toContain('query=bug+fix');
        expect(url).toContain('priority=High');
        expect(url).not.toContain('status=');
    });
});

describe('stats', () => {
    test('fetches dashboard statistics', async () => {
        setToken('jwt-token');
        stubFetch(() =>
            jsonResponse({
                total_tasks: 4,
                todo_count: 2,
                in_progress_count: 1,
                done_count: 1,
                high_priority_count: 1,
            })
        );

        const stats = await tasksApi.stats();

        expect(stats.total_tasks).toBe(4);
        expect(stats.done_count).toBe(1);
    });
});
