// TaskFlow - Dashboard page
// Main authenticated view: sidebar layout, stats, task board,
// search/filters, create/edit modal, delete confirmation, toasts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import ConfirmDialog from '../components/ConfirmDialog';
import ToastStack, { type ToastItem } from '../components/Toast';
import {
    IconAlert,
    IconCheckCircle,
    IconClock,
    IconFlag,
    IconInbox,
    IconList,
    IconMenu,
    IconPlay,
    IconPlus,
    IconSearch,
    IconSparkles,
    IconX,
} from '../components/Icons';
import {
    authApi,
    clearToken,
    errorMessage,
    isAuthError,
    logout,
    tasksApi,
    type DashboardStats,
    type Task,
    type TaskFormValues,
    type User,
} from '../utils/api';

type LoadState = 'loading' | 'ready' | 'error';

const DashboardPage = () => {
    const navigate = useNavigate();

    // Data -------------------------------------------------------
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [loadError, setLoadError] = useState('');

    // UI ---------------------------------------------------------
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toastIdRef = useRef(0);

    // Filters ----------------------------------------------------
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    // Auth redirect helper ---------------------------------------
    const forceLogout = useCallback(() => {
        clearToken();
        navigate('/login', { replace: true });
    }, [navigate]);

    const showToast = useCallback((type: ToastItem['type'], message: string) => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, type, message }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Initial load ------------------------------------------------
    // Data is fetched inside the effect; state updates only happen after
    // the promise settles (no synchronous setState during render effects).
    const [loadKey, setLoadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [profile, taskList, statsData] = await Promise.all([
                    authApi.me(),
                    tasksApi.list(),
                    tasksApi.stats(),
                ]);
                if (cancelled) return;
                setUser(profile);
                setTasks(taskList);
                setStats(statsData);
                setLoadError('');
                setLoadState('ready');
            } catch (err) {
                if (cancelled) return;
                if (isAuthError(err)) {
                    forceLogout();
                    return;
                }
                setLoadError(errorMessage(err, 'Failed to load your dashboard'));
                setLoadState('error');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadKey, forceLogout]);

    // Retry handler (event context - safe to set state synchronously)
    const retryLoad = () => {
        setLoadError('');
        setLoadState('loading');
        setLoadKey((key) => key + 1);
    };

    // Refresh only the stats after a mutation ---------------------
    const refreshStats = useCallback(async () => {
        try {
            setStats(await tasksApi.stats());
        } catch {
            // Stats refresh is non-critical; keep the last known values
        }
    }, []);

    // Handlers ----------------------------------------------------
    const openCreate = () => {
        setEditingTask(null);
        setModalError('');
        setModalOpen(true);
    };

    const openEdit = (task: Task) => {
        setEditingTask(task);
        setModalError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (submitting) return;
        setModalOpen(false);
        setModalError('');
    };

    const handleSubmit = async (values: TaskFormValues) => {
        setSubmitting(true);
        setModalError('');
        try {
            if (editingTask) {
                const updated = await tasksApi.update(editingTask.id, values);
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                showToast('success', 'Task updated');
            } else {
                const created = await tasksApi.create(values);
                setTasks((prev) => [created, ...prev]);
                showToast('success', 'Task created');
            }
            setModalOpen(false);
            setEditingTask(null);
            refreshStats();
        } catch (err) {
            if (isAuthError(err)) {
                forceLogout();
                return;
            }
            // Keep the modal open so the user can fix the input
            setModalError(errorMessage(err, 'Could not save the task'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (task: Task) => {
        const nextStatus = task.status === 'Done' ? 'To Do' : 'Done';
        setBusyTaskId(task.id);
        try {
            const updated = await tasksApi.update(task.id, { status: nextStatus });
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            refreshStats();
        } catch (err) {
            if (isAuthError(err)) {
                forceLogout();
                return;
            }
            showToast('error', errorMessage(err, 'Could not update the task'));
        } finally {
            setBusyTaskId(null);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await tasksApi.remove(pendingDelete.id);
            setTasks((prev) => prev.filter((t) => t.id !== pendingDelete.id));
            setPendingDelete(null);
            showToast('success', 'Task deleted');
            refreshStats();
        } catch (err) {
            if (isAuthError(err)) {
                forceLogout();
                return;
            }
            showToast('error', errorMessage(err, 'Could not delete the task'));
        } finally {
            setDeleting(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    // Derived data ------------------------------------------------
    const filteredTasks = useMemo(() => {
        const q = query.trim().toLowerCase();
        return tasks.filter((task) => {
            if (statusFilter !== 'All' && task.status !== statusFilter) return false;
            if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
            if (q) {
                const haystack = `${task.title} ${task.description || ''}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [tasks, query, statusFilter, priorityFilter]);

    const filtersActive = query.trim() !== '' || statusFilter !== 'All' || priorityFilter !== 'All';

    const clearFilters = () => {
        setQuery('');
        setStatusFilter('All');
        setPriorityFilter('All');
    };

    const statCards = [
        {
            key: 'total',
            label: 'Total tasks',
            value: stats?.total_tasks ?? 0,
            icon: <IconList size={18} />,
            tone: 'blue',
            hint: 'All tasks on your board',
        },
        {
            key: 'done',
            label: 'Completed',
            value: stats?.done_count ?? 0,
            icon: <IconCheckCircle size={18} />,
            tone: 'green',
            hint: 'Tasks marked as done',
        },
        {
            key: 'progress',
            label: 'In progress',
            value: stats?.in_progress_count ?? 0,
            icon: <IconPlay size={18} />,
            tone: 'violet',
            hint: 'Currently being worked on',
        },
        {
            key: 'todo',
            label: 'Pending',
            value: stats?.todo_count ?? 0,
            icon: <IconClock size={18} />,
            tone: 'amber',
            hint: 'Waiting to be started',
        },
        {
            key: 'high',
            label: 'High priority',
            value: stats?.high_priority_count ?? 0,
            icon: <IconFlag size={18} />,
            tone: 'rose',
            hint: 'Needs attention first',
        },
    ];

    const completionPct =
        stats && stats.total_tasks > 0
            ? Math.round((stats.done_count / stats.total_tasks) * 100)
            : 0;

    const firstName = (user?.name || '').split(' ')[0] || 'there';

    // Loading / error states -------------------------------------
    if (loadState === 'loading') {
        return (
            <div className="app-shell">
                <div className="sidebar sidebar-static" aria-hidden="true">
                    <div className="sidebar-brand">
                        <span className="brand-mark shimmer" />
                        <span className="brand-name shimmer shimmer-text" />
                    </div>
                    <div className="skeleton-nav">
                        {[0, 1].map((i) => (
                            <span key={i} className="shimmer shimmer-nav" />
                        ))}
                    </div>
                </div>
                <main className="main">
                    <div className="content">
                        <div className="shimmer shimmer-hero" />
                        <div className="stats-grid">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div key={i} className="shimmer shimmer-stat" />
                            ))}
                        </div>
                        <div className="shimmer shimmer-panel" />
                    </div>
                </main>
            </div>
        );
    }

    if (loadState === 'error') {
        return (
            <div className="state-page">
                <div className="state-card">
                    <span className="state-icon state-icon-error">
                        <IconAlert size={26} />
                    </span>
                    <h1>Could not load your dashboard</h1>
                    <p>{loadError}</p>
                    <div className="state-actions">
                        <button type="button" className="btn btn-primary" onClick={retryLoad}>
                            Try again
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                            Back to login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Sidebar
                user={user}
                onLogout={handleLogout}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="main">
                <header className="topbar">
                    <button
                        type="button"
                        className="icon-btn hamburger"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open navigation menu"
                    >
                        <IconMenu size={20} />
                    </button>
                    <div className="topbar-title">
                        <span className="topbar-eyebrow">Workspace</span>
                        <h1>Dashboard</h1>
                    </div>
                    <div className="topbar-actions">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={openCreate}
                            aria-label="New task"
                        >
                            <IconPlus size={16} />
                            <span className="btn-label">New task</span>
                        </button>
                    </div>
                </header>

                <div className="content">
                    {/* Welcome banner */}
                    <section className="welcome">
                        <div className="welcome-copy">
                            <span className="welcome-chip">
                                <IconSparkles size={13} /> Welcome back
                            </span>
                            <h2>Hey {firstName} 👋</h2>
                            <p>
                                {stats && stats.total_tasks > 0
                                    ? `You have ${stats.todo_count + stats.in_progress_count} open ${
                                          stats.todo_count + stats.in_progress_count === 1 ? 'task' : 'tasks'
                                      } — keep the momentum going.`
                                    : 'Your board is empty — create your first task to get started.'}
                            </p>
                        </div>
                        <div className="welcome-progress">
                            <div className="progress-meta">
                                <span>Completion</span>
                                <strong>{completionPct}%</strong>
                            </div>
                            <div
                                className="progress-track"
                                role="progressbar"
                                aria-valuenow={completionPct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Task completion"
                            >
                                <span className="progress-fill" style={{ width: `${completionPct}%` }} />
                            </div>
                            <div className="progress-sub">
                                {stats?.done_count ?? 0} of {stats?.total_tasks ?? 0} tasks completed
                            </div>
                        </div>
                    </section>

                    {/* Stats */}
                    <section className="stats-grid" aria-label="Task statistics">
                        {statCards.map((card) => (
                            <div key={card.key} className="stat-card">
                                <div className={`stat-icon stat-${card.tone}`}>{card.icon}</div>
                                <div className="stat-info">
                                    <span className="stat-value">{card.value}</span>
                                    <span className="stat-label">{card.label}</span>
                                </div>
                                <span className="stat-hint">{card.hint}</span>
                            </div>
                        ))}
                    </section>

                    {/* Tasks panel */}
                    <section className="panel">
                        <div className="panel-header">
                            <div className="panel-title">
                                <h3>Tasks</h3>
                                <span className="count-chip">
                                    {filteredTasks.length}
                                    {filtersActive ? ` of ${tasks.length}` : ''}
                                </span>
                            </div>
                            <div className="toolbar">
                                <div className="search-box">
                                    <IconSearch size={16} />
                                    <input
                                        type="search"
                                        className="search-input"
                                        placeholder="Search title or description..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        aria-label="Search tasks"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            className="search-clear"
                                            onClick={() => setQuery('')}
                                            aria-label="Clear search"
                                        >
                                            <IconX size={13} />
                                        </button>
                                    )}
                                </div>

                                <select
                                    className="input select filter-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    aria-label="Filter by status"
                                >
                                    <option value="All">All statuses</option>
                                    <option value="To Do">To Do</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Done</option>
                                </select>

                                <select
                                    className="input select filter-select"
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    aria-label="Filter by priority"
                                >
                                    <option value="All">All priorities</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>

                                {filtersActive && (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="panel-body">
                            {filteredTasks.length === 0 ? (
                                <div className="empty-state">
                                    <span className="state-icon">
                                        <IconInbox size={34} />
                                    </span>
                                    <h4>
                                        {tasks.length === 0
                                            ? 'No tasks yet'
                                            : 'No tasks match your filters'}
                                    </h4>
                                    <p>
                                        {tasks.length === 0
                                            ? 'Create your first task and it will show up here.'
                                            : 'Try adjusting your search or clearing the filters.'}
                                    </p>
                                    {tasks.length === 0 ? (
                                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                                            <IconPlus size={16} /> Create task
                                        </button>
                                    ) : (
                                        <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="task-list">
                                    {filteredTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            busy={busyTaskId === task.id}
                                            onToggle={handleToggle}
                                            onEdit={openEdit}
                                            onDelete={setPendingDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* Create / edit modal */}
            <TaskModal
                open={modalOpen}
                task={editingTask}
                submitting={submitting}
                error={modalError}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            {/* Delete confirmation */}
            <ConfirmDialog
                open={pendingDelete !== null}
                title="Delete this task?"
                message={`"${pendingDelete?.title ?? ''}" will be permanently removed. This action cannot be undone.`}
                confirmLabel="Delete task"
                busy={deleting}
                onCancel={() => !deleting && setPendingDelete(null)}
                onConfirm={confirmDelete}
            />

            {/* Toasts */}
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
};

export default DashboardPage;
