"use client";

import clsx from 'clsx';
import { ReactNode } from 'react';

type ConfirmProps =
  | { hideConfirm?: false; confirmLabel: string; onConfirm: () => void }
  /** No confirm button: the children carry their own (e.g. HoldToConfirm). */
  | { hideConfirm: true; confirmLabel?: string; onConfirm?: () => void };

type StaffDialogProps = ConfirmProps & {
  open: boolean;
  title: string;
  children?: ReactNode;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  confirmDisabled?: boolean;
  onCancel?: () => void;
};

export default function StaffDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'primary',
  confirmDisabled = false,
  hideConfirm = false,
  onConfirm,
  onCancel,
}: StaffDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(213,220,226,0.7)] p-4 backdrop-blur-sm">
      <div className="staff-panel w-full max-w-sm p-5 text-gray-900">
        <h2 className="text-lg font-bold">{title}</h2>
        {children && <div className="mt-3 text-sm text-gray-600">{children}</div>}
        <div className="mt-6 flex flex-col gap-3">
          {!hideConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={clsx(
                'staff-btn',
                variant === 'danger' ? 'staff-btn-danger' : 'staff-btn-primary',
              )}
            >
              {confirmLabel}
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="staff-btn staff-btn-outline"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
