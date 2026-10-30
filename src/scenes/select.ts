import type { InputFrame } from '../logic/types';
import { wrap } from './menu';
import { pickIndex } from './random';

export interface SelectCursor {
  index: number;
  decided: boolean;
}

export interface SelectState {
  cursors: [SelectCursor, SelectCursor];
  /** CPU戦なら 2P は CPU（カーソルを動かさず、1P の決定時に乱数で決める） */
  cpu: boolean;
}

export interface SelectStep {
  state: SelectState;
  /** 前の画面へ戻る（決定していない人がガードを押した） */
  back: boolean;
  /** 両者が決まった */
  done: boolean;
}

export function createSelect(cpu: boolean, initial: [number, number] = [0, 0]): SelectState {
  return {
    cpu,
    cursors: [
      { index: initial[0], decided: false },
      { index: initial[1], decided: false },
    ],
  };
}

/**
 * キャラ選択を1フレーム進める。1P・2P は自分のキーだけで同時に選ぶ。
 * 左右で移動（端で回る）、パンチで決定、ガードで決定の取り消し。決定前にガードを押すと前の画面へ戻る。
 * seed は CPU のキャラを選ぶ乱数の種
 */
export function stepSelect(s: SelectState, inputs: [InputFrame, InputFrame], count: number, seed: number): SelectStep {
  let back = false;
  const players = s.cpu ? [0] : [0, 1];
  const cursors: [SelectCursor, SelectCursor] = [{ ...s.cursors[0] }, { ...s.cursors[1] }];
  for (const p of players) {
    const c = cursors[p];
    const input = inputs[p];
    if (c.decided) {
      if (input.pressed.guard) c.decided = false;
      continue;
    }
    if (input.pressed.guard) {
      back = true;
      continue;
    }
    if (input.pressed.left) c.index = wrap(c.index - 1, count);
    if (input.pressed.right) c.index = wrap(c.index + 1, count);
    if (input.pressed.punch) c.decided = true;
  }
  if (s.cpu && cursors[0].decided && !cursors[1].decided) {
    cursors[1] = { index: pickIndex(seed, count), decided: true };
  }
  const done = !back && cursors[0].decided && cursors[1].decided;
  return { state: { cpu: s.cpu, cursors }, back, done };
}
