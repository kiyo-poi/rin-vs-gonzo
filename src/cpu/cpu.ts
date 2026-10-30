import type { Match } from '../logic/match';
import type { InputFrame, Params } from '../logic/types';
import { emptyHeld } from '../input/inputFrame';

export type CpuLevel = 'easy' | 'normal' | 'hard';

export interface CpuController {
  /** Called once per frame while the match runs; returns this frame's buttons for player `self`. */
  next(match: Match, self: 0 | 1): InputFrame;
}

/** 仮の CPU（M6 で置き換える）。何も押さない「動かない相手」 */
export function createCpu(_level: CpuLevel, _params: Params, _seed: number): CpuController {
  return {
    next: () => ({ held: emptyHeld(), pressed: emptyHeld() }),
  };
}
