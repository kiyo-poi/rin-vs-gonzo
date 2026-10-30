import { describe, expect, it } from 'vitest';
import { gonzo, lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { createMatch, stepMatch, type Match } from '../src/logic/match';
import type { CharacterData, InputFrame, Params } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

function run(b0: Battle, n: number, inputAt: (i: number) => [InputFrame, InputFrame]): Battle[] {
  const result: Battle[] = [];
  let b = b0;
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

const withGauge = (b: Battle, g0: number, g1: number): Battle => ({
  ...b,
  fighters: [{ ...b.fighters[0], gauge: g0 }, { ...b.fighters[1], gauge: g1 }],
});

/** 1P リンが1F目にジャブ（30）。2P ゴンゾーは input を入れ続ける */
const jab = (p2: InputFrame) => (i: number): [InputFrame, InputFrame] => [i === 1 ? inputOf([], ['punch']) : NONE, p2];

describe('ゲージ', () => {
  it('ヒット：当てた側は 30×0.8＝24、食らった側は 30×0.4＝12 増える', () => {
    const t = run(createBattle([lin, gonzo], params, [400, 470]), 8, jab(NONE));
    const hitAt = t.findIndex((b) => b.events.some((e) => e.type === 'hit'));
    expect(hitAt).toBeGreaterThanOrEqual(0);
    expect(t[hitAt].fighters.map((f) => f.gauge)).toEqual([24, 12]);
  });

  it('ガード：ガードさせた側だけ 30×0.3＝9 増える', () => {
    const t = run(createBattle([lin, gonzo], params, [400, 470]), 8, jab(inputOf(['guard'])));
    const at = t.findIndex((b) => b.events.some((e) => e.type === 'block'));
    expect(at).toBeGreaterThanOrEqual(0);
    expect(t[at].fighters.map((f) => f.gauge)).toEqual([9, 0]);
  });

  it('1000 で止まる', () => {
    const t = run(withGauge(createBattle([lin, gonzo], params, [400, 470]), 990, 995), 8, jab(NONE));
    expect(t[7].fighters.map((f) => f.gauge)).toEqual([1000, 1000]);
  });

  it('次のラウンドに持ち越し、新しい試合では 0 から', () => {
    const quick: Params = { ...params, round: { ...params.round, introFrames: 2, endFrames: 2, timeFrames: 30 } };
    const glass: CharacterData = { ...lin, stats: { ...lin.stats, health: 30 } };
    let m: Match = createMatch([lin, glass], quick, [400, 470]);
    m = { ...m, battle: withGauge(m.battle, 500, 100) };
    let i = 0;
    while (m.phase !== 'roundEnd') {
      m = stepMatch(m, [m.phase === 'fight' && i++ === 0 ? inputOf([], ['punch']) : NONE, NONE], quick);
      if (m.phase === 'intro' && m.phaseFrame >= quick.round.introFrames) i = 0;
    }
    const end = m.battle.fighters.map((f) => f.gauge);
    expect(end).toEqual([524, 112]);
    while (m.phase === 'roundEnd') m = stepMatch(m, [NONE, NONE], quick);
    expect(m.round).toBe(2);
    expect(m.battle.fighters.map((f) => f.gauge)).toEqual(end);
    expect(createMatch([lin, glass], quick).battle.fighters.map((f) => f.gauge)).toEqual([0, 0]);
  });
});
