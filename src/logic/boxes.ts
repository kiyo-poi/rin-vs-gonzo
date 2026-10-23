import type { Box } from './types';

/** 足元基準・右向き基準の箱を、ステージ上の座標（x＝左端、y＝下端）に直す */
export function toWorld(box: Box, origin: { x: number; y: number; facing: 1 | -1 }): Box {
  const left = origin.facing === 1 ? origin.x + box.x : origin.x - box.x - box.w;
  return { x: left, y: origin.y + box.y, w: box.w, h: box.h };
}

/** 2つの箱が重なっているか。辺が接しているだけでは重ならない */
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
