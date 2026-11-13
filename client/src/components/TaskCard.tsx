// TaskFlow - Task card component
// Displays a single task with status toggle, badges, due date, edit and delete

import type { Task } from '../utils/api';
import { IconCalendar, IconCheck, IconPencil, IconTrash } from './Icons';

interface TaskCardProps {
    task: Task;
    onToggle: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    busy?: boolean;
}

// Due date helpers ------------------------------------------------
const parseDate = (value: string): Date | null => {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
};

const isOverdue = (value: string | null): boolean => {
    if (!value) return false;
    const due = parseDate(value);
    if (!due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
};

const formatDue = (value: string | null): string => {
    const due = value ? parseDate(value) : null;
    if (!due) return 'No due date';
    return due.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: due.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
};

const TaskCard = ({ task, onToggle, onEdit, onDelete, busy }: TaskCardProps) => {
    const done = task.status === 'Done';
    const overdue = !done && isOverdue(task.due_date);

    return (
        <article className={`task-card ${done ? 'task-done' : ''} ${busy ? 'task-busy' : ''}`}>
            <button
                type="button"
                className={`task-check ${done ? 'task-check-checked' : ''}`}
                onClick={() => onToggle(task)}
                disabled={busy}
                aria-label={done ? `Mark "${task.title}" as not complete` : `Mark "${task.title}" as complete`}
            >
                {done && <IconCheck size={13} />}
            </button>

            <div className="task-body">
                <div className="task-top">
                    <h3 className="task-title">{task.title}</h3>
                    <div className="task-badges">
                        <span className={`badge badge-priority badge-priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                        </span>
                        <span className={`badge badge-status badge-status-${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {task.status}
                        </span>
                    </div>
                </div>

                {task.description && <p className="task-desc">{task.description}</p>}

                <div className="task-meta">
                    <span className="task-due-group">
                        {overdue && (
                            <span className="overdue-pill" role="status">
                                Overdue
                            </span>
                        )}
                        <span className={`task-due ${overdue ? 'task-due-overdue' : ''}`}>
                            <IconCalendar size={13} />
                            {overdue ? 'Was due ' : 'Due '}{formatDue(task.due_date)}
                        </span>
                    </span>

                    <div className="task-actions">
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => onEdit(task)}
                            disabled={busy}
                            aria-label={`Edit ${task.title}`}
                            title="Edit"
                        >
                            <IconPencil size={15} />
                        </button>
                        <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => onDelete(task)}
                            disabled={busy}
                            aria-label={`Delete ${task.title}`}
                            title="Delete"
                        >
                            <IconTrash size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default TaskCard;
