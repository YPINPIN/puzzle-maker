import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { resetGame } from '../../store/puzzleSlice';
import { getRecords, updateRecord } from '../../lib/records';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes} 分 ${seconds.toString().padStart(2, '0')} 秒`;
  }
  return `${seconds} 秒`;
}

export default function CompletionOverlay() {
  const dispatch = useDispatch<AppDispatch>();
  const elapsedMs = useSelector((s: RootState) => s.puzzle.elapsedMs);
  const referenceDataUrl = useSelector((s: RootState) => s.puzzle.referenceDataUrl);
  const currentGameId = useSelector((s: RootState) => s.puzzle.currentGameId);

  useEffect(() => {
    if (!currentGameId || !elapsedMs) return;
    // 只有比既有最佳紀錄更快時才更新時間
    const existing = getRecords().find((r) => r.id === currentGameId);
    const bestTimeMs =
      existing?.isCompleted && existing.bestTimeMs > 0 && existing.bestTimeMs < elapsedMs
        ? existing.bestTimeMs
        : elapsedMs;
    updateRecord(currentGameId, { isCompleted: true, bestTimeMs });
  }, [currentGameId, elapsedMs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5">
        {referenceDataUrl && (
          <img
            src={referenceDataUrl}
            alt="完成的拼圖"
            className="max-w-full max-h-48 rounded-xl shadow-lg object-contain"
          />
        )}
        <div className="text-5xl">🎉</div>
        <h1 className="text-3xl font-bold text-gray-800">拼圖完成！</h1>
        <p className="text-xl text-gray-600">
          用時：<span className="font-semibold text-blue-600">{formatTime(elapsedMs)}</span>
        </p>
        <button
          onClick={() => dispatch(resetGame())}
          className="mt-2 px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg transition-colors"
        >
          再玩一次
        </button>
      </div>
    </div>
  );
}
