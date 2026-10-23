import { toWorld } from './boxes';
import type { Box, CharacterData, Fighter, FighterStateName, HitData, InputFrame, MoveData, Params } from './types';

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

export function moveTotalFrames(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

/** 攻撃の箱（ステージ座標）。持続中で、まだ当たっていない時だけ返す */
export function activeHitbox(f: Fighter): { box: Box; hit: HitData } | null {
  if (f.state.name !== 'attack' || f.moveHasHit) return null;
  const move = f.char.moves.punch;
  const frame = f.state.frame;
  if (frame <= move.startup || frame > move.startup + move.active) return null;
  const hit = move.hits[0];
  return { box: toWorld(hit.box, f), hit };
}

/** 食らいの箱（ステージ座標）。しゃがみ・空中・それ以外（立ち）で使い分ける */
export function hurtBoxes(f: Fighter): Box[] {
  const hurt = f.char.boxes.hurt;
  const local = f.state.name === 'crouch' ? hurt.crouch : f.state.name === 'air' ? hurt.air : hurt.stand;
  return local.map((box) => toWorld(box, f));
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
    case 'attack': {
      // 全体フレームが終わるまでは技の途中。終わったフレームは自由に動ける
      if (st.frame + 1 <= moveTotalFrames(f.char.moves.punch)) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'hitstun':
    case 'blockstun': {
      if (st.frame + 1 <= (st.duration ?? 0)) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
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

  if (input.pressed.punch) return { ...base, state: { name: 'attack', frame: 1 } };
  if (held.up) return { ...base, state: { name: 'jumpSquat', frame: 1 } };
  if (held.guard) return enter('guard');
  if (held.down) return enter('crouch');
  if (horizontal !== 0) {
    const x = clampX(base.x + horizontal * f.char.stats.walkSpeed, params);
    return enter(horizontal * facing > 0 ? 'walkForward' : 'walkBack', x);
  }
  return enter('idle');
}
