import { describe, expect, it } from 'vitest';
import { PANTS_2P, recolorPixels } from '../src/render/recolor';

type RGB = [number, number, number];
const SKIN: RGB = [250, 200, 150];
const BLACK: RGB = [20, 20, 20];
const RED: RGB = [220, 30, 30];

/** 30×40 の人：上半分は肌、頭に黒い髪の塊、下半分に黒いパンツの塊、全体に細い黒の輪郭線 */
function figure(): { d: Uint8ClampedArray; w: number; h: number } {
  const w = 30;
  const h = 40;
  const d = new Uint8ClampedArray(w * h * 4);
  const put = (x: number, y: number, c: RGB) => d.set([...c, 255], (y * w + x) * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const hair = y < 10 && x > 5 && x < 25;
      const pants = y >= 24 && y < 36 && x > 3 && x < 27;
      const shirt = y >= 14 && y < 20;
      put(x, y, edge || hair || pants ? BLACK : shirt ? RED : SKIN);
    }
  }
  return { d, w, h };
}
const at = (d: Uint8ClampedArray, w: number, x: number, y: number) => [...d.slice((y * w + x) * 4, (y * w + x) * 4 + 3)];

describe('2P の色違い（パンツの色だけ変える）', () => {
  it('下半分の黒い塊（パンツ）は青くなる', () => {
    const { d, w, h } = figure();
    recolorPixels(d, w, h, PANTS_2P);
    const [r, g, b] = at(d, w, 15, 30);
    expect(b).toBeGreaterThan(r + 40);
    expect(b).toBeGreaterThan(g);
  });

  it('髪・輪郭線・肌・服の色は変えない', () => {
    const { d, w, h } = figure();
    recolorPixels(d, w, h, PANTS_2P);
    expect(at(d, w, 15, 5)).toEqual(BLACK);
    expect(at(d, w, 0, 20)).toEqual(BLACK);
    expect(at(d, w, 15, 12)).toEqual(SKIN);
    expect(at(d, w, 15, 16)).toEqual(RED);
  });
});
