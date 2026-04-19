import { useRef, useState } from 'react';
import { encodeShareCode, decodeShareCode, shareDataToRecord } from '../lib/shareCode';
import { saveRecord, getRecords, type PuzzleRecord } from '../lib/records';

type Props =
  | { mode: 'share'; record: PuzzleRecord; onClose: () => void }
  | { mode: 'import'; onImport: (record: PuzzleRecord) => void; onClose: () => void };

export default function ShareCodeModal(props: Props) {
  const { mode, onClose } = props;
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareCode = mode === 'share' ? encodeShareCode(props.record) : '';

  function handleCopy() {
    navigator.clipboard.writeText(shareCode).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleImport() {
    setError('');
    const data = decodeShareCode(inputCode);
    if (!data) {
      setError('代碼格式錯誤，請確認是否貼入完整代碼');
      return;
    }
    if (getRecords().length >= 10) {
      setError('快捷設定已達上限（10 筆），請先刪除不需要的設定後再匯入');
      return;
    }
    const record = shareDataToRecord(data);
    saveRecord(record);
    (props as { mode: 'import'; onImport: (r: PuzzleRecord) => void }).onImport(record);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,9,6,.85)' }}
      onClick={onClose}
    >
      <div
        className="bg-paper-50 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-paper-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-300">
          <h2 className="text-xl font-bold text-paper-900">
            {mode === 'share' ? '分享拼圖' : '匯入拼圖代碼'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-paper-100 hover:bg-paper-300 text-paper-600 hover:text-paper-900 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {mode === 'share' ? (
            <>
              <p className="text-sm text-paper-600">
                將以下代碼傳給對方，對方在「快速開局」→「匯入代碼」貼上即可遊玩同一張拼圖。
              </p>
              <textarea
                readOnly
                value={shareCode}
                className="w-full h-32 rounded-xl border border-paper-300 bg-paper-100 p-3 text-xs font-mono text-paper-700 resize-none focus:outline-none"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                onClick={handleCopy}
                className={`btn-primary py-2.5 text-sm transition-all ${copied ? 'opacity-80' : ''}`}
              >
                {copied ? '已複製！' : '複製代碼'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-paper-600">
                貼入對方提供的分享代碼，即可匯入並直接開始遊玩。
              </p>
              <textarea
                value={inputCode}
                onChange={(e) => { setInputCode(e.target.value); setError(''); }}
                placeholder="請貼入分享代碼…"
                className="w-full h-32 rounded-xl border border-paper-300 bg-white p-3 text-xs font-mono text-paper-700 resize-none focus:outline-none focus:border-brand-500"
              />
              {error && (
                <p className="text-sm text-danger font-medium">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={!inputCode.trim()}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  確認匯入
                </button>
                <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
