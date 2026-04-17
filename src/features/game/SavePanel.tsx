import { useState } from 'react';
import { getGameHistory } from '../../lib/gameHistory';
import type { GameHistoryRecord } from '../../types/puzzle';
import ConfirmDialog from '../../components/ConfirmDialog';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
  expert: '專家',
};

const MAX_SLOTS = 10;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d
    .getDate()
    .toString()
    .padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} 分 ${(s % 60).toString().padStart(2, '0')} 秒` : `${s} 秒`;
}

type Props = {
  gameId: string | null;
  onSave: (existing: GameHistoryRecord | null, slotIndex: number) => void;
  onClose: () => void;
};

export default function SavePanel({ gameId, onSave, onClose }: Props) {
  const history = getGameHistory();
  const [pendingSlot, setPendingSlot] = useState<{ record: GameHistoryRecord; index: number } | null>(null);

  const slots: (GameHistoryRecord | null)[] = Array.from({ length: MAX_SLOTS }, (_, i) =>
    history[i] ?? null
  );

  const originSlotIndex = gameId
    ? slots.findIndex((r) => r?.id === gameId)
    : -1;

  function handleSlotClick(record: GameHistoryRecord | null, index: number) {
    if (record && index !== originSlotIndex) {
      setPendingSlot({ record, index });
    } else {
      onSave(record, index);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800">選擇保存位置</h2>
              <p className="text-xs text-gray-400 mt-0.5">最多保留 10 筆，點選空位直接保存，點選已有紀錄可覆蓋</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors text-lg font-bold"
            >
              ✕
            </button>
          </div>

          {/* Slots */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              {slots.map((record, i) => {
                const isOrigin = i === originSlotIndex;
                return (
                  <button
                    key={i}
                    onClick={() => handleSlotClick(record, i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      isOrigin
                        ? 'border-green-400 bg-green-50 hover:bg-green-100'
                        : record
                          ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {/* Slot number */}
                    <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      isOrigin ? 'bg-green-500 text-white' : record ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i + 1}
                    </div>

                    {record ? (
                      <>
                        {/* Thumbnail */}
                        <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <img src={record.thumbnailDataUrl} alt="縮圖" className="w-full h-full object-cover" />
                        </div>
                        {/* Info */}
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isOrigin && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-200 text-green-800 font-semibold">
                                目前紀錄
                              </span>
                            )}
                            {record.isCompleted && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                已完成
                              </span>
                            )}
                            <span className="text-xs font-medium text-gray-700">
                              {DIFFICULTY_LABEL[record.difficulty] ?? record.difficulty}
                            </span>
                            <span className="text-xs text-gray-500">
                              {record.cols}×{record.rows}（{record.cols * record.rows} 片）
                            </span>
                            {!record.isCompleted && (() => {
                              const snapped = record.savedState.pieces.filter((p) => p.isSnapped).length;
                              const total = record.savedState.pieces.length;
                              const pct = total > 0 ? Math.round((snapped / total) * 100) : 0;
                              return (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">
                                  {pct}% 完成
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-gray-400">儲存於 {formatDate(record.updatedAt)}</p>
                          <p className="text-xs text-gray-500">
                            {record.isCompleted
                              ? `完成時間：${formatTime(record.savedState.elapsedAtSave)}`
                              : `已拼 ${record.savedState.pieces.filter((p) => p.isSnapped).length} / ${record.savedState.pieces.length} 片・已用 ${formatTime(record.savedState.elapsedAtSave)}`}
                          </p>
                        </div>
                        <span className={`text-xs flex-shrink-0 ${isOrigin ? 'text-green-600 font-semibold' : 'text-blue-400'}`}>
                          {isOrigin ? '覆蓋儲存' : '覆蓋'}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">空位</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {pendingSlot && (
        <ConfirmDialog
          title="覆蓋存檔？"
          message={`第 ${pendingSlot.index + 1} 格已有存檔，確定要覆蓋嗎？此操作無法復原。`}
          confirmText="確定覆蓋"
          cancelText="取消"
          danger
          onConfirm={() => {
            onSave(pendingSlot.record, pendingSlot.index);
            setPendingSlot(null);
          }}
          onCancel={() => setPendingSlot(null)}
        />
      )}
    </>
  );
}
