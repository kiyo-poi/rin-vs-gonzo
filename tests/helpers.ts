import { BUTTONS, type Button, type InputFrame } from '../src/logic/types';

/** テスト用の InputFrame。pressed に入れたボタンは held にも入る */
export function inputOf(held: Button[] = [], pressed: Button[] = []): InputFrame {
  const isHeld = (b: Button) => held.includes(b) || pressed.includes(b);
  return {
    held: Object.fromEntries(BUTTONS.map((b) => [b, isHeld(b)])) as Record<Button, boolean>,
    pressed: Object.fromEntries(BUTTONS.map((b) => [b, pressed.includes(b)])) as Record<Button, boolean>,
  };
}

export const NONE: InputFrame = inputOf();
