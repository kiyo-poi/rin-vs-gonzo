import type { CharacterData, Fighter, FighterStateName, InputFrame, Params } from './types';

export function createFighter(char: CharacterData, x: number, facing: 1 | -1): Fighter {
  return {
    char,
    x,
    y: 0,
    facing,
    health: char.stats.health,
    state: { name: 'idle', frame: 1 },
    moveHasHit: false,
  };
}

/** 画面端の余白より端に行かないようにする */
export function clampX(x: number, params: Params): number {
  const { width, edgeMargin } = params.stage;
  return Math.min(width - edgeMargin, Math.max(edgeMargin, x));
}

/** ジャンプの放物線。空中の frame F目の高さ（frame = total / 2 で一番高い） */
export function jumpY(frame: number, total: number, height: number): number {
  const t = frame / total;
  return 4 * height * t * (1 - t);
}

/** 1フレーム進める */
export function stepFighter(f: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter {
  const st = f.state;
  switch (st.name) {
    case 'jumpSquat': {
      if (st.frame + 1 <= params.jumpSquatFrames) return { ...f, state: { ...st, frame: st.frame + 1 } };
      const { jumpAirFrames, jumpHeight } = f.char.stats;
      return { ...f, y: jumpY(1, jumpAirFrames, jumpHeight), state: { name: 'air', frame: 1 } };
    }
    case 'air': {
      const { jumpAirFrames, jumpHeight } = f.char.stats;
      const frame = st.frame + 1;
      if (frame >= jumpAirFrames) return { ...f, y: 0, state: { name: 'idle', frame: 1 } };
      return { ...f, y: jumpY(frame, jumpAirFrames, jumpHeight), state: { name: 'air', frame } };
    }
  }
  return stepFree(f, input, opponentX, params);
}

/** 自由に動ける状態（待機・歩き・しゃがみ・ガード）で、このフレームの行動を決める */
function stepFree(f: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter {
  const facing: 1 | -1 = opponentX === f.x ? f.facing : opponentX > f.x ? 1 : -1;
  const held = input.held;
  // 左右同時押しは 0（どちらも押していない扱い）
  const horizontal = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  const base: Fighter = { ...f, facing, moveHasHit: false };

  const enter = (name: FighterStateName, x = base.x): Fighter => ({
    ...base,
    x,
    state: { name, frame: f.state.name === name ? f.state.frame + 1 : 1 },
  });

  if (held.up) return { ...base, state: { name: 'jumpSquat', frame: 1 } };
  if (held.guard) return enter('guard');
  if (held.down) return enter('crouch');
  if (horizontal !== 0) {
    const x = clampX(base.x + horizontal * f.char.stats.walkSpeed, params);
    return enter(horizontal * facing > 0 ? 'walkForward' : 'walkBack', x);
  }
  return enter('idle');
}
