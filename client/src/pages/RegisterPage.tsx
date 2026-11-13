// TaskFlow - Registration page

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, errorMessage, getToken } from '../utils/api';
import { IconLogo } from '../components/Icons';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (getToken()) navigate('/dashboard', { replace: true });
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        setError('');

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName || !trimmedEmail || !password) {
            setError('Please fill in all fields');
            return;
        }
        if (trimmedName.length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await authApi.register(trimmedName, trimmedEmail, password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Registration failed. Please try again.'));
        } finally {
            setLoading(false);
        }
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
                    <h1>Create your account</h1>
                    <p>Start organizing your tasks in seconds</p>
                </div>

                {error && (
                    <div className="form-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    <div className="form-group">
                        <label htmlFor="name">Full name</label>
                        <input
                            id="name"
                            type="text"
                            className="input"
                            placeholder="Ada Lovelace"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            disabled={loading}
                        />
                    </div>

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
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            disabled={loading}
                        />
                        <span className="field-hint">Minimum 6 characters</span>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner" aria-hidden="true" />
                                Creating account...
                            </>
                        ) : (
                            'Create account'
                        )}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
