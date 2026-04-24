import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { goToHome, goToUpload, backToConfig, resetGame } from '../../store/puzzleSlice';

export function usePhaseHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // 是否有 backstop entry 存在：離開 home 時 push 一筆，回到 home 時清除
  const hasBackstop = useRef(false);

  // 只在第一次離開 home 時 push 一筆 backstop（後續 forward 不再 push）
  useEffect(() => {
    if (phase === 'home') {
      hasBackstop.current = false;
      return;
    }
    if (!hasBackstop.current) {
      hasBackstop.current = true;
      history.pushState({ puzzle: true }, '');
    }
  }, [phase]);

  useEffect(() => {
    const onPopState = () => {
      let goesToHome = false;
      switch (phaseRef.current) {
        case 'upload':   dispatch(goToHome());    goesToHome = true; break;
        case 'config':   dispatch(goToUpload());  break;
        case 'crop':     dispatch(backToConfig()); break;
        case 'playing':
        case 'complete': dispatch(resetGame());   goesToHome = true; break;
      }
      if (!goesToHome) {
        // 重新 push backstop，清除 forward history，維持在 app 內
        history.pushState({ puzzle: true }, '');
        hasBackstop.current = true;
      } else {
        // 回到 home：不重新 push，ptr 停在 app_url，再按一次 back 即離開 app
        hasBackstop.current = false;
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dispatch]);
}
