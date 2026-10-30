import { describe, expect, it } from 'vitest';
import { lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { inputOf, NONE } from './helpers';

/** 1P（リン）が1F目に連拳（ニュートラル必殺）。2P の入力は guardUntil F目まで guard を押し続ける（省略時は押さない） */
function play(n: number, guardUntil = 0): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([lin, lin], params, [400, 460]);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, [i === 1 ? inputOf([], ['special']) : NONE, i <= guardUntil ? inputOf(['guard']) : NONE], params);
    result.push(b);
  }
  return result;
}

const frames = (t: Battle[], type: string) => t.map((b, i) => (b.events.some((e) => e.type === type) ? i + 1 : -1)).filter((i) => i > 0);

describe('連拳', () => {
  it('連拳は 8F目から 4F ごとに5回当たり、合計 90 減る', () => {
    const t = play(40);
    expect(frames(t, 'hit')).toEqual([8, 12, 16, 20, 24]);
    expect(t[39].fighters[1].health).toBe(850 - 90);
  });

  it('5発目だけ重さが中（のけぞり 18F）', () => {
    const t = play(40);
    expect(t[18].fighters[1].state).toMatchObject({ name: 'hitstun', duration: 14 });
    expect(t[19].fighters[1].state).toMatchObject({ name: 'hitstun', duration: 14 });
    expect(t[23].fighters[1].state).toMatchObject({ name: 'hitstun', duration: 18 });
  });

  it('1発目をガードしたら、相手がガードを離しても残り4発はガードになる', () => {
    const t = play(40, 8);
    expect(frames(t, 'block')).toEqual([8, 12, 16, 20, 24]);
    expect(frames(t, 'hit')).toEqual([]);
    expect(t[7].fighters[0].guardLocked).toBe(true);
  });

  it('ガード固定は相手が棒立ちでも効く（ガード硬直が切れた状態の確認）', () => {
    let b = createBattle([lin, lin], params, [400, 460]);
    b = stepBattle(b, [inputOf([], ['special']), inputOf(['guard'])], params);
    for (let i = 2; i < 8; i++) b = stepBattle(b, [NONE, inputOf(['guard'])], params);
    b = stepBattle(b, [NONE, inputOf(['guard'])], params);
    expect(b.events).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
    // 守る側を待機に戻しても、ガード固定の間は 2発目もガードになる
    b = { ...b, fighters: [b.fighters[0], { ...b.fighters[1], state: { name: 'idle', frame: 1 } }] };
    for (let i = 9; i < 12; i++) b = stepBattle(b, [NONE, NONE], params);
    b = stepBattle(b, [NONE, NONE], params);
    expect(b.events).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
  });

  it('1発目が当たっていたら、ガード固定にはならない', () => {
    const t = play(10);
    expect(t[7].fighters[0].guardLocked).toBe(false);
  });

  it('技が始まる時は guardLocked が false', () => {
    const t = play(10, 8);
    expect(t[7].fighters[0].guardLocked).toBe(true);
    let b = { ...t[7], fighters: [{ ...t[7].fighters[0], state: { name: 'idle' as const, frame: 1 } }, t[7].fighters[1]] as Battle['fighters'] };
    b = stepBattle(b, [inputOf([], ['punch']), NONE], params);
    expect(b.fighters[0].guardLocked).toBe(false);
  });
});
