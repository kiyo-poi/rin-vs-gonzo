import { describe, expect, it } from 'vitest';
import { overlaps, toWorld } from '../src/logic/boxes';

const box = { x: 20, y: 100, w: 70, h: 20 };

describe('toWorld', () => {
  it('右向きは足元の位置に足すだけ', () => {
    expect(toWorld(box, { x: 400, y: 0, facing: 1 })).toEqual({ x: 420, y: 100, w: 70, h: 20 });
  });

  it('左向きは左右を反転する', () => {
    expect(toWorld(box, { x: 400, y: 0, facing: -1 })).toEqual({ x: 310, y: 100, w: 70, h: 20 });
  });

  it('空中なら高さの分だけ上がる', () => {
    expect(toWorld(box, { x: 400, y: 50, facing: 1 }).y).toBe(150);
  });
});

describe('overlaps', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  it('重なっていれば true', () => {
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it('辺が接しているだけなら false', () => {
    expect(overlaps(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('離れていれば false', () => {
    expect(overlaps(a, { x: 0, y: 20, w: 10, h: 10 })).toBe(false);
  });
});
