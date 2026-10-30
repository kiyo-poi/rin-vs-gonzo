import { PANTS_2P, type Recolor } from './recolor';

const BASE: Record<string, string> = { lin: '#e55', gonzo: '#5b5' };
const FALLBACK = ['#e95', '#a6e', '#5bd', '#dd5'];
/** 同じキャラ同士の時の 2P の色（色違い） */
const MIRROR: Record<string, string> = { lin: '#58f', gonzo: '#c8c' };

/** キャラの基本色。知らないキャラは id から決まった色 */
export function baseColor(id: string): string {
  if (BASE[id]) return BASE[id];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

/** 描く色。同じキャラ同士なら 2P は色違いにする */
export function fighterColor(ids: readonly [string, string], index: 0 | 1): string {
  if (index === 1 && ids[0] === ids[1]) return MIRROR[ids[1]] ?? '#58f';
  return baseColor(ids[index]);
}

/** 同じキャラ同士の時の 2P の色の変え方（どのキャラもパンツを青に。他の色はそのまま） */
export function mirrorRecolor(_id: string): Recolor {
  return PANTS_2P;
}
