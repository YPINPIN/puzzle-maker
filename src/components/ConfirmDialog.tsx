type Props = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmText = '確定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(13,9,6,.85)' }}
      onClick={onCancel}
    >
      <div
        className="bg-paper-50 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 border border-paper-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-paper-900">{title}</h2>
        <p className="text-sm text-paper-800 leading-relaxed">{message}</p>
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
