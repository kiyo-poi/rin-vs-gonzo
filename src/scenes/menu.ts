import type { InputFrame } from '../logic/types';

export interface MenuResult {
  index: number;
  decided: boolean;
  cancelled: boolean;
}

/** 縦に並んだメニューを1フレーム進める。どの入力（1P・2P）でも操作できる。上下は端で反対側に回る */
export function stepMenu(index: number, count: number, inputs: readonly InputFrame[]): MenuResult {
  let next = index;
  let decided = false;
  let cancelled = false;
  for (const input of inputs) {
    if (input.pressed.up) next = wrap(next - 1, count);
    if (input.pressed.down) next = wrap(next + 1, count);
    if (input.pressed.punch) decided = true;
    if (input.pressed.guard) cancelled = true;
  }
  // 決定と取り消しを同時に押したら、取り消しを優先する（意図しない決定を防ぐ）
  if (cancelled) decided = false;
  return { index: next, decided, cancelled };
}

export function wrap(i: number, count: number): number {
  return ((i % count) + count) % count;
}
