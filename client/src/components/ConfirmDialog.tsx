// TaskFlow - Confirmation dialog
// Used before destructive actions (task deletion)

import { useEffect } from 'react';
import { IconAlert, IconX } from './Icons';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

const ConfirmDialog = ({
    open,
    title,
    message,
    confirmLabel = 'Delete',
    busy = false,
    onCancel,
    onConfirm,
}: ConfirmDialogProps) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onCancel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;

    return (
        <div
            className="modal-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
        >
            <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
                <div className="confirm-icon" aria-hidden="true">
                    <IconAlert size={22} />
                </div>
                <h2 id="confirm-title" className="confirm-title">{title}</h2>
                <p className="confirm-message">{message}</p>

                <div className="modal-footer modal-footer-center">
                    <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
                        <IconX size={14} /> Cancel
                    </button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                        {busy ? (
                            <>
                                <span className="spinner" aria-hidden="true" />
                                Deleting...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
