import { describe, expect, it } from 'vitest';
import { lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { inputOf, NONE } from './helpers';

/** n フレーム進め、各フレームの結果を返す（[0] が1F目） */
function run(b0: Battle, n: number, inputAt: (i: number) => [ReturnType<typeof inputOf>, ReturnType<typeof inputOf>] = () => [NONE, NONE]): Battle[] {
  const out: Battle[] = [];
  let b = b0;
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    out.push(b);
  }
  return out;
}

describe('宙に浮いたまま残らない', () => {
  it('昇り蹴りの上昇中に通常技と相打ちしても、60F以内に地面に戻る', () => {
    // リンは昇り蹴りの 7F目（上昇中、次の 8F目から食らう）。相手のジャブは次のフレームが持続の1F目
    let b = createBattle([lin, lin], params, [400, 460]);
    b = {
      ...b,
      fighters: [
        { ...b.fighters[0], y: 35, hitDone: [false], state: { name: 'attack', frame: 7, move: 'downSpecial' } },
        { ...b.fighters[1], hitDone: [false], state: { name: 'attack', frame: 4, move: 'punch' } },
      ],
    };
    const t = run(b, 60);
    expect(t[0].events).toEqual([{ type: 'clash' }]);
    expect(t[0].fighters[0].y).toBeGreaterThan(0);
    const last = t[59].fighters[0];
    expect(last.y).toBe(0);
    // 宙で歩き・待機・ガードにならない
    for (const s of t) {
      const f = s.fighters[0];
      if (f.y > 0) expect(['airHit', 'attack', 'air']).toContain(f.state.name);
    }
  });

  it('連拳のガード固定は、ジャンプ中の相手にはかからず、相手は宙に残らない', () => {
    // 1発目をガードさせてガード固定にする
    let b = createBattle([lin, lin], params, [400, 460]);
    b = stepBattle(b, [inputOf([], ['special']), inputOf(['guard'])], params);
    for (let i = 2; i <= 8; i++) b = stepBattle(b, [NONE, inputOf(['guard'])], params);
    expect(b.fighters[0].guardLocked).toBe(true);
    // 守る側をジャンプ中にする（2発目が届く高さ）
    b = { ...b, fighters: [b.fighters[0], { ...b.fighters[1], y: 40, state: { name: 'air', frame: 30, dir: 0, attack: null, used: null, recoilLeft: 0 } }] };
    const t = run(b, 60);
    for (const s of t) {
      const f = s.fighters[1];
      if (f.y > 0) expect(f.state.name).not.toBe('blockstun');
    }
    expect(t[59].fighters[1].y).toBe(0);
  });
});
