import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { toggleImagePreview, resetGame } from '../../store/puzzleSlice';
import { TOOLBAR_HEIGHT } from '../../lib/constants';

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0
    ? `${m} 分 ${(s % 60).toString().padStart(2, '0')} 秒`
    : `${s} 秒`;
}

export default function GameToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const startTime = useSelector((s: RootState) => s.puzzle.startTime);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-4 bg-gray-800 text-white"
      style={{ height: TOOLBAR_HEIGHT }}
    >
      {/* 計時器 */}
      <div className="font-mono text-lg font-semibold tracking-wider">
        {formatTime(elapsed)}
      </div>

      {/* 右側按鈕 */}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch(toggleImagePreview())}
          className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
        >
          查看參考圖
        </button>
        <button
          onClick={() => dispatch(resetGame())}
          className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
        >
          結束遊戲
        </button>
      </div>
    </div>
  );
}
