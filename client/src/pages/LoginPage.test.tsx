// TaskFlow - Login page tests

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import { getToken } from '../utils/api';
import { jsonResponse, stubFetch } from '../test/mockFetch';

const renderLogin = () =>
    render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<div data-testid="dashboard" />} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('LoginPage', () => {
    test('renders the form with email and password fields', () => {
        renderLogin();

        expect(
            screen.getByRole('heading', { name: /welcome back/i })
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });

    test('shows a validation message when fields are empty and does not call the API', async () => {
        const user = userEvent.setup();
        const fetchSpy = stubFetch(() => jsonResponse({}));
        renderLogin();

        await user.click(screen.getByRole('button', { name: /^sign in$/i }));

        expect(
            await screen.findByRole('alert')
        ).toHaveTextContent(/enter your email and password/i);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('stores the token and navigates to the dashboard on success', async () => {
        const user = userEvent.setup();
        stubFetch(() =>
            jsonResponse({
                message: 'Logged in successfully',
                token: 'jwt-login-token',
                user: { id: 1, name: 'Demo User', email: 'demo@taskflow.dev' },
            })
        );
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'demo@taskflow.dev');
        await user.type(screen.getByLabelText(/^password$/i), 'demo123');
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));

        await waitFor(() => {
            expect(screen.getByTestId('dashboard')).toBeInTheDocument();
        });
        expect(getToken()).toBe('jwt-login-token');
    });

    test('displays the server error for invalid credentials', async () => {
        const user = userEvent.setup();
        stubFetch(() =>
            jsonResponse({ message: 'Invalid email or password' }, 401)
        );
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'demo@taskflow.dev');
        await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            /invalid email or password/i
        );
        expect(getToken()).toBeNull();
        // Still on the login page
        expect(
            screen.getByRole('heading', { name: /welcome back/i })
        ).toBeInTheDocument();
    });

    test('the demo button fills in the demo credentials', async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.click(screen.getByRole('button', { name: /use demo account/i }));

        expect(screen.getByLabelText(/email address/i)).toHaveValue(
            'demo@taskflow.dev'
        );
        expect(screen.getByLabelText(/^password$/i)).toHaveValue('demo123');
    });
});
