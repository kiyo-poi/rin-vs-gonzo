import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (frame: number) => [InputFrame, InputFrame];

function play(xs: [number, number], n: number, inputsAt: Inputs): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([proto, proto], params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputsAt(i), params);
    result.push(b);
  }
  return result;
}

const RIGHT_EDGE = params.stage.width - params.stage.edgeMargin; // 1860
const MAX_DISTANCE = params.screen.width - 2 * params.stage.edgeMargin; // 1160

describe('押し合い', () => {
  it('歩いて押すと、相手は歩き速度の 50%（2.5px/F）で押され、2人は重ならない', () => {
    const t = play([400, 460], 10, () => [inputOf(['right']), NONE]);
    const [a, b] = t[9].fighters;
    expect(b.x).toBe(485);
    expect(b.x - a.x).toBe(60);
  });

  it('2人とも押し合うと、どちらも進めない', () => {
    const t = play([400, 460], 10, () => [inputOf(['right']), inputOf(['left'])]);
    expect(t[9].fighters.map((f) => f.x)).toEqual([400, 460]);
  });

  it('画面端の相手は押せず、押した側が進めない', () => {
    const t = play([RIGHT_EDGE - 60, RIGHT_EDGE], 10, () => [inputOf(['right']), NONE]);
    expect(t[9].fighters.map((f) => f.x)).toEqual([RIGHT_EDGE - 60, RIGHT_EDGE]);
  });

  it('前ジャンプで相手を飛び越えられ、着地後は2人とも相手の方を向く', () => {
    const t = play([400, 470], 39, (i) => [i === 1 ? inputOf(['right'], ['up']) : NONE, NONE]);
    const [a, b] = t[38].fighters;
    expect(a.x).toBe(610);
    expect(a.facing).toBe(-1);
    expect(b.facing).toBe(1);
  });

  it('着地した時に重なっていたら、半分ずつ離れる', () => {
    const t = play([400, 600], 39, (i) => [i === 1 ? inputOf(['right'], ['up']) : NONE, NONE]);
    const [a, b] = t[38].fighters;
    expect(a.x).toBe(635);
    expect(b.x).toBe(575);
  });
});

describe('2人の距離の上限（1160px）', () => {
  it('離れる向きに歩いても、上限より離れない', () => {
    const t = play([600, 600 + MAX_DISTANCE], 10, () => [inputOf(['left']), NONE]);
    expect(t[9].fighters[0].x).toBe(600);
  });

  it('2人とも離れると、両方とも止まる', () => {
    const t = play([600, 600 + MAX_DISTANCE], 10, () => [inputOf(['left']), inputOf(['right'])]);
    expect(t[9].fighters.map((f) => f.x)).toEqual([600, 600 + MAX_DISTANCE]);
  });

  it('上限より近ければ自由に下がれる', () => {
    const t = play([600, 600 + MAX_DISTANCE - 50], 10, () => [inputOf(['left']), NONE]);
    expect(t[9].fighters[0].x).toBe(550);
  });
});
