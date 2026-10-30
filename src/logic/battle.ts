import { overlaps } from './boxes';
import { activeHitbox, clampX, clashRecoil, createFighter, currentAttack, faceOpponent, hurtBoxes, isAirborne, getMove, isCrouching, isHittable, stepFighter } from './fighter';
import { limitDistance, resolvePush } from './position';
import type { CharacterData, Fighter, FighterState, HitData, InputFrame, Params } from './types';

export type BattleEvent = { type: 'hit' | 'block'; attacker: 0 | 1; damage: number } | { type: 'clash' };

export interface Battle {
  frame: number;
  fighters: [Fighter, Fighter];
  /** このフレームに起きたことだけ。描画・音はこれを見て演出する */
  events: BattleEvent[];
}

export function createBattle(chars: [CharacterData, CharacterData], params: Params, xs?: [number, number]): Battle {
  const center = params.stage.width / 2;
  const half = params.stage.startDistance / 2;
  const [x0, x1] = xs ?? [center - half, center + half];
  return {
    frame: 0,
    fighters: [createFighter(chars[0], x0, 1), createFighter(chars[1], x1, -1)],
    events: [],
  };
}

/** 2人を1フレーム進める */
export function stepBattle(b: Battle, inputs: [InputFrame, InputFrame], params: Params): Battle {
  const [before0, before1] = b.fighters;
  const stepped: [Fighter, Fighter] = [
    stepFighter(before0, inputs[0], before1.x, params),
    stepFighter(before1, inputs[1], before0.x, params),
  ];
  // 判定の前に、押し合い → 2人の距離の上限 の順で位置を直す（08_architecture.md 2.4 の5番）
  const pushed = limitDistance(resolvePush(stepped, b.fighters, params), b.fighters, params);
  // 押し合いで左右が入れ替わることがあるので、動かしたあとの位置で向きを決め直す（6番）
  const moved: [Fighter, Fighter] = [faceOpponent(pushed[0], pushed[1].x), faceOpponent(pushed[1], pushed[0].x)];

  // 両者とも「動かしたあとの同じ状態」で調べる（1P が先に処理されて有利にならないように）
  const results = [resolveAttack(moved[0], moved[1]), resolveAttack(moved[1], moved[0])];

  // 両者の攻撃が同時に届いたら相打ち。ダメージ・ガード・ノックバックなしで両者が弾かれる
  if (results[0] && results[1]) {
    return {
      frame: b.frame + 1,
      fighters: [clashRecoil(moved[0], params), clashRecoil(moved[1], params)],
      events: [{ type: 'clash' }],
    };
  }

  const fighters: [Fighter, Fighter] = [moved[0], moved[1]];
  const beforeKnockback: [Fighter, Fighter] = [moved[0], moved[1]];
  const events: BattleEvent[] = [];
  results.forEach((result, i) => {
    if (!result) return;
    const attacker = i as 0 | 1;
    const defender = (1 - i) as 0 | 1;
    const weight = params.weights[result.hit.weight];
    fighters[attacker] = markHitDone(fighters[attacker], result.index);
    if (result.blocked) {
      // ガード固定の技は、1発目がガードされたら残りの当たりもガード扱いにする
      const cur = currentAttack(fighters[attacker]);
      if (cur && getMove(fighters[attacker].char, cur.move).guardLock) fighters[attacker] = { ...fighters[attacker], guardLocked: true };
      fighters[defender] = {
        ...fighters[defender],
        state: { name: 'blockstun', frame: 0, duration: weight.blockstun, crouch: isCrouching(fighters[defender]) },
      };
      events.push({ type: 'block', attacker, damage: 0 });
    } else {
      const d = fighters[defender];
      const health = Math.max(0, d.health - result.hit.damage);
      // 空中で食らったら落下（y はそのまま）。ただし倒れる一撃なら、KO 画面で宙に浮かないようすぐ地面に倒す。
      // 地上で knockdown の技ならダウン。それ以外はのけぞり
      const knockdown: FighterState = { name: 'knockdown', frame: 0, duration: params.knockdownFrames };
      const wasAir = isAirborne(d);
      const state: FighterState =
        wasAir && health === 0 ? knockdown
        : wasAir ? { name: 'airHit', frame: 0 }
        : result.hit.knockdown ? knockdown
        : { name: 'hitstun', frame: 0, duration: weight.hitstun, crouch: isCrouching(d) };
      fighters[defender] = { ...d, health, y: wasAir && health === 0 ? 0 : d.y, state };
      events.push({ type: 'hit', attacker, damage: result.hit.damage });
    }
    const distance = weight.knockback * (result.blocked ? params.blockKnockbackRate : 1);
    const [pushedAttacker, pushedDefender] = applyKnockback(fighters[attacker], fighters[defender], distance, params);
    fighters[attacker] = pushedAttacker;
    fighters[defender] = pushedDefender;
  });

  // ノックバックのあとにも、2人の距離の上限をかけ直す（画面端は applyKnockback の clampX が守る）
  const limited = limitDistance(fighters, beforeKnockback, params);
  return { frame: b.frame + 1, fighters: limited, events };
}

function markHitDone(f: Fighter, index: number): Fighter {
  const hitDone = f.hitDone.slice();
  hitDone[index] = true;
  return { ...f, hitDone };
}

/** 攻撃側の攻撃の箱が、守る側の食らいの箱に重なったか。重なったらガードできたかも返す */
function resolveAttack(attacker: Fighter, defender: Fighter): { hit: HitData; index: number; blocked: boolean } | null {
  const active = activeHitbox(attacker);
  if (!active || !isHittable(defender)) return null;
  // 地上だけに当たる当たり（衝撃波）は、空中の相手には当たらない
  if (active.hit.groundOnly && isAirborne(defender)) return null;
  if (!hurtBoxes(defender).some((box) => overlaps(active.box, box))) return null;
  const blocked = attacker.guardLocked || defender.state.name === 'guard' || defender.state.name === 'blockstun';
  return { hit: active.hit, index: active.index, blocked };
}

/** ノックバックの向き。相手が右なら 1、左なら -1、同じ位置なら攻撃側の向き */
export function knockbackDirection(attacker: Fighter, defender: Fighter): 1 | -1 {
  return defender.x > attacker.x ? 1 : defender.x < attacker.x ? -1 : attacker.facing;
}

/** 守る側を攻撃側から遠ざける向きへ押す。画面端で下がれない分は、攻撃側が逆へ下がる（画面端で永久に殴り続けられないように） */
function applyKnockback(attacker: Fighter, defender: Fighter, distance: number, params: Params): [Fighter, Fighter] {
  const dir = knockbackDirection(attacker, defender);
  const defenderX = clampX(defender.x + dir * distance, params);
  const shortfall = distance - Math.abs(defenderX - defender.x);
  const attackerX = clampX(attacker.x - dir * shortfall, params);
  return [{ ...attacker, x: attackerX }, { ...defender, x: defenderX }];
}
