// TaskFlow - Toast notifications
// Lightweight success/error feedback stack

import { IconAlert, IconCheckCircle, IconX } from './Icons';

export interface ToastItem {
    id: number;
    type: 'success' | 'error';
    message: string;
}

interface ToastStackProps {
    toasts: ToastItem[];
    onDismiss: (id: number) => void;
}

const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-stack" role="status" aria-live="polite">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' ? <IconCheckCircle size={17} /> : <IconAlert size={17} />}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                    <button
                        type="button"
                        className="toast-close"
                        onClick={() => onDismiss(toast.id)}
                        aria-label="Dismiss notification"
                    >
                        <IconX size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastStack;
