import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { clashRecoil, createFighter, stepFighter } from '../src/logic/fighter';
import { knockbackDirection } from '../src/logic/battle';
import type { Fighter } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

function play(
  n: number,
  inputsAt: (i: number) => [ReturnType<typeof inputOf>, ReturnType<typeof inputOf>],
  xs: [number, number] = [400, 500],
): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([proto, proto], params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputsAt(i), params);
    result.push(b);
  }
  return result;
}

describe('相打ち', () => {
  it('同じフレームに当て合うと両者ダメージなしで弾かれ、16F 動けない', () => {
    const punchAt22 = inputOf([], ['punch']);
    const t = play(22, (i) =>
      i === 1 ? [inputOf([], ['punch']), inputOf([], ['punch'])] : i === 22 ? [punchAt22, NONE] : [NONE, NONE],
    );
    expect(t[4].events).toEqual([{ type: 'clash' }]);
    expect(t[4].fighters.map((f) => f.health)).toEqual([850, 850]);
    expect(t[4].fighters.map((f) => f.state)).toEqual([
      { name: 'recoil', frame: 0, duration: 16 },
      { name: 'recoil', frame: 0, duration: 16 },
    ]);
    expect(t[4].fighters.map((f) => f.x)).toEqual([400, 500]);
    expect(t[20].fighters[0].state.name).toBe('recoil');
    expect(t[21].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });

  it('相打ちの片方が空中なら、空中の側は空中技だけ消えて落ち続け、着地は普通（着地の隙あり）', () => {
    let f = createFighter(proto, 400, 1);
    f = stepFighter(f, inputOf(['up']), 900, params);
    for (let i = 2; i <= 10; i++) f = stepFighter(f, i === 10 ? inputOf([], ['punch']) : NONE, 900, params);
    expect(f.state).toMatchObject({ name: 'air', attack: { move: 'airPunch' }, used: 'airPunch' });
    const clashed = clashRecoil(f, params);
    expect(clashed.moveHasHit).toBe(true);
    expect(clashed.state).toMatchObject({ name: 'air', attack: null, used: 'airPunch' });
    let g = clashed;
    for (let i = 11; i <= 38; i++) g = stepFighter(g, NONE, 900, params);
    expect(g.state.name).toBe('air');
    g = stepFighter(g, NONE, 900, params);
    expect(g.state).toEqual({ name: 'landing', frame: 1, duration: 4 });
  });

  it('地上 vs 空中の相打ち：空中の側も 16F 動けず、地上の側より先に動けない', () => {
    // 2P は1F目にジャンプし、24F目に空中パンチ。1P は29F目のジャブ。34F目に両方の攻撃が届いて相打ち
    const t = play(60, (i) => [
      i === 29 ? inputOf([], ['punch']) : NONE,
      i === 1 ? inputOf([], ['up']) : i === 24 ? inputOf([], ['punch']) : NONE,
    ], [400, 470]);
    const clashAt = t.findIndex((b) => b.events.some((e) => e.type === 'clash')) + 1;
    expect(clashAt).toBe(34);
    expect(t[clashAt - 1].fighters[1].state.name).toBe('air');
    // 動ける（待機に戻る）最初のフレーム
    const free = (who: 0 | 1) => t.findIndex((b, i) => i >= clashAt && b.fighters[who].state.name === 'idle') + 1;
    expect(free(0)).toBe(clashAt + 17);
    expect(free(1)).toBeGreaterThanOrEqual(free(0));
  });

  it('空中の clashRecoil は recoilLeft を入れ、空中のフレームごとに 1 ずつ減らす', () => {
    const air = { ...createFighter(proto, 400, 1), y: 50, state: { name: 'air', frame: 5, dir: 0, attack: { move: 'airPunch', frame: 3 }, used: 'airPunch', recoilLeft: 0 } } as Fighter;
    const clashed = clashRecoil(air, params);
    expect(clashed.state).toMatchObject({ name: 'air', attack: null, used: 'airPunch', recoilLeft: 16 });
    const next = stepFighter(clashed, NONE, 900, params);
    expect(next.state).toMatchObject({ name: 'air', recoilLeft: 15 });
  });

  it('地上の clashRecoil は recoil 状態にする', () => {
    const f = clashRecoil(createFighter(proto, 400, 1), params);
    expect(f.state).toEqual({ name: 'recoil', frame: 0, duration: 16 });
    expect(f.moveHasHit).toBe(true);
  });
});

describe('knockbackDirection', () => {
  it('相手が右なら 1、左なら -1、同じ位置なら攻撃側の向き', () => {
    const right = createFighter(proto, 400, 1);
    expect(knockbackDirection(right, createFighter(proto, 500, -1))).toBe(1);
    expect(knockbackDirection(right, createFighter(proto, 300, -1))).toBe(-1);
    expect(knockbackDirection(right, createFighter(proto, 400, -1))).toBe(1);
    expect(knockbackDirection(createFighter(proto, 400, -1), createFighter(proto, 400, 1))).toBe(-1);
  });
});
