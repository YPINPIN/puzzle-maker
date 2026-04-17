import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { confirmConfig, resetGame } from '../../store/puzzleSlice';
import type { Difficulty } from '../../types/puzzle';

type GridPreset = { cols: number; rows: number; label: string };

const DIFFICULTIES: { value: Difficulty; label: string; count: number }[] = [
  { value: 'easy',   label: '簡單', count: 20  },
  { value: 'normal', label: '普通', count: 50  },
  { value: 'hard',   label: '困難', count: 100 },
  { value: 'expert', label: '專家', count: 150 },
];

const GRID_PRESETS: Record<Difficulty, GridPreset[]> = {
  easy:   [
    { cols: 4, rows: 5,  label: '4 × 5'  },
    { cols: 5, rows: 4,  label: '5 × 4'  },
  ],
  normal: [
    { cols: 5,  rows: 10, label: '5 × 10' },
    { cols: 10, rows: 5,  label: '10 × 5' },
    { cols: 7,  rows: 7,  label: '7 × 7'  },
  ],
  hard: [
    { cols: 10, rows: 10, label: '10 × 10' },
    { cols: 8,  rows: 13, label: '8 × 13'  },
    { cols: 13, rows: 8,  label: '13 × 8'  },
  ],
  expert: [
    { cols: 10, rows: 15, label: '10 × 15' },
    { cols: 15, rows: 10, label: '15 × 10' },
    { cols: 13, rows: 12, label: '13 × 12' },
  ],
};

export default function DifficultySelector() {
  const dispatch = useDispatch<AppDispatch>();
  const difficulty = useSelector((s: RootState) => s.puzzle.difficulty);

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(difficulty);
  const [selectedGrid, setSelectedGrid] = useState<GridPreset>(GRID_PRESETS[difficulty][0]);

  function handleDifficultyChange(value: Difficulty) {
    setSelectedDifficulty(value);
    setSelectedGrid(GRID_PRESETS[value][0]);
  }

  function handleNext() {
    dispatch(confirmConfig({
      cols: selectedGrid.cols,
      rows: selectedGrid.rows,
      difficulty: selectedDifficulty,
    }));
  }

  const presets = GRID_PRESETS[selectedDifficulty];

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center bg-gray-50 p-4 gap-6">
      <div className="w-full max-w-sm flex items-center">
        <button
          onClick={() => dispatch(resetGame())}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← 重新上傳圖片
        </button>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">選擇難度</h1>

      {/* 難度選擇 */}
      <div className="flex gap-3 flex-wrap justify-center">
        {DIFFICULTIES.map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => handleDifficultyChange(value)}
            className={`px-5 py-3 rounded-xl text-base font-semibold border-2 transition-all ${
              selectedDifficulty === value
                ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
            }`}
          >
            <div>{label}</div>
            <div className="text-sm font-normal opacity-80">{count} 片</div>
          </button>
        ))}
      </div>

      {/* 格數選擇 */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-gray-600">選擇格數</h2>
        <div className="flex gap-3 flex-wrap justify-center">
          {presets.map((preset) => {
            const isSelected =
              selectedGrid.cols === preset.cols && selectedGrid.rows === preset.rows;
            return (
              <button
                key={preset.label}
                onClick={() => setSelectedGrid(preset)}
                className={`px-5 py-3 rounded-xl text-base font-semibold border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-gray-400">
          共 {selectedGrid.cols * selectedGrid.rows} 片
          （{selectedGrid.cols} 欄 × {selectedGrid.rows} 列）
        </p>
      </div>

      <button
        onClick={handleNext}
        className="px-10 py-4 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold rounded-xl shadow-lg transition-colors"
      >
        下一步：選取裁切區域
      </button>
    </div>
  );
}
