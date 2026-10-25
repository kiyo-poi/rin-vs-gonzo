import { describe, expect, it } from 'vitest';
import { activeHitbox } from '../src/logic/fighter';
import { fighterTimeline, inputOf } from './helpers';

const kickAtFirst = (i: number) => (i === 1 ? inputOf([], ['kick']) : inputOf());

describe('キック（旋風脚：発生8・持続3・硬直14、中）', () => {
  const t = fighterTimeline(27, kickAtFirst); // t[0] が1F目

  it('押したフレームが技の1F目', () => {
    expect(t[0].state).toEqual({ name: 'attack', frame: 1, move: 'kick' });
  });

  it('攻撃の箱は 9〜11F目だけ出る', () => {
    const active = t.map((f) => activeHitbox(f) !== null);
    expect(active.slice(0, 12)).toEqual([false, false, false, false, false, false, false, false, true, true, true, false]);
  });

  it('ダメージ 50、重さは中、箱はパンチより遠くまで届く', () => {
    const hit = activeHitbox(t[8]);
    expect(hit?.hit).toMatchObject({ damage: 50, weight: 'medium' });
    expect(hit?.box).toEqual({ x: 420, y: 60, w: 110, h: 24 });
  });

  it('25F目までは技の途中、26F目から待機に戻る', () => {
    expect(t[24].state).toEqual({ name: 'attack', frame: 25, move: 'kick' });
    expect(t[25].state.name).toBe('idle');
  });

  it('同じフレームにパンチとキックを押したらキックが出る', () => {
    const both = fighterTimeline(1, () => inputOf([], ['punch', 'kick']));
    expect(both[0].state).toEqual({ name: 'attack', frame: 1, move: 'kick' });
  });
});
