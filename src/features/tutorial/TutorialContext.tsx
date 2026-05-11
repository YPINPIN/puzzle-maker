import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { isNewUser } from '../../lib/records';
import { TutorialContext } from './tutorialContext';
import type { TutorialPhase } from './tutorialContext';

const TUTORIAL_DONE_KEY = 'puzzle-tutorial-done';

const HOME_LAST_STEP = 4;
const PLAY_LAST_STEP = 9;

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [tutorialDone, setTutorialDone] = useState<boolean>(() => {
    if (localStorage.getItem(TUTORIAL_DONE_KEY)) return true;
    if (!isNewUser()) {
      localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
      return true;
    }
    return false;
  });

  const [homeStep, setHomeStep] = useState(0);
  const [playStep, setPlayStep] = useState(0);

  // midStepDone 在切換頁面時重置（render-phase 派生狀態更新）
  const [midStepDone, setMidStepDone] = useState(false);
  const [midStepPathname, setMidStepPathname] = useState(location.pathname);
  if (!tutorialDone && midStepPathname !== location.pathname) {
    setMidStepPathname(location.pathname);
    setMidStepDone(false);
  }

  // 從 URL 直接推導 phase，無需 effect 或 playTutorialActive 旗標
  let phase: TutorialPhase = 'inactive';
  if (!tutorialDone) {
    if (location.pathname === '/') phase = 'home';
    else if (location.pathname === '/upload') phase = 'upload';
    else if (location.pathname === '/config') phase = 'config';
    else if (location.pathname === '/crop') phase = 'crop';
    else if (location.pathname === '/play') phase = 'play';
  }

  const nextHomeStep = useCallback(() => {
    if (homeStep < HOME_LAST_STEP) {
      setHomeStep((s) => s + 1);
    } else {
      // 只導航，phase 由 URL 推導自動轉換為 'upload'
      navigate('/upload');
    }
  }, [homeStep, navigate]);

  const nextPlayStep = useCallback(() => {
    if (playStep < PLAY_LAST_STEP) {
      setPlayStep((s) => s + 1);
    } else {
      setTutorialDone(true);
      localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    }
  }, [playStep]);

  const advanceMidStep = useCallback(() => {
    setMidStepDone(true);
  }, []);

  const endPlayTutorial = useCallback(() => {
    setTutorialDone(true);
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
  }, []);

  return (
    <TutorialContext.Provider value={{ phase, homeStep, playStep, midStepDone, nextHomeStep, nextPlayStep, advanceMidStep, endPlayTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}
