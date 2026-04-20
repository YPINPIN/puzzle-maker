import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { goToHome, goToUpload, backToConfig, resetGame } from '../../store/puzzleSlice';

export function usePhaseHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // true 期間是由 popstate 觸發的 phase 變化，不應再 push 新 entry
  const navigatingRef = useRef(false);

  // 初次 render 用 replaceState（不多推一層），後續 phase 變化才 pushState
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      history.replaceState({ phase }, '');
      return;
    }
    if (navigatingRef.current) {
      navigatingRef.current = false;
      return;
    }
    history.pushState({ phase }, '');
  }, [phase]);

  useEffect(() => {
    const onPopState = () => {
      navigatingRef.current = true;
      switch (phaseRef.current) {
        case 'upload':   dispatch(goToHome());    break;
        case 'config':   dispatch(goToUpload());  break;
        case 'crop':     dispatch(backToConfig()); break;
        case 'playing':  dispatch(resetGame());   break;
        case 'complete': dispatch(resetGame());   break;
        default: navigatingRef.current = false;   break;
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dispatch]);
}
