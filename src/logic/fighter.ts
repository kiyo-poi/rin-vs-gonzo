import { toWorld } from './boxes';
import type { Box, CharacterData, Fighter, FreeStateName, HitData, InputFrame, MoveData, Params } from './types';

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
  const st = f.state;
  if (st.name !== 'attack' || f.moveHasHit) return null;
  const move = f.char.moves[st.move];
  if (st.frame <= move.startup || st.frame > move.startup + move.active) return null;
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
      if (st.frame + 1 <= moveTotalFrames(f.char.moves[st.move])) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'hitstun':
    case 'blockstun': {
      if (st.frame + 1 <= st.duration) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'jumpSquat': {
      if (st.frame + 1 <= params.jumpSquatFrames) return { ...f, state: { ...st, frame: st.frame + 1 } };
      const { jumpAirFrames, jumpHeight, jumpForwardSpeed } = f.char.stats;
      return {
        ...f,
        x: clampX(f.x + st.dir * jumpForwardSpeed, params),
        y: jumpY(1, jumpAirFrames, jumpHeight),
        state: { name: 'air', frame: 1, dir: st.dir },
      };
    }
    case 'air': {
      const { jumpAirFrames, jumpHeight, jumpForwardSpeed } = f.char.stats;
      const frame = st.frame + 1;
      if (frame < jumpAirFrames) {
        return {
          ...f,
          x: clampX(f.x + st.dir * jumpForwardSpeed, params),
          y: jumpY(frame, jumpAirFrames, jumpHeight),
          state: { name: 'air', frame, dir: st.dir },
        };
      }
      // 着地したフレームは、そのまま自由に動ける（入力を受け付け、向きも更新する）
      return stepFree({ ...f, y: 0, state: { name: 'idle', frame: 0 } }, input, opponentX, params);
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

  const enter = (name: FreeStateName, x = base.x): Fighter => ({
    ...base,
    x,
    state: { name, frame: f.state.name === name ? f.state.frame + 1 : 1 },
  });

  // 同じフレームに押されたらキックを優先する（08_architecture.md の優先順位）
  if (input.pressed.kick) return { ...base, state: { name: 'attack', frame: 1, move: 'kick' } };
  if (input.pressed.punch) return { ...base, state: { name: 'attack', frame: 1, move: 'punch' } };
  if (held.up) return { ...base, state: { name: 'jumpSquat', frame: 1, dir: horizontal as -1 | 0 | 1 } };
  if (held.guard) return enter('guard');
  if (held.down) return enter('crouch');
  if (horizontal !== 0) {
    const x = clampX(base.x + horizontal * f.char.stats.walkSpeed, params);
    return enter(horizontal * facing > 0 ? 'walkForward' : 'walkBack', x);
  }
  return enter('idle');
}

/**
 * 押し合いのあとの位置で、相手の方を向き直す（08_architecture.md 2.4 の6番）。
 * 振り向けるのは自由に動ける状態と、このフレームに技・ジャンプ準備を始めた時だけ。
 * 空中・技の途中・のけぞり・ガード硬直では向きを変えない。同じ位置なら今の向きのまま
 */
export function faceOpponent(f: Fighter, opponentX: number): Fighter {
  const st = f.state;
  const canTurn =
    st.name === 'idle' ||
    st.name === 'walkForward' ||
    st.name === 'walkBack' ||
    st.name === 'crouch' ||
    st.name === 'guard' ||
    ((st.name === 'attack' || st.name === 'jumpSquat') && st.frame === 1);
  if (!canTurn || opponentX === f.x) return f;
  const facing: 1 | -1 = opponentX > f.x ? 1 : -1;
  return facing === f.facing ? f : { ...f, facing };
}
