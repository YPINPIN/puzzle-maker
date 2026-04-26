import { useEffect } from 'react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 重點文字用的工具 span
export const Hi = ({ children }: { children: ReactNode }) => (
  <span className="font-semibold text-brand-500">{children}</span>
);
export const HiAccent = ({ children }: { children: ReactNode }) => (
  <span className="font-semibold text-accent-500">{children}</span>
);
export const HiDanger = ({ children }: { children: ReactNode }) => (
  <span className="font-semibold text-danger">{children}</span>
);

export default function ConfirmDialog({
  title,
  message,
  confirmText = '確定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(13,9,6,.85)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="bg-paper-50 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 border border-paper-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-paper-900">{title}</h2>
        <p id="confirm-dialog-message" className="text-sm text-paper-800 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex gap-3 justify-end mt-1">
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
