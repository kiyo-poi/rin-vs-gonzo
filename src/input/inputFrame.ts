import { BUTTONS, type Button, type ButtonKeys, type Controls, type InputFrame } from '../logic/types';

export function emptyHeld(): Record<Button, boolean> {
  return Object.fromEntries(BUTTONS.map((b) => [b, false])) as Record<Button, boolean>;
}

/** 押されているキーの集合から、1人分のボタン状態を作る。割り当てたキーのどれかが押されていれば押している扱い */
export function heldFromKeys(keys: ReadonlySet<string>, map: ButtonKeys): Record<Button, boolean> {
  return Object.fromEntries(BUTTONS.map((b) => [b, map[b].some((code) => keys.has(code))])) as Record<Button, boolean>;
}

export function buildInputFrame(held: Record<Button, boolean>, prevHeld: Record<Button, boolean>): InputFrame {
  const pressed = Object.fromEntries(BUTTONS.map((b) => [b, held[b] && !prevHeld[b]])) as Record<Button, boolean>;
  return { held, pressed };
}

/** ゲームで使う全キー。矢印キーでのスクロールなど、ブラウザの既定動作を止める対象 */
export function allCodes(controls: Controls): Set<string> {
  const codes = new Set<string>(controls.pause);
  for (const map of [controls.p1, controls.p2]) {
    for (const b of BUTTONS) map[b].forEach((code) => codes.add(code));
  }
  return codes;
}

/** 押されているキーのうち、その人に割り当てたキーだけを返す（開発用のキー表示用） */
export function keysFor(keys: ReadonlySet<string>, map: ButtonKeys): string[] {
  const mine = new Set(BUTTONS.flatMap((b) => map[b]));
  return [...keys].filter((code) => mine.has(code));
}
