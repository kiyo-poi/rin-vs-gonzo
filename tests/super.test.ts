import { describe, expect, it } from 'vitest';
import { gonzo, lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import { createFighter, isHittable, stepFighter } from '../src/logic/fighter';
import { createMatch, stepMatch, type Match } from '../src/logic/match';
import type { CharacterData, Fighter, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

const FULL = params.gauge.max;
const SUPER = inputOf([], ['special', 'guard']);
const SPECIAL = inputOf([], ['special']);
const GUARD = inputOf([], ['guard']);

function battleOf(chars: [CharacterData, CharacterData], xs: [number, number], gauges: [number, number] = [FULL, 0]): Battle {
  const b = createBattle(chars, params, xs);
  return { ...b, fighters: [{ ...b.fighters[0], gauge: gauges[0] }, { ...b.fighters[1], gauge: gauges[1] }] };
}

function run(b0: Battle, n: number, inputAt: (i: number) => [InputFrame, InputFrame]): Battle[] {
  const result: Battle[] = [];
  let b = b0;
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputAt(i), params);
    result.push(b);
  }
  return result;
}

/** 1P だけが入力する（i F目の入力） */
const p1 = (at: Record<number, InputFrame>) => (i: number): [InputFrame, InputFrame] => [at[i] ?? NONE, NONE];
const moveOf = (f: Fighter) => (f.state.name === 'attack' ? f.state.move : null);

describe('超必殺の受付', () => {
  it('ゲージ満タンで必殺＋ガード同時押し → 超必殺。ゲージは 0、暗転 30F、superStart', () => {
    const t = run(battleOf([lin, gonzo], [400, 1200]), 1, p1({ 1: SUPER }));
    expect(t[0].fighters[0].state).toEqual({ name: 'attack', frame: 0, move: 'super' });
    expect(t[0].fighters[0].gauge).toBe(0);
    expect(t[0].freeze).toBe(30);
    expect(t[0].events).toEqual([{ type: 'superStart', attacker: 0 }]);
  });

  it('ゲージが満タンでなければ通常の必殺技が出る', () => {
    const t = run(battleOf([lin, gonzo], [400, 1200], [FULL - 1, 0]), 1, p1({ 1: SUPER }));
    expect(moveOf(t[0].fighters[0])).toBe('special');
    expect(t[0].fighters[0].gauge).toBe(FULL - 1);
    expect(t[0].freeze).toBe(0);
  });

  it('ガードが先：3F 後の必殺までは超必殺、4F 後は通常の必殺', () => {
    expect(moveOf(run(battleOf([lin, gonzo], [400, 1200]), 4, p1({ 1: GUARD, 4: SPECIAL }))[3].fighters[0])).toBe('super');
    expect(moveOf(run(battleOf([lin, gonzo], [400, 1200]), 5, p1({ 1: GUARD, 5: SPECIAL }))[4].fighters[0])).toBe('special');
  });

  it('必殺が先：必殺技はすぐ出始め、3F 後のガードで超必殺に差し替わる。4F 後は差し替わらない', () => {
    const ok = run(battleOf([lin, gonzo], [400, 1200]), 4, p1({ 1: SPECIAL, 4: GUARD }));
    expect(moveOf(ok[0].fighters[0])).toBe('special');
    expect(ok[3].fighters[0].state).toEqual({ name: 'attack', frame: 0, move: 'super' });
    expect(ok[3].events).toEqual([{ type: 'superStart', attacker: 0 }]);
    const late = run(battleOf([lin, gonzo], [400, 1200]), 5, p1({ 1: SPECIAL, 5: GUARD }));
    expect(moveOf(late[4].fighters[0])).toBe('special');
    expect(late[4].fighters[0].gauge).toBe(FULL);
  });

  it('ガードを押しっぱなしで必殺を押しても（押した瞬間が 3F より前なら）通常の必殺', () => {
    const t = run(battleOf([lin, gonzo], [400, 1200]), 10, (i) => [i === 1 ? GUARD : i === 10 ? inputOf(['guard'], ['special']) : inputOf(['guard']), NONE]);
    expect(moveOf(t[9].fighters[0])).toBe('special');
  });

});

