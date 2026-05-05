import { Outlet } from 'react-router';
import { Suspense, useEffect, useRef } from 'react';
import AppHeader from './AppHeader';
import { usePreventForwardNav } from '../../lib/usePreventForwardNav';
import { useBackgroundMusic } from '../game/useBackgroundMusic';
import { playClick } from '../../lib/soundEngine';
import { initImageCache, migrateToImageCache } from '../../lib/imageCache';

export type AppLayoutOutletContext = {
  leaveHandlerRef: React.MutableRefObject<(() => void) | null>;
};

export default function AppLayout() {
  usePreventForwardNav();
  useBackgroundMusic();

  const leaveHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    migrateToImageCache();
    initImageCache();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) playClick();
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <div className="flex flex-col w-screen overflow-hidden overscroll-none" style={{ height: '100dvh' }}>
      <AppHeader leaveHandlerRef={leaveHandlerRef} />
      <div className="flex-1 overflow-hidden min-h-0">
        <Suspense fallback={null}>
          <Outlet context={{ leaveHandlerRef } satisfies AppLayoutOutletContext} />
        </Suspense>
      </div>
    </div>
  );
}
