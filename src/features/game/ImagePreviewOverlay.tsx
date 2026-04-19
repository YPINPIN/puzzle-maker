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
      className="fixed inset-0 z-30 flex items-center justify-center p-8 sm:p-6"
      style={{ background: 'rgba(13,9,6,.85)' }}
      onClick={() => dispatch(toggleImagePreview())}
    >
      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={referenceDataUrl}
          alt="參考圖"
          className="max-w-full max-h-[calc(100vh-4rem)] sm:max-h-[85vh] rounded-2xl object-contain"
          style={{
            boxShadow: '0 0 0 2px #B96A00, 0 0 0 4px #7C4500, 0 30px 60px rgba(0,0,0,.7)',
          }}
        />
        <button
          onClick={() => dispatch(toggleImagePreview())}
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-lg hover:brightness-110 transition-all text-paper-900"
          style={{
            background: 'linear-gradient(180deg, #F6B641, #E08A10)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 3px 0 #9E5A00, 0 6px 12px rgba(0,0,0,.5)',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
