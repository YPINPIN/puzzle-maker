import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { confirmConfig } from '../../store/puzzleSlice';
import type { Difficulty } from '../../types/puzzle';
import { CREST } from '../../lib/difficulty';
import PageFooter from '../../components/PageFooter';

type GridPreset = { cols: number; rows: number; label: string };

const DIFFICULTIES: { value: Difficulty; label: string; count: number; device: string }[] = [
  { value: 'easy',   label: '簡單', count: 25,  device: '手機 / 平板 / 桌機' },
  { value: 'normal', label: '普通', count: 50,  device: '平板 / 桌機' },
  { value: 'hard',   label: '困難', count: 100, device: '建議平板或桌機' },
  { value: 'expert', label: '專家', count: 150, device: '建議桌機' },
];

const GRID_PRESETS: Record<Difficulty, GridPreset[]> = {
  easy:   [
    { cols: 5,  rows: 5,  label: '5 × 5'  },
    { cols: 4,  rows: 6,  label: '4 × 6'  },
    { cols: 6,  rows: 4,  label: '6 × 4'  },
  ],
  normal: [
    { cols: 7,  rows: 7,  label: '7 × 7'  },
    { cols: 6,  rows: 8,  label: '6 × 8'  },
    { cols: 8,  rows: 6,  label: '8 × 6'  },
  ],
  hard: [
    { cols: 10, rows: 10, label: '10 × 10' },
    { cols: 9,  rows: 12, label: '9 × 12'  },
    { cols: 12, rows: 9,  label: '12 × 9'  },
  ],
  expert: [
    { cols: 12, rows: 12, label: '12 × 12' },
    { cols: 10, rows: 15, label: '10 × 15' },
    { cols: 15, rows: 10, label: '15 × 10' },
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
        className="px-4 py-3 backdrop-blur-sm flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #251E15 0%, rgba(26,20,13,.9) 100%)', borderBottom: '1px solid #3A2F25' }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-1.5 text-paper-400 text-sm font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
            style={{ background: '#3A2F25', border: '1px solid #5A4B38' }}
          >
            <Icon name="ic-arrow-left" size={16} />
            返回選擇圖片
          </button>
          <button
            onClick={handleNext}
            className="btn-primary text-sm px-5 py-2"
          >
            <Icon name="ic-crop" size={16} />
            選擇拼圖區域
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center p-6">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full">
        <h1 className="text-2xl font-black text-paper-900 tracking-tight">選擇難度</h1>

        {/* 難度選擇 */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-[220px] sm:max-w-[280px]">
          {DIFFICULTIES.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => handleDifficultyChange(value)}
              className={`aspect-square relative flex flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold border-2 transition-all card-lift ${
                selectedDifficulty === value
                  ? 'border-brand-700 text-paper-900 -translate-y-0.5'
                  : 'border-paper-300 bg-paper-100 text-paper-900 hover:border-brand-500'
              }`}
              style={selectedDifficulty === value ? {
                background: 'linear-gradient(180deg, #FFE9B5, #F6B641)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 0 6px 0 #9E5A00, 0 10px 18px rgba(185,106,0,.3)',
              } : undefined}
            >
              <span className="w-8 h-8 sm:w-10 sm:h-10">
                <Icon name={CREST[value]} size="100%" />
              </span>
              <div>{label}</div>
              <div className="text-xs font-bold font-mono opacity-80">約 {count} 片</div>
              {selectedDifficulty === value && (
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{ background: 'var(--color-paper-100)', color: 'var(--color-brand-700)', boxShadow: '0 2px 6px rgba(0,0,0,.2)', border: '2px solid #B96A00' }}
                ><Icon name="ic-check" size={12} /></div>
              )}
            </button>
          ))}
        </div>

        {/* 裝置建議 */}
        <p className="text-xs text-paper-500 text-center">
          建議遊玩裝置：
          <span className="font-semibold text-paper-600">
            {DIFFICULTIES.find(d => d.value === selectedDifficulty)?.device}
          </span>
        </p>

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

        <PageFooter />
      </div>
    </div>
  );
}
