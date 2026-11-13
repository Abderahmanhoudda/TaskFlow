// TaskFlow - Router / auth guard tests

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { setToken } from './utils/api';
import { jsonResponse, stubFetch } from './test/mockFetch';

beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('App routing', () => {
    test('redirects unauthenticated visitors to the login page', () => {
        window.history.replaceState({}, '', '/dashboard');

        render(<App />);

        expect(
            screen.getByRole('heading', { name: /welcome back/i })
        ).toBeInTheDocument();
    });

    test('keeps authenticated users away from the login page', async () => {
        setToken('jwt-token');
        stubFetch((url) => {
            if (url.includes('/api/auth/me')) {
                return jsonResponse({ id: 1, name: 'Demo User', email: 'demo@taskflow.dev' });
            }
            if (url.includes('/api/dashboard/stats')) {
                return jsonResponse({
                    total_tasks: 0,
                    todo_count: 0,
                    in_progress_count: 0,
                    done_count: 0,
                    high_priority_count: 0,
                });
            }
            return jsonResponse([]);
        });
        window.history.replaceState({}, '', '/login');

        render(<App />);

        expect(screen.queryByRole('heading', { name: /welcome back/i })).toBeNull();
        expect(
            await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
        ).toBeInTheDocument();
    });

    test('unknown routes fall back to the dashboard guard', () => {
        window.history.replaceState({}, '', '/some/unknown/path');

        render(<App />);

        expect(
            screen.getByRole('heading', { name: /welcome back/i })
        ).toBeInTheDocument();
    });
});
