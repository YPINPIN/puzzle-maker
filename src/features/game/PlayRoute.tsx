import { useNavigate, useBlocker, Navigate, useOutletContext } from 'react-router';
import { useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { pauseGame, resumeGame, resetGame } from '../../store/puzzleSlice';
import { useGameDraft } from './useGameDraft';
import ConfirmDialog, { HiAccent } from '../../components/ConfirmDialog';
import type { AppLayoutOutletContext } from '../layout/AppLayout';

const PuzzleBoard      = lazy(() => import('./PuzzleBoard'));
const CompletionOverlay = lazy(() => import('../complete/CompletionOverlay'));

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef:   React.RefObject<Map<number, Path2D>>;
};

export default function PlayRoute({ canvasMapRef, pathMapRef }: Props) {
  const dispatch    = useDispatch<AppDispatch>();
  const navigate    = useNavigate();
  const { saveNow } = useGameDraft();
  const isComplete  = useSelector((s: RootState) => s.puzzle.isComplete);
  const pieces      = useSelector((s: RootState) => s.puzzle.pieces);
  const { leaveHandlerRef } = useOutletContext<AppLayoutOutletContext>();

  // 用 ref 標記「使用者已確認離開」，讓 blocker callback 放行下一次 navigate
  const confirmedLeaveRef = useRef(false);

  // 離開確認：僅在遊戲未完成且未確認離開時攔截
  const blocker = useBlocker(
    useCallback(() => {
      if (confirmedLeaveRef.current) return false;
      return !isComplete;
    }, [isComplete])
  );

  // blocker 觸發時自動暫存 + 暫停
  useEffect(() => {
    if (blocker.state === 'blocked') {
      saveNow();
      dispatch(pauseGame());
    }
  }, [blocker.state, saveNow, dispatch]);

  // 向 AppHeader 暴露 leave handler（先設確認旗標再 navigate，讓 blocker 放行）
  useEffect(() => {
    leaveHandlerRef.current = () => {
      confirmedLeaveRef.current = true;
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-idx); else navigate('/');
    };
    return () => { leaveHandlerRef.current = null; };
  }, [navigate, leaveHandlerRef]);

  // Guard：無遊戲狀態時重導回首頁（confirmedLeaveRef 為 true 時代表正在主動離開，不觸發）
  if (!pieces.length && !isComplete && !confirmedLeaveRef.current) return <Navigate to="/" replace />;

  const handleConfirm = () => {
    saveNow();
    confirmedLeaveRef.current = true;
    dispatch(resetGame());
    blocker.reset?.();
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-idx); else navigate('/');
  };

  const handleLeave = () => { confirmedLeaveRef.current = true; };

  const handleCancel = () => {
    dispatch(resumeGame());
    blocker.reset?.();
  };

  return (
    <>
      <Suspense fallback={null}>
        <PuzzleBoard canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />
        {isComplete && <CompletionOverlay onLeave={handleLeave} />}
      </Suspense>
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="確定要離開遊戲嗎？"
          message={<>目前進度已自動暫存，回到首頁後可從<HiAccent>「繼續上局」</HiAccent>恢復。</>}
          confirmText="確定離開"
          cancelText="繼續遊戲"
          danger
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
