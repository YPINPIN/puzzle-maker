import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setImage, goToHome } from '../../store/puzzleSlice';

export default function ImageUpload() {
  const dispatch = useDispatch<AppDispatch>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
      dispatch(setImage(canvas.toDataURL('image/jpeg', 0.92)));
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

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="w-full flex items-center">
          <button
            onClick={() => dispatch(goToHome())}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回首頁
          </button>
        </div>

        <div
          className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 text-center">
            拖曳圖片至此，或<span className="text-blue-500 font-medium">點擊上傳</span>
          </p>
          <p className="text-gray-400 text-sm">支援 JPG、PNG、WEBP 等圖片格式（透明背景自動填白）</p>
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
