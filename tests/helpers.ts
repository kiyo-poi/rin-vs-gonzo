import { params, proto } from '../src/data/data';
import { createFighter, stepFighter } from '../src/logic/fighter';
import { BUTTONS, type Button, type Fighter, type InputFrame } from '../src/logic/types';

/** テスト用の InputFrame。pressed に入れたボタンは held にも入る */
export function inputOf(held: Button[] = [], pressed: Button[] = []): InputFrame {
  const isHeld = (b: Button) => held.includes(b) || pressed.includes(b);
  return {
    held: Object.fromEntries(BUTTONS.map((b) => [b, isHeld(b)])) as Record<Button, boolean>,
    pressed: Object.fromEntries(BUTTONS.map((b) => [b, pressed.includes(b)])) as Record<Button, boolean>,
  };
}

export const NONE: InputFrame = inputOf();

/** x=400・右向きの仮キャラを、相手を opponentX に置いたまま n フレーム進め、各フレームの結果を返す（[0] が1F目） */
export function fighterTimeline(n: number, inputAt: (frame: number) => InputFrame, opponentX = 900): Fighter[] {
  const result: Fighter[] = [];
  let f = createFighter(proto, 400, 1);
  for (let i = 1; i <= n; i++) {
    f = stepFighter(f, inputAt(i), opponentX, params);
    result.push(f);
  }
  return result;
}
