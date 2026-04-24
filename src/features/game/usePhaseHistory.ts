import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { goToHome, goToUpload, backToConfig, resetGame } from '../../store/puzzleSlice';

const PHASE_ORDER = ['home', 'upload', 'config', 'crop', 'playing', 'complete'];

export function usePhaseHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const isBackNav = useRef(false);
  // 正在 undo 一段 forward/stale entries，需連續往回走直到找到合法 entry
  const isUndoingForward = useRef(false);

  // 每次向前進入非 home phase 各 push 一筆 entry（含 phase 供方向偵測）
  // back 觸發的 phase 變化由 isBackNav flag 跳過，避免重複 push
  useEffect(() => {
    if (isBackNav.current) {
      isBackNav.current = false;
      return;
    }
    if (phase === 'home') return;
    history.pushState({ puzzle: true, phase }, '', '#app');
  }, [phase]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as { puzzle?: boolean; phase?: string } | null;
      const storedIdx = state?.phase ? PHASE_ORDER.indexOf(state.phase) : -1;
      const currentIdx = PHASE_ORDER.indexOf(phaseRef.current);

      // 正在 undo forward/stale：繼續往回走，直到 storedIdx <= currentIdx
      if (isUndoingForward.current) {
        if (storedIdx > currentIdx) {
          history.back();
        } else {
          // 已回到正確位置，停止並取消（不 dispatch）
          isUndoingForward.current = false;
        }
        return;
      }

      // 抵達 app_url（無 puzzle state）
      if (!state?.puzzle) {
        if (phaseRef.current !== 'home') {
          isBackNav.current = true;
          dispatch(goToHome());
        }
        return;
      }

      // storedIdx > currentIdx：forward 導航或 stale 舊 session entry → undo
      if (storedIdx > currentIdx) {
        isUndoingForward.current = true;
        history.back();
        return;
      }

      // 合法的 backward navigation
      isBackNav.current = true;
      switch (phaseRef.current) {
        case 'upload':   dispatch(goToHome());     break;
        case 'config':   dispatch(goToUpload());   break;
        case 'crop':     dispatch(backToConfig()); break;
        case 'playing':
        case 'complete': dispatch(resetGame());    break;
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dispatch]);
}
