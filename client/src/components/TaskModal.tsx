// TaskFlow - Create / Edit task modal
// Professional modal form used for both creating and editing tasks.
// The form stays mounted while submitting (fixes the original
// "Add Task disappears" bug caused by full-page loading states).

import { useEffect, useRef, useState } from 'react';
import type { Task, TaskFormValues } from '../utils/api';
import { IconX } from './Icons';

interface TaskModalProps {
    open: boolean;
    task: Task | null; // null = create mode
    submitting: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (values: TaskFormValues) => void;
}

const emptyValues: TaskFormValues = {
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    due_date: '',
};

// Map a stored task (or "create mode") onto editable form values
const formValuesFor = (task: Task | null): TaskFormValues =>
    task
        ? {
              title: task.title,
              description: task.description || '',
              priority: task.priority,
              status: task.status,
              due_date: task.due_date || '',
          }
        : { ...emptyValues };

const TaskModal = ({ open, task, submitting, error, onClose, onSubmit }: TaskModalProps) => {
    const [values, setValues] = useState<TaskFormValues>(() => formValuesFor(task));
    const [validationError, setValidationError] = useState('');
    const titleRef = useRef<HTMLInputElement>(null);

    // Reset the form when the modal opens (React's "adjust state during
    // render" pattern - avoids an effect-triggered render cascade)
    const [prev, setPrev] = useState({ open, task });
    if (prev.open !== open || prev.task !== task) {
        setPrev({ open, task });
        if (open) {
            setValidationError('');
            setValues(formValuesFor(task));
        }
    }

    // Focus the title field when the modal opens. The effect runs after
    // the dialog is committed and painted, so no delayed timer is needed.
    // A late setTimeout() focus can steal focus from an in-flight
    // interaction (it raced Playwright's description fill and appended
    // the description into the title field), so focus synchronously here.
    useEffect(() => {
        if (!open) return;
        titleRef.current?.focus();
    }, [open]);

    // ESC to close + lock body scroll
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        document.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, submitting, onClose]);

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const title = values.title.trim();
        if (!title) {
            setValidationError('Please enter a task title');
            titleRef.current?.focus();
            return;
        }
        if (title.length > 200) {
            setValidationError('Title must be 200 characters or fewer');
            return;
        }
        setValidationError('');
        onSubmit({ ...values, title });
    };

    const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    const displayError = validationError || error;

    return (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
                <div className="modal-header">
                    <div>
                        <h2 id="task-modal-title">{task ? 'Edit task' : 'Create new task'}</h2>
                        <p className="modal-subtitle">
                            {task ? 'Update the details of your task.' : 'Fill in the details to add a task to your board.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close dialog"
                    >
                        <IconX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form" noValidate>
                    {displayError && (
                        <div className="form-error" role="alert">
                            {displayError}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="task-title">Title <span className="req">*</span></label>
                        <input
                            id="task-title"
                            ref={titleRef}
                            type="text"
                            className="input"
                            placeholder="e.g. Ship the quarterly report"
                            value={values.title}
                            onChange={(e) => set('title', e.target.value)}
                            maxLength={200}
                            disabled={submitting}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="task-description">Description</label>
                        <textarea
                            id="task-description"
                            className="input textarea"
                            placeholder="Add more context, links, or acceptance criteria (optional)"
                            value={values.description}
                            onChange={(e) => set('description', e.target.value)}
                            rows={3}
                            maxLength={2000}
                            disabled={submitting}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="task-priority">Priority</label>
                            <select
                                id="task-priority"
                                className="input select"
                                value={values.priority}
                                onChange={(e) => set('priority', e.target.value as TaskFormValues['priority'])}
                                disabled={submitting}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="task-status">Status</label>
                            <select
                                id="task-status"
                                className="input select"
                                value={values.status}
                                onChange={(e) => set('status', e.target.value as TaskFormValues['status'])}
                                disabled={submitting}
                            >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="task-due-date">Due date</label>
                            <input
                                id="task-due-date"
                                type="date"
                                className="input"
                                value={values.due_date}
                                onChange={(e) => set('due_date', e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <span className="spinner" aria-hidden="true" />
                                    {task ? 'Saving...' : 'Creating...'}
                                </>
                            ) : task ? (
                                'Save changes'
                            ) : (
                                'Create task'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
