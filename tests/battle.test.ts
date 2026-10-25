import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (frame: number) => [InputFrame, InputFrame];

/** frame番目（1始まり）の入力で n フレーム進め、各フレームの結果を記録する */
function play(xs: [number, number], n: number, inputsAt: Inputs): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([proto, proto], params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputsAt(i), params);
    result.push(b);
  }
  return result;
}

const p1PunchAtFirst: Inputs = (i) => [i === 1 ? inputOf([], ['punch']) : NONE, NONE];

describe('createBattle', () => {
  it('ステージ中央から左右に離れて、向かい合って始まる', () => {
    const b = createBattle([proto, proto], params);
    expect(b.fighters.map((f) => f.x)).toEqual([400, 880]);
    expect(b.fighters.map((f) => f.facing)).toEqual([1, -1]);
  });
});

describe('ヒット', () => {
  const t = play([400, 500], 20, p1PunchAtFirst); // t[0] が1F目

  it('4F目までは当たらず、5F目に当たって体力が 30 減る', () => {
    expect(t[3].fighters[1].health).toBe(850);
    expect(t[4].fighters[1].health).toBe(820);
    expect(t[4].events).toEqual([{ type: 'hit', attacker: 0, damage: 30 }]);
  });

  it('1回のパンチは1回だけ当たる', () => {
    expect(t[13].fighters[1].health).toBe(820);
    expect(t.flatMap((b) => b.events)).toHaveLength(1);
  });

  it('当たった相手はのけぞる（軽：14F）。のけぞりが終わる20F目から動ける', () => {
    expect(t[4].fighters[1].state).toEqual({ name: 'hitstun', frame: 0, duration: 14 });
    const recover = play([400, 500], 20, (i) => [
      i === 1 ? inputOf([], ['punch']) : NONE,
      i >= 6 ? inputOf([], ['punch']) : NONE,
    ]);
    expect(recover[18].fighters[1].state.name).toBe('hitstun');
    expect(recover[19].fighters[1].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });

  it('届かない距離では当たらない', () => {
    const far = play([400, 700], 14, p1PunchAtFirst);
    expect(far[13].fighters[1].health).toBe(850);
  });
});

describe('2P の攻撃', () => {
  it('2P だけがパンチすると、5F目に 1P へ当たる', () => {
    const t = play([400, 500], 5, (i) => [NONE, i === 1 ? inputOf([], ['punch']) : NONE]);
    expect(t[4].fighters[0].health).toBe(820);
    expect(t[4].events).toEqual([{ type: 'hit', attacker: 1, damage: 30 }]);
  });
});

describe('空中で食らう', () => {
  it('空中の相手に当てたら、のけぞると同時に地面へ戻り、浮いたままにならない', () => {
    const t = play([400, 500], 40, (i) => [
      i === 3 ? inputOf([], ['punch']) : NONE,
      i === 1 ? inputOf([], ['up']) : NONE,
    ]);
    const hitIndex = t.findIndex((b) => b.events.some((e) => e.type === 'hit'));
    expect(hitIndex).toBeGreaterThanOrEqual(0);
    expect(t[hitIndex].fighters[1].state.name).toBe('hitstun');
    expect(t[hitIndex].fighters[1].y).toBe(0);
    expect(t[hitIndex + 20].fighters[1].state.name).not.toBe('air');
    expect(t[hitIndex + 20].fighters[1].y).toBe(0);
  });
});

describe('ガード', () => {
  const t = play([400, 500], 14, (i) => [i === 1 ? inputOf([], ['punch']) : NONE, inputOf(['guard'])]);

  it('ガードを押していればパンチで体力が減らない', () => {
    expect(t[13].fighters[1].health).toBe(850);
  });

  it('ガードしたらガード硬直（軽：10F）になる', () => {
    expect(t[4].events).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
    expect(t[4].fighters[1].state).toEqual({ name: 'blockstun', frame: 0, duration: 10 });
  });
});

describe('同時', () => {
  it('同じフレームに当て合えば両方の体力が減る（相打ちのルールは M3）', () => {
    const t = play([400, 500], 5, (i) => (i === 1 ? [inputOf([], ['punch']), inputOf([], ['punch'])] : [NONE, NONE]));
    expect(t[4].fighters.map((f) => f.health)).toEqual([820, 820]);
  });
});
