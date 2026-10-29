import type { Match } from '../logic/match';
import type { Params } from '../logic/types';

/** 画面中央に出す文言（05_screens.md）。出さない時は null */
export function phaseMessage(m: Match, params: Params): string | null {
  switch (m.phase) {
    case 'intro':
      return m.phaseFrame <= params.round.introFrames / 2 ? `ROUND ${m.round}` : 'FIGHT!';
    case 'fight':
      return null;
    case 'roundEnd': {
      const result = m.lastResult;
      if (!result) return null;
      if (result.winner === null) return result.reason === 'ko' ? 'DOUBLE K.O.' : 'DRAW';
      return result.reason === 'ko' ? 'K.O.' : 'TIME UP';
    }
    case 'matchEnd':
      return m.winner === null ? 'DRAW GAME' : `${m.winner + 1}P WIN`;
  }
}
