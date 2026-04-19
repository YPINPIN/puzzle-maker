import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setImage, goToHome } from '../../store/puzzleSlice';

export default function ImageUpload() {
  const dispatch = useDispatch<AppDispatch>();
  const imageDataUrl = useSelector((s: RootState) => s.puzzle.imageDataUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(imageDataUrl);

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      setPendingImageUrl(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleConfirm() {
    if (pendingImageUrl) dispatch(setImage(pendingImageUrl));
  }

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
          onClick={() => dispatch(goToHome())}
          className="text-paper-400 text-sm font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          style={{ background: '#3A2F25', border: '1px solid #5A4B38' }}
        >
          ← 返回首頁
        </button>
        <div className="w-9" />
        <button
          onClick={handleConfirm}
          disabled={!pendingImageUrl}
          className="btn-primary text-sm px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          確定圖片
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <h1 className="text-2xl font-black text-paper-900 tracking-tight">上傳圖片</h1>
          {pendingImageUrl ? (
            <div
              className={`w-full rounded-3xl overflow-hidden cursor-pointer border-2 transition-all ${
                isDragOver ? 'border-accent-500 scale-[1.01]' : 'border-brand-500/50 hover:border-brand-500'
              }`}
              style={{ boxShadow: 'inset 0 0 0 6px var(--color-paper-50), 0 0 0 3px var(--color-brand-50)' }}
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <div className="relative">
                <img
                  src={pendingImageUrl}
                  alt="已選圖片"
                  className="w-full max-h-72 object-contain bg-paper-900"
                />
                <div
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none"
                  style={{ background: 'rgba(26,20,13,.75)', color: 'var(--color-paper-300)', border: '1px solid #5A4B38' }}
                >
                  點擊或拖放更換圖片
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`w-full border-2 border-dashed rounded-3xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                isDragOver
                  ? 'border-accent-500 bg-accent-500/10 scale-[1.01]'
                  : 'border-brand-500/50 bg-paper-100 hover:border-brand-500 hover:bg-brand-50/50'
              }`}
              style={{ boxShadow: 'inset 0 0 0 6px var(--color-paper-50), 0 0 0 3px var(--color-brand-50)' }}
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-50), var(--color-paper-50))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8), 0 6px 14px rgba(244,165,43,.2)',
                }}
              >🧩</div>
              <p className="text-paper-900 text-lg font-extrabold text-center">把圖片拖到這裡</p>
              <p className="text-paper-800 text-sm">或<span className="text-brand-600 font-bold cursor-pointer">點擊上傳</span>你的照片</p>
              <div
                className="inline-flex items-center gap-2 text-xs rounded-full px-3 py-1.5 font-medium"
                style={{ background: 'var(--color-paper-100)', color: 'var(--color-paper-600)' }}
              >
                <span>支援 JPG · PNG · WEBP</span>
                <span>·</span>
                <span>透明背景自動補白</span>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
}
