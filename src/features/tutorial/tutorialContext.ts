import { createContext } from 'react';

export type TutorialPhase = 'inactive' | 'home' | 'upload' | 'config' | 'crop' | 'play';

export interface TutorialContextValue {
  phase: TutorialPhase;
  homeStep: number;
  playStep: number;
  midStepDone: boolean;
  nextHomeStep: () => void;
  nextPlayStep: () => void;
  advanceMidStep: () => void;
  endPlayTutorial: () => void;
}

export const TutorialContext = createContext<TutorialContextValue>({
  phase: 'inactive',
  homeStep: 0,
  playStep: 0,
  midStepDone: false,
  nextHomeStep: () => {},
  nextPlayStep: () => {},
  advanceMidStep: () => {},
  endPlayTutorial: () => {},
});
