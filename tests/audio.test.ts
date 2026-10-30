import { describe, expect, it } from 'vitest';
import { createAudio, VOLUME, noteFreq, RECIPES, soundForEvent, soundForPhaseMessage, SONGS } from '../src/audio/audio';

describe('soundForEvent', () => {
  const table: Array<[{ type: string; weight?: string; damage?: number }, string | null]> = [
    [{ type: 'hit', weight: 'light' }, 'hit_light'],
    [{ type: 'hit', weight: 'medium' }, 'hit_medium'],
    [{ type: 'hit', weight: 'heavy' }, 'hit_heavy'],
    // weight が無い時はダメージで決める（技のダメージは 18〜300 なので ≤40 軽・≤80 中・それ以上 重）
    [{ type: 'hit', damage: 30 }, 'hit_light'],
    [{ type: 'hit', damage: 60 }, 'hit_medium'],
    [{ type: 'hit', damage: 120 }, 'hit_heavy'],
    [{ type: 'block' }, 'block'],
    [{ type: 'clash' }, 'clash'],
    [{ type: 'grab' }, 'grab'],
    [{ type: 'throw' }, 'throw'],
    [{ type: 'tech' }, 'tech'],
    [{ type: 'armor' }, 'armor'],
    [{ type: 'ko' }, 'ko'],
    [{ type: 'whatever' }, null],
  ];
  it.each(table)('%j → %s', (ev, sound) => {
    expect(soundForEvent(ev)).toBe(sound);
  });
  it('返す音には必ずレシピがある', () => {
    for (const [ev] of table) {
      const s = soundForEvent(ev);
      if (s) expect(RECIPES[s]).toBeDefined();
    }
  });
});

describe('BGM の表', () => {
  it('melody と bass のステップ数が揃っている', () => {
    for (const s of Object.values(SONGS)) expect(s.melody.length).toBe(s.bass.length);
  });
  it('noteFreq', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('-')).toBe(0);
  });
});

describe('createAudio（AudioContext が無い環境）', () => {
  it('unlock 前も後も例外を投げない', () => {
    const a = createAudio();
    expect(() => {
      a.playEvents([{ type: 'hit', attacker: 0, damage: 5, weight: 'light' }, { type: 'clash' }]);
      a.playUi('move');
      a.startBgm('title');
      a.stopBgm();
      a.unlock();
      a.playEvents([{ type: 'clash' }]);
      a.playUi('decide');
      a.startBgm('stage');
      a.stopBgm();
    }).not.toThrow();
  });
  it('未知のイベントは無視する', () => {
    const a = createAudio();
    expect(() => a.playEvents([{ type: 'nope' } as never])).not.toThrow();
  });
});

describe('soundForPhaseMessage（試合の進行の音）', () => {
  it('表示が変わった時だけ、表示に合った音', () => {
    expect(soundForPhaseMessage(null, 'ROUND 1')).toBe('round');
    expect(soundForPhaseMessage('ROUND 1', 'FIGHT!')).toBe('fight');
    expect(soundForPhaseMessage(null, 'K.O.')).toBe('ko');
    expect(soundForPhaseMessage(null, 'DOUBLE K.O.')).toBe('ko');
    expect(soundForPhaseMessage(null, 'TIME UP')).toBe('timeup');
    expect(soundForPhaseMessage('K.O.', '1P WIN')).toBe('win');
    expect(soundForPhaseMessage(null, 'DRAW GAME')).toBe('draw');
    expect(soundForPhaseMessage('FIGHT!', 'FIGHT!')).toBeNull();
    expect(soundForPhaseMessage('FIGHT!', null)).toBeNull();
  });
  it('createAudio の playSound は AudioContext が無くても落ちない', () => {
    expect(() => createAudio().playSound('ko')).not.toThrow();
  });
});

describe('音量', () => {
  const level = (n: keyof typeof RECIPES) => [...(RECIPES[n].tones ?? []), ...(RECIPES[n].noise ?? [])].reduce((a, x) => a + (x.vol ?? 0.5), 0);
  it('強い当たりは弱い当たりの 1.3 倍以下', () => {
    expect(level('hit_heavy')).toBeLessThanOrEqual(level('hit_light') * 1.3);
    expect(level('hit_medium')).toBeLessThanOrEqual(level('hit_heavy'));
  });
  it('効果音は以前（0.8）の半分程度', () => {
    expect(VOLUME.sfx).toBeLessThanOrEqual(0.4);
  });
});
