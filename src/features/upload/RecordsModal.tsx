import { useEffect, useState } from 'react';
import { getRecords, deleteRecord, type PuzzleRecord } from '../../lib/records';
import { getGameHistory, deleteGameHistory } from '../../lib/gameHistory';
import type { GameHistoryRecord } from '../../types/puzzle';
import ConfirmDialog from '../../components/ConfirmDialog';

type Mode = 'quick' | 'history';

type Props = {
  mode: Mode;
  onClose: () => void;
  onApply?: (record: PuzzleRecord) => void;
  onContinue?: (record: GameHistoryRecord) => void;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
  expert: '專家',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes} 分 ${seconds.toString().padStart(2, '0')} 秒`;
  return `${seconds} 秒`;
}

export default function RecordsModal({ mode, onClose, onApply, onContinue }: Props) {
  const [quickSettings, setQuickSettings] = useState<PuzzleRecord[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistoryRecord[]>([]);
  const [pendingDeleteQuick, setPendingDeleteQuick] = useState<string | null>(null);
  const [pendingDeleteHistory, setPendingDeleteHistory] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'quick') setQuickSettings(getRecords());
    else setGameHistory(getGameHistory());
  }, [mode]);

  function confirmDeleteQuick() {
    if (!pendingDeleteQuick) return;
    deleteRecord(pendingDeleteQuick);
    setQuickSettings(getRecords());
    setPendingDeleteQuick(null);
  }

  function confirmDeleteHistory() {
    if (!pendingDeleteHistory) return;
    deleteGameHistory(pendingDeleteHistory);
    setGameHistory(getGameHistory());
    setPendingDeleteHistory(null);
  }

  function handleApply(record: PuzzleRecord) {
    if (!record.croppedImageDataUrl) return;
    onApply?.(record);
    onClose();
  }

  function handleContinue(record: GameHistoryRecord) {
    onContinue?.(record);
    onClose();
  }

  const title = mode === 'quick' ? '快捷設定' : '歷史紀錄';
  const subtitle = mode === 'quick' ? '最多保留 10 筆' : '最多保留 10 筆';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,9,6,.85)' }}
      onClick={onClose}
    >
      <div
        className="bg-paper-50 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-paper-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-300">
          <div>
            <h2 className="text-xl font-bold text-paper-900">{title}</h2>
            <p className="text-xs text-paper-600 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-paper-100 hover:bg-paper-300 text-paper-600 hover:text-paper-900 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'quick' && (
            quickSettings.length === 0 ? (
              <EmptyState message="尚無快捷設定" />
            ) : (
              <div className="flex flex-col gap-3">
                {quickSettings.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap gap-3 p-3 rounded-xl border border-paper-300 hover:border-paper-400 hover:bg-paper-100 transition-colors"
                  >
                    <Thumbnail src={r.thumbnailDataUrl} />
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                          r.isCompleted
                            ? 'border-[rgba(34,163,106,.2)]'
                            : 'border-paper-300'
                        }`} style={r.isCompleted ? { background: 'var(--color-success-bg)', color: 'var(--color-success)' } : { background: 'var(--color-paper-100)', color: 'var(--color-paper-600)' }}>
                          {r.isCompleted ? '已完成' : '未完成'}
                        </span>
                        <span className="text-xs text-paper-600">
                          {DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}
                        </span>
                        <span className="text-xs text-paper-600">
                          {r.cols}×{r.rows}（{r.cols * r.rows} 片）
                        </span>
                      </div>
                      <p className="text-xs text-paper-500 truncate">{formatDate(r.createdAt)}</p>
                      {r.isCompleted && r.bestTimeMs > 0 && (
                        <p className="text-sm font-bold text-brand-600">
                          最快：{formatTime(r.bestTimeMs)}
                        </p>
                      )}
                    </div>
                    <div className="basis-full sm:basis-auto flex flex-row gap-2 flex-shrink-0 items-center justify-end sm:justify-start">
                      {r.croppedImageDataUrl && (
                        <button
                          onClick={() => handleApply(r)}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          重新遊玩
                        </button>
                      )}
                      <button
                        onClick={() => setPendingDeleteQuick(r.id)}
                        className="btn-secondary px-3 py-1.5 text-xs hover:border-red-400 hover:text-red-500"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {mode === 'history' && (
            gameHistory.length === 0 ? (
              <EmptyState message="尚無歷史紀錄，遊戲中點「保存並結束」即可儲存進度" />
            ) : (
              <div className="flex flex-col gap-3">
                {gameHistory.map((r) => {
                  const snapped = r.savedState.pieces.filter((p) => p.isSnapped).length;
                  const total = r.savedState.pieces.length;
                  const progressPct = total > 0 ? Math.round((snapped / total) * 100) : 0;
                  return (
                    <div
                      key={r.id}
                      className={`flex flex-wrap gap-3 p-3 rounded-xl border transition-colors ${
                        r.isCompleted
                          ? 'border-success/30 bg-success-bg/60'
                          : 'border-paper-300 hover:border-paper-400 hover:bg-paper-100'
                      }`}
                    >
                      <Thumbnail src={r.thumbnailDataUrl} />
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-paper-600">
                            {DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}
                          </span>
                          <span className="text-xs text-paper-600">
                            {r.cols}×{r.rows}（{total} 片）
                          </span>
                          {r.isCompleted ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold border border-[rgba(34,163,106,.2)]" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                              已完成
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold border border-[rgba(244,165,43,.3)]" style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}>
                              {progressPct}% 完成
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-paper-500 truncate">
                          儲存於 {formatDate(r.updatedAt)}
                        </p>
                        <p className="text-xs text-paper-600">
                          {r.isCompleted
                            ? `完成時間：${formatTime(r.savedState.elapsedAtSave)}`
                            : `已拼 ${snapped} / ${total} 片・已用 ${formatTime(r.savedState.elapsedAtSave)}`}
                        </p>
                      </div>
                      <div className="basis-full sm:basis-auto flex flex-row gap-2 flex-shrink-0 items-center justify-end sm:justify-start">
                        {!r.isCompleted && (
                          <button
                            onClick={() => handleContinue(r)}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            繼續遊戲
                          </button>
                        )}
                        <button
                          onClick={() => setPendingDeleteHistory(r.id)}
                          className="btn-secondary px-3 py-1.5 text-xs hover:border-red-400 hover:text-red-500"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {pendingDeleteQuick && (
        <ConfirmDialog
          title="確定要刪除嗎？"
          message="此快捷設定將被永久刪除，無法復原。"
          confirmText="確定刪除"
          cancelText="取消"
          danger
          onConfirm={confirmDeleteQuick}
          onCancel={() => setPendingDeleteQuick(null)}
        />
      )}

      {pendingDeleteHistory && (
        <ConfirmDialog
          title="確定要刪除嗎？"
          message="此歷史紀錄將被永久刪除，無法復原。"
          confirmText="確定刪除"
          cancelText="取消"
          danger
          onConfirm={confirmDeleteHistory}
          onCancel={() => setPendingDeleteHistory(null)}
        />
      )}
    </div>
  );
}

function Thumbnail({ src }: { src: string }) {
  return (
    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-paper-200">
      <img src={src} alt="縮圖" className="w-full h-full object-cover" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-paper-500 gap-3">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-center text-sm">{message}</p>
    </div>
  );
}
