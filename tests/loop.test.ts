import { describe, expect, it } from 'vitest';
import { createFixedStep } from '../src/core/loop';

const STEP = 1000 / 60;

describe('createFixedStep', () => {
  it('最初の呼び出しでは更新しない', () => {
    const step = createFixedStep();
    expect(step(0)).toBe(0);
  });

  it('1/60秒ごとに1回更新する（60Hz のモニター）', () => {
    const step = createFixedStep();
    step(0);
    expect(step(STEP)).toBe(1);
    expect(step(STEP * 2)).toBe(1);
    expect(step(STEP * 3)).toBe(1);
  });

  it('120Hz のモニターでは2回に1回だけ更新する', () => {
    const step = createFixedStep();
    step(0);
    const counts = [1, 2, 3, 4].map((i) => step((i * 1000) / 120));
    expect(counts).toEqual([0, 1, 0, 1]);
  });

  it('1回で最大4回まで更新し、あふれた時間は捨てる', () => {
    const step = createFixedStep();
    step(0);
    expect(step(1000)).toBe(4);
    expect(step(1000 + STEP)).toBe(1);
  });
});
