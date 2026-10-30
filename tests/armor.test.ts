import { describe, expect, it } from 'vitest';
import { gonzo, lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle, type BattleEvent } from '../src/logic/battle';
import type { CharacterData, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** 1P リン・2P ゴンゾー。inputAt(i) で i F目の入力を決めて n フレーム進めた各フレームの結果（[0] が1F目） */
function run(chars: [CharacterData, CharacterData], xs: [number, number], n: number, inputAt: (i: number) => [InputFrame, InputFrame]): Battle[] {
  const result: Battle[] = [];
  let b = createBattle(chars, params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

const eventsOf = (t: Battle[]): BattleEvent[] => t.flatMap((b) => b.events);
const frameOf = (t: Battle[], type: string, attacker: 0 | 1) =>
  t.findIndex((b) => b.events.some((e) => e.type === type && 'attacker' in e && e.attacker === attacker)) + 1;

/** 1P が punch を押す。2P のゴンゾーは1F目に押した技を出す */
const jabAt = (p: number, gonzoInput: InputFrame) => (i: number): [InputFrame, InputFrame] => [
  i === p ? inputOf([], ['punch']) : NONE,
  i === 1 ? gonzoInput : NONE,
];

/** 箱が遠くまで届くジャブのリン（ラリアット突進が相手に届く前に当てるため） */
const longJab: CharacterData = {
  ...lin,
  moves: { ...lin.moves, punch: { ...lin.moves.punch, hits: [{ ...lin.moves.punch.hits[0], box: { x: 20, y: 100, w: 700, h: 20 } }] } },
};

describe('マッスルポーズ', () => {
  const pose = inputOf([], ['special']);

  it('持続中にジャブを耐え、被ダメージは 15（30 の 50%）、のけぞらない', () => {
    // リンのジャブの当たる 5F目 ＝ 7F目（リンは3F目に押す）。ゴンゾーはマッスルポーズの7F目
    const t = run([lin, gonzo], [400, 470], 8, jabAt(3, pose));
    expect(t[6].events).toEqual([{ type: 'armor', attacker: 0, damage: 15 }]);
    expect(t[6].fighters[1].health).toBe(1150 - 15);
    expect(t[6].fighters[1].x).toBe(470);
    expect(t[6].fighters[0].x).toBe(400);
  });

  it('耐えたら反撃パンチに移り、反撃パンチ（発生8F）が当たると 100 減る', () => {
    const t = run([lin, gonzo], [400, 470], 20, jabAt(3, pose));
    expect(t[6].fighters[1].state).toEqual({ name: 'attack', frame: 0, move: 'counterPunch' });
    expect(t[7].fighters[1].state).toEqual({ name: 'attack', frame: 1, move: 'counterPunch' });
    // 反撃パンチの箱は 発生8F の次、9F目（7＋9＝16F目）
    expect(frameOf(t, 'hit', 1)).toBe(16);
    expect(t[15].fighters[0].health).toBe(850 - 100);
  });

  it('アーマーは1発だけ。連拳を受けると1発目だけ耐える', () => {
    const t = run([lin, gonzo], [400, 470], 40, (i) => [i === 1 ? inputOf([], ['special']) : NONE, i === 1 ? pose : NONE]);
    expect(eventsOf(t).map((e) => e.type)).toEqual(['armor', 'hit', 'hit', 'hit', 'hit']);
    // 1発目は 18 の半分、2発目以降は反撃パンチ中のゴンゾーに普通に当たる
    expect(t[7].events).toEqual([{ type: 'armor', attacker: 0, damage: 9 }]);
    expect(t[11].fighters[1].state.name).toBe('hitstun');
    expect(t[39].fighters[1].health).toBe(1150 - 9 - 18 * 4);
  });
});

describe('ラリアット突進のアーマー', () => {
  const lariat = inputOf(['left'], ['special']);

  it('突進中に打撃を1発耐えて、そのまま当てる', () => {
    // ゴンゾー 800・リン 400。リンのジャブは 14F目に押して 18F目に当たる（ゴンゾーの18F目＝アーマー区間）
    const t = run([longJab, gonzo], [400, 800], 40, (i) => [i === 14 ? inputOf([], ['punch']) : NONE, i === 1 ? lariat : NONE]);
    expect(t[17].events).toEqual([{ type: 'armor', attacker: 0, damage: 15 }]);
    expect(t[17].fighters[1].state).toMatchObject({ name: 'attack', frame: 18, move: 'forwardSpecial' });
    expect(t[17].fighters[1].x).toBeCloseTo(800 - 38);
    // そのまま突進して当てる
    const hit = frameOf(t, 'hit', 1);
    expect(hit).toBeGreaterThan(18);
    expect(t[hit - 1].fighters[0].health).toBe(850 - 110);
    expect(frameOf(t, 'hit', 0)).toBe(0);
  });

  it('アーマーとの相打ちは相打ちにならず、アーマー側が勝つ', () => {
    // まずリンが何もしない時にラリアットが届く F目 g を調べ、リンのジャブがちょうど g F目に当たるように押す
    const alone = run([longJab, gonzo], [400, 800], 40, (i) => [NONE, i === 1 ? lariat : NONE]);
    const g = frameOf(alone, 'hit', 1);
    expect(g).toBeGreaterThan(17);
    const t = run([longJab, gonzo], [400, 800], g, (i) => [i === g - 4 ? inputOf([], ['punch']) : NONE, i === 1 ? lariat : NONE]);
    expect(t[g - 1].events).toContainEqual({ type: 'armor', attacker: 0, damage: 15 });
    expect(t[g - 1].events).toContainEqual({ type: 'hit', attacker: 1, damage: 110 });
    expect(t[g - 1].events.some((e) => e.type === 'clash')).toBe(false);
    expect(t[g - 1].fighters[0].health).toBe(850 - 110);
    expect(t[g - 1].fighters[1].state.name).toBe('attack');
  });

  it('アーマーのない技どうしの相打ちは、今までどおり相打ち', () => {
    const t = run([lin, lin], [400, 470], 6, (i) => [i === 1 ? inputOf([], ['punch']) : NONE, i === 1 ? inputOf([], ['punch']) : NONE]);
    expect(t[4].events).toEqual([{ type: 'clash' }]);
  });
});
