import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle } from '../src/logic/battle';
import { activeHitbox, hurtBoxes } from '../src/logic/fighter';
import { fighterTimeline, inputOf, NONE } from './helpers';

const at1 = (held: Parameters<typeof inputOf>[0], pressed: Parameters<typeof inputOf>[1]) => (i: number) =>
  i === 1 ? inputOf(held, pressed) : NONE;

describe('しゃがみパンチ（下段掌）', () => {
  const t = fighterTimeline(20, at1(['down'], ['punch']));

  it('↓＋パンチで下段掌が出る。攻撃の箱は 6〜8F目だけ', () => {
    expect(t[0].state).toEqual({ name: 'attack', frame: 1, move: 'crouchPunch' });
    const active = t.map((f) => activeHitbox(f) !== null);
    expect(active.map((a, i) => (a ? i : -1)).filter((i) => i >= 0)).toEqual([5, 6, 7]);
  });

  it('技の最中は、しゃがみの食らいの箱（高さ 100）', () => {
    expect(hurtBoxes(t[0])[0].h).toBe(100);
  });
});

describe('しゃがみキック（足払い）', () => {
  const t = fighterTimeline(32, at1(['down'], ['kick']));

  it('全体 30F、31F目から動ける', () => {
    expect(t[0].state).toEqual({ name: 'attack', frame: 1, move: 'crouchKick' });
    expect(t[29].state).toEqual({ name: 'attack', frame: 30, move: 'crouchKick' });
    expect(t[30].state.name).not.toBe('attack');
  });
});

describe('しゃがみガード', () => {
  it('↓＋ガードはしゃがみガード（食らいの箱の高さ 100、crouch: true）', () => {
    const t = fighterTimeline(2, () => inputOf(['down', 'guard']));
    expect(t[1].state).toEqual({ name: 'guard', frame: 2, crouch: true });
    expect(hurtBoxes(t[1])[0].h).toBe(100);
  });

  it('↓なしのガードは立ちガード（crouch: false）', () => {
    const t = fighterTimeline(1, () => inputOf(['guard']));
    expect(t[0].state).toEqual({ name: 'guard', frame: 1, crouch: false });
    expect(hurtBoxes(t[0])[0].h).toBe(160);
  });

  it('しゃがみガード中に立ちキックを受けてもガードになる（上下段なし）', () => {
    let b = createBattle([proto, proto], params, [400, 500]);
    const events: unknown[][] = [];
    for (let i = 1; i <= 9; i++) {
      b = stepBattle(b, [i === 1 ? inputOf([], ['kick']) : NONE, inputOf(['down', 'guard'])], params);
      events.push(b.events);
    }
    expect(events[8]).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
    expect(b.fighters[1].health).toBe(850);
  });
});

describe('しゃがみの姿勢は硬直中も保つ', () => {
  /** 2P が guardInput で構え、1P が1F目にキック。キックは9F目に当たる */
  function blockKick(guardInput: ReturnType<typeof inputOf>) {
    let b = createBattle([proto, proto], params, [400, 500]);
    for (let i = 1; i <= 9; i++) b = stepBattle(b, [i === 1 ? inputOf([], ['kick']) : NONE, guardInput], params);
    return b;
  }

  it('しゃがみガードでキックを受けたら、ガード硬直中もしゃがみの食らいの箱（高さ 100）', () => {
    const b = blockKick(inputOf(['down', 'guard']));
    expect(b.events).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
    expect(b.fighters[1].state).toMatchObject({ name: 'blockstun', crouch: true });
    expect(hurtBoxes(b.fighters[1])[0].h).toBe(100);
  });

  it('立ちガードで受けたら、ガード硬直中も立ちの箱（高さ 160）', () => {
    const b = blockKick(inputOf(['guard']));
    expect(b.fighters[1].state).toMatchObject({ name: 'blockstun', crouch: false });
    expect(hurtBoxes(b.fighters[1])[0].h).toBe(160);
  });

  it('しゃがみで食らったら、のけぞり中もしゃがみの箱', () => {
    let b = createBattle([proto, proto], params, [400, 500]);
    for (let i = 1; i <= 9; i++) b = stepBattle(b, [i === 1 ? inputOf([], ['kick']) : NONE, inputOf(['down'])], params);
    expect(b.fighters[1].state).toMatchObject({ name: 'hitstun', crouch: true });
    expect(hurtBoxes(b.fighters[1])[0].h).toBe(100);
  });

  it('しゃがみ技の最中に食らっても、のけぞり中はしゃがみの箱', () => {
    let b = createBattle([proto, proto], params, [400, 500]);
    for (let i = 1; i <= 9; i++) {
      b = stepBattle(b, [i === 1 ? inputOf([], ['kick']) : NONE, i === 5 ? inputOf(['down'], ['punch']) : NONE], params);
    }
    expect(b.fighters[1].state).toMatchObject({ name: 'hitstun', crouch: true });
  });

  it('リンのジャブ（y 100〜120）は、しゃがみのガード硬直中のリンには当たらない。立ちなら当たる', () => {
    const jab = (crouch: boolean) => {
      let b = createBattle([proto, proto], params, [400, 450]);
      b = { ...b, fighters: [b.fighters[0], { ...b.fighters[1], state: { name: 'blockstun', frame: 1, duration: 14, crouch } }] };
      const events: unknown[] = [];
      for (let i = 1; i <= 8; i++) {
        b = stepBattle(b, [i === 1 ? inputOf([], ['punch']) : NONE, NONE], params);
        events.push(...b.events);
      }
      return events;
    };
    expect(jab(true)).toEqual([]);
    expect(jab(false)).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
  });
});
