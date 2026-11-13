// TaskFlow - Dashboard page tests
// Covers data loading, stats, search/filters, create, edit, toggle, delete,
// empty states, and expired-session handling.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { getToken, setToken, type Task } from '../utils/api';
import { jsonResponse, stubFetch, type FetchHandler } from '../test/mockFetch';

// ---------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------
const user = { id: 1, name: 'Demo User', email: 'demo@taskflow.dev' };

const sampleTasks: Task[] = [
    {
        id: 1,
        user_id: 1,
        title: 'Design system tokens',
        description: 'Define the color palette and spacing scale',
        priority: 'High',
        status: 'In Progress',
        due_date: null,
        created_at: '2026-11-01 10:00:00',
    },
    {
        id: 2,
        user_id: 1,
        title: 'Write API documentation',
        description: null,
        priority: 'Low',
        status: 'To Do',
        due_date: '2027-01-15',
        created_at: '2026-11-01 11:00:00',
    },
    {
        id: 3,
        user_id: 1,
        title: 'Fix login redirect bug',
        description: 'Redirect loop when the token expires',
        priority: 'Medium',
        status: 'Done',
        due_date: null,
        created_at: '2026-11-01 12:00:00',
    },
];

const sampleStats = {
    total_tasks: 3,
    todo_count: 1,
    in_progress_count: 1,
    done_count: 1,
    high_priority_count: 1,
};

// Route-driven fetch mock with mutable task state
function createApi(initialTasks: Task[] = sampleTasks) {
    const state = { tasks: [...initialTasks] };
    const created: Task[] = [];

    const handler: FetchHandler = (url, init) => {
        const method = (init?.method || 'GET').toUpperCase();

        if (url.includes('/api/auth/me')) {
            return jsonResponse(user);
        }
        if (url.includes('/api/dashboard/stats')) {
            const t = state.tasks;
            return jsonResponse({
                total_tasks: t.length,
                todo_count: t.filter((x) => x.status === 'To Do').length,
                in_progress_count: t.filter((x) => x.status === 'In Progress').length,
                done_count: t.filter((x) => x.status === 'Done').length,
                high_priority_count: t.filter((x) => x.priority === 'High').length,
            });
        }
        if (url.includes('/api/tasks/') && method === 'PUT') {
            const id = Number(url.split('/').pop());
            const patch = JSON.parse(String(init?.body)) as Partial<Task>;
            const index = state.tasks.findIndex((t) => t.id === id);
            const updated = { ...state.tasks[index], ...patch };
            state.tasks[index] = updated;
            return jsonResponse(updated);
        }
        if (url.includes('/api/tasks/') && method === 'DELETE') {
            const id = Number(url.split('/').pop());
            state.tasks = state.tasks.filter((t) => t.id !== id);
            return jsonResponse({ message: 'Task removed' });
        }
        if (url.endsWith('/api/tasks') && method === 'POST') {
            const body = JSON.parse(String(init?.body)) as Partial<Task>;
            const task: Task = {
                id: 99,
                user_id: 1,
                title: body.title || '',
                description: body.description || null,
                priority: body.priority || 'Medium',
                status: body.status || 'To Do',
                due_date: body.due_date || null,
                created_at: '2026-11-03 09:00:00',
            };
            state.tasks.unshift(task);
            created.push(task);
            return jsonResponse(task, 201);
        }
        if (url.endsWith('/api/tasks')) {
            return jsonResponse(state.tasks);
        }
        return jsonResponse({ message: 'Not found' }, 404);
    };

    const fetchSpy = stubFetch(handler);
    return { state, created, fetchSpy };
}

const renderDashboard = () =>
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/login" element={<div data-testid="login-page" />} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    localStorage.clear();
    setToken('jwt-test-token');
});

afterEach(() => {
    vi.unstubAllGlobals();
});

