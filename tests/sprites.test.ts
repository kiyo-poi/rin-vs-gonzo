import { describe, expect, it } from 'vitest';
import { gonzo, proto } from '../src/data/data';
import { createFighter } from '../src/logic/fighter';
import type { Fighter, FighterState } from '../src/logic/types';
import { fitBottom } from '../src/render/portrait';
import { poseFor, poseForMove, POSES, spritePath } from '../src/render/sprites';

const withState = (state: unknown): Fighter => ({ ...createFighter(proto, 400, 1), state: state as FighterState });

describe('poseFor', () => {
  const cases: Array<[unknown, string]> = [
    [{ name: 'idle', frame: 1 }, 'idle'],
    [{ name: 'walkForward', frame: 3 }, 'walk'],
    [{ name: 'walkBack', frame: 3 }, 'walk'],
    [{ name: 'crouch', frame: 1 }, 'crouch'],
    [{ name: 'guard', frame: 1, crouch: true }, 'guard'],
    [{ name: 'blockstun', frame: 1, duration: 10, crouch: false }, 'guard'],
    [{ name: 'jumpSquat', frame: 1, dir: 0 }, 'crouch'],
    [{ name: 'landing', frame: 1, duration: 4 }, 'crouch'],
    [{ name: 'air', frame: 5, dir: 0, attack: null, used: null, recoilLeft: 0 }, 'jump'],
    [{ name: 'air', frame: 5, dir: 0, attack: { move: 'airPunch', frame: 2 }, used: 'airPunch', recoilLeft: 0 }, 'air_punch'],
    [{ name: 'air', frame: 5, dir: 0, attack: { move: 'airKick', frame: 2 }, used: 'airKick', recoilLeft: 0 }, 'air_kick'],
    [{ name: 'air', frame: 5, dir: 0, attack: null, used: 'airKick', recoilLeft: 8 }, 'hit'],
    [{ name: 'attack', frame: 1, move: 'punch' }, 'punch'],
    [{ name: 'attack', frame: 1, move: 'kick' }, 'kick'],
    [{ name: 'attack', frame: 1, move: 'crouchPunch' }, 'crouch_punch'],
    [{ name: 'attack', frame: 1, move: 'crouchKick' }, 'crouch_kick'],
    [{ name: 'attack', frame: 1, move: 'grab' }, 'grab'],
    [{ name: 'attack', frame: 1, move: 'special' }, 'special_n'],
    [{ name: 'attack', frame: 1, move: 'forwardSpecial' }, 'special_f'],
    [{ name: 'attack', frame: 1, move: 'downSpecial' }, 'special_d'],
    [{ name: 'attack', frame: 1, move: 'super' }, 'super'],
    [{ name: 'attack', frame: 1, move: 'mystery' }, 'idle'],
    [{ name: 'hitstun', frame: 1, duration: 10, crouch: false }, 'hit'],
    [{ name: 'recoil', frame: 1, duration: 10 }, 'hit'],
    [{ name: 'airHit', frame: 1 }, 'hit'],
    [{ name: 'thrown', frame: 1 }, 'hit'],
    [{ name: 'throwing', frame: 1 }, 'throw'],
    [{ name: 'knockdown', frame: 1, duration: 30 }, 'down'],
    [{ name: 'somethingNew', frame: 1 }, 'idle'],
  ];
  it.each(cases)('%j → %s', (state, pose) => {
    expect(poseFor(withState(state))).toBe(pose);
  });

  it('返すポーズ名は全て 07 の一覧に含まれる', () => {
    for (const [state] of cases) expect(POSES).toContain(poseFor(withState(state)));
  });
  it('poseForMove: 未知・空は idle', () => {
    expect(poseForMove(undefined)).toBe('idle');
    expect(poseForMove('x')).toBe('idle');
  });
  it('どのキャラでも動く', () => {
    expect(poseFor({ ...createFighter(gonzo, 0, -1) })).toBe('idle');
  });
});

describe('spritePath', () => {
  it('assets の公開先 + images/characters/<id>/<id>_<pose>.png', () => {
    expect(spritePath('./', 'lin', 'crouch_punch')).toBe('./images/characters/lin/lin_crouch_punch.png');
    expect(spritePath('/', 'gonzo', 'idle')).toBe('/images/characters/gonzo/gonzo_idle.png');
    expect(spritePath('/app', 'lin', 'idle')).toBe('/app/images/characters/lin/lin_idle.png');
  });
});

describe('fitBottom', () => {
  it('縦長の画像は枠の高さに合わせ、左右中央・下揃えにする', () => {
    expect(fitBottom(480, 720, { x: 60, y: 130, w: 360, h: 270 })).toEqual({ x: 150, y: 130, w: 180, h: 270 });
  });
  it('横に収まらない画像は枠の幅に合わせ、下に寄せる', () => {
    expect(fitBottom(480, 720, { x: 0, y: 0, w: 240, h: 600 })).toEqual({ x: 0, y: 240, w: 240, h: 360 });
  });
});
