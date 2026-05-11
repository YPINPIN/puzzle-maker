import { useNavigate, useBlocker, Navigate, useOutletContext } from 'react-router';
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { pauseGame, resumeGame, resetGame } from '../../store/puzzleSlice';
import { useGameDraft } from './useGameDraft';
import { saveRecord, isTutorialDone } from '../../lib/records';
import { saveImage } from '../../lib/imageCache';
import ConfirmDialog, { HiAccent } from '../../components/ConfirmDialog';
import type { AppLayoutOutletContext } from '../layout/AppLayout';
import CompletionOverlay from '../complete/CompletionOverlay';
import { useTutorial } from '../tutorial/useTutorial';

const PuzzleBoard = lazy(() => import('./PuzzleBoard'));

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef:   React.RefObject<Map<number, Path2D>>;
};

export default function PlayRoute({ canvasMapRef, pathMapRef }: Props) {
  const dispatch    = useDispatch<AppDispatch>();
  const navigate    = useNavigate();
  const { saveNow } = useGameDraft();
  const isComplete  = useSelector((s: RootState) => s.puzzle.isComplete);
  const startTime   = useSelector((s: RootState) => s.puzzle.startTime);
  const pieces      = useSelector((s: RootState) => s.puzzle.pieces);
  const configId    = useSelector((s: RootState) => s.puzzle.configId);
  const difficulty  = useSelector((s: RootState) => s.puzzle.difficulty);
  const cols        = useSelector((s: RootState) => s.puzzle.cols);
  const rows        = useSelector((s: RootState) => s.puzzle.rows);
  const referenceDataUrl = useSelector((s: RootState) => s.puzzle.referenceDataUrl);

  const { leaveHandlerRef } = useOutletContext<AppLayoutOutletContext>();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const handleAnimationEnd = useCallback(() => setOverlayVisible(true), []);

  const { phase: tutorialPhase } = useTutorial();

  // 教學整合：mount 時若教學進行中則暫停計時；play→inactive 時恢復並補存初始資料
  const prevTutorialPhase = useRef<string | null>(null);
  useEffect(() => {
    if (prevTutorialPhase.current === null) {
      // 首次執行（mount）：教學進行中則暫停計時
      if (tutorialPhase === 'play' && startTime) dispatch(pauseGame());
    } else if (prevTutorialPhase.current === 'play' && tutorialPhase === 'inactive') {
      // 教學完成：恢復計時，並補存首次快捷設定與草稿
      dispatch(resumeGame());
      if (isTutorialDone()) {
        if (configId && referenceDataUrl) {
          saveRecord({ id: configId, createdAt: Date.now(), difficulty, cols, rows, isCompleted: false, bestTimeMs: 0 });
          saveImage(configId, referenceDataUrl);
        }
        saveNow();
      }
    }
    prevTutorialPhase.current = tutorialPhase;
  }, [tutorialPhase, startTime, dispatch, saveNow, configId, difficulty, cols, rows, referenceDataUrl]);

  // ref 供 blocker callback（非 render 路徑）讀取；state 供 render guard 讀取
  const confirmedLeaveRef = useRef(false);
  const [confirmedLeave, setConfirmedLeave] = useState(false);

  const markConfirmedLeave = useCallback(() => {
    confirmedLeaveRef.current = true;
    setConfirmedLeave(true);
  }, []);

  // 離開確認：僅在遊戲未完成且未確認離開時攔截
  const blocker = useBlocker(
    useCallback(() => {
      if (confirmedLeaveRef.current) return false;
      return !isComplete;
    }, [isComplete])
  );

  // blocker 觸發時自動暫存 + 暫停；教學進行中靜默攔截，不顯示離開 Dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (tutorialPhase === 'play') {
        blocker.reset?.();
        return;
      }
      saveNow();
      dispatch(pauseGame());
    }
  }, [blocker, tutorialPhase, saveNow, dispatch]);

  // 向 AppHeader 暴露 leave handler（先設確認旗標再 navigate，讓 blocker 放行）
  useEffect(() => {
    leaveHandlerRef.current = () => {
      markConfirmedLeave();
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-idx); else navigate('/');
    };
    return () => { leaveHandlerRef.current = null; };
  }, [navigate, leaveHandlerRef, markConfirmedLeave]);

  // Guard：無遊戲狀態時重導回首頁（confirmedLeave 為 true 時代表正在主動離開，不觸發）
  if (!pieces.length && !isComplete && !confirmedLeave) return <Navigate to="/" replace />;

  const handleConfirm = () => {
    saveNow();
    markConfirmedLeave();
    dispatch(resetGame());
    blocker.reset?.();
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-idx); else navigate('/');
  };

  const handleLeave = () => { markConfirmedLeave(); };

  const handleCancel = () => {
    dispatch(resumeGame());
    blocker.reset?.();
  };

  return (
    <>
      <Suspense fallback={null}>
        <PuzzleBoard canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} onAnimationEnd={handleAnimationEnd} />
      </Suspense>
      {overlayVisible && <CompletionOverlay onLeave={handleLeave} />}
      {blocker.state === 'blocked' && tutorialPhase !== 'play' && (
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
