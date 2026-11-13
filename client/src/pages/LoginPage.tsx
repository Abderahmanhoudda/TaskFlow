// TaskFlow - Login page

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, errorMessage, getToken, isAuthError } from '../utils/api';
import { IconLogo } from '../components/Icons';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Already authenticated -> go straight to the dashboard
    useEffect(() => {
        if (getToken()) navigate('/dashboard', { replace: true });
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        setError('');

        if (!email.trim() || !password) {
            setError('Please enter your email and password');
            return;
        }

        setLoading(true);
        try {
            await authApi.login(email.trim(), password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(
                isAuthError(err)
                    ? 'Invalid email or password'
                    : errorMessage(err, 'Login failed. Please try again.')
            );
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = () => {
        setEmail('demo@taskflow.dev');
        setPassword('demo123');
        setError('');
    };

    return (
        <div className="auth-page">
            <div className="auth-glow auth-glow-1" aria-hidden="true" />
            <div className="auth-glow auth-glow-2" aria-hidden="true" />

            <div className="auth-card">
                <div className="auth-brand">
                    <span className="brand-mark brand-mark-lg">
                        <IconLogo size={24} />
                    </span>
                    <span className="brand-name">
                        TaskFlow<span className="brand-dot">.</span>
                    </span>
                </div>

                <div className="auth-heading">
                    <h1>Welcome back</h1>
                    <p>Sign in to continue to your dashboard</p>
                </div>

                {error && (
                    <div className="form-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner" aria-hidden="true" />
                                Signing in...
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </form>

                <button type="button" className="demo-fill" onClick={fillDemo} disabled={loading}>
                    Use demo account
                </button>

                <p className="auth-footer">
                    Don&apos;t have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
