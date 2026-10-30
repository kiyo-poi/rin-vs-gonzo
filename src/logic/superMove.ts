import { currentAttack, getMove, startMove } from './fighter';
import type { Fighter, HitData, InputFrame, MoveData, Params } from './types';

/** 必殺とガードの「押した瞬間」の差がこの F 以内なら同時押し（08_architecture.md 2.3） */
export const SUPER_INPUT_WINDOW = 3;
/** 押してからの経過 F の上限（これ以上は数えない） */
const AGE_CAP = 99;

export const FRESH_PRESS_AGE = { special: AGE_CAP, guard: AGE_CAP };

/** 今出している技が超必殺か */
export function isSuperAttack(f: Fighter): boolean {
  const cur = currentAttack(f);
  return !!cur && getMove(f.char, cur.move).kind === 'super';
}

/** 超必殺の技データ。まだ中身のない仮置き（当たりも掴みもない）なら null */
function superMoveOf(f: Fighter): MoveData | null {
  const move = (f.char.moves as Record<string, MoveData | undefined>).super;
  if (!move || move.kind !== 'super' || (move.hits.length === 0 && !move.throw)) return null;
  return move;
}

/**
 * stepFighter の結果に、超必殺の同時押しの受付をかける（08_architecture.md 2.3）。
 * - 必殺とガードの押した瞬間が 3F 以内（どちらが先でもよい）で、ゲージが満タンなら、出始めの必殺技を超必殺に差し替える
 * - 必殺を先に押した場合は必殺技がすぐ出始めていて、ガードを押したフレームに差し替える
 * - 差し替えたフレームは技の 0F目（暗転のあと 1F目から数える）。ゲージは 0 にする
 */
export function applySuperInput(next: Fighter, prevAge: Fighter['pressAge'], input: InputFrame, params: Params): Fighter {
  const pressAge = {
    special: input.pressed.special ? 0 : Math.min(AGE_CAP, prevAge.special + 1),
    guard: input.pressed.guard ? 0 : Math.min(AGE_CAP, prevAge.guard + 1),
  };
  const f: Fighter = { ...next, pressAge };
  const superMove = superMoveOf(f);
  if (!superMove || f.gauge < (superMove.meterCost ?? params.gauge.max)) return f;
  const st = f.state;
  if (st.name !== 'attack' || getMove(f.char, st.move).kind !== 'special') return f;
  // 必殺技が「必殺を押した瞬間」以降に出始めたもの（先行入力から遅れて出た場合も含む）で、
  // 必殺とガードの押した瞬間の差が 3F 以内。差し替えるのは、必殺技が出始めたフレームか、ガードを押したフレーム
  const startedAfterPress = st.frame - 1 <= pressAge.special;
  const together = Math.abs(pressAge.special - pressAge.guard) <= SUPER_INPUT_WINDOW;
  const trigger = st.frame === 1 || input.pressed.guard;
  if (!startedAfterPress || !together || !trigger) return f;
  // 差し替え：上昇する必殺技の途中でも地上から出す
  return { ...startMove({ ...f, y: 0 }, 'super', 0), gauge: 0 };
}

/** 超必殺が今のフレームに始まったか（暗転を始める合図） */
export function superStarted(f: Fighter): boolean {
  return f.state.name === 'attack' && f.state.frame === 0 && getMove(f.char, f.state.move).kind === 'super';
}

/**
 * 両者の攻撃が同時に届いた時の超必殺の扱い（08 2.4 の3番）。
 * 片方だけ超必殺なら、超必殺でない方の攻撃を消す（超必殺が一方的に勝つ）。超必殺同士は普通の相打ち
 */
export function superClashPriority<R>(fighters: [Fighter, Fighter], results: [R | null, R | null]): [R | null, R | null] {
  if (!results[0] || !results[1]) return results;
  const s0 = isSuperAttack(fighters[0]);
  const s1 = isSuperAttack(fighters[1]);
  if (s0 === s1) return results;
  return s0 ? [results[0], null] : [null, results[1]];
}

/** 超必殺がガードされた時の削りダメージ（超必殺でなければ 0）。超必殺の削りは KO できる */
export function superChipDamage(attacker: Fighter, hit: HitData, params: Params): number {
  return isSuperAttack(attacker) ? Math.floor(hit.damage * params.chipRate) : 0;
}

/**
 * 超必殺の突進は相手の手前（押し合いの幅）で止める。突進が速く、持続の前に相手をすり抜けてしまわないように。
 * 相手の前にいた時だけ止める（すでに後ろにいたら何もしない）
 */
export function limitSuperDash(prev: Fighter, next: Fighter, opponentX: number): Fighter {
  if (!isSuperAttack(next) || next.x === prev.x) return next;
  const dir = next.facing;
  if (dir * (prev.x - opponentX) >= 0) return next;
  const limit = opponentX - dir * next.char.stats.pushWidth;
  if (dir * (next.x - limit) <= 0) return next;
  return { ...next, x: dir * (prev.x - limit) > 0 ? prev.x : limit };
}
