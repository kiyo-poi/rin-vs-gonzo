import { toWorld } from './boxes';
import type { Box, CharacterData, Fighter, FreeStateName, HitData, InputFrame, MoveData, MoveSlot, Params, Posture } from './types';

export function createFighter(char: CharacterData, x: number, facing: 1 | -1): Fighter {
  return {
    char,
    x,
    y: 0,
    facing,
    health: char.stats.health,
    state: { name: 'idle', frame: 1 },
    hitDone: [],
    invincible: 0,
  };
}

export function moveTotalFrames(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

/** 技の枠名か subMoves の名前から技データを引く。無ければ例外 */
export function getMove(char: CharacterData, id: string): MoveData {
  const move = (char.moves as Record<string, MoveData>)[id] ?? char.subMoves?.[id];
  if (!move) throw new Error(`技が見つかりません: ${id}`);
  return move;
}

/** 空中か。高さがある（技の途中のジャンプなど）か、空中・空中やられの状態 */
export function isAirborne(f: Fighter): boolean {
  return f.y > 0 || f.state.name === 'air' || f.state.name === 'airHit';
}

/** 技を始める時の hitDone（hits と同じ長さで全部 false） */
function freshHitDone(move: MoveData): boolean[] {
  return move.hits.map(() => false);
}

/** 攻撃の箱（ステージ座標）。今のフレームに出ていて、まだ当たっていない最初の当たりを返す */
export function activeHitbox(f: Fighter): { box: Box; hit: HitData; index: number } | null {
  const st = f.state;
  const cur = st.name === 'attack' ? st : st.name === 'air' ? st.attack : null;
  if (!cur) return null;
  const move = getMove(f.char, cur.move);
  if (cur.frame <= move.startup || cur.frame > move.startup + move.active) return null;
  const activeFrame = cur.frame - move.startup;
  const index = move.hits.findIndex((hit, i) => {
    const range = hit.frames ?? { from: 1, to: move.active };
    return !f.hitDone[i] && activeFrame >= range.from && activeFrame <= range.to;
  });
  if (index < 0) return null;
  const hit = move.hits[index];
  return { box: toWorld(hit.box, f), hit, index };
}

/** 攻撃を食らう状態か。ダウン・落下中と、起き上がり無敵の間は当たらない */
export function isHittable(f: Fighter): boolean {
  return f.state.name !== 'knockdown' && f.state.name !== 'airHit' && f.invincible <= 0;
}

/** 相打ちで弾かれる。地上なら動けなくなる。空中なら空中技が消えて落ち続け、着地しても弾かれた時間が終わるまで動けない（used は残す） */
export function clashRecoil(f: Fighter, params: Params): Fighter {
  if (f.state.name === 'air') {
    // 空中の側も地上の側と同じ時間だけ動けなくする：空中技を消し、着地の隙を弾かれた時間以上にする
    return { ...f, hitDone: allDone(f), state: { ...f.state, attack: null, recoilLeft: params.clashRecoil } };
  }
  return { ...f, hitDone: allDone(f), state: { name: 'recoil', frame: 0, duration: params.clashRecoil } };
}

/** 弾かれた技はもう当たらない：全部の当たりを済みにする */
function allDone(f: Fighter): boolean[] {
  return f.hitDone.map(() => true);
}

/** しゃがんでいるか。食らった・ガードした時の姿勢を、硬直中も保つために使う */
export function isCrouching(f: Fighter): boolean {
  const st = f.state;
  return (
    st.name === 'crouch' ||
    (st.name === 'guard' && st.crouch) ||
    ((st.name === 'hitstun' || st.name === 'blockstun') && st.crouch) ||
    (st.name === 'attack' && getMove(f.char, st.move).posture === 'crouch')
  );
}

/** 食らいの箱（ステージ座標）。しゃがみ・空中・それ以外（立ち）で使い分ける */
export function hurtBoxes(f: Fighter): Box[] {
  const hurt = f.char.boxes.hurt;
  const st = f.state;
  const posture: Posture =
    st.name === 'attack' ? getMove(f.char, st.move).posture
    : isCrouching(f) ? 'crouch'
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
      if (st.frame + 1 <= moveTotalFrames(getMove(f.char, st.move))) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'landing': {
      if (st.frame + 1 <= st.duration) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'hitstun':
    case 'blockstun':
    case 'recoil': {
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
      return { ...f, y: 0, hitDone: [], state: { name: 'knockdown', frame: 1, duration: params.knockdownFrames } };
    }
    case 'jumpSquat': {
      if (st.frame + 1 <= params.jumpSquatFrames) return { ...f, state: { ...st, frame: st.frame + 1 } };
      const { jumpAirFrames, jumpHeight, jumpForwardSpeed } = f.char.stats;
      return {
        ...f,
        x: clampX(f.x + st.dir * jumpForwardSpeed, params),
        y: jumpY(1, jumpAirFrames, jumpHeight),
        state: { name: 'air', frame: 1, dir: st.dir, attack: null, used: null, recoilLeft: 0 },
      };
    }
    case 'air': {
      const { jumpAirFrames, jumpHeight, jumpForwardSpeed } = f.char.stats;
      const frame = st.frame + 1;
      if (frame < jumpAirFrames) {
        let attack = st.attack;
        let used = st.used;
        let hitDone = f.hitDone;
        if (attack) {
          attack = attack.frame + 1 <= moveTotalFrames(getMove(f.char, attack.move)) ? { ...attack, frame: attack.frame + 1 } : null;
        } else if (!used && (input.pressed.kick || input.pressed.punch)) {
          // 同じフレームに押されたらキックを優先する
          const move = input.pressed.kick ? 'airKick' : 'airPunch';
          attack = { move, frame: 1 };
          used = move;
          hitDone = freshHitDone(f.char.moves[move]);
        }
        return {
          ...f,
          hitDone,
          x: clampX(f.x + st.dir * jumpForwardSpeed, params),
          y: jumpY(frame, jumpAirFrames, jumpHeight),
          state: { name: 'air', frame, dir: st.dir, attack, used, recoilLeft: Math.max(0, st.recoilLeft - 1) },
        };
      }
      // 空中技を出していたら着地の隙（このフレームは入力を受け付けない）
      if (st.used) {
        const duration = Math.max(getMove(f.char, st.used).landingRecovery ?? params.airLandingRecovery, st.recoilLeft);
        return { ...f, y: 0, hitDone: [], state: { name: 'landing', frame: 1, duration } };
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
  const base: Fighter = { ...f, facing, hitDone: [] };

  const enter = (name: FreeStateName, x = base.x): Fighter => ({
    ...base,
    x,
    state: { name, frame: f.state.name === name ? f.state.frame + 1 : 1 },
  });

  // 同じフレームに押されたらキックを優先する（08_architecture.md の優先順位）
  const attack = (move: MoveSlot): Fighter => ({
    ...base,
    hitDone: freshHitDone(f.char.moves[move]),
    state: { name: 'attack', frame: 1, move },
  });
  if (input.pressed.kick) return attack(held.down ? 'crouchKick' : 'kick');
  if (input.pressed.punch) return attack(held.down ? 'crouchPunch' : 'punch');
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
 * 振り向けるのは自由に動ける状態と、このフレームに技・ジャンプ準備を始めた時、着地した瞬間だけ。
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
    (st.name === 'landing' && st.frame === 1) ||
    ((st.name === 'attack' || st.name === 'jumpSquat') && st.frame === 1);
  if (!canTurn || opponentX === f.x) return f;
  const facing: 1 | -1 = opponentX > f.x ? 1 : -1;
  return facing === f.facing ? f : { ...f, facing };
}
