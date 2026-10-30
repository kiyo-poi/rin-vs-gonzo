import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createMatch, type Match } from '../src/logic/match';
import { comboLabel, gaugeView, phaseMessage } from '../src/render/hud';

const base = createMatch([proto, proto], params);
const withState = (patch: Partial<Match>): Match => ({ ...base, ...patch });

describe('phaseMessage', () => {
  it('開始表示の前半は ROUND n、後半は FIGHT!', () => {
    expect(phaseMessage(withState({ phase: 'intro', phaseFrame: 1, round: 2 }), params)).toBe('ROUND 2');
    expect(phaseMessage(withState({ phase: 'intro', phaseFrame: 60 }), params)).toBe('ROUND 1');
    expect(phaseMessage(withState({ phase: 'intro', phaseFrame: 61 }), params)).toBe('FIGHT!');
  });

  it('対戦中は何も出さない', () => {
    expect(phaseMessage(withState({ phase: 'fight' }), params)).toBeNull();
  });

  it('決着表示', () => {
    const end = (reason: 'ko' | 'timeUp', winner: 0 | 1 | null) =>
      phaseMessage(withState({ phase: 'roundEnd', lastResult: { reason, winner } }), params);
    expect(end('ko', 0)).toBe('K.O.');
    expect(end('ko', null)).toBe('DOUBLE K.O.');
    expect(end('timeUp', 1)).toBe('TIME UP');
    expect(end('timeUp', null)).toBe('DRAW');
  });

  it('試合終了', () => {
    expect(phaseMessage(withState({ phase: 'matchEnd', winner: 0 }), params)).toBe('1P WIN');
    expect(phaseMessage(withState({ phase: 'matchEnd', winner: 1 }), params)).toBe('2P WIN');
    expect(phaseMessage(withState({ phase: 'matchEnd', winner: null }), params)).toBe('DRAW GAME');
  });
});

describe('ゲージ・連続技の表示', () => {
  const f = createMatch([proto, proto], params).battle.fighters[1];
  it('gaugeView：割合、満タンで点滅', () => {
    expect(gaugeView(500, 0, params)).toEqual({ ratio: 0.5, full: false, glow: false });
    expect(gaugeView(params.gauge.max, 0, params)).toEqual({ ratio: 1, full: true, glow: true });
    expect(gaugeView(params.gauge.max, 8, params).glow).toBe(false);
  });
  it('comboLabel：2 ヒット以上で「N HIT」', () => {
    expect(comboLabel({ ...f, combo: { moves: 1, hits: 1 } })).toBeNull();
    expect(comboLabel({ ...f, combo: { moves: 2, hits: 3 } })).toBe('3 HIT');
  });
});
