import { describe, expect, it } from 'vitest';
import { recolorPixels, type Recolor } from '../src/render/recolor';

const RED_TO_BLUE: Recolor = { from: 340, to: 15, minSat: 0.45, hue: 220, minArea: 0.1 };

/** w×h の画像を、色の配列（1画素ずつ、null は透明）から作る */
function image(px: ([number, number, number] | null)[]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(px.length * 4);
  px.forEach((c, i) => {
    if (c) d.set([...c, 255], i * 4);
  });
  return d;
}
const at = (d: Uint8ClampedArray, i: number) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];

describe('2P の色違い（衣装の色の差し替え）', () => {
  it('大きな赤い塊は青に変わり、肌色と黒はそのまま', () => {
    const R: [number, number, number] = [220, 30, 30];
    const SKIN: [number, number, number] = [250, 215, 190];
    const BLACK: [number, number, number] = [20, 20, 20];
    const d = image([R, R, R, R, SKIN, BLACK, null, null]);
    recolorPixels(d, 4, 2, RED_TO_BLUE);
    const [r, g, b] = at(d, 0);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
    expect(at(d, 4)).toEqual(SKIN);
    expect(at(d, 5)).toEqual(BLACK);
  });

  it('小さい赤（口など）は変えない', () => {
    const R: [number, number, number] = [220, 30, 30];
    const S: [number, number, number] = [250, 215, 190];
    // 赤1画素だけ・不透明20画素 → 5% < 10%
    const d = image([R, ...Array(19).fill(S)]);
    recolorPixels(d, 20, 1, RED_TO_BLUE);
    expect(at(d, 0)).toEqual(R);
  });
});
