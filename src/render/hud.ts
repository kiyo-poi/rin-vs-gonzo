import type { Match } from '../logic/match';
import type { Fighter, Params } from '../logic/types';

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

/** 超必殺ゲージの見た目（05_screens.md：下部の左右、満タンで光る）。glow は満タンの時だけ 8F ごとに点滅 */
export function gaugeView(gauge: number, frame: number, params: Params): { ratio: number; full: boolean; glow: boolean } {
  const ratio = Math.max(0, Math.min(1, gauge / params.gauge.max));
  const full = gauge >= params.gauge.max;
  return { ratio, full, glow: full && Math.floor(frame / 8) % 2 === 0 };
}

/** 連続技の表示（「N HIT」）。守る側が 2 ヒット以上受けている時だけ。出さない時は null */
export function comboLabel(defender: Fighter): string | null {
  return defender.combo.hits >= 2 ? `${defender.combo.hits} HIT` : null;
}

/** 投げられている間は少し持ち上げて描く（px） */
export const THROWN_LIFT = 30;
