import { overlaps } from './boxes';
import { activeHitbox, clampX, createFighter, hurtBoxes, stepFighter } from './fighter';
import type { CharacterData, Fighter, HitData, InputFrame, Params } from './types';

export interface BattleEvent {
  type: 'hit' | 'block';
  attacker: 0 | 1;
  damage: number;
}

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
  const moved: [Fighter, Fighter] = [
    stepFighter(before0, inputs[0], before1.x, params),
    stepFighter(before1, inputs[1], before0.x, params),
  ];

  // 両者とも「動かしたあとの同じ状態」で調べる（1P が先に処理されて有利にならないように）
  const results = [resolveAttack(moved[0], moved[1]), resolveAttack(moved[1], moved[0])];

  const fighters: [Fighter, Fighter] = [moved[0], moved[1]];
  const events: BattleEvent[] = [];
  results.forEach((result, i) => {
    if (!result) return;
    const attacker = i as 0 | 1;
    const defender = (1 - i) as 0 | 1;
    const weight = params.weights[result.hit.weight];
    fighters[attacker] = { ...fighters[attacker], moveHasHit: true };
    if (result.blocked) {
      fighters[defender] = {
        ...fighters[defender],
        state: { name: 'blockstun', frame: 0, duration: weight.blockstun },
      };
      events.push({ type: 'block', attacker, damage: 0 });
    } else {
      fighters[defender] = {
        ...fighters[defender],
        health: Math.max(0, fighters[defender].health - result.hit.damage),
        // M1 は空中で食らったら即座に地面へ戻す（落下してダウンする動きは M2/M3 で作る）
        y: 0,
        state: { name: 'hitstun', frame: 0, duration: weight.hitstun },
      };
      events.push({ type: 'hit', attacker, damage: result.hit.damage });
    }
    const distance = weight.knockback * (result.blocked ? params.blockKnockbackRate : 1);
    const [pushedAttacker, pushedDefender] = applyKnockback(fighters[attacker], fighters[defender], distance, params);
    fighters[attacker] = pushedAttacker;
    fighters[defender] = pushedDefender;
  });

  return { frame: b.frame + 1, fighters, events };
}

/** 攻撃側の攻撃の箱が、守る側の食らいの箱に重なったか。重なったらガードできたかも返す */
function resolveAttack(attacker: Fighter, defender: Fighter): { hit: HitData; blocked: boolean } | null {
  const active = activeHitbox(attacker);
  if (!active) return null;
  if (!hurtBoxes(defender).some((box) => overlaps(active.box, box))) return null;
  const blocked = defender.state.name === 'guard' || defender.state.name === 'blockstun';
  return { hit: active.hit, blocked };
}

/** 守る側を攻撃側の向きへ押す。画面端で下がれない分は、攻撃側が逆へ下がる（画面端で永久に殴り続けられないように） */
function applyKnockback(attacker: Fighter, defender: Fighter, distance: number, params: Params): [Fighter, Fighter] {
  const dir = attacker.facing;
  const defenderX = clampX(defender.x + dir * distance, params);
  const shortfall = distance - Math.abs(defenderX - defender.x);
  const attackerX = clampX(attacker.x - dir * shortfall, params);
  return [{ ...attacker, x: attackerX }, { ...defender, x: defenderX }];
}
