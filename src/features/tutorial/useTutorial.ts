import { useContext } from 'react';
import { TutorialContext } from './tutorialContext';

export function useTutorial() {
  return useContext(TutorialContext);
}
