import { describe, expect, it } from 'vitest';
import { characters } from '../src/data/data';
import { resultTitle } from '../src/scenes/config';
import { stepMenu } from '../src/scenes/menu';
import { pickIndex } from '../src/scenes/random';
import { createSelect, stepSelect } from '../src/scenes/select';
import { tickSlow, KO_SLOW_FRAMES } from '../src/scenes/slowmo';
import { inputOf, NONE } from './helpers';

describe('stepMenu', () => {
  it('上下で移動し端で回る。1P・2P どちらでも操作できる', () => {
    expect(stepMenu(0, 3, [inputOf([], ['down']), NONE]).index).toBe(1);
    expect(stepMenu(0, 3, [NONE, inputOf([], ['up'])]).index).toBe(2);
    expect(stepMenu(2, 3, [NONE, inputOf([], ['down'])]).index).toBe(0);
  });
  it('パンチで決定、ガードで戻る', () => {
    expect(stepMenu(1, 3, [NONE, inputOf([], ['punch'])])).toEqual({ index: 1, decided: true, cancelled: false });
    expect(stepMenu(1, 3, [inputOf([], ['guard']), NONE]).cancelled).toBe(true);
  });
});

describe('stepSelect', () => {
  const count = 2;
  it('1P・2P が同時に自分のキーで選び、両者が決めたら終わる', () => {
    let s = createSelect(false);
    let r = stepSelect(s, [inputOf([], ['right']), inputOf([], ['punch'])], count, 1);
    expect(r.state.cursors).toEqual([{ index: 1, decided: false }, { index: 0, decided: true }]);
    expect(r.done).toBe(false);
    r = stepSelect(r.state, [inputOf([], ['punch']), NONE], count, 1);
    expect(r.done).toBe(true);
  });
  it('同じキャラを選べる', () => {
    const r = stepSelect(createSelect(false), [inputOf([], ['punch']), inputOf([], ['punch'])], count, 1);
    expect(r.done).toBe(true);
    expect(r.state.cursors[0].index).toBe(r.state.cursors[1].index);
  });
  it('ガードで決定を取り消し、決定前のガードは前の画面へ戻る', () => {
    let r = stepSelect(createSelect(false), [inputOf([], ['punch']), NONE], count, 1);
    r = stepSelect(r.state, [inputOf([], ['guard']), NONE], count, 1);
    expect(r.state.cursors[0].decided).toBe(false);
    expect(r.back).toBe(false);
    r = stepSelect(r.state, [NONE, inputOf([], ['guard'])], count, 1);
    expect(r.back).toBe(true);
  });
  it('CPU戦では 2P の入力を無視し、1P の決定時に種から CPU のキャラを決める', () => {
    let r = stepSelect(createSelect(true), [NONE, inputOf([], ['right', 'punch'])], count, 7);
    expect(r.state.cursors[1]).toEqual({ index: 0, decided: false });
    r = stepSelect(r.state, [inputOf([], ['punch']), NONE], count, 7);
    expect(r.done).toBe(true);
    expect(r.state.cursors[1]).toEqual({ index: pickIndex(7, count), decided: true });
  });
  it('乱数は種で決まり、どの選択肢も出る', () => {
    expect(pickIndex(42, 5)).toBe(pickIndex(42, 5));
    const seen = new Set(Array.from({ length: 50 }, (_, i) => pickIndex(i, 3)));
    expect(seen).toEqual(new Set([0, 1, 2]));
  });
  it('キャラはデータから並ぶ（キャラを足すと選択肢が増える）', () => {
    expect(Object.keys(characters).length).toBeGreaterThanOrEqual(2);
  });
});

describe('resultTitle', () => {
  it('2人対戦は nP WIN、CPU戦は YOU WIN / YOU LOSE', () => {
    expect(resultTitle(1, 'versus')).toBe('2P WIN');
    expect(resultTitle(0, 'cpu')).toBe('YOU WIN');
    expect(resultTitle(1, 'cpu')).toBe('YOU LOSE');
    expect(resultTitle(null, 'cpu')).toBe('DRAW GAME');
  });
});

describe('tickSlow', () => {
  it('スロー中は2フレームに1回だけ進め、終わったら毎フレーム進める', () => {
    let remaining = KO_SLOW_FRAMES;
    let steps = 0;
    for (let i = 0; i < KO_SLOW_FRAMES; i++) {
      const t = tickSlow(remaining);
      remaining = t.remaining;
      if (t.step) steps++;
    }
    expect(steps).toBe(KO_SLOW_FRAMES / 2);
    expect(tickSlow(0).step).toBe(true);
  });
});
