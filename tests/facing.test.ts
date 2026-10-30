import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle } from '../src/logic/battle';
import { createFighter, faceOpponent } from '../src/logic/fighter';
import type { Fighter } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

describe('押し合いの後の振り向き', () => {
  it('飛び越えて着地した時、入れ替わっても2人とも相手の方を向く', () => {
    let b = createBattle([proto, proto], params, [400, 607]);
    for (let i = 1; i <= 39; i++) {
      const a = i === 1 ? inputOf(['right'], ['up']) : i === 39 ? inputOf([], ['punch']) : NONE;
      const c = i === 39 ? inputOf(['right']) : NONE;
      b = stepBattle(b, [a, c], params);
    }
    const [a, c] = b.fighters;
    expect(a.x).toBeLessThan(c.x);
    expect(a.state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
    expect(a.facing).toBe(1);
    expect(c.facing).toBe(-1);
  });
});

describe('着地の瞬間の振り向き', () => {
  it('空中攻撃で相手を飛び越えたら、着地のフレームに相手の方を向く（空中では向かない）', () => {
    let b = createBattle([proto, proto], params, [400, 470]);
    const facings: number[] = [];
    for (let i = 1; i <= 39; i++) {
      const a = i === 1 ? inputOf(['right'], ['up']) : i === 10 ? inputOf([], ['punch']) : NONE;
      b = stepBattle(b, [a, NONE], params);
      facings.push(b.fighters[0].facing);
    }
    const [a, c] = b.fighters;
    expect(a.state).toEqual({ name: 'landing', frame: 1, duration: 4 });
    expect(a.x).toBeGreaterThan(c.x);
    expect(facings[37]).toBe(1);
    expect(a.facing).toBe(-1);
  });

  it('着地の隙の2F目以降は振り向かない', () => {
    const landing = (frame: number) => ({ ...createFighter(proto, 400, 1), state: { name: 'landing', frame, duration: 4 } }) as Fighter;
    expect(faceOpponent(landing(1), 300).facing).toBe(-1);
    expect(faceOpponent(landing(2), 300).facing).toBe(1);
  });
});

describe('faceOpponent', () => {
  const at = (state: object): Fighter => ({ ...createFighter(proto, 400, 1), ...state }) as Fighter;

  it('振り向ける状態では相手の方を向く', () => {
    expect(faceOpponent(at({ state: { name: 'idle', frame: 3 } }), 300).facing).toBe(-1);
    expect(faceOpponent(at({ state: { name: 'attack', frame: 1, move: 'punch' } }), 300).facing).toBe(-1);
    expect(faceOpponent(at({ state: { name: 'jumpSquat', frame: 1, dir: 0 } }), 300).facing).toBe(-1);
  });

  it('空中・技の途中・のけぞり・ガード硬直では振り向かない', () => {
    for (const state of [
      { name: 'air', frame: 5, dir: 0 },
      { name: 'attack', frame: 2, move: 'punch' },
      { name: 'jumpSquat', frame: 2, dir: 0 },
      { name: 'hitstun', frame: 1, duration: 14, crouch: false },
      { name: 'blockstun', frame: 1, duration: 10, crouch: false },
    ]) {
      expect(faceOpponent(at({ state }), 300).facing).toBe(1);
    }
  });

  it('同じ位置なら向きを変えない', () => {
    expect(faceOpponent(at({ state: { name: 'idle', frame: 1 } }), 400).facing).toBe(1);
  });
});
