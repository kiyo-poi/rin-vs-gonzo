import { describe, expect, it } from 'vitest';
import { lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (i: number) => [InputFrame, InputFrame];

/** リン同士。inputAt(i) で i F目の入力を決めて n フレーム進めた各フレームの結果（[0] が1F目）。health2 で 2P の体力を決められる */
function run(xs: [number, number], n: number, inputAt: Inputs, health2?: number): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([lin, lin], params, xs);
  if (health2 !== undefined) b.fighters[1] = { ...b.fighters[1], health: health2 };
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

const events = (t: Battle[], type: string) => t.flatMap((b) => b.events).filter((e) => e.type === type);
const guard = inputOf(['guard']);
const palm = inputOf(['right'], ['special']);

describe('連続技の補正', () => {
  it('ジャブ→突進掌のキャンセルで 30＋56＝86 減る', () => {
    const t = run([400, 470], 30, (i) => [i === 1 ? inputOf([], ['punch']) : i === 6 ? palm : NONE, NONE]);
    expect(events(t, 'hit')).toMatchObject([
      { type: 'hit', attacker: 0, damage: 30 },
      { type: 'hit', attacker: 0, damage: 56 },
    ]);
    expect(t[29].fighters[1].health).toBe(850 - 86);
    expect(t[29].fighters[1].combo).toEqual({ moves: 2, hits: 2 });
  });

  it('連拳の5発は補正されず合計 90', () => {
    const t = run([400, 460], 40, (i) => [i === 1 ? inputOf([], ['special']) : NONE, NONE]);
    expect(events(t, 'hit').map((e) => 'damage' in e && e.damage)).toEqual([18, 18, 18, 18, 18]);
    expect(t[39].fighters[1].health).toBe(850 - 90);
    expect(t[39].fighters[1].combo).toEqual({ moves: 1, hits: 5 });
  });

  it('相手が動けるようになったら、次の当たりは補正なし', () => {
    const t = run([400, 470], 60, (i) => [i === 1 || i === 40 ? inputOf([], ['punch']) : NONE, NONE]);
    expect(events(t, 'hit').map((e) => 'damage' in e && e.damage)).toEqual([30, 30]);
    expect(t[50].fighters[1].combo).toEqual({ moves: 1, hits: 1 });
    expect(t[35].fighters[1].combo).toEqual({ moves: 0, hits: 0 });
  });
});

describe('削り', () => {
  const palmAt1 = (): Inputs => (i) => [i === 1 ? palm : NONE, guard];

  it('突進掌をガードさせると 14（70 の 20%）減る', () => {
    const t = run([400, 600], 30, palmAt1());
    expect(events(t, 'block')).toHaveLength(1);
    expect(t[29].fighters[1].health).toBe(850 - 14);
  });

  it('体力1の相手に必殺技をガードさせても1のまま', () => {
    const t = run([400, 600], 30, palmAt1(), 1);
    expect(events(t, 'block')).toHaveLength(1);
    expect(t[29].fighters[1].health).toBe(1);
    // 体力10なら 1 で止まる
    expect(run([400, 600], 30, palmAt1(), 10)[29].fighters[1].health).toBe(1);
  });

  it('通常技をガードさせても減らない', () => {
    const t = run([400, 470], 12, (i) => [i === 1 ? inputOf([], ['punch']) : NONE, guard]);
    expect(events(t, 'block')).toHaveLength(1);
    expect(t[11].fighters[1].health).toBe(850);
  });
});
