import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle } from '../src/logic/battle';
import { addEventEffects, createEffects, shakeOffset, SHAKE_FRAMES, SPARK_LIFE, stepEffects, TEXT_LIFE } from '../src/render/effects';
import { createTrail, stepTrail, TRAIL_HOLD } from '../src/render/healthTrail';
import { controlLines, keyLabel, moveLines } from '../src/render/labels';
import { fighterColor } from '../src/render/palette';

const fighters = createBattle([proto, proto], params).fighters;

describe('演出', () => {
  it('ヒットは火花と擬音、ガードは別の火花、相打ちは「カキーン」', () => {
    const s = addEventEffects(createEffects(), [
      { type: 'hit', attacker: 0, damage: 30 } as never,
      { type: 'block', attacker: 1, damage: 0 } as never,
      { type: 'clash' },
    ], fighters);
    expect(s.list.map((e) => e.kind)).toEqual(['hitSpark', 'text', 'blockSpark', 'clashSpark', 'text']);
    expect(s.list[1].text).toBe('ドカッ');
    expect(s.list[4].text).toBe('カキーン');
    expect(s.shake).toBe(0);
  });
  it('重い技だけ画面が揺れ、擬音が変わる', () => {
    const byWeight = addEventEffects(createEffects(), [{ type: 'hit', attacker: 0, damage: 10, weight: 'heavy' } as never], fighters);
    expect(byWeight.shake).toBe(SHAKE_FRAMES);
    expect(byWeight.list[1].text).toBe('バキッ');
    const byDamage = addEventEffects(createEffects(), [{ type: 'hit', attacker: 1, damage: 100 } as never], fighters);
    expect(byDamage.shake).toBe(SHAKE_FRAMES);
    expect(shakeOffset(byDamage).x).not.toBe(0);
  });
  it('知らない出来事は無視する', () => {
    expect(addEventEffects(createEffects(), [{ type: 'combo' }], fighters).list).toEqual([]);
  });
  it('寿命が来たら消え、揺れも止まる', () => {
    let s = addEventEffects(createEffects(), [{ type: 'hit', attacker: 0, damage: 100 } as never], fighters);
    for (let i = 0; i < SPARK_LIFE; i++) s = stepEffects(s);
    expect(s.list.map((e) => e.kind)).toEqual(['text']);
    for (let i = SPARK_LIFE; i < TEXT_LIFE; i++) s = stepEffects(s);
    expect(s.list).toEqual([]);
    expect(s.shake).toBe(0);
    expect(shakeOffset(s)).toEqual({ x: 0, y: 0 });
  });
});

describe('体力バーの赤い残り', () => {
  it('減った分が赤く残ってから、ゆっくり縮む', () => {
    let t = createTrail(1000);
    t = stepTrail(t, 900, 1000);
    expect(t.value).toBe(1000);
    for (let i = 0; i < TRAIL_HOLD; i++) t = stepTrail(t, 900, 1000);
    expect(t.value).toBe(1000);
    t = stepTrail(t, 900, 1000);
    expect(t.value).toBeLessThan(1000);
    expect(t.value).toBeGreaterThan(900);
    for (let i = 0; i < 100; i++) t = stepTrail(t, 900, 1000);
    expect(t.value).toBe(900);
  });
  it('回復（次のラウンド）ではすぐ消える', () => {
    let t = stepTrail(createTrail(1000), 500, 1000);
    t = stepTrail(t, 1000, 1000);
    expect(t.value).toBe(1000);
  });
});

describe('表示用の文字', () => {
  it('キーの名前', () => {
    expect(keyLabel('KeyF')).toBe('F');
    expect(keyLabel('ArrowLeft')).toBe('←');
    expect(keyLabel('Numpad4')).toBe('テンキー4');
    expect(controlLines({ left: ['KeyA'], right: [], up: [], down: [], punch: ['Numpad4', 'KeyJ'], kick: [], grab: [], special: [], guard: [] })).toContain('パンチ テンキー4 / J');
  });
  it('技一覧はキャラデータから作る', () => {
    expect(moveLines(proto)).toContain('パンチ：ジャブ');
  });
  it('同じキャラ同士なら 2P は色違い', () => {
    expect(fighterColor(['lin', 'lin'], 1)).not.toBe(fighterColor(['lin', 'lin'], 0));
    expect(fighterColor(['lin', 'gonzo'], 0)).toBe(fighterColor(['lin', 'lin'], 0));
  });
});
