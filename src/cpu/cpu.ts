import { getMove } from '../logic/fighter';
import type { Match } from '../logic/match';
import { BUTTONS, type Button, type Fighter, type InputFrame, type MoveSlot, type Params } from '../logic/types';

export type CpuLevel = 'easy' | 'normal' | 'hard';

export interface CpuController {
  /** Called once per frame while the match runs; returns this frame's buttons for player `self`. */
  next(match: Match, self: 0 | 1): InputFrame;
}

const FALLBACK = {
  easy: { reaction: 30, guardRate: 0.2, specialRate: 0.05 },
  normal: { reaction: 18, guardRate: 0.5, specialRate: 0.25 },
  hard: { reaction: 10, guardRate: 0.8, specialRate: 0.5 },
};

/** mulberry32 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isFree(f: Fighter): boolean {
  const n = f.state.name;
  return n === 'idle' || n === 'walkForward' || n === 'walkBack' || n === 'crouch';
}

/** 相手の技の届く距離（足元の中心どうし）。パンチ・キックの箱の先まで */
function reachOf(f: Fighter): number {
  const m = f.char.moves;
  const r = (s: MoveSlot) => m[s].hits.reduce((a, h) => Math.max(a, h.box.x + h.box.w), 0);
  return Math.max(r('punch'), r('kick'));
}

type Plan = { kind: 'retreat' | 'jump' | 'wait'; left: number } | null;

export function createCpu(level: CpuLevel, params: Params, seed: number): CpuController {
  const cfg = (params.cpu ?? FALLBACK)[level];
  const rng = makeRng(seed);
  /** 相手の過去の姿。reaction フレーム前のものを見て判断する */
  const history: Fighter[] = [];
  let prevHeld: Record<Button, boolean> = Object.fromEntries(BUTTONS.map((b) => [b, false])) as Record<Button, boolean>;
  let plan: Plan = null;
  let cooldown = 0;
  let guarding = false;
  /** 同じ攻撃に2回判定しないための目印 */
  let seenAttack = false;
  let lastRound = -1;

  return {
    next(match, self) {
      if (match.round !== lastRound) {
        lastRound = match.round;
        history.length = 0;
        plan = null;
        guarding = false;
        seenAttack = false;
      }
      const me = match.battle.fighters[self];
      const opp = match.battle.fighters[self === 0 ? 1 : 0];
      history.push(opp);
      if (history.length > cfg.reaction + 1) history.shift();
      const seen = history[0]; // 反応の遅れ分だけ前の相手

      const held = Object.fromEntries(BUTTONS.map((b) => [b, false])) as Record<Button, boolean>;
      const active = match.phase === 'fight';
      if (active) decide(me, opp, seen, held);
      if (held.left && held.right) {
        held.left = false;
        held.right = false;
      }
      const pressed = Object.fromEntries(BUTTONS.map((b) => [b, held[b] && !prevHeld[b]])) as Record<Button, boolean>;
      prevHeld = held;
      return { held, pressed };
    },
  };

  function decide(me: Fighter, opp: Fighter, seen: Fighter, held: Record<Button, boolean>): void {
    const dx = seen.x - me.x;
    const dist = Math.abs(dx);
    const toward: Button = dx >= 0 ? 'right' : 'left';
    const away: Button = dx >= 0 ? 'left' : 'right';
    const myReach = reachOf(me);
    const oppReach = reachOf(seen);
    if (cooldown > 0) cooldown--;

    // 相手の攻撃：始まりを見た時に一度だけ、ガードするか決める
    const st = seen.state;
    const oppAttack = st.name === 'attack' ? st.move : st.name === 'air' && st.attack ? st.attack.move : null;
    if (oppAttack) {
      if (!seenAttack) {
        seenAttack = true;
        guarding = rng() < cfg.guardRate;
      }
    } else {
      seenAttack = false;
      guarding = false;
    }
    if (guarding && oppAttack && isFree(me) && dist <= oppReach + 60) {
      held.guard = true;
      if (getMove(seen.char, oppAttack).posture === 'crouch') held.down = true;
      return;
    }
    if (!isFree(me)) return;

    if (plan) {
      if (plan.kind === 'retreat') held[away] = true;
      else if (plan.kind === 'jump' && plan.left === 1) {
        held.up = true;
        held[toward] = true;
      }
      plan.left--;
      if (plan.left <= 0) plan = null;
      return;
    }

    // 相手が硬直中で届くなら反撃（つよい）／届く位置ならときどき攻撃
    const oppRecovering = st.name === 'attack' && st.frame > getMove(seen.char, st.move).startup + getMove(seen.char, st.move).active;
    const inRange = dist <= myReach;
    if (inRange && cooldown === 0) {
      const punish = level === 'hard' && oppRecovering;
      if (punish || rng() < 0.12) {
        attack(held, toward);
        return;
      }
      if (rng() < 0.01) {
        plan = { kind: 'retreat', left: 10 + Math.floor(rng() * 20) };
        return;
      }
    }
    if (dist > myReach - 10) {
      if (dist > 220 && dist < 420 && rng() < 0.004) {
        plan = { kind: 'jump', left: 1 };
        return;
      }
      held[toward] = true;
    }
  }

  function attack(held: Record<Button, boolean>, toward: Button): void {
    cooldown = 8 + Math.floor(rng() * 12);
    if (rng() < cfg.specialRate) {
      held.special = true;
      const r = rng();
      if (r < 0.34) held[toward] = true;
      else if (r < 0.67) held.down = true;
      return;
    }
    const r = rng();
    if (r < 0.3) held.punch = true;
    else if (r < 0.6) held.kick = true;
    else if (r < 0.8) {
      held.down = true;
      held.punch = true;
    } else {
      held.down = true;
      held.kick = true;
    }
  }
}