// ---------------------------------------------------------------
describe('Dashboard - data loading', () => {
    test('renders the welcome message, stats, and tasks from the API', async () => {
        createApi();
        renderDashboard();

        expect(await screen.findByText(/hey demo/i)).toBeInTheDocument();

        // Stats: the total card shows the API-provided count
        const totalCard = screen.getByText('Total tasks').closest('.stat-card');
        expect(totalCard).not.toBeNull();
        expect(totalCard).toHaveTextContent('3');
        expect(screen.getByText('Completed')).toBeInTheDocument();

        // All three task titles render
        expect(await screen.findByText('Design system tokens')).toBeInTheDocument();
        expect(screen.getByText('Write API documentation')).toBeInTheDocument();
        expect(screen.getByText('Fix login redirect bug')).toBeInTheDocument();
    });

    test('shows an error state with retry when the API fails, then recovers', async () => {
        let failNext = true;
        stubFetch((url) => {
            if (failNext) {
                failNext = false;
                return jsonResponse({ message: 'boom' }, 500);
            }
            if (url.includes('/api/auth/me')) return jsonResponse(user);
            if (url.includes('/api/dashboard/stats')) return jsonResponse(sampleStats);
            if (url.endsWith('/api/tasks')) return jsonResponse(sampleTasks);
            return jsonResponse({ message: 'Not found' }, 404);
        });
        renderDashboard();

        expect(
            await screen.findByRole('heading', { name: /could not load your dashboard/i })
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /try again/i }));

        expect(await screen.findByText(/hey demo/i)).toBeInTheDocument();
    });

    test('redirects to login and clears the token when the session expired', async () => {
        stubFetch(() => jsonResponse({ message: 'Session expired, please log in again' }, 401));
        renderDashboard();

        expect(await screen.findByTestId('login-page')).toBeInTheDocument();
        expect(getToken()).toBeNull();
    });
});

