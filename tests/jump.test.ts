import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createFighter, jumpY, stepFighter } from '../src/logic/fighter';
import type { Fighter } from '../src/logic/types';
import { inputOf } from './helpers';

/** 1フレーム目だけ ↑ を押して、各フレームの状態を記録する */
function jumpTimeline(frames: number): Fighter[] {
  const result: Fighter[] = [];
  let f = createFighter(proto, 400, 1);
  for (let i = 1; i <= frames; i++) {
    f = stepFighter(f, i === 1 ? inputOf([], ['up']) : inputOf(), 900, params);
    result.push(f);
  }
  return result;
}

describe('jumpY', () => {
  it('滞空の半分で一番高い', () => {
    expect(jumpY(18, 36, 200)).toBe(200);
  });
  it('始まりと終わりは地面', () => {
    expect(jumpY(0, 36, 200)).toBe(0);
    expect(jumpY(36, 36, 200)).toBe(0);
  });
});

describe('ジャンプ', () => {
  const t = jumpTimeline(40); // t[0] が1F目

  it('1〜3F目は踏み込み（地上）', () => {
    for (const f of t.slice(0, 3)) {
      expect(f.state.name).toBe('jumpSquat');
      expect(f.y).toBe(0);
    }
  });

  it('4F目から空中', () => {
    expect(t[3].state.name).toBe('air');
    expect(t[3].y).toBeGreaterThan(0);
  });

  it('38F目はまだ空中、39F目に着地して待機（踏み込み3F＋滞空36F）', () => {
    expect(t[37].state.name).toBe('air');
    expect(t[37].y).toBeGreaterThan(0);
    expect(t[38].state.name).toBe('idle');
    expect(t[38].y).toBe(0);
  });

  it('着地した39F目にもパンチが押せる（入力を落とさない）', () => {
    let f = createFighter(proto, 400, 1);
    for (let i = 1; i <= 39; i++) {
      const input = i === 1 ? inputOf([], ['up']) : i === 39 ? inputOf([], ['punch']) : inputOf();
      f = stepFighter(f, input, 900, params);
    }
    expect(f.y).toBe(0);
    expect(f.state).toEqual({ name: 'attack', frame: 1 });
  });

  it('空中で → を押しても横に動かない（M1 は真上ジャンプだけ）', () => {
    let f = stepFighter(createFighter(proto, 400, 1), inputOf([], ['up']), 900, params);
    for (let i = 0; i < 10; i++) f = stepFighter(f, inputOf(['right']), 900, params);
    expect(f.x).toBe(400);
  });
});
