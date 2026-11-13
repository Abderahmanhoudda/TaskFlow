// TaskFlow - Application root
// Router setup + authentication guard for protected pages

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getToken } from './utils/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AboutPage from './pages/AboutPage';

// Redirects to /login when no token is present.
// Expired tokens are handled by the API layer (401 -> clear token -> redirect).
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const location = useLocation();
    if (!getToken()) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return <>{children}</>;
};

// Sent authenticated users away from the auth pages
const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
    if (getToken()) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
};

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicOnlyRoute>
                            <LoginPage />
                        </PublicOnlyRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicOnlyRoute>
                            <RegisterPage />
                        </PublicOnlyRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/about"
                    element={
                        <ProtectedRoute>
                            <AboutPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
