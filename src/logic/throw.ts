import { getMove, isAirborne, isHittable } from './fighter';
import type { Fighter } from './types';

/** 掴める状態か。空中・のけぞり・ガード硬直・ダウン・無敵・投げの最中は掴めない（ジャンプの踏み込み中は掴める） */
export function isGrabbable(f: Fighter): boolean {
  if (!isHittable(f) || isAirborne(f)) return false;
  const name = f.state.name;
  return name !== 'hitstun' && name !== 'blockstun' && name !== 'knockdown' && name !== 'airHit' && name !== 'thrown' && name !== 'throwing';
}

/** 掴みが届くか。相手が前にいて、2人の押し合いの幅の外側どうしの隙間が range 以下 */
export function grabReaches(attacker: Fighter, defender: Fighter, range: number): boolean {
  const dx = (defender.x - attacker.x) * attacker.facing;
  if (dx < 0) return false;
  const gap = dx - (attacker.char.stats.pushWidth + defender.char.stats.pushWidth) / 2;
  return gap <= range;
}

/** 掴みの箱が出ているフレームで、相手に届いているか */
export function grabConnects(attacker: Fighter, defender: Fighter): boolean {
  const st = attacker.state;
  if (st.name !== 'attack') return false;
  const move = getMove(attacker.char, st.move);
  if (!move.throw || st.frame <= move.startup || st.frame > move.startup + move.active) return false;
  return isGrabbable(defender) && grabReaches(attacker, defender, move.throw.range);
}
