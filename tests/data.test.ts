import { describe, expect, it } from 'vitest';
import { characters, controls, gonzo, lin, params, proto } from '../src/data/data';
import type { MoveSlot } from '../src/logic/types';
import { inputOf } from './helpers';

describe('データ', () => {
  it('仮キャラのパンチはリンのジャブの数値（03_moves.md）', () => {
    const punch = proto.moves.punch;
    expect([punch.startup, punch.active, punch.recovery]).toEqual([4, 2, 8]);
    expect(punch.hits[0].damage).toBe(30);
    expect(punch.hits[0].weight).toBe('light');
  });

  it('歩き速度とジャンプは 06_params.md の初期値', () => {
    expect(proto.stats.walkSpeed).toBe(5);
    expect(proto.stats.jumpAirFrames).toBe(36);
    expect(params.jumpSquatFrames).toBe(3);
  });

  it('のけぞり・ガード硬直（軽）は 14F / 10F', () => {
    expect(params.weights.light).toEqual({ hitstun: 14, blockstun: 10, knockback: 20 });
    expect(params.weights.medium).toEqual({ hitstun: 18, blockstun: 13, knockback: 35 });
    expect(params.weights.heavy).toEqual({ hitstun: 24, blockstun: 17, knockback: 60 });
    expect(params.blockKnockbackRate).toBe(1.2);
    expect(params.stage.width).toBe(1920);
    expect(params.pushRate).toBe(0.5);
    expect(params.screen.width).toBe(1280);
    expect(proto.stats.pushWidth).toBe(60);
  });

  it('ラウンドの値は 01・06 のとおり', () => {
    expect(params.round).toEqual({ timeFrames: 5940, introFrames: 120, endFrames: 90, winsToWin: 2, maxRounds: 5 });
  });

  it('2P のパンチはテンキー4と J の両方', () => {
    expect(controls.p2.punch).toEqual(['Numpad4', 'KeyJ']);
    expect(controls.p1.punch).toEqual(['KeyF']);
  });

  it('inputOf は pressed を held にも入れる', () => {
    const input = inputOf(['left'], ['punch']);
    expect(input.held.left && input.held.punch).toBe(true);
    expect(input.pressed.punch).toBe(true);
    expect(input.pressed.left).toBe(false);
  });
});

const TABLE = {
  lin: {
    punch: [4, 2, 8, 30, 'light'], kick: [8, 3, 14, 50, 'medium'],
    crouchPunch: [5, 3, 10, 30, 'light'], crouchKick: [9, 3, 18, 50, 'medium'],
    airPunch: [6, 6, 8, 40, 'medium'], airKick: [7, 8, 10, 50, 'medium'],
  },
  gonzo: {
    punch: [9, 3, 16, 70, 'medium'], kick: [13, 4, 20, 90, 'heavy'],
    crouchPunch: [8, 4, 20, 80, 'medium'], crouchKick: [14, 4, 24, 100, 'heavy'],
    airPunch: [9, 6, 12, 70, 'medium'], airKick: [10, 8, 18, 80, 'heavy'],
  },
} as const;

describe('キャラデータ', () => {
  it('全12技の発生・持続・硬直・ダメージ・重さが 03_moves.md のとおり', () => {
    for (const [id, moves] of Object.entries(TABLE)) {
      for (const [slot, [s, a, r, d, w]] of Object.entries(moves)) {
        const m = characters[id].moves[slot as MoveSlot];
        expect([m.startup, m.active, m.recovery, m.hits[0].damage, m.hits[0].weight], `${id}.${slot}`).toEqual([s, a, r, d, w]);
      }
    }
  });

  it('全技の姿勢は、パンチ・キックが stand、しゃがみが crouch、空中が air', () => {
    const expected: Partial<Record<MoveSlot, string>> = {
      punch: 'stand', kick: 'stand', crouchPunch: 'crouch', crouchKick: 'crouch', airPunch: 'air', airKick: 'air',
    };
    for (const [id, char] of Object.entries(characters)) {
      for (const [slot, posture] of Object.entries(expected)) {
        expect(char.moves[slot as MoveSlot].posture, `${id}.${slot}`).toBe(posture);
      }
    }
  });

  it('足払い・ローキック払いはダウン属性、ドロップキックは着地の隙 20F', () => {
    expect(lin.moves.crouchKick.hits[0].knockdown).toBe(true);
    expect(gonzo.moves.crouchKick.hits[0].knockdown).toBe(true);
    expect(gonzo.moves.airKick.landingRecovery).toBe(20);
  });

  it('ゴンゾーの基本値は 03・06 のとおり', () => {
    expect(gonzo.stats).toMatchObject({ health: 1150, walkSpeed: 3, jumpAirFrames: 46, jumpHeight: 170, jumpForwardSpeed: 4 });
  });

  it('全キャラに必殺・前必殺・下必殺・掴みの枠がある', () => {
    for (const char of Object.values(characters)) {
      for (const slot of ['special', 'forwardSpecial', 'downSpecial', 'grab'] as const) {
        expect(char.moves[slot], `${char.id}.${slot}`).toBeDefined();
      }
    }
  });

  it('突進掌は 12/4/18・70・中で 420px 突進、ラリアット突進は 16/20/22・110・重で 380px 突進', () => {
    const palm = lin.moves.forwardSpecial;
    expect([palm.startup, palm.active, palm.recovery, palm.hits[0].damage, palm.hits[0].weight]).toEqual([12, 4, 18, 70, 'medium']);
    expect(palm.kind).toBe('special');
    expect(palm.movement).toEqual([{ frames: { from: 1, to: 12 }, dx: 420 }]);
    const lariat = gonzo.moves.forwardSpecial;
    expect([lariat.startup, lariat.active, lariat.recovery, lariat.hits[0].damage, lariat.hits[0].weight]).toEqual([16, 20, 22, 110, 'heavy']);
    expect(lariat.kind).toBe('special');
    expect(lariat.movement).toEqual([{ frames: { from: 17, to: 36 }, dx: 380 }]);
  });
});
