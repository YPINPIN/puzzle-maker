import { useRef, useState } from 'react';
import { Icon } from '../../components/Icon';

type Props = {
  onClose: () => void;
  onSelect: (dataUrl: string) => void;
};

const BASE = import.meta.env.BASE_URL;
const PRESET_IMAGES = [
  { url: `${BASE}presets/puzzle-1.png`, name: '奇幻自然' },
  { url: `${BASE}presets/puzzle-2.png`, name: '復古機械' },
  { url: `${BASE}presets/puzzle-3.png`, name: '貓咪咖啡館' },
  { url: `${BASE}presets/puzzle-4.png`, name: '賽博街景' },
];

export default function PresetImagesModal({ onClose, onSelect }: Props) {
  const cacheRef = useRef<Map<string, string>>(new Map());
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  async function handleSelect(url: string) {
    if (loadingUrl) return;
    setLoadingUrl(url);
    try {
      if (!cacheRef.current.has(url)) {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(objectUrl);
            cacheRef.current.set(url, canvas.toDataURL('image/jpeg', 0.92));
            resolve();
          };
          img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(); };
          img.src = objectUrl;
        });
      }
      onSelect(cacheRef.current.get(url)!);
      onClose();
    } catch {
      setLoadingUrl(null);
    }
  }

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-300 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-paper-900">內建圖片</h2>
            <p className="text-xs text-paper-600 mt-0.5">點擊圖片即可選用</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-paper-100 hover:bg-paper-300 text-paper-600 hover:text-paper-900 transition-colors font-bold text-lg"
          >
            <Icon name="ic-close" size={18} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.url}
                onClick={() => handleSelect(preset.url)}
                disabled={loadingUrl !== null}
                className="relative rounded-2xl overflow-hidden border-2 border-paper-300 hover:border-brand-500 transition-all group disabled:cursor-not-allowed card-lift"
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-full aspect-square object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/15 transition-all" />
                {/* Name label */}
                <div
                  className="absolute bottom-0 inset-x-0 px-3 py-2 text-sm font-bold text-paper-50 text-center"
                  style={{ background: 'linear-gradient(0deg, rgba(26,20,13,.8) 0%, transparent 100%)' }}
                >
                  {preset.name}
                </div>
                {/* Loading spinner */}
                {loadingUrl === preset.url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-paper-50/70">
                    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
