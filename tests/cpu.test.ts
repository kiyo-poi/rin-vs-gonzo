import { describe, expect, it } from 'vitest';
import { createCpu, type CpuLevel } from '../src/cpu/cpu';
import { params, lin, gonzo } from '../src/data/data';
import { createMatch, stepMatch, type Match } from '../src/logic/match';
import { BUTTONS, type Fighter, type Params } from '../src/logic/types';
import { NONE } from './helpers';

function fightMatch(): Match {
  let m = createMatch([lin, gonzo], params);
  for (let i = 0; i <= params.round.introFrames; i++) m = stepMatch(m, [NONE, NONE], params);
  return m;
}

function withFighters(m: Match, f0: Partial<Fighter>, f1: Partial<Fighter>): Match {
  const [a, b] = m.battle.fighters;
  return { ...m, battle: { ...m.battle, fighters: [{ ...a, ...f0 }, { ...b, ...f1 }] } };
}

const attacking: Partial<Fighter> = { state: { name: 'attack', frame: 3, move: 'punch' } };

describe('CPU', () => {
  it('同じシードなら同じ入力になる', () => {
    const run = (seed: number) => {
      const cpu = createCpu('normal', params, seed);
      let m = fightMatch();
      const out: string[] = [];
      for (let i = 0; i < 600; i++) {
        const inp = cpu.next(m, 1);
        out.push(BUTTONS.filter((b) => inp.held[b]).join(','));
        m = stepMatch(m, [NONE, inp], params);
      }
      return out;
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('相手の変化には reaction フレーム経つまで反応しない', () => {
    const p: Params = { ...params, cpu: { ...params.cpu!, normal: { reaction: 18, guardRate: 1, specialRate: 0 } } };
    const cpu = createCpu('normal', p, 1);
    const base = withFighters(fightMatch(), { x: 900 }, { x: 960 });
    // 相手が攻撃を始めたフレームを T=0 とする。それ以前は待機
    for (let i = 0; i < 30; i++) cpu.next(base, 1);
    const atk = withFighters(base, { x: 900, ...attacking }, { x: 960 });
    const guardAt: number[] = [];
    for (let t = 0; t < 40; t++) {
      if (cpu.next(atk, 1).held.guard) guardAt.push(t);
    }
    expect(guardAt.length).toBeGreaterThan(0);
    expect(guardAt[0]).toBe(18);
  });

  it('つよいはやさしいよりよくガードする', () => {
    const rate = (level: CpuLevel) => {
      let guards = 0;
      const trials = 300;
      for (let s = 1; s <= trials; s++) {
        const cpu = createCpu(level, params, s);
        const base = withFighters(fightMatch(), { x: 900 }, { x: 960 });
        const atk = withFighters(base, { x: 900, ...attacking }, { x: 960 });
        let g = false;
        for (let t = 0; t < 70; t++) if (cpu.next(t < 5 ? base : atk, 1).held.guard) g = true;
        if (g) guards++;
      }
      return guards / trials;
    };
    const easy = rate('easy');
    const hard = rate('hard');
    expect(hard).toBeGreaterThan(easy + 0.3);
  });

  it('遠い相手には歩いて近づく', () => {
    const cpu = createCpu('normal', params, 3);
    const m = withFighters(fightMatch(), { x: 200 }, { x: 1600 });
    let right = 0;
    let left = 0;
    for (let i = 0; i < 40; i++) {
      const inp = cpu.next(m, 1);
      if (inp.held.left) left++;
      if (inp.held.right) right++;
    }
    expect(left).toBeGreaterThan(30);
    expect(right).toBe(0);
  });

  it('左右を同時に押さず、pressed は押した最初のフレームだけ', () => {
    const cpu = createCpu('hard', params, 11);
    let m = fightMatch();
    let prev = NONE;
    let presses = 0;
    for (let i = 0; i < 2000; i++) {
      const inp = cpu.next(m, 1);
      expect(inp.held.left && inp.held.right).toBe(false);
      for (const b of BUTTONS) {
        expect(inp.pressed[b]).toBe(inp.held[b] && !prev.held[b]);
        if (inp.pressed[b]) presses++;
      }
      prev = inp;
      m = stepMatch(m, [NONE, inp], params);
    }
    expect(presses).toBeGreaterThan(0);
  });

  it('ふつうのCPUは棒立ちの相手に30秒以内にダメージを与える', () => {
    const cpu = createCpu('normal', params, 5);
    let m = fightMatch();
    for (let i = 0; i < 1800 && m.battle.fighters[0].health === lin.stats.health; i++) {
      m = stepMatch(m, [NONE, cpu.next(m, 1)], params);
    }
    expect(m.battle.fighters[0].health).toBeLessThan(lin.stats.health);
  });
});
