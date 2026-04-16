import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setImage, setReferenceImage, setPieces, setCurrentGameId, startGame } from '../../store/puzzleSlice';
import { generatePieces } from '../../lib/pieceFactory';
import { TOOLBAR_HEIGHT } from '../../lib/constants';
import type { PuzzleRecord } from '../../lib/records';
import RecordsModal from './RecordsModal';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

export default function ImageUpload({ canvasMapRef, pathMapRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      dispatch(setImage(dataUrl));
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

  const applyRecord = useCallback(async (record: PuzzleRecord) => {
    if (!record.croppedImageDataUrl || isReplaying) return;
    setIsReplaying(true);

    try {
      const viewH = window.innerHeight - TOOLBAR_HEIGHT;
      const viewW = window.innerWidth;
      const canvasSize = 2 * Math.min(viewW, viewH);

      const result = await generatePieces(
        record.croppedImageDataUrl,
        record.cols,
        record.rows,
        viewW,
        viewH,
        canvasSize,
        // cropRegion 省略 → 使用完整圖片（裁切圖已是正確區域）
      );

      canvasMapRef.current.clear();
      result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
      pathMapRef.current.clear();
      result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

      // 沿用原紀錄 ID（不建立新紀錄，完成後只在破紀錄時更新）
      dispatch(setReferenceImage(record.croppedImageDataUrl));
      dispatch(setPieces({
        pieces: result.pieces,
        rows: result.rows,
        cols: result.cols,
        boardH: canvasSize,
        pieceW: result.pieceW,
        pieceH: result.pieceH,
        puzzleOffsetX: result.puzzleOffsetX,
        puzzleOffsetY: result.puzzleOffsetY,
      }));
      dispatch(setCurrentGameId(record.id));
      dispatch(startGame());
    } finally {
      setIsReplaying(false);
    }
  }, [canvasMapRef, pathMapRef, dispatch, isReplaying]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="w-full flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gray-800">拼圖樂</h1>
          <button
            onClick={() => setShowRecords(true)}
            className="px-4 py-2 text-sm bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors shadow-sm"
          >
            歷史紀錄
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

        {isReplaying && (
          <p className="text-sm text-blue-500 animate-pulse">正在載入遊戲…</p>
        )}
      </div>

      {showRecords && (
        <RecordsModal
          onClose={() => setShowRecords(false)}
          onApply={applyRecord}
        />
      )}
    </div>
  );
}
