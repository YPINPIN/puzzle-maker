import { useEffect } from 'react';
import { startMusic, stopMusic, isMuted, pauseForBackground, resumeFromBackground } from '../../lib/soundEngine';

export function useBackgroundMusic(): void {
  useEffect(() => {
    if (!isMuted()) startMusic();
    const onVisibility = () => {
      if (document.hidden) pauseForBackground();
      else resumeFromBackground();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopMusic();
    };
  }, []);
}