// ---------------------------------------------------------------
describe('Dashboard - search and filters', () => {
    test('search narrows the list by title and description', async () => {
        const userEvt = userEvent.setup();
        createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        const search = screen.getByLabelText(/search tasks/i);
        await userEvt.type(search, 'login');

        await waitFor(() => {
            expect(screen.getByText('Fix login redirect bug')).toBeInTheDocument();
            expect(screen.queryByText('Design system tokens')).not.toBeInTheDocument();
        });
    });

    test('status filter limits tasks to the selected status', async () => {
        const userEvt = userEvent.setup();
        createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.selectOptions(screen.getByLabelText(/filter by status/i), 'To Do');

        await waitFor(() => {
            expect(screen.getByText('Write API documentation')).toBeInTheDocument();
            expect(screen.queryByText('Design system tokens')).not.toBeInTheDocument();
        });
    });

    test('priority filter and clear button work together', async () => {
        const userEvt = userEvent.setup();
        createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.selectOptions(screen.getByLabelText(/filter by priority/i), 'High');

        await waitFor(() => {
            expect(screen.getByText('Design system tokens')).toBeInTheDocument();
            expect(screen.queryByText('Write API documentation')).not.toBeInTheDocument();
        });

        await userEvt.click(screen.getByRole('button', { name: /^clear$/i }));

        await waitFor(() => {
            expect(screen.getByText('Write API documentation')).toBeInTheDocument();
            expect(screen.getByText('Fix login redirect bug')).toBeInTheDocument();
        });
    });

    test('shows the empty state when filters match nothing', async () => {
        const userEvt = userEvent.setup();
        createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.type(screen.getByLabelText(/search tasks/i), 'zzz-no-match');

        expect(
            await screen.findByText(/no tasks match your filters/i)
        ).toBeInTheDocument();

        await userEvt.click(screen.getByRole('button', { name: /clear filters/i }));

        expect(await screen.findByText('Design system tokens')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------
describe('Dashboard - create task', () => {
    test('opens the modal, creates a task, and shows it in the list', async () => {
        const userEvt = userEvent.setup();
        const api = createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(screen.getByRole('button', { name: /new task/i }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/create new task/i)).toBeInTheDocument();

        await userEvt.type(within(dialog).getByLabelText(/title/i), 'Ship release notes');
        await userEvt.click(within(dialog).getByRole('button', { name: /create task/i }));

        // Modal closes, new task appears, toast confirms
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(await screen.findByText('Ship release notes')).toBeInTheDocument();
        expect(await screen.findByText(/task created/i)).toBeInTheDocument();

        // The POST went to the API with the form values
        const postCall = api.fetchSpy.mock.calls.find(
            ([url, init]) =>
                String(url).endsWith('/api/tasks') &&
                (init?.method || 'GET').toUpperCase() === 'POST'
        );
        expect(postCall).toBeTruthy();
        expect(JSON.parse(String(postCall![1]?.body)).title).toBe('Ship release notes');
    });

    test('keeps the modal open and shows an error when the server rejects the task', async () => {
        const userEvt = userEvent.setup();
        stubFetch((url, init) => {
            if (url.includes('/api/auth/me')) return jsonResponse(user);
            if (url.includes('/api/dashboard/stats')) return jsonResponse(sampleStats);
            if (url.endsWith('/api/tasks') && (init?.method || 'GET') === 'POST') {
                return jsonResponse({ message: 'Task title is required' }, 400);
            }
            if (url.endsWith('/api/tasks')) return jsonResponse(sampleTasks);
            return jsonResponse({ message: 'Not found' }, 404);
        });
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(screen.getByRole('button', { name: /new task/i }));
        const dialog = await screen.findByRole('dialog');
        // Title passes client validation but the server rejects it (400)
        await userEvt.type(within(dialog).getByLabelText(/title/i), 'Rejected task');
        await userEvt.click(within(dialog).getByRole('button', { name: /create task/i }));

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            /task title is required/i
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // User input is preserved for correction
        expect(within(dialog).getByLabelText(/title/i)).toHaveValue('Rejected task');
    });

    test('client-side validation blocks an empty title without calling the API', async () => {
        const userEvt = userEvent.setup();
        const api = createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(screen.getByRole('button', { name: /new task/i }));
        const dialog = await screen.findByRole('dialog');
        await userEvt.click(within(dialog).getByRole('button', { name: /create task/i }));

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
            /enter a task title/i
        );
        const posts = api.fetchSpy.mock.calls.filter(
            ([url, init]) =>
                String(url).endsWith('/api/tasks') &&
                (init?.method || 'GET').toUpperCase() === 'POST'
        );
        expect(posts).toHaveLength(0);
    });
});

// ---------------------------------------------------------------
describe('Dashboard - edit task', () => {
    test('edits a task through the modal and persists changes', async () => {
        const userEvt = userEvent.setup();
        const api = createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(
            screen.getByRole('button', { name: /edit design system tokens/i })
        );

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/edit task/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/title/i)).toHaveValue(
            'Design system tokens'
        );

        const titleInput = within(dialog).getByLabelText(/title/i);
        await userEvt.clear(titleInput);
        await userEvt.type(titleInput, 'Design tokens v2');
        await userEvt.click(within(dialog).getByRole('button', { name: /save changes/i }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(await screen.findByText('Design tokens v2')).toBeInTheDocument();
        expect(await screen.findByText(/task updated/i)).toBeInTheDocument();

        const putCall = api.fetchSpy.mock.calls.find(
            ([url, init]) =>
                String(url).includes('/api/tasks/1') &&
                (init?.method || 'GET').toUpperCase() === 'PUT'
        );
        expect(putCall).toBeTruthy();
        expect(JSON.parse(String(putCall![1]?.body)).title).toBe('Design tokens v2');
    });
});

// ---------------------------------------------------------------
describe('Dashboard - toggle status', () => {
    test('marks a task as complete and updates its badge', async () => {
        const userEvt = userEvent.setup();
        createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(
            screen.getByRole('button', { name: /mark "write api documentation" as complete/i })
        );

        await waitFor(() => {
            expect(
                screen.getByRole('button', {
                    name: /mark "write api documentation" as not complete/i,
                })
            ).toBeInTheDocument();
        });
    });
});

// ---------------------------------------------------------------
describe('Dashboard - delete task', () => {
    test('requires confirmation and then removes the task', async () => {
        const userEvt = userEvent.setup();
        const api = createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(
            screen.getByRole('button', { name: /delete design system tokens/i })
        );

        const alert = await screen.findByRole('alertdialog');
        expect(alert).toHaveTextContent(/will be permanently removed/i);

        // Cancel first - nothing is deleted
        await userEvt.click(within(alert).getByRole('button', { name: /cancel/i }));
        expect(await screen.findByText('Design system tokens')).toBeInTheDocument();

        // Now confirm
        await userEvt.click(
            screen.getByRole('button', { name: /delete design system tokens/i })
        );
        const confirmAgain = await screen.findByRole('alertdialog');
        await userEvt.click(
            within(confirmAgain).getByRole('button', { name: /delete task/i })
        );

        await waitFor(() => {
            expect(screen.queryByText('Design system tokens')).not.toBeInTheDocument();
        });
        expect(await screen.findByText(/task deleted/i)).toBeInTheDocument();

        const deleteCall = api.fetchSpy.mock.calls.find(
            ([url, init]) =>
                String(url).includes('/api/tasks/1') &&
                (init?.method || 'GET').toUpperCase() === 'DELETE'
        );
        expect(deleteCall).toBeTruthy();
    });
});

// ---------------------------------------------------------------
describe('Dashboard - logout', () => {
    test('clears the token and returns to the login page', async () => {
        const userEvt = userEvent.setup();
        createApi();
        renderDashboard();
        await screen.findByText('Design system tokens');

        await userEvt.click(screen.getByRole('button', { name: /log out/i }));

        expect(await screen.findByTestId('login-page')).toBeInTheDocument();
        expect(getToken()).toBeNull();
    });
});
