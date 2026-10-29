import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { CharacterData, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (frame: number) => [InputFrame, InputFrame];

function play(chars: [CharacterData, CharacterData], xs: [number, number], n: number, inputsAt: Inputs): Battle[] {
  const result: Battle[] = [];
  let b = createBattle(chars, params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputsAt(i), params);
    result.push(b);
  }
  return result;
}

/** パンチの重さだけを重にした仮キャラ（重の値を確かめるため） */
const heavyPuncher: CharacterData = {
  ...proto,
  moves: { ...proto.moves, punch: { ...proto.moves.punch, hits: [{ ...proto.moves.punch.hits[0], weight: 'heavy' }] } },
};

const P: [CharacterData, CharacterData] = [proto, proto];
const punchAt1: Inputs = (i) => [i === 1 ? inputOf([], ['punch']) : NONE, NONE];
const kickAt1: Inputs = (i) => [i === 1 ? inputOf([], ['kick']) : NONE, NONE];
const RIGHT_EDGE = params.stage.width - params.stage.edgeMargin; // 1860

describe('ノックバック', () => {
  it('軽：ヒットで 20px 下がる', () => {
    const t = play(P, [400, 500], 5, punchAt1);
    expect(t[4].fighters[1].x).toBe(520);
  });

  it('軽：ガードではその 1.2 倍（24px）下がる', () => {
    const t = play(P, [400, 500], 5, (i) => [i === 1 ? inputOf([], ['punch']) : NONE, inputOf(['guard'])]);
    expect(t[4].fighters[1].x).toBe(524);
  });

  it('中（キック）：ヒットで 35px、のけぞり 18F', () => {
    const t = play(P, [400, 500], 9, kickAt1);
    expect(t[8].fighters[1].x).toBe(535);
    expect(t[8].fighters[1].state).toEqual({ name: 'hitstun', frame: 0, duration: 18 });
  });

  it('中（キック）：ガードで 42px、ガード硬直 13F', () => {
    const t = play(P, [400, 500], 9, (i) => [i === 1 ? inputOf([], ['kick']) : NONE, inputOf(['guard'])]);
    expect(t[8].fighters[1].x).toBe(542);
    expect(t[8].fighters[1].state).toEqual({ name: 'blockstun', frame: 0, duration: 13 });
  });

  it('重：ヒットで 60px、のけぞり 24F の間は動けない', () => {
    // 2P は当たった次のフレームから毎フレームパンチを押す。24F 動けず、25F目に出る
    const t = play([heavyPuncher, proto], [400, 500], 30, (i) => [
      i === 1 ? inputOf([], ['punch']) : NONE,
      i >= 6 ? inputOf([], ['punch']) : NONE,
    ]);
    expect(t[4].fighters[1].x).toBe(560);
    expect(t[28].fighters[1].state.name).toBe('hitstun');
    expect(t[29].fighters[1].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });

  it('重：ガードで 72px、ガード硬直 17F', () => {
    const t = play([heavyPuncher, proto], [400, 500], 5, (i) => [i === 1 ? inputOf([], ['punch']) : NONE, inputOf(['guard'])]);
    expect(t[4].fighters[1].x).toBe(572);
    expect(t[4].fighters[1].state).toEqual({ name: 'blockstun', frame: 0, duration: 17 });
  });
});

describe('画面端', () => {
  it('端の相手を殴ると、相手は動かず攻めた側が 20px 下がる', () => {
    const t = play(P, [RIGHT_EDGE - 100, RIGHT_EDGE], 5, punchAt1);
    expect(t[4].fighters[1].x).toBe(RIGHT_EDGE);
    expect(t[4].fighters[0].x).toBe(RIGHT_EDGE - 120);
  });

  it('端まで 10px なら、相手が 10px 下がり、攻めた側が残りの 10px 下がる', () => {
    const t = play(P, [RIGHT_EDGE - 110, RIGHT_EDGE - 10], 5, punchAt1);
    expect(t[4].fighters[1].x).toBe(RIGHT_EDGE);
    expect(t[4].fighters[0].x).toBe(RIGHT_EDGE - 120);
  });

  it('端でガードし続ける相手を殴り続けても、攻めた側が下がって3回で届かなくなる', () => {
    // 1P は 15F ごとにパンチ（パンチは全体 14F）。2P は端でガードを押し続ける
    const t = play(P, [RIGHT_EDGE - 60, RIGHT_EDGE], 60, (i) => [
      i % 15 === 1 ? inputOf([], ['punch']) : NONE,
      inputOf(['guard']),
    ]);
    const blocks = t.flatMap((b) => b.events).filter((e) => e.type === 'block');
    expect(blocks).toHaveLength(3);
    expect(t[59].fighters[0].x).toBe(RIGHT_EDGE - 60 - 72);
    expect(t[59].fighters[1].x).toBe(RIGHT_EDGE);
  });
});
