import { describe, expect, it } from 'vitest';
import { gonzo, lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { CharacterData, FighterState, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (i: number) => [InputFrame, InputFrame];

/** inputAt(i) で i F目の入力を決めて n フレーム進めた各フレームの結果（[0] が1F目）。states で開始時の状態を差し替えられる */
function run(chars: [CharacterData, CharacterData], xs: [number, number], n: number, inputAt: Inputs, states: Partial<Record<0 | 1, FighterState>> = {}): Battle[] {
  const result: Battle[] = [];
  let b = createBattle(chars, params, xs);
  for (const k of [0, 1] as const) {
    const st = states[k];
    if (st) b.fighters[k] = { ...b.fighters[k], state: st };
  }
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

const grab = inputOf([], ['grab']);
const throwFrame = (t: Battle[]) => t.findIndex((b) => b.events.some((e) => e.type === 'throw')) + 1;
/** 1F目に 1P が掴みを押し、2P は p2(i) */
const grabFirst = (p2: (i: number) => InputFrame): Inputs => (i) => [i === 1 ? grab : NONE, p2(i)];

describe('掴みと投げ', () => {
  it('掴みはガード中の相手を掴み、40F 後に 80 減ってダウン', () => {
    const t = run([lin, lin], [400, 470], 60, grabFirst(() => inputOf(['guard'])));
    const g = throwFrame(t);
    expect(g).toBe(6); // 発生5F → 6F目
    expect(t[g - 1].events).toEqual([{ type: 'throw', attacker: 0 }]);
    expect(t[g - 1].fighters[0].state).toEqual({ name: 'throwing', frame: 0, duration: 40 });
    expect(t[g - 1].fighters[1].state).toMatchObject({ name: 'thrown', frame: 0, duration: 40, damage: 80 });
    // 40F の間は食らい続ける・体力はまだ減らない
    expect(t[g - 1 + 40].fighters[1].state).toMatchObject({ name: 'thrown', frame: 40 });
    expect(t[g - 1 + 40].fighters[1].health).toBe(850);
    expect(t[g - 1 + 41].fighters[1].health).toBe(850 - 80);
    expect(t[g - 1 + 41].fighters[1].state.name).toBe('knockdown');
    expect(t[g - 1 + 41].fighters[0].state.name).toBe('idle');
    // 叩きつけたフレームに、音・火花用の重い 'hit' が出る（それ以外のフレームには出ない）
    expect(t[g - 1 + 41].events).toEqual([{ type: 'hit', attacker: 0, damage: 80, weight: 'heavy' }]);
    expect(t.slice(g, g - 1 + 41).every((b) => b.events.length === 0)).toBe(true);
  });

  it('掴みの発生前に打撃が当たれば打撃が勝つ', () => {
    // 2P のジャブ（2F目に押す）は 6F目に当たる。1P の掴みも 6F目に届くが、打撃が勝って不成立
    const t = run([lin, lin], [400, 470], 8, (i) => [i === 1 ? grab : NONE, i === 2 ? inputOf([], ['punch']) : NONE]);
    expect(t[5].events).toMatchObject([{ type: 'hit', attacker: 1, damage: 30 }]);
    expect(t[5].fighters[0].state.name).toBe('hitstun');
    expect(t[5].fighters[1].state.name).toBe('attack');
    expect(throwFrame(t)).toBe(0);
  });

  it('掴み同士は両者弾かれる', () => {
    const t = run([lin, lin], [400, 470], 6, () => [grab, grab]);
    expect(t[5].events).toEqual([{ type: 'clash' }]);
    expect(t[5].fighters[0].state.name).toBe('recoil');
    expect(t[5].fighters[1].state.name).toBe('recoil');
  });

  it('掴まれてから 8F 以内に掴みを押すと両者弾かれる（tech）。9F目に押しても投げられる', () => {
    const pressAt = (k: number) => run([lin, lin], [400, 470], 60, grabFirst((i) => (i === 6 + k ? grab : NONE)));
    const ok = pressAt(8);
    expect(ok[13].events).toEqual([{ type: 'tech' }]);
    expect(ok[13].fighters[0].state).toMatchObject({ name: 'recoil', frame: 0 });
    expect(ok[13].fighters[1].state).toMatchObject({ name: 'recoil', frame: 0 });
    expect(ok[13].fighters[1].health).toBe(850);
    const late = pressAt(9);
    expect(late.flatMap((b) => b.events).some((e) => e.type === 'tech')).toBe(false);
    expect(late[14].fighters[1].state.name).toBe('thrown');
    expect(late[5 + 41].fighters[1].health).toBe(850 - 80);
  });

  it('ジャンプ中の相手は掴めない。ジャンプの踏み込み中の相手は掴める', () => {
    // 2P が 1F目に跳ぶと、掴みが届く 6F目には空中
    const air = run([lin, lin], [400, 470], 8, grabFirst((i) => (i === 1 ? inputOf(['up']) : NONE)));
    expect(air[5].fighters[1].y).toBeGreaterThan(0);
    expect(throwFrame(air)).toBe(0);
    // 2P が 4F目に跳ぶと、6F目は踏み込みの3F目（まだ地上）
    const squat = run([lin, lin], [400, 470], 8, grabFirst((i) => (i === 4 ? inputOf(['up']) : NONE)));
    expect(squat[4].fighters[1].state).toMatchObject({ name: 'jumpSquat', frame: 2 });
    expect(throwFrame(squat)).toBe(6);
  });

  it('のけぞり中・ガード硬直中の相手は掴めない', () => {
    for (const state of [
      { name: 'hitstun', frame: 1, duration: 30, crouch: false },
      { name: 'blockstun', frame: 1, duration: 30, crouch: false },
    ] as const) {
      const t = run([lin, lin], [400, 470], 8, grabFirst(() => NONE), { 1: state });
      expect(throwFrame(t), state.name).toBe(0);
    }
  });

  it('ゴンゾーの掴み間合いはリンより広い（隙間 80px：ゴンゾーは掴め、リンは掴めない）', () => {
    // 押し合いの幅の平均は (60＋80)/2＝70、中心の距離 150 で隙間 80
    const g = run([gonzo, lin], [400, 550], 12, grabFirst(() => NONE));
    expect(throwFrame(g)).toBe(7);
    expect(g[6].fighters[1].state).toMatchObject({ name: 'thrown', damage: 140 });
    const l = run([lin, gonzo], [400, 550], 12, grabFirst(() => NONE));
    expect(throwFrame(l)).toBe(0);
  });

  it('アーマー中のゴンゾーも掴める', () => {
    // 2P のゴンゾーはマッスルポーズ（アーマー 5〜30F目）。6F目に掴む
    const t = run([lin, gonzo], [400, 470], 8, (i) => [i === 1 ? grab : NONE, i === 1 ? inputOf([], ['special']) : NONE]);
    expect(t[5].fighters[1].armorLeft).toBe(1);
    expect(t[5].events).toEqual([{ type: 'throw', attacker: 0 }]);
    expect(t[5].fighters[1].state.name).toBe('thrown');
  });
});
