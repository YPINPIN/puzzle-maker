import { useEffect } from 'react';
import { startMusic, stopMusic, isMuted } from '../../lib/soundEngine';

export function useBackgroundMusic(): void {
  useEffect(() => {
    if (!isMuted()) startMusic();
    return () => stopMusic();
  }, []);
}
