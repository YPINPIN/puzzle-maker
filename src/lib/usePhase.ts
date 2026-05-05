import { useLocation } from 'react-router';
import type { GamePhase } from '../types/puzzle';

const ROUTE_TO_PHASE: Record<string, GamePhase> = {
  '/':        'home',
  '/upload':  'upload',
  '/config':  'config',
  '/crop':    'crop',
  '/play':    'playing',
};

export function usePhase(): GamePhase {
  const { pathname } = useLocation();
  return ROUTE_TO_PHASE[pathname] ?? 'home';
}
