import { describe, expect, it } from 'vitest';
import { gonzo, params, proto } from '../src/data/data';
import { activeHitbox, createFighter, stepFighter } from '../src/logic/fighter';
import type { Fighter, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** char を n フレーム進める。pressAt に書いた入力がそのフレームに入る。ジャンプは1F目の↑ */
function run(char: typeof proto, n: number, pressAt: Record<number, InputFrame>): Fighter[] {
  const out: Fighter[] = [];
  let f = createFighter(char, 400, 1);
  for (let i = 1; i <= n; i++) {
    const input = i === 1 ? inputOf(['up']) : (pressAt[i] ?? NONE);
    f = stepFighter(f, input, 900, params);
    out.push(f);
  }
  return out;
}
const at = (i: number) => i - 1;

describe('空中攻撃', () => {
  it('空中でパンチ：10F目に押すと空中掌打が出て、攻撃の箱は 16〜21F目', () => {
    const t = run(proto, 40, { 10: inputOf([], ['punch']) });
    const s = t[at(10)].state;
    expect(s).toMatchObject({ name: 'air', attack: { move: 'airPunch', frame: 1 }, used: 'airPunch' });
    const active = t.map((f, i) => (activeHitbox(f) ? i + 1 : -1)).filter((i) => i > 0);
    expect(active).toEqual([16, 17, 18, 19, 20, 21]);
  });

  it('空中技が終わっても（30F目）ジャンプは続き、同じジャンプでは2回目が出ない', () => {
    const t = run(proto, 40, { 10: inputOf([], ['punch']), 32: inputOf([], ['kick']) });
    expect(t[at(30)].state).toMatchObject({ name: 'air', attack: null, used: 'airPunch' });
    expect(t[at(32)].state).toMatchObject({ name: 'air', attack: null });
  });

  it('空中技を出したジャンプは、着地で 4F の隙（39〜42F目は landing、43F目に押したパンチが出る）', () => {
    const t = run(proto, 44, { 10: inputOf([], ['punch']), 40: inputOf([], ['punch']), 43: inputOf([], ['punch']) });
    expect(t[at(38)].state.name).toBe('air');
    expect(t[at(39)].state).toEqual({ name: 'landing', frame: 1, duration: 4 });
    expect(t[at(42)].state).toEqual({ name: 'landing', frame: 4, duration: 4 });
    expect(t[at(43)].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });

  it('着地のフレーム（39F目）に押したパンチは出ない', () => {
    const t = run(proto, 39, { 10: inputOf([], ['punch']), 39: inputOf([], ['punch']) });
    expect(t[at(39)].state.name).toBe('landing');
  });

  it('空中技を出していないジャンプは、着地のフレームから動ける', () => {
    const t = run(proto, 39, { 39: inputOf([], ['punch']) });
    expect(t[at(39)].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
    expect(t[at(39)].y).toBe(0);
  });

  it('ドロップキック（ゴンゾー）の着地の隙は 20F', () => {
    const t = run(gonzo, 70, { 10: inputOf([], ['kick']) });
    expect(t[at(48)].state.name).toBe('air');
    expect(t[at(49)].state).toMatchObject({ name: 'landing', frame: 1, duration: 20 });
    expect(t[at(68)].state.name).toBe('landing');
    expect(t[at(69)].state.name).toBe('idle');
  });

  it('空中では振り向かない（空中技の最中も）', () => {
    let f = createFighter(proto, 400, 1);
    f = stepFighter(f, inputOf(['up']), 900, params);
    for (let i = 2; i <= 12; i++) f = stepFighter(f, i === 10 ? inputOf([], ['punch']) : NONE, 100, params);
    expect(f.facing).toBe(1);
  });
});