describe('ゴンゾーの超必殺 ジャイアントスイング（コマンド投げ）', () => {
  // 押し合いの幅の外側どうしの隙間が 50px（掴み間合い 100px の内側）
  const near: [number, number] = [400, 400 + (gonzo.stats.pushWidth + lin.stats.pushWidth) / 2 + 50];
  const HOLD_GUARD = inputOf(['guard']);

  /** ゴンゾーが 1F目に超必殺、林は guard を押し続ける。throw イベントまでと、その後の投げ終わりまでを返す */
  function swing(p2: (i: number) => InputFrame = () => HOLD_GUARD, gauge = FULL, n = 120) {
    return run(battleOf([gonzo, lin], near, [gauge, 0]), n, (i) => [i === 1 ? SUPER : NONE, p2(i)]);
  }

  it('ゲージ 1000 を使い、暗転 30F（superStart）', () => {
    const t = swing();
    expect(t[0].fighters[0].state).toEqual({ name: 'attack', frame: 0, move: 'super' });
    expect(t[0].fighters[0].gauge).toBe(0);
    expect(t[0].freeze).toBe(30);
    expect(t[0].events).toEqual([{ type: 'superStart', attacker: 0 }]);
  });

  it('ガード中の相手も掴む（ガード不能）。投げ抜けできず、300 ダメージでダウン', () => {
    // 投げられている間ずっと掴みを連打しても抜けられない
    const t = swing((i) => (i > 30 ? inputOf([], ['grab']) : HOLD_GUARD));
    const thrownAt = t.findIndex((b) => b.events.some((e) => e.type === 'throw'));
    expect(thrownAt).toBeGreaterThan(0);
    expect(t[thrownAt].fighters[1].state).toMatchObject({ name: 'thrown', techable: false, damage: 300 });
    expect(t.some((b) => b.events.some((e) => e.type === 'tech'))).toBe(false);
    const done = t.find((b) => b.fighters[1].state.name === 'knockdown')!;
    expect(done.fighters[1].health).toBe(lin.stats.health - 300);
  });

  it('投げ終わりに相手を画面端の方へ 300px 運ぶ（ステージ端で止まる）', () => {
    const t = swing();
    const before = t.find((b) => b.fighters[1].state.name === 'thrown')!.fighters[1].x;
    const done = t.find((b) => b.fighters[1].state.name === 'knockdown')!;
    expect(done.fighters[1].x).toBe(before + 300);
    // 端の近く：端で止まる
    const edge = params.stage.width - params.stage.edgeMargin;
    const b0 = battleOf([gonzo, lin], [edge - 150, edge - 150 + (gonzo.stats.pushWidth + lin.stats.pushWidth) / 2 + 20]);
    const t2 = run(b0, 120, (i) => [i === 1 ? SUPER : NONE, HOLD_GUARD]);
    expect(t2.find((b) => b.fighters[1].state.name === 'knockdown')!.fighters[1].x).toBe(edge);
  });

  it('ジャンプ中の相手は掴めない（空振り）', () => {
    // 林が先に跳び、ゴンゾーは林が空中にいる間に超必殺を出す
    const t = run(battleOf([gonzo, lin], near), 80, (i) => [i === 6 ? SUPER : NONE, i === 1 ? inputOf(['up'], ['up']) : i < 4 ? inputOf(['up']) : NONE]);
    const started = t.findIndex((b) => moveOf(b.fighters[0]) === 'super');
    expect(started).toBe(5);
    expect(t[started + 31].fighters[1].y).toBeGreaterThan(0);
    expect(t.some((b) => b.events.some((e) => e.type === 'throw'))).toBe(false);
    expect(t.every((b) => b.fighters[1].health === lin.stats.health)).toBe(true);
  });

  it('ゲージが満タンでなければ通常の必殺（投げにならない）', () => {
    const t = swing(() => HOLD_GUARD, FULL - 1);
    expect(moveOf(t[0].fighters[0])).toBe('special');
    expect(t[0].freeze).toBe(0);
  });
});

describe('暗転', () => {
  it('30F の間は2人とも止まり、タイマーも止まる。そのあと超必殺が 1F目から動く', () => {
    let m: Match = { ...createMatch([lin, gonzo], params, [400, 1200]), phase: 'fight', phaseFrame: 0 };
    m = { ...m, battle: battleOf([lin, gonzo], [400, 1200]) };
    m = stepMatch(m, [SUPER, inputOf(['right'])], params);
    const started = m;
    for (let i = 0; i < 30; i++) {
      m = stepMatch(m, [NONE, inputOf(['left'], ['punch'])], params);
      expect(m.battle.fighters).toEqual(started.battle.fighters);
      expect(m.timeLeft).toBe(started.timeLeft);
    }
    expect(m.battle.freeze).toBe(0);
    m = stepMatch(m, [NONE, NONE], params);
    expect(m.battle.fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'super' });
    expect(m.timeLeft).toBe(started.timeLeft - 1);
  });
});

describe('百裂連拳フィナーレ', () => {
  it('8/10/30・250・重、無敵は 1〜8F', () => {
    const m = lin.moves.super;
    expect([m.startup, m.active, m.recovery, m.hits[0].damage, m.hits[0].weight, m.kind, m.meterCost]).toEqual([8, 10, 30, 250, 'heavy', 'super', 1000]);
    let f: Fighter = { ...createFighter(lin, 400, 1), gauge: FULL };
    f = stepFighter(f, SUPER, 1200, params);
    expect(f.state).toEqual({ name: 'attack', frame: 0, move: 'super' });
    for (let frame = 1; frame <= 9; frame++) {
      f = stepFighter(f, NONE, 1200, params);
      expect(isHittable(f), `${frame}F`).toBe(frame > 8);
    }
    // 1〜8F で 500px 突進
    expect(f.x).toBe(900);
  });

  it('突進して当たると 250 減る', () => {
    const t = run(battleOf([lin, gonzo], [400, 1000]), 60, p1({ 1: SUPER }));
    const hit = t.flatMap((b) => b.events).filter((e) => e.type === 'hit');
    expect(hit).toMatchObject([{ type: 'hit', attacker: 0, damage: 250 }]);
    expect(t[59].fighters[1].health).toBe(1150 - 250);
  });
});

