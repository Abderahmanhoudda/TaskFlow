// TaskFlow - About page

import { Link } from 'react-router-dom';
import { IconLogo, IconSparkles } from '../components/Icons';

const features = [
    'Secure registration and login with JWT sessions',
    'Create, edit, complete, and delete tasks',
    'Priority levels (Low / Medium / High) and statuses',
    'Due dates with overdue highlighting',
    'Instant search across titles and descriptions',
    'Status and priority filters with live counts',
    'Dashboard statistics and completion tracking',
    'Responsive layout for desktop, tablet, and mobile',
];

const techStack = [
    { group: 'Frontend', items: ['React 19', 'TypeScript', 'Vite', 'React Router', 'Custom CSS design system'] },
    { group: 'Backend', items: ['Node.js', 'Express 5', 'REST API', 'JWT', 'bcrypt'] },
    { group: 'Database', items: ['SQLite (better-sqlite3)', 'Indexed queries', 'Automatic schema init'] },
    { group: 'Testing', items: ['Jest + Supertest (API)', 'Vitest + Testing Library (UI)', 'Playwright (E2E)'] },
];

const AboutPage = () => {
    return (
        <div className="about-page">
            <header className="about-hero">
                <span className="brand-mark brand-mark-lg">
                    <IconLogo size={24} />
                </span>
                <div>
                    <h1>About TaskFlow</h1>
                    <p>
                        A full-stack task management app built to demonstrate modern
                        full-stack development end to end — from database design and REST API
                        engineering to a polished, responsive React interface.
                    </p>
                </div>
            </header>

            <section className="about-grid">
                <div className="about-card">
                    <h2>
                        <IconSparkles size={16} /> Features
                    </h2>
                    <ul className="about-list">
                        {features.map((f) => (
                            <li key={f}>{f}</li>
                        ))}
                    </ul>
                </div>

                <div className="about-card">
                    <h2>Technology stack</h2>
                    {techStack.map((group) => (
                        <div key={group.group} className="tech-group">
                            <span className="tech-label">{group.group}</span>
                            <div className="tech-chips">
                                {group.items.map((item) => (
                                    <span key={item} className="tech-chip">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="about-actions">
                <Link to="/dashboard" className="btn btn-primary">
                    Back to dashboard
                </Link>
            </div>
        </div>
    );
};

export default AboutPage;
