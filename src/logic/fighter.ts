import { toWorld } from './boxes';
import type { Box, CharacterData, Fighter, FreeStateName, HitData, InputFrame, MoveData, Params, Posture } from './types';

export function createFighter(char: CharacterData, x: number, facing: 1 | -1): Fighter {
  return {
    char,
    x,
    y: 0,
    facing,
    health: char.stats.health,
    state: { name: 'idle', frame: 1 },
    moveHasHit: false,
    invincible: 0,
  };
}

export function moveTotalFrames(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

/** 攻撃の箱（ステージ座標）。持続中で、まだ当たっていない時だけ返す */
export function activeHitbox(f: Fighter): { box: Box; hit: HitData } | null {
  const st = f.state;
  if (f.moveHasHit) return null;
  const cur = st.name === 'attack' ? st : st.name === 'air' ? st.attack : null;
  if (!cur) return null;
  const move = f.char.moves[cur.move];
  if (cur.frame <= move.startup || cur.frame > move.startup + move.active) return null;
  const hit = move.hits[0];
  return { box: toWorld(hit.box, f), hit };
}

/** 攻撃を食らう状態か。ダウン・落下中と、起き上がり無敵の間は当たらない */
export function isHittable(f: Fighter): boolean {
  return f.state.name !== 'knockdown' && f.state.name !== 'airHit' && f.invincible <= 0;
}

/** 食らいの箱（ステージ座標）。しゃがみ・空中・それ以外（立ち）で使い分ける */
export function hurtBoxes(f: Fighter): Box[] {
  const hurt = f.char.boxes.hurt;
  const st = f.state;
  const posture: Posture =
    st.name === 'attack' ? f.char.moves[st.move].posture
    : st.name === 'crouch' || (st.name === 'guard' && st.crouch) ? 'crouch'
    : st.name === 'air' || st.name === 'airHit' ? 'air'
    : 'stand';
  const local = hurt[posture];
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
export function stepFighter(prev: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter {
  const f: Fighter = { ...prev, invincible: Math.max(0, prev.invincible - 1) };
  const st = f.state;
  switch (st.name) {
    case 'attack': {
      // 全体フレームが終わるまでは技の途中。終わったフレームは自由に動ける
      if (st.frame + 1 <= moveTotalFrames(f.char.moves[st.move])) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'landing': {
      if (st.frame + 1 <= st.duration) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'hitstun':
    case 'blockstun': {
      if (st.frame + 1 <= st.duration) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'knockdown': {
      if (st.frame + 1 <= st.duration) return { ...f, state: { ...st, frame: st.frame + 1 } };
      // 起き上がったフレームから動け、そのフレームから無敵が始まる
      return { ...stepFree(f, input, opponentX, params), invincible: params.wakeupInvincible };
    }
    case 'airHit': {
      const y = f.y - params.airHitFallSpeed;
      if (y > 0) return { ...f, y, state: { ...st, frame: st.frame + 1 } };
      // 地面に着いたフレームからダウン
      return { ...f, y: 0, moveHasHit: false, state: { name: 'knockdown', frame: 1, duration: params.knockdownFrames } };
    }
    case 'jumpSquat': {
      if (st.frame + 1 <= params.jumpSquatFrames) return { ...f, state: { ...st, frame: st.frame + 1 } };
      const { jumpAirFrames, jumpHeight, jumpForwardSpeed } = f.char.stats;
      return {
        ...f,
        x: clampX(f.x + st.dir * jumpForwardSpeed, params),
        y: jumpY(1, jumpAirFrames, jumpHeight),
        state: { name: 'air', frame: 1, dir: st.dir, attack: null, used: null },
      };
    }
    case 'air': {
      const { jumpAirFrames, jumpHeight, jumpForwardSpeed } = f.char.stats;
      const frame = st.frame + 1;
      if (frame < jumpAirFrames) {
        let attack = st.attack;
        let used = st.used;
        let moveHasHit = f.moveHasHit;
        if (attack) {
          attack = attack.frame + 1 <= moveTotalFrames(f.char.moves[attack.move]) ? { ...attack, frame: attack.frame + 1 } : null;
        } else if (!used && (input.pressed.kick || input.pressed.punch)) {
          // 同じフレームに押されたらキックを優先する
          const move = input.pressed.kick ? 'airKick' : 'airPunch';
          attack = { move, frame: 1 };
          used = move;
          moveHasHit = false;
        }
        return {
          ...f,
          moveHasHit,
          x: clampX(f.x + st.dir * jumpForwardSpeed, params),
          y: jumpY(frame, jumpAirFrames, jumpHeight),
          state: { name: 'air', frame, dir: st.dir, attack, used },
        };
      }
      // 空中技を出していたら着地の隙（このフレームは入力を受け付けない）
      if (st.used) {
        const duration = f.char.moves[st.used].landingRecovery ?? params.airLandingRecovery;
        return { ...f, y: 0, moveHasHit: false, state: { name: 'landing', frame: 1, duration } };
      }
      // 出していなければ、着地したフレームからそのまま自由に動ける（入力を受け付け、向きも更新する）
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
  if (input.pressed.kick) return { ...base, state: { name: 'attack', frame: 1, move: held.down ? 'crouchKick' : 'kick' } };
  if (input.pressed.punch) return { ...base, state: { name: 'attack', frame: 1, move: held.down ? 'crouchPunch' : 'punch' } };
  if (held.up) return { ...base, state: { name: 'jumpSquat', frame: 1, dir: horizontal as -1 | 0 | 1 } };
  if (held.guard) {
    return { ...base, state: { name: 'guard', frame: f.state.name === 'guard' ? f.state.frame + 1 : 1, crouch: held.down } };
  }
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
