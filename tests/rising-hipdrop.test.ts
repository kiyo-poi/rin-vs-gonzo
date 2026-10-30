import { describe, expect, it } from 'vitest';
import { gonzo, lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { isHittable } from '../src/logic/fighter';
import type { CharacterData, Fighter, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** type のイベントが起きたフレーム。attacker を指定したらその攻撃側だけ */
const frames = (t: Battle[], type: string, attacker?: 0 | 1) =>
  t.map((b, i) => (b.events.some((e) => e.type === type && (attacker === undefined || ('attacker' in e && e.attacker === attacker))) ? i + 1 : -1)).filter((i) => i > 0);

/** inputAt(i) で i F目の入力を決めて n フレーム進めた各フレームの結果（[0] が1F目） */
function run(b0: Battle, n: number, inputAt: (i: number) => [InputFrame, InputFrame]): Battle[] {
  const result: Battle[] = [];
  let b = b0;
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

const risingAt = (i: number): InputFrame => (i === 1 ? inputOf(['down'], ['special']) : NONE);

describe('昇り蹴り', () => {
  /** リンが4F目に昇り蹴り、ゴンゾーが1F目にチョップ（持続は10〜12F目）。ゴンゾーの10F目＝リンの7F目 */
  function overlapPunch(chara: CharacterData): Battle[] {
    return run(createBattle([chara, gonzo], params, [400, 535]), 14, (i) => [
      i === 4 ? inputOf(['down'], ['special']) : NONE,
      i === 1 ? inputOf([], ['punch']) : NONE,
    ]);
  }

  it('1〜7F目に打撃が当たらない（8F目からは当たる）', () => {
    const t = overlapPunch(lin);
    // ゴンゾーのチョップが届くのは 10F目だが、リンは7F目なので無敵。次の 11F目（リンの8F目）に当たる。
    // リンの昇り蹴りの箱は、この距離ではゴンゾーに届かない
    expect(frames(t, 'hit', 1)).toEqual([11]);
    expect(t[9].fighters[0].health).toBe(850);
  });

  it('無敵を外した昇り蹴りなら、同じ重なりで 10F目に当たる（無敵が理由で外れている確認）', () => {
    const noInvincible: CharacterData = { ...lin, moves: { ...lin.moves, downSpecial: { ...lin.moves.downSpecial, invincible: undefined } } };
    expect(frames(overlapPunch(noInvincible), 'hit', 1)).toEqual([10]);
  });

  it('isHittable は技の無敵の区間で false、8F目からは true', () => {
    const at = (n: number): Fighter => run(createBattle([lin, gonzo], params, [400, 1300]), n, (i) => [risingAt(i), NONE])[n - 1].fighters[0];
    expect(isHittable(at(1))).toBe(false);
    expect(isHittable(at(7))).toBe(false);
    expect(isHittable(at(8))).toBe(true);
  });

  it('昇り蹴りで上昇し、43F目で地面に戻る（硬直は着地まで含む）', () => {
    const t = run(createBattle([lin, gonzo], params, [400, 1300]), 46, (i) => [risingAt(i), NONE]);
    expect(t[4].fighters[0].y).toBe(0);
    expect(t[5].fighters[0].y).toBeCloseTo(17.5);
    expect(t[12].fighters[0].y).toBeCloseTo(140);
    expect(t[13].fighters[0].y).toBeCloseTo(140 - 140 / 30);
    expect(t[42].fighters[0].y).toBe(0);
    expect(t[42].fighters[0].state).toEqual({ name: 'attack', frame: 43, move: 'downSpecial' });
    expect(t[43].fighters[0].state.name).toBe('idle');
    // 前へ 30px
    expect(t[42].fighters[0].x).toBeCloseTo(430);
  });

  it('昇り蹴りで空中の相手を落とすと空中やられになる', () => {
    let b = createBattle([lin, gonzo], params, [400, 470]);
    b = { ...b, fighters: [b.fighters[0], { ...b.fighters[1], y: 100, state: { name: 'air', frame: 5, dir: 0, attack: null, used: null, recoilLeft: 0 } }] };
    const t = run(b, 8, (i) => [risingAt(i), NONE]);
    expect(frames(t, 'hit')).toEqual([6]);
    expect(t[5].fighters[1].state.name).toBe('airHit');
    expect(t[5].fighters[1].health).toBe(1150 - 100);
  });

  it('昇り蹴りの途中（浮いている時）に食らうと空中やられになる', () => {
    const t = overlapPunch(lin);
    expect(t[10].fighters[0].y).toBeGreaterThan(0);
    expect(t[10].fighters[0].state.name).toBe('airHit');
  });
});

describe('ヒップドロップ', () => {
  const dropAt = (i: number): InputFrame => (i === 1 ? inputOf(['down'], ['special']) : NONE);

  it('ジャンプして降りる：15F目で 120px、30F目で地面', () => {
    const t = run(createBattle([gonzo, lin], params, [600, 1300]), 32, (i) => [dropAt(i), NONE]);
    expect(t[14].fighters[0].y).toBeCloseTo(120);
    expect(t[29].fighters[0].y).toBe(0);
    expect(t[29].fighters[0].x).toBe(600);
  });

  it('衝撃波は左右 160px の地上の相手に当たる（後ろ側にも当たる）', () => {
    for (const lx of [750, 450]) {
      const t = run(createBattle([gonzo, lin], params, [600, lx]), 40, (i) => [dropAt(i), NONE]);
      expect(frames(t, 'hit'), `x=${lx}`).toEqual([31]);
      expect(t[30].fighters[1].health).toBe(850 - 100);
    }
  });

  it('160px より遠い地上の相手には当たらない', () => {
    // リンの食らいの箱の近い端が、箱の端（x±160）より外
    const t = run(createBattle([gonzo, lin], params, [600, 800]), 40, (i) => [dropAt(i), NONE]);
    expect(frames(t, 'hit')).toEqual([]);
  });

  it('衝撃波はジャンプ中の相手には当たらない', () => {
    // 技の途中で高さが 10 の相手（空中扱い）と、同じ技で高さが 0 の相手を比べる
    const floaty = (dy: number): CharacterData => ({
      ...lin,
      moves: {
        ...lin.moves,
        punch: { ...lin.moves.punch, startup: 1, active: 1, recovery: 80, hits: [], movement: [{ frames: { from: 1, to: 1 }, dx: 0, dy }] },
      },
    });
    const play = (dy: number) =>
      run(createBattle([gonzo, floaty(dy)], params, [600, 700]), 40, (i) => [dropAt(i), i === 1 ? inputOf([], ['punch']) : NONE]);
    expect(frames(play(10), 'hit')).toEqual([]);
    expect(frames(play(0), 'hit')).toEqual([31]);
  });
});
