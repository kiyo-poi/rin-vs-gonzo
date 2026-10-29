import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createMatch, type Match } from '../src/logic/match';
import { phaseMessage } from '../src/render/hud';

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
