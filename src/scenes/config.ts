import type { CpuLevel } from '../cpu/cpu';
import type { CharacterData } from '../logic/types';

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

/** キャラ id から名簿のキャラを引く。見つからなければ名簿の先頭（データの書き間違いで画面が落ちないように） */
export function resolveChar(roster: readonly CharacterData[], id: string): CharacterData {
  const found = roster.find((c) => c.id === id) ?? roster[0];
  if (!found) throw new Error('キャラの名簿が空です');
  return found;
}

/** 1P・2P のキャラ id をまとめて引く（resolveChar） */
export function resolveChars(roster: readonly CharacterData[], ids: readonly [string, string]): [CharacterData, CharacterData] {
  return [resolveChar(roster, ids[0]), resolveChar(roster, ids[1])];
}

/** 戦うステージ。2P のキャラのステージで戦う（CPU 戦は CPU が 2P なので CPU のキャラのステージ） */
export function stageForMatch(chars: readonly [CharacterData, CharacterData], _mode: Mode): string {
  return chars[1].stageId;
}
