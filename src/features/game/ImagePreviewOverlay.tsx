import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { toggleImagePreview } from '../../store/puzzleSlice';

export default function ImagePreviewOverlay() {
  const dispatch = useDispatch<AppDispatch>();
  const referenceDataUrl = useSelector((s: RootState) => s.puzzle.referenceDataUrl);
  const show = useSelector((s: RootState) => s.puzzle.showImagePreview);

  if (!show || !referenceDataUrl) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/70"
      onClick={() => dispatch(toggleImagePreview())}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={referenceDataUrl}
          alt="參考圖"
          className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
          style={{ minWidth: 200 }}
        />
        <button
          onClick={() => dispatch(toggleImagePreview())}
          className="absolute -top-3 -right-3 w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