describe('超必殺の相打ち・アーマー・削り', () => {
  // 1F目に超必殺 → 2〜31F 暗転 → 32F が技の1F目、40F が9F目（持続の1F目）
  it('ジャブと同時に当たっても超必殺が一方的に勝つ', () => {
    const t = run(battleOf([lin, lin], [400, 700]), 41, (i) => [i === 1 ? SUPER : NONE, i === 36 ? inputOf([], ['punch']) : NONE]);
    const events = t.flatMap((b) => b.events);
    expect(events.some((e) => e.type === 'clash')).toBe(false);
    expect(t[39].events).toMatchObject([{ type: 'hit', attacker: 0, damage: 250 }]);
    expect(t[40].fighters[0].health).toBe(850);
  });

  it('超必殺同士は相打ちで両者弾かれ、ゲージは戻らない', () => {
    const t = run(battleOf([lin, lin], [400, 900], [FULL, FULL]), 45, (i) => [i === 1 ? SUPER : NONE, i === 1 ? SUPER : NONE]);
    expect(t[0].events).toEqual([{ type: 'superStart', attacker: 0 }, { type: 'superStart', attacker: 1 }]);
    const clashAt = t.findIndex((b) => b.events.some((e) => e.type === 'clash'));
    expect(clashAt).toBeGreaterThan(0);
    expect(t[clashAt].fighters.map((f) => f.state.name)).toEqual(['recoil', 'recoil']);
    expect(t[clashAt].fighters.map((f) => f.gauge)).toEqual([0, 0]);
    expect(t[clashAt].fighters.map((f) => f.health)).toEqual([850, 850]);
  });

  it('アーマーを無視する（マッスルポーズ中のゴンゾーに 250 そのまま当たる）', () => {
    const t = run(battleOf([lin, gonzo], [400, 700]), 41, (i) => [i === 1 ? SUPER : NONE, i === 32 ? SPECIAL : NONE]);
    expect(t[38].fighters[1].state).toMatchObject({ name: 'attack', move: 'special' });
    const events = t.flatMap((b) => b.events);
    expect(events.some((e) => e.type === 'armor')).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: 'hit', attacker: 0, damage: 250 }));
    expect(t[40].fighters[1].health).toBe(1150 - 250);
  });

  it('削り（250×20%＝50）で体力 1 の相手を KO できる', () => {
    let m: Match = { ...createMatch([lin, gonzo], params, [400, 700]), phase: 'fight', phaseFrame: 0 };
    const b = battleOf([lin, gonzo], [400, 700]);
    m = { ...m, battle: { ...b, fighters: [b.fighters[0], { ...b.fighters[1], health: 1 }] } };
    const guard = inputOf(['guard']);
    m = stepMatch(m, [SUPER, guard], params);
    let block = null;
    for (let i = 0; i < 60 && m.phase === 'fight'; i++) {
      m = stepMatch(m, [NONE, guard], params);
      block ??= m.battle.events.find((e) => e.type === 'block') ?? null;
    }
    expect(block).toMatchObject({ type: 'block', attacker: 0, damage: 50 });
    expect(m.battle.fighters[1].health).toBe(0);
    expect(m.phase).toBe('roundEnd');
    expect(m.lastResult).toEqual({ reason: 'ko', winner: 0 });
  });
});

describe('超必殺と先行入力', () => {
  it('先行入力から遅れて出た必殺技も、3F 以内のガードで超必殺に差し替わる', () => {
    const b0 = battleOf([lin, gonzo], [400, 1200]);
    const b = { ...b0, fighters: [{ ...b0.fighters[0], state: { name: 'landing', frame: 0, duration: 4 } }, b0.fighters[1]] as [Fighter, Fighter] };
    // 着地硬直中に必殺（先行入力）→ 2F 後にガード
    const t = run(b, 8, p1({ 1: SPECIAL, 3: GUARD }));
    const firstSuper = t.findIndex((x) => moveOf(x.fighters[0]) === 'super');
    expect(firstSuper).toBeGreaterThanOrEqual(0);
    expect(t[firstSuper].events).toEqual([{ type: 'superStart', attacker: 0 }]);
  });

  it('先行入力の必殺とガードが 4F 離れていたら超必殺にならない', () => {
    const b0 = battleOf([lin, gonzo], [400, 1200]);
    const b = { ...b0, fighters: [{ ...b0.fighters[0], state: { name: 'landing', frame: 0, duration: 4 } }, b0.fighters[1]] as [Fighter, Fighter] };
    const t = run(b, 8, p1({ 1: SPECIAL, 5: GUARD }));
    expect(t.some((x) => moveOf(x.fighters[0]) === 'super')).toBe(false);
  });
});
