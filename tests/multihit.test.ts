import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { activeHitbox, createFighter, getMove, isAirborne, stepFighter } from '../src/logic/fighter';
import type { CharacterData } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** パンチを3発の当たり（持続の1・2・3F目）にしたキャラ。発生4・持続3 */
const jab = proto.moves.punch.hits[0];
const multi: CharacterData = {
  ...proto,
  moves: {
    ...proto.moves,
    punch: {
      ...proto.moves.punch,
      startup: 4,
      active: 3,
      hits: [1, 2, 3].map((n) => ({ ...jab, frames: { from: n, to: n } })),
    },
  },
};

function play(n: number): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([multi, proto], params, [400, 470]);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, [i === 1 ? inputOf([], ['punch']) : NONE, NONE], params);
    result.push(b);
  }
  return result;
}

describe('多段技', () => {
  it('多段技は持続の各区間で1回ずつ当たる', () => {
    const t = play(20);
    const hitFrames = t.map((b, i) => (b.events.some((e) => e.type === 'hit') ? i + 1 : -1)).filter((i) => i > 0);
    expect(hitFrames).toEqual([5, 6, 7]);
    expect(t.flatMap((b) => b.events).filter((e) => e.type === 'hit')).toHaveLength(3);
    expect(t[19].fighters[1].health).toBe(850 - 90);
  });

  it('当たった当たりは同じ技の間は二度と当たらない', () => {
    const t = play(20);
    expect(t[6].fighters[0].hitDone).toEqual([true, true, true]);
    expect(activeHitbox(t[6].fighters[0])).toBeNull();
    // 1発目だけ済みなら、次に返るのは2発目
    expect(activeHitbox({ ...t[5].fighters[0], hitDone: [true, false, false] })?.index).toBe(1);
    expect(t.slice(7).every((b) => b.events.length === 0)).toBe(true);
  });

  it('技を始めた時の hitDone は hits と同じ長さで全部 false', () => {
    expect(play(1)[0].fighters[0].hitDone).toEqual([false, false, false]);
  });
});

describe('isAirborne', () => {
  it('y が 0 より大きい技の途中は空中扱い', () => {
    const f = createFighter(proto, 400, 1);
    expect(isAirborne({ ...f, y: 30, state: { name: 'attack', frame: 3, move: 'punch' } })).toBe(true);
    expect(isAirborne(f)).toBe(false);
  });

  it('air・airHit の状態は y が 0 でも空中扱い', () => {
    const f = createFighter(proto, 400, 1);
    expect(isAirborne({ ...f, state: { name: 'airHit', frame: 0 } })).toBe(true);
    expect(isAirborne(stepFighter(f, inputOf(['up']), 900, params))).toBe(false);
  });
});

describe('getMove', () => {
  const withSub: CharacterData = { ...proto, subMoves: { counter: { ...proto.moves.punch, name: '反撃' } } };

  it('moves も subMoves も引ける', () => {
    expect(getMove(withSub, 'punch')).toBe(proto.moves.punch);
    expect(getMove(withSub, 'counter').name).toBe('反撃');
  });

  it('無い名前は例外', () => {
    expect(() => getMove(withSub, 'nothing')).toThrow();
  });
});
