/**
 * 2P の色違い：パンツ（体の下半分にある、黒い大きな塊）だけを別の色にする。
 * 他の部分（肌・服・髪・輪郭線）の色は変えない。
 */
export interface Recolor {
  /** パンツの新しい色相（度） */
  hue: number;
}

/** 2P のパンツの色（青） */
export const PANTS_2P: Recolor = { hue: 215 };

/** 輪郭線を消すために縮める幅（px）。線より太い塊だけが残る */
const ERODE = 3;

function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, max === 0 ? 0 : d / max, max / 255];
}

function rgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

/** 正方形の範囲での最小（keep=0）・最大（keep=1）。縦横に分けて計算する */
function squareFilter(m: Uint8Array, w: number, h: number, r: number, max: boolean): Uint8Array {
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = max ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x;
          const yy = horizontal ? y : y + k;
          const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
          if (max ? s : !s) { v = max ? 1 : 0; break; }
        }
        out[y * w + x] = v;
      }
    }
    return out;
  };
  return pass(pass(m, true), false);
}

/** RGBA の画素列を直接書き換える（canvas の ImageData.data をそのまま渡す） */
export function recolorPixels(data: Uint8ClampedArray, w: number, h: number, rule: Recolor): void {
  // 暗くて色の薄い画素（黒いパンツ・髪・ひげ・輪郭線）
  const dark = new Uint8Array(w * h);
  let top = h;
  let bottom = -1;
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] <= 40) continue;
    const y = Math.floor(i / w);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    if (data[i * 4 + 3] < 128) continue;
    const [, s, v] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (v < 0.42 && s < 0.45) dark[i] = 1;
  }
  if (bottom < 0) return;
  // 細い輪郭線を消し、残った塊のうち体の下半分（上から4割より下）にある大きいものをパンツとする
  const core = squareFilter(dark, w, h, ERODE, false);
  const label = new Int32Array(w * h).fill(-1);
  const blobs: { n: number; pts: number[] }[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!core[start] || label[start] >= 0) continue;
    const id = blobs.length;
    const pts: number[] = [];
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      pts.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && core[q] && label[q] < 0) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    blobs.push({ n: pts.length, pts });
  }
  const height = bottom - top + 1;
  const lower = blobs.filter((b) => {
    const cy = b.pts.reduce((sum, p) => sum + Math.floor(p / w), 0) / b.n;
    return (cy - top) / height >= 0.4;
  });
  if (!lower.length) return;
  const biggest = Math.max(...lower.map((b) => b.n));
  const mask = new Uint8Array(w * h);
  for (const b of lower) if (b.n >= biggest * 0.2) for (const p of b.pts) mask[p] = 1;
  // 縮めた分を戻す（暗い画素の中だけ）
  const grown = squareFilter(mask, w, h, ERODE + 1, true);
  for (let i = 0; i < w * h; i++) {
    if (!grown[i] || !dark[i]) continue;
    const [, , v] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    // 黒のままだと色が見えないので明るくする（影の濃淡は残す）
    const [r, g, b] = rgb(rule.hue, 0.75, Math.min(1, 0.3 + v * 1.6));
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
  }
}
