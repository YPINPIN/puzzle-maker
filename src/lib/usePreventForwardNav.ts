import { useCallback, useLayoutEffect, useRef } from 'react';
import { useBlocker, useLocation } from 'react-router';

export function usePreventForwardNav() {
  const location = useLocation();
  const historyIdxRef = useRef<number>(
    (window.history.state as { idx?: number } | null)?.idx ?? 0
  );

  useLayoutEffect(() => {
    historyIdxRef.current = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  }, [location]);

  const blocker = useBlocker(
    useCallback(({ historyAction }) => {
      if (historyAction !== 'POP') return false;
      const newIdx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      return newIdx > historyIdxRef.current;
    }, [])
  );

  useLayoutEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  }, [blocker.state]);
}
