import { describe, expect, it } from 'vitest';
import { lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { FighterState, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (i: number) => [InputFrame, InputFrame];

/** リン同士。inputAt(i) で i F目の入力を決めて n フレーム進めた各フレームの結果（[0] が1F目） */
function run(xs: [number, number], n: number, inputAt: Inputs, state0?: FighterState): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([lin, lin], params, xs);
  if (state0) b.fighters[0] = { ...b.fighters[0], state: state0 };
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

describe('先行入力', () => {
  // 1P をのけぞり（i=1〜20、21F目から自由）にして、press F目にパンチを押す
  const hitstun: FighterState = { name: 'hitstun', frame: 0, duration: 20, crouch: false };
  const pressAt = (press: number) => run([400, 900], 22, (i) => [i === press ? inputOf([], ['punch']) : NONE, NONE], hitstun);

  it('のけぞり中に押した攻撃は、6F 以内なら動けるようになった最初のフレームに出る', () => {
    const t = pressAt(15); // 21F目で age 6
    expect(t[19].fighters[0].state.name).toBe('hitstun');
    expect(t[20].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
    expect(t[20].fighters[0].buffer).toBeNull();
  });

  it('7F 以上前に押した攻撃は出ない', () => {
    const t = pressAt(14); // 21F目で age 7
    expect(t[20].fighters[0].state.name).toBe('idle');
  });
});

describe('キャンセル', () => {
  const jabThen = (p2: InputFrame, cancelInput: InputFrame, cancelAt = 6): Inputs => (i) => [
    i === 1 ? inputOf([], ['punch']) : i === cancelAt ? cancelInput : NONE,
    p2,
  ];

  it('ジャブがヒットしたあと、硬直中に →＋必殺を押すと、その場で突進掌が出る', () => {
    const t = run([400, 470], 7, jabThen(NONE, inputOf(['right'], ['special'])));
    expect(t[4].events).toEqual([{ type: 'hit', attacker: 0, damage: 30 }]); // ジャブは5F目に当たる
    expect(t[4].fighters[0].state).toMatchObject({ name: 'attack', move: 'punch', frame: 5 });
    expect(t[5].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'forwardSpecial' });
  });

  it('ガードされた時もキャンセルできる', () => {
    const t = run([400, 470], 7, jabThen(inputOf(['guard']), inputOf(['right'], ['special'])));
    expect(t[4].events).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
    expect(t[5].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'forwardSpecial' });
  });

  it('空振りしたジャブは、必殺を押してもキャンセルされない', () => {
    const t = run([400, 900], 10, jabThen(NONE, inputOf(['right'], ['special'])));
    expect(t[4].events).toEqual([]);
    for (const b of t.slice(5, 10)) expect(b.fighters[0].state).toMatchObject({ name: 'attack', move: 'punch' });
    expect(t[9].fighters[0].state).toMatchObject({ frame: 10 });
  });

  it('必殺技から必殺技へはキャンセルできない', () => {
    // 突進掌（1F目に出す）が 13F目に当たる。14F目にもう一度必殺を押しても、突進掌のまま
    const t = run([400, 600], 15, (i) => [i === 1 ? inputOf(['right'], ['special']) : i === 14 ? inputOf([], ['special']) : NONE, NONE]);
    expect(t.flatMap((b) => b.events).some((e) => e.type === 'hit')).toBe(true);
    expect(t[13].fighters[0].state).toEqual({ name: 'attack', frame: 14, move: 'forwardSpecial' });
  });
});
