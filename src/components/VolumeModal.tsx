import { useState, useEffect } from 'react';
import { Icon, type IconName } from './Icon';
import {
  getMusicVolume, getButtonVolume, getPieceVolume,
  setMusicVolume, setButtonVolume, setPieceVolume,
  setMuted as setSoundMuted, isMuted,
  playClick, playSnap, startMusic, stopMusic,
} from '../lib/soundEngine';

type Props = { onClose: () => void };

export default function VolumeModal({ onClose }: Props) {
  const [muted, setMuted] = useState(() => isMuted());
  const [music, setMusic] = useState(() => Math.round(getMusicVolume() * 100));
  const [button, setButton] = useState(() => Math.round(getButtonVolume() * 100));
  const [piece, setPiece] = useState(() => Math.round(getPieceVolume() * 100));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleToggleMute() {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
    if (next) stopMusic();
    else startMusic();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(13,9,6,.85)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="volume-modal-title"
        className="bg-paper-50 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5 border border-paper-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between">
          <h2 id="volume-modal-title" className="text-lg font-bold text-paper-900">音量設定</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-paper-100 hover:bg-paper-300 text-paper-600 hover:text-paper-900 transition-colors"
          >
            <Icon name="ic-close" size={18} />
          </button>
        </div>

        {/* 全部靜音 toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-paper-300">
          <span className="text-sm font-medium text-paper-800">全部靜音</span>
          <button
            onClick={handleToggleMute}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: muted ? 'var(--color-paper-300)' : 'var(--color-accent-500)' }}
            title={muted ? '取消靜音' : '全部靜音'}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: muted ? 'translateX(0)' : 'translateX(1.25rem)' }}
            />
          </button>
        </div>

        {/* 三個音量滑桿 */}
        <div className="flex flex-col gap-4">
          <VolumeRow
            label="背景音樂"
            icon="ic-volume"
            value={music}
            disabled={muted}
            onChange={(v) => {
              setMusic(v);
              setMusicVolume(v / 100);
              startMusic();
            }}
          />
          <VolumeRow
            label="按鈕音效"
            icon="ic-settings"
            value={button}
            disabled={muted}
            onChange={(v) => {
              setButton(v);
              setButtonVolume(v / 100);
              playClick();
            }}
          />
          <VolumeRow
            label="拼圖音效"
            icon="ic-puzzle"
            value={piece}
            disabled={muted}
            onChange={(v) => {
              setPiece(v);
              setPieceVolume(v / 100);
              playSnap();
            }}
          />
        </div>

        <p className="text-xs text-paper-500 text-center">調整滑桿時可即時預覽音效</p>
      </div>
    </div>
  );
}

function VolumeRow({
  label, icon, value, disabled, onChange,
}: {
  label: string;
  icon: IconName;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5" style={{ opacity: disabled ? 0.4 : 1, transition: 'opacity 0.2s' }}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-paper-800">
          <Icon name={icon} size={14} />
          <span className="translate-y-px">{label}</span>
        </span>
        <span className="text-sm text-paper-600 tabular-nums w-10 text-right">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={10}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          accentColor: 'var(--color-brand-500)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
    </div>
  );
}
