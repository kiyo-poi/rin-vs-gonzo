import { overlaps } from './boxes';
import { activeHitbox, clampX, clashRecoil, createFighter, currentAttack, faceOpponent, hurtBoxes, isAirborne, getMove, isCrouching, isHittable, startMove, stepFighter } from './fighter';
import { gainGauge } from './gauge';
import { limitDistance, resolvePush } from './position';
import { isSuperAttack, superChipDamage, superClashPriority, superStarted } from './superMove';
import type { CharacterData, Fighter, FighterState, HitData, InputFrame, Params } from './types';

export type BattleEvent =
  | { type: 'hit' | 'block' | 'armor'; attacker: 0 | 1; damage: number }
  | { type: 'clash' }
  | { type: 'superStart'; attacker: 0 | 1 };

export interface Battle {
  frame: number;
  fighters: [Fighter, Fighter];
  /** このフレームに起きたことだけ。描画・音はこれを見て演出する */
  events: BattleEvent[];
  /** 超必殺の暗転の残り F（0 なら止まっていない）。この間は2人ともタイマーも止まり、入力は捨てる。描画はこれで画面を暗くする */
  freeze: number;
}

export function createBattle(chars: [CharacterData, CharacterData], params: Params, xs?: [number, number]): Battle {
  const center = params.stage.width / 2;
  const half = params.stage.startDistance / 2;
  const [x0, x1] = xs ?? [center - half, center + half];
  return {
    frame: 0,
    fighters: [createFighter(chars[0], x0, 1), createFighter(chars[1], x1, -1)],
    events: [],
    freeze: 0,
  };
}

/** 2人を1フレーム進める */
export function stepBattle(b: Battle, inputs: [InputFrame, InputFrame], params: Params): Battle {
  // [超必殺] 暗転中は誰も動かない
  if (b.freeze > 0) return { ...b, frame: b.frame + 1, freeze: b.freeze - 1, events: [] };
  const stepped = stepBattleBase(b, inputs, params);
  // [超必殺] このフレームに超必殺が始まったら、暗転を始める（技の 1F目は暗転のあと）
  const started = ([0, 1] as const).filter((i) => superStarted(stepped.fighters[i]));
  if (started.length === 0) return stepped;
  return {
    ...stepped,
    freeze: params.superFlash,
    events: [...stepped.events, ...started.map((attacker): BattleEvent => ({ type: 'superStart', attacker }))],
  };
}

