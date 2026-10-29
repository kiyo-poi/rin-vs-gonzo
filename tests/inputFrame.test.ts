import { describe, expect, it } from 'vitest';
import { controls } from '../src/data/data';
import { allCodes, buildInputFrame, emptyHeld, heldFromKeys, keysFor } from '../src/input/inputFrame';

describe('heldFromKeys', () => {
  it('1P の F でパンチ', () => {
    const held = heldFromKeys(new Set(['KeyF']), controls.p1);
    expect(held.punch).toBe(true);
    expect(held.kick).toBe(false);
  });

  it('2P はテンキー4でも J でもパンチ', () => {
    expect(heldFromKeys(new Set(['Numpad4']), controls.p2).punch).toBe(true);
    expect(heldFromKeys(new Set(['KeyJ']), controls.p2).punch).toBe(true);
  });

  it('2P はテンキー系と J〜, 系を混ぜて押してよい', () => {
    const held = heldFromKeys(new Set(['Numpad4', 'KeyK', 'Comma']), controls.p2);
    expect([held.punch, held.kick, held.guard]).toEqual([true, true, true]);
  });

  it('1P のキーは 2P に反応しない', () => {
    expect(heldFromKeys(new Set(['KeyF']), controls.p2).punch).toBe(false);
  });
});

describe('buildInputFrame', () => {
  it('押した最初のフレームだけ pressed になる', () => {
    const none = emptyHeld();
    const down = { ...emptyHeld(), punch: true };
    const first = buildInputFrame(down, none);
    const second = buildInputFrame(down, down);
    expect(first.pressed.punch).toBe(true);
    expect(second.pressed.punch).toBe(false);
    expect(second.held.punch).toBe(true);
  });
});

describe('allCodes', () => {
  it('1P・2P・ポーズの全キーを含む', () => {
    const codes = allCodes(controls);
    for (const code of ['KeyA', 'KeyF', 'Numpad4', 'KeyJ', 'Comma', 'ArrowUp', 'Escape']) {
      expect(codes.has(code)).toBe(true);
    }
  });
});

describe('keysFor', () => {
  it('押されているキーのうち、その人のキーだけを返す', () => {
    const keys = new Set(['KeyF', 'Numpad4', 'KeyJ', 'KeyQ']);
    expect(keysFor(keys, controls.p1)).toEqual(['KeyF']);
    expect(keysFor(keys, controls.p2)).toEqual(['Numpad4', 'KeyJ']);
  });
});
