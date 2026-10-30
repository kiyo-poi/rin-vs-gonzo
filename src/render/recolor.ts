/** 2P の色違い：衣装の色（決まった色相の範囲）だけを別の色相に差し替える */
export interface Recolor {
  /** 差し替える色相の範囲（度）。from > to なら 0 度をまたぐ（例：340〜15 の赤） */
  from: number;
  to: number;
  /** これより鮮やかな色だけ変える（0〜1）。肌や影は変えない */
  minSat: number;
  /** 差し替え先の色相（度） */
  hue: number;
  /** 不透明な部分に対してこの割合より小さい塊は変えない（口・頬など） */
  minArea: number;
}

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

/** RGBA の画素列を直接書き換える（canvas の ImageData.data をそのまま渡す） */
export function recolorPixels(data: Uint8ClampedArray, w: number, h: number, rule: Recolor): void {
  const inRange = (deg: number) => (rule.from <= rule.to ? deg >= rule.from && deg <= rule.to : deg >= rule.from || deg <= rule.to);
  const cand = new Uint8Array(w * h);
  let opaque = 0;
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] < 10) continue;
    opaque++;
    const [hh, s, v] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (inRange(hh) && s >= rule.minSat && v > 0.25) cand[i] = 1;
  }
  // 候補を上下左右でつながった塊に分け、大きい塊（衣装）だけ色を変える
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const minArea = rule.minArea * opaque;
  for (let start = 0; start < w * h; start++) {
    if (!cand[start] || seen[start]) continue;
    const blob: number[] = [];
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      blob.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && cand[q] && !seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (blob.length < minArea) continue;
    for (const p of blob) {
      const [, s, v] = hsv(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
      const [r, g, b] = rgb(rule.hue, s, v * 0.95);
      data[p * 4] = r;
      data[p * 4 + 1] = g;
      data[p * 4 + 2] = b;
    }
  }
}