function stepBattleBase(b: Battle, inputs: [InputFrame, InputFrame], params: Params): Battle {
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
  // [超必殺] 片方だけ超必殺なら、もう片方の攻撃は消える（超必殺が一方的に勝つ）
  const results = superClashPriority(moved, [resolveAttack(moved[0], moved[1]), resolveAttack(moved[1], moved[0])]);

  // 両者の攻撃が同時に届いたら相打ち。ダメージ・ガード・ノックバックなしで両者が弾かれる。
  // ただし片方がアーマーで耐えられるなら相打ちにせず、アーマー側が耐えてアーマー側の打撃が当たる（08 2.4 の3番）
  if (results[0] && results[1] && !results[0].armored && !results[1].armored) {
    return {
      frame: b.frame + 1,
      fighters: [clashRecoil(moved[0], params), clashRecoil(moved[1], params)],
      events: [{ type: 'clash' }],
      freeze: 0,
    };
  }

  const fighters: [Fighter, Fighter] = [moved[0], moved[1]];
  const beforeKnockback: [Fighter, Fighter] = [moved[0], moved[1]];
  const events: BattleEvent[] = [];
  // 当たった当たりは先に全部済みにする（耐えた側が派生技に移っても、攻撃側の記録が混ざらないように）
  results.forEach((result, i) => {
    if (result) fighters[i] = markHitDone(fighters[i], result.index);
  });
  results.forEach((result, i) => {
    if (!result) return;
    const attacker = i as 0 | 1;
    const defender = (1 - i) as 0 | 1;
    const weight = params.weights[result.hit.weight];
    if (result.armored) {
      // アーマーで耐える：被ダメージは割合だけ、のけぞり・ノックバックなし。耐えられる数を1つ減らし、派生技があれば移る
      const d = fighters[defender];
      const damage = Math.floor(result.hit.damage * (d.char.stats.armorDamageRate ?? 1));
      const cur = currentAttack(d);
      const onAbsorb = cur ? getMove(d.char, cur.move).armor?.onAbsorb : undefined;
      const absorbed = { ...d, health: Math.max(0, d.health - damage), armorLeft: d.armorLeft - 1 };
      fighters[defender] = onAbsorb ? startMove(absorbed, onAbsorb, 0) : absorbed;
      events.push({ type: 'armor', attacker, damage });
      [fighters[0], fighters[1]] = gainGauge(fighters, attacker, 'armor', damage, false, params);
      return;
    }
    if (result.blocked) {
      // ガード固定の技は、1発目がガードされたら残りの当たりもガード扱いにする
      const cur = currentAttack(fighters[attacker]);
      if (cur && getMove(fighters[attacker].char, cur.move).guardLock) fighters[attacker] = { ...fighters[attacker], guardLocked: true };
      // [超必殺] 超必殺の削りは KO できる
      const chip = superChipDamage(fighters[attacker], result.hit, params);
      fighters[defender] = {
        ...fighters[defender],
        health: Math.max(0, fighters[defender].health - chip),
        state: { name: 'blockstun', frame: 0, duration: weight.blockstun, crouch: isCrouching(fighters[defender]) },
      };
      events.push({ type: 'block', attacker, damage: chip });
      [fighters[0], fighters[1]] = gainGauge(fighters, attacker, 'guarded', result.hit.damage, isSuperAttack(fighters[attacker]), params);
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
      [fighters[0], fighters[1]] = gainGauge(fighters, attacker, 'hit', result.hit.damage, isSuperAttack(fighters[attacker]), params);
    }
    const distance = weight.knockback * (result.blocked ? params.blockKnockbackRate : 1);
    const [pushedAttacker, pushedDefender] = applyKnockback(fighters[attacker], fighters[defender], distance, params);
    fighters[attacker] = pushedAttacker;
    fighters[defender] = pushedDefender;
  });

  // ノックバックのあとにも、2人の距離の上限をかけ直す（画面端は applyKnockback の clampX が守る）
  const limited = limitDistance(fighters, beforeKnockback, params);
  return { frame: b.frame + 1, fighters: limited, events, freeze: 0 };
}

function markHitDone(f: Fighter, index: number): Fighter {
  const hitDone = f.hitDone.slice();
  hitDone[index] = true;
  return { ...f, hitDone };
}

/** 攻撃側の攻撃の箱が、守る側の食らいの箱に重なったか。重なったらガードできたかも返す */
function resolveAttack(attacker: Fighter, defender: Fighter): { hit: HitData; index: number; blocked: boolean; armored: boolean } | null {
  const active = activeHitbox(attacker);
  if (!active || !isHittable(defender)) return null;
  // 地上だけに当たる当たり（衝撃波）は、空中の相手には当たらない
  if (active.hit.groundOnly && isAirborne(defender)) return null;
  if (!hurtBoxes(defender).some((box) => overlaps(active.box, box))) return null;
  const blocked = attacker.guardLocked || defender.state.name === 'guard' || defender.state.name === 'blockstun';
  // [超必殺] 超必殺はアーマーを無視する
  return { hit: active.hit, index: active.index, blocked, armored: isArmored(defender) && !isSuperAttack(attacker) };
}

/** 守る側が今、アーマーで打撃を耐えられるか（技のアーマー区間の中で、耐えられる数が残っている） */
function isArmored(defender: Fighter): boolean {
  const cur = currentAttack(defender);
  if (!cur || defender.armorLeft <= 0) return false;
  const armor = getMove(defender.char, cur.move).armor;
  return !!armor && cur.frame >= armor.frames.from && cur.frame <= armor.frames.to;
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
