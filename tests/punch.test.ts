import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { activeHitbox, createFighter, hurtBoxes, stepFighter } from '../src/logic/fighter';
import type { Fighter, InputFrame } from '../src/logic/types';
import { inputOf } from './helpers';

/** frame番目（1始まり）の入力を返す関数で n フレーム進め、各フレームの状態を記録する */
function timeline(n: number, inputAt: (frame: number) => InputFrame): Fighter[] {
  const result: Fighter[] = [];
  let f = createFighter(proto, 400, 1);
  for (let i = 1; i <= n; i++) {
    f = stepFighter(f, inputAt(i), 900, params);
    result.push(f);
  }
  return result;
}

const punchAtFirst = (i: number) => (i === 1 ? inputOf([], ['punch']) : inputOf());

describe('パンチ（発生4・持続2・硬直8）', () => {
  const t = timeline(16, punchAtFirst); // t[0] が1F目

  it('押したフレームが技の1F目', () => {
    expect(t[0].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });

  it('攻撃の箱は 5〜6F目だけ出る', () => {
    const active = t.map((f) => activeHitbox(f) !== null);
    expect(active.slice(0, 8)).toEqual([false, false, false, false, true, true, false, false]);
  });

  it('攻撃の箱は前に出る（右向きなら足元より右）', () => {
    const hit = activeHitbox(t[4]);
    expect(hit?.box).toEqual({ x: 420, y: 100, w: 70, h: 20 });
    expect(hit?.hit.damage).toBe(30);
  });

  it('14F目までは技の途中、15F目から待機に戻る', () => {
    expect(t[13].state).toEqual({ name: 'attack', frame: 14, move: 'punch' });
    expect(t[14].state.name).toBe('idle');
  });

  it('技の途中は歩けず、パンチも出し直せない', () => {
    const busy = timeline(14, (i) => (i === 1 ? inputOf([], ['punch']) : inputOf(['right'], i % 2 === 0 ? ['punch'] : [])));
    expect(busy[13].state).toEqual({ name: 'attack', frame: 14, move: 'punch' });
    expect(busy[13].x).toBe(400);
  });

  it('15F目に押せば次のパンチが出る', () => {
    const again = timeline(15, (i) => (i === 1 || i === 15 ? inputOf([], ['punch']) : inputOf()));
    expect(again[14].state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });

  it('当たったあとは攻撃の箱が消える', () => {
    expect(activeHitbox({ ...t[4], moveHasHit: true })).toBeNull();
  });
});

describe('食らいの箱', () => {
  it('立ちとしゃがみで高さが変わる', () => {
    const stand = createFighter(proto, 400, 1);
    const crouch = stepFighter(stand, inputOf(['down']), 900, params);
    expect(hurtBoxes(stand)[0]).toEqual({ x: 370, y: 0, w: 60, h: 160 });
    expect(hurtBoxes(crouch)[0].h).toBe(100);
  });
});

describe('のけぞり・ガード硬直', () => {
  it('duration のフレームが過ぎるまで動けない', () => {
    let f: Fighter = { ...createFighter(proto, 400, 1), state: { name: 'hitstun', frame: 0, duration: 14, crouch: false } };
    for (let i = 0; i < 14; i++) f = stepFighter(f, inputOf(['right'], ['punch']), 900, params);
    expect(f.state).toEqual({ name: 'hitstun', frame: 14, duration: 14, crouch: false });
    expect(f.x).toBe(400);
    f = stepFighter(f, inputOf([], ['punch']), 900, params);
    expect(f.state).toEqual({ name: 'attack', frame: 1, move: 'punch' });
  });
});
