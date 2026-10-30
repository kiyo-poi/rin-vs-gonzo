import { describe, expect, it } from 'vitest';
import { FADE_FRAMES, SceneStack, type FrameInput, type Scene } from '../src/core/scene';
import { NONE } from './helpers';

const input: FrameInput = { players: [NONE, NONE], pause: false };

function fake(name: string, log: string[]): Scene & { updates: number } {
  const s = {
    updates: 0,
    update() { s.updates++; },
    draw() {},
    enter() { log.push(`enter ${name}`); },
    exit() { log.push(`exit ${name}`); },
  };
  return s;
}

describe('SceneStack', () => {
  it('replace は暗転を挟み、暗転中は入力（更新）を受け付けない', () => {
    const log: string[] = [];
    const stack = new SceneStack();
    const a = fake('a', log);
    const b = fake('b', log);
    stack.start(a);
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    expect(stack.fading).toBe(false);
    stack.update(input);
    expect(a.updates).toBe(1);

    stack.replace(b);
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    expect(stack.top).toBe(b);
    expect(log).toEqual(['enter a', 'exit a', 'enter b']);
    expect(stack.fadeAlpha()).toBe(1);
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    expect(b.updates).toBe(0);
    expect(a.updates).toBe(1);
    stack.update(input);
    expect(b.updates).toBe(1);
  });

  it('push したシーンだけが更新され、下は止まる。pop で戻る', () => {
    const log: string[] = [];
    const stack = new SceneStack();
    const fight = fake('fight', log);
    const pause = fake('pause', log);
    stack.start(fight);
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    stack.push(pause);
    stack.update(input);
    stack.update(input);
    expect(pause.updates).toBe(2);
    expect(fight.updates).toBe(0);
    stack.pop();
    stack.update(input);
    expect(fight.updates).toBe(1);
    expect(stack.size).toBe(1);
  });

  it('replace は積んだシーンをすべて下ろす', () => {
    const log: string[] = [];
    const stack = new SceneStack();
    stack.start(fake('fight', log));
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    stack.push(fake('pause', log));
    stack.replace(fake('title', log));
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    expect(stack.size).toBe(1);
    expect(log).toEqual(['enter fight', 'enter pause', 'exit pause', 'exit fight', 'enter title']);
  });

  it('blur は暗転中でなければ一番上のシーンに伝える', () => {
    const stack = new SceneStack();
    let blurred = 0;
    stack.start({ update() {}, draw() {}, onBlur() { blurred++; } });
    stack.blur();
    expect(blurred).toBe(0);
    for (let i = 0; i < FADE_FRAMES; i++) stack.update(input);
    stack.blur();
    expect(blurred).toBe(1);
  });
});

describe('resolveChar（キャラ id → 名簿）', () => {
  it('見つかればそのキャラ、無ければ名簿の先頭', async () => {
    const { resolveChar, resolveChars } = await import('../src/scenes/config');
    const { lin, gonzo } = await import('../src/data/data');
    expect(resolveChar([lin, gonzo], 'gonzo')).toBe(gonzo);
    expect(resolveChar([lin, gonzo], 'typo')).toBe(lin);
    expect(resolveChars([lin, gonzo], ['gonzo', 'nope'])).toEqual([gonzo, lin]);
  });
});
