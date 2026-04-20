import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { goToHome, goToUpload, backToConfig, resetGame } from '../../store/puzzleSlice';

export function usePhaseHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const isFirstRender = useRef(true);

  // 每次 phase 變化都 push 一筆 history entry（初次用 replaceState）
  // popstate 觸發 dispatch → phase 改變 → 這裡再 push，同時清除所有 forward history
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      history.replaceState({ phase }, '');
      return;
    }
    history.pushState({ phase }, '');
  }, [phase]);

  useEffect(() => {
    const onPopState = () => {
      switch (phaseRef.current) {
        case 'upload':   dispatch(goToHome());     break;
        case 'config':   dispatch(goToUpload());   break;
        case 'crop':     dispatch(backToConfig());  break;
        case 'playing':  dispatch(resetGame());    break;
        case 'complete': dispatch(resetGame());    break;
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dispatch]);
}
