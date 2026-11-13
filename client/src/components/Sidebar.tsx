// TaskFlow - Sidebar navigation
// Fixed left sidebar with branding, navigation, and user account section

import { NavLink } from 'react-router-dom';
import type { User } from '../utils/api';
import {
    IconDashboard,
    IconInfo,
    IconLogout,
    IconLogo,
    IconUser,
} from './Icons';

interface SidebarProps {
    user: User | null;
    onLogout: () => void;
    open: boolean;
    onClose: () => void;
}

const Sidebar = ({ user, onLogout, open, onClose }: SidebarProps) => {
    const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

    return (
        <>
            {open && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
                <div className="sidebar-brand">
                    <span className="brand-mark">
                        <IconLogo size={22} />
                    </span>
                    <span className="brand-name">
                        TaskFlow<span className="brand-dot">.</span>
                    </span>
                </div>

                <nav className="sidebar-nav" aria-label="Main navigation">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'nav-active' : ''}`
                        }
                        onClick={onClose}
                    >
                        <IconDashboard size={18} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink
                        to="/about"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'nav-active' : ''}`
                        }
                        onClick={onClose}
                    >
                        <IconInfo size={18} />
                        <span>About</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-card">
                        <span className="user-avatar">
                            {user ? initial : <IconUser size={16} />}
                        </span>
                        <div className="user-meta">
                            <span className="user-name" title={user?.name}>
                                {user?.name || 'Loading...'}
                            </span>
                            <span className="user-email" title={user?.email}>
                                {user?.email || ''}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="nav-item logout-item"
                        onClick={onLogout}
                    >
                        <IconLogout size={18} />
                        <span>Log out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
