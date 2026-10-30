import type { CpuLevel } from '../cpu/cpu';

export type Mode = 'versus' | 'cpu';

/** シーン間で受け渡す「対戦の設定」。再戦はこれをそのまま使う */
export interface MatchConfig {
  mode: Mode;
  /** CPU戦の難易度（2人対戦では使わない） */
  level: CpuLevel;
  /** 1P・2P のキャラ id */
  chars: [string, string];
  /** CPU の乱数の種 */
  seed: number;
}

export const LEVELS: { level: CpuLevel; label: string }[] = [
  { level: 'easy', label: 'やさしい' },
  { level: 'normal', label: 'ふつう' },
  { level: 'hard', label: 'つよい' },
];

/** 結果画面の見出し（05_screens.md）。CPU戦は 1P 視点で YOU WIN / YOU LOSE */
export function resultTitle(winner: 0 | 1 | null, mode: Mode): string {
  if (winner === null) return 'DRAW GAME';
  if (mode === 'cpu') return winner === 0 ? 'YOU WIN' : 'YOU LOSE';
  return `${winner + 1}P WIN`;
}
