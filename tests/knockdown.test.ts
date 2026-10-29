import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { isHittable } from '../src/logic/fighter';
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
const at = (i: number) => i - 1;

/** 1P が1F目にしゃがみ足払い（9/3/18・50・ダウン）。2P は何もしない */
const sweep: Inputs = (i) => [i === 1 ? inputOf(['down'], ['kick']) : NONE, NONE];

describe('ダウンと起き上がり', () => {
  it('足払いでダウン：10F目に当たり、11〜50F目はダウン、51F目に起き上がる', () => {
    const t = play([400, 500], 52, sweep);
    expect(t[at(9)].fighters[1].state.name).toBe('idle');
    expect(t[at(10)].events).toEqual([{ type: 'hit', attacker: 0, damage: 50 }]);
    expect(t[at(10)].fighters[1].state).toEqual({ name: 'knockdown', frame: 0, duration: 40 });
    expect(t[at(11)].fighters[1].state).toEqual({ name: 'knockdown', frame: 1, duration: 40 });
    expect(t[at(50)].fighters[1].state).toEqual({ name: 'knockdown', frame: 40, duration: 40 });
    expect(t[at(51)].fighters[1].state.name).toBe('idle');
  });

  it('起き上がってから 6F（51〜56F目）は当たらず、57F目から当たる', () => {
    const t = play([400, 500], 58, sweep);
    for (let i = 11; i <= 50; i++) expect(isHittable(t[at(i)].fighters[1])).toBe(false);
    for (let i = 51; i <= 56; i++) expect(isHittable(t[at(i)].fighters[1])).toBe(false);
    expect(t[at(51)].fighters[1].invincible).toBe(6);
    expect(isHittable(t[at(57)].fighters[1])).toBe(true);
  });

  it('ダウン中は攻撃が重なっても当たらない', () => {
    // 1P の足払いは30F。31F目に押したキック（旋風脚 8/3）は 39〜41F目が攻撃の箱。2P は 535 でダウン中（〜50F目）
    const t = play([400, 500], 45, (i) => [
      i === 1 ? inputOf(['down'], ['kick']) : i === 31 ? inputOf([], ['kick']) : NONE,
      NONE,
    ]);
    expect(t[at(10)].fighters[1].x).toBe(535);
    expect(t[at(41)].fighters[1].state.name).toBe('knockdown');
    expect(t[at(44)].fighters[1].health).toBe(850 - 50);
    expect(t.slice(10).flatMap((b) => b.events)).toEqual([]);
  });
});

describe('空中で食らう', () => {
  /** 2P が1F目に真上ジャンプ、1P が1F目にパンチ */
  const jumpHit: Inputs = (i) => [i === 1 ? inputOf([], ['punch']) : NONE, i === 1 ? inputOf([], ['up']) : NONE];

  it('ジャンプ中の相手に当てると airHit になり、y が毎フレーム 8 ずつ減って、0 に着いたフレームからダウン', () => {
    const t = play([400, 500], 60, jumpHit);
    expect(t[at(5)].events).toEqual([{ type: 'hit', attacker: 0, damage: 30 }]);
    const hit = t[at(5)].fighters[1];
    expect(hit.state).toEqual({ name: 'airHit', frame: 0 });
    expect(hit.y).toBeGreaterThan(0);
    let i = 5;
    let prevY = hit.y;
    while (t[at(i + 1)].fighters[1].state.name === 'airHit') {
      i++;
      expect(t[at(i)].fighters[1].y).toBe(prevY - 8);
      prevY = t[at(i)].fighters[1].y;
    }
    // 次のフレームで y が 0 以下になって着地し、そこからダウン
    expect(prevY).toBeLessThanOrEqual(8);
    expect(t[at(i + 1)].fighters[1]).toMatchObject({ y: 0, state: { name: 'knockdown', frame: 1, duration: 40 } });
  });

  it('落下中は追撃できない：airHit の間は isHittable が false', () => {
    const t = play([400, 500], 60, jumpHit);
    const falling = t.filter((b) => b.fighters[1].state.name === 'airHit');
    expect(falling.length).toBeGreaterThan(3);
    for (const b of falling) expect(isHittable(b.fighters[1])).toBe(false);
  });

  it('空中技を出したあとに食らったら、着地の隙ではなくダウン', () => {
    // 2P は4F目から空中。20F目に空中パンチを出し、下降中（空中技の後隙）に 1P の30F目のパンチ（34F目に当たる）を食らう
    const t = play([400, 500], 90, (i) => [
      i === 30 ? inputOf([], ['punch']) : NONE,
      i === 1 ? inputOf([], ['up']) : i === 20 ? inputOf([], ['punch']) : NONE,
    ]);
    expect(t[at(20)].fighters[1].state).toMatchObject({ name: 'air', attack: { move: 'airPunch' } });
    expect(t[at(34)].events).toEqual([{ type: 'hit', attacker: 0, damage: 30 }]);
    expect(t[at(34)].fighters[1].state).toEqual({ name: 'airHit', frame: 0 });
    const names = t.slice(at(34)).map((b) => b.fighters[1].state.name);
    expect(names).toContain('knockdown');
    expect(names).not.toContain('landing');
    expect(names).not.toContain('air');
  });
});
