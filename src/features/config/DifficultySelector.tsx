import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { confirmConfig } from '../../store/puzzleSlice';
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
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--pg-warm)' }}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 backdrop-blur-sm flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #251E15 0%, rgba(26,20,13,.9) 100%)', borderBottom: '1px solid #3A2F25' }}
      >
        <button
          onClick={() => history.back()}
          className="text-paper-400 text-sm font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          style={{ background: '#3A2F25', border: '1px solid #5A4B38' }}
        >
          ← 返回選擇圖片
        </button>
        <div className="w-9" />
        <button
          onClick={handleNext}
          className="btn-primary text-sm px-5 py-2"
        >
          選擇拼圖區域
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 gap-6">
        <h1 className="text-3xl sm:text-4xl font-black text-paper-900 tracking-tight">選擇難度</h1>

        {/* 難度選擇 */}
        <div className="flex gap-2 flex-wrap justify-center">
          {DIFFICULTIES.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => handleDifficultyChange(value)}
              className={`relative px-4 py-3 rounded-2xl text-base font-extrabold border-2 transition-all card-lift ${
                selectedDifficulty === value
                  ? 'border-brand-700 text-paper-900 -translate-y-0.5'
                  : 'border-paper-300 bg-paper-100 text-paper-900 hover:border-brand-500'
              }`}
              style={selectedDifficulty === value ? {
                background: 'linear-gradient(180deg, #FFE9B5, #F6B641)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 0 6px 0 #9E5A00, 0 10px 18px rgba(185,106,0,.3)',
              } : undefined}
            >
              <div>{label}</div>
              <div className="text-xs font-bold font-mono opacity-80 mt-0.5">{count} 片</div>
              {selectedDifficulty === value && (
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{ background: 'var(--color-paper-100)', color: 'var(--color-brand-700)', boxShadow: '0 2px 6px rgba(0,0,0,.2)', border: '2px solid #B96A00' }}
                >✓</div>
              )}
            </button>
          ))}
        </div>

        {/* 格數選擇 */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-paper-600">選擇格數</h2>
          <div className="flex gap-3 flex-wrap justify-center">
            {presets.map((preset) => {
              const isSelected =
                selectedGrid.cols === preset.cols && selectedGrid.rows === preset.rows;
              return (
                <button
                  key={preset.label}
                  onClick={() => setSelectedGrid(preset)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold border-2 transition-all ${
                    isSelected
                      ? 'border-brand-700 bg-brand-500 text-paper-900 shadow-md'
                      : 'border-paper-300 bg-paper-100 text-paper-800 hover:border-brand-500/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-paper-600 font-mono">
            共 {selectedGrid.cols * selectedGrid.rows} 片
            （{selectedGrid.cols} 欄 × {selectedGrid.rows} 列）
          </p>
        </div>
      </div>
    </div>
  );
}
