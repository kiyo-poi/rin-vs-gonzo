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

  it('連拳は 7/20/16、18×5＝90（軽×4＋中）、ガード固定', () => {
    const m = lin.moves.special;
    expect([m.startup, m.active, m.recovery]).toEqual([7, 20, 16]);
    expect(m.kind).toBe('special');
    expect(m.guardLock).toBe(true);
    expect(m.hits.map((h) => h.frames)).toEqual([1, 5, 9, 13, 17].map((n) => ({ from: n, to: n })));
    expect(m.hits.map((h) => h.damage)).toEqual([18, 18, 18, 18, 18]);
    expect(m.hits.map((h) => h.weight)).toEqual(['light', 'light', 'light', 'light', 'medium']);
    expect(m.hits[0].box).toEqual({ x: 20, y: 90, w: 110, h: 30 });
  });

  it('昇り蹴りは 5/8/30・100・重、無敵1〜7F、上昇してから着地まで', () => {
    const m = lin.moves.downSpecial;
    expect([m.startup, m.active, m.recovery, m.hits[0].damage, m.hits[0].weight]).toEqual([5, 8, 30, 100, 'heavy']);
    expect(m.kind).toBe('special');
    expect(m.invincible).toEqual([{ from: 1, to: 7 }]);
    expect(m.movement).toEqual([
      { frames: { from: 6, to: 13 }, dx: 30, dy: 140 },
      { frames: { from: 14, to: 43 }, dx: 0, dy: -140 },
    ]);
    expect(m.hits[0].box).toEqual({ x: 0, y: 60, w: 70, h: 100 });
  });

  it('ヒップドロップは 30/6/24・100・重、発生中にジャンプ、衝撃波は左右 160px の地上だけ', () => {
    const m = gonzo.moves.downSpecial;
    expect([m.startup, m.active, m.recovery, m.hits[0].damage, m.hits[0].weight]).toEqual([30, 6, 24, 100, 'heavy']);
    expect(m.kind).toBe('special');
    expect(m.movement).toEqual([
      { frames: { from: 1, to: 15 }, dx: 0, dy: 120 },
      { frames: { from: 16, to: 30 }, dx: 0, dy: -120 },
    ]);
    expect(m.hits[0]).toMatchObject({ frames: { from: 1, to: 6 }, groundOnly: true, box: { x: -160, y: 0, w: 320, h: 30 } });
  });

  it('マッスルポーズは 4/26/20・アーマー1発・耐えたら反撃パンチ、反撃パンチは 8/3/16・100・重', () => {
    const m = gonzo.moves.special;
    expect([m.startup, m.active, m.recovery]).toEqual([4, 26, 20]);
    expect(m.kind).toBe('special');
    expect(m.hits).toEqual([]);
    expect(m.armor).toEqual({ frames: { from: 5, to: 30 }, hits: 1, onAbsorb: 'counterPunch' });
    const c = gonzo.subMoves!.counterPunch;
    expect([c.startup, c.active, c.recovery, c.hits[0].damage, c.hits[0].weight]).toEqual([8, 3, 16, 100, 'heavy']);
    expect(c.kind).toBe('special');
    expect(c.hits[0].box).toEqual({ x: 30, y: 110, w: 100, h: 30 });
  });

  it('ラリアット突進のアーマーは 17〜36F目に1発、ゴンゾーのアーマー被ダメージ率は 0.5', () => {
    expect(gonzo.moves.forwardSpecial.armor).toEqual({ frames: { from: 17, to: 36 }, hits: 1 });
    expect(gonzo.stats.armorDamageRate).toBe(0.5);
  });

  it('掴みは リン 肩乗りエルボー 5/2/20・間合い60・80、ゴンゾー ボディスラム 6/3/26・間合い90・140', () => {
    const l = lin.moves.grab;
    expect([l.startup, l.active, l.recovery, l.kind, l.hits]).toEqual([5, 2, 20, 'throw', []]);
    expect(l.throw).toEqual({ range: 60, damage: 80, techable: true });
    const g = gonzo.moves.grab;
    expect([g.startup, g.active, g.recovery, g.kind, g.hits]).toEqual([6, 3, 26, 'throw', []]);
    expect(g.throw).toEqual({ range: 90, damage: 140, techable: true });
    expect(params.throwTechWindow).toBe(8);
    expect(params.throwDuration).toBe(40);
  });

  it('両キャラの全技（通常6＋必殺3＋掴み1、ゴンゾーは反撃パンチも）が 03_moves.md の表のとおり', () => {
    // [発生, 持続, 硬直, 当たりの数, 合計ダメージ, 各当たりの重さ]
    type Row = readonly [number, number, number, number, number, readonly string[]];
    const ALL: Record<string, Record<string, Row>> = {
      lin: {
        punch: [4, 2, 8, 1, 30, ['light']], kick: [8, 3, 14, 1, 50, ['medium']],
        crouchPunch: [5, 3, 10, 1, 30, ['light']], crouchKick: [9, 3, 18, 1, 50, ['medium']],
        airPunch: [6, 6, 8, 1, 40, ['medium']], airKick: [7, 8, 10, 1, 50, ['medium']],
        special: [7, 20, 16, 5, 90, ['light', 'light', 'light', 'light', 'medium']],
        forwardSpecial: [12, 4, 18, 1, 70, ['medium']],
        downSpecial: [5, 8, 30, 1, 100, ['heavy']],
        grab: [5, 2, 20, 0, 0, []],
      },
      gonzo: {
        punch: [9, 3, 16, 1, 70, ['medium']], kick: [13, 4, 20, 1, 90, ['heavy']],
        crouchPunch: [8, 4, 20, 1, 80, ['medium']], crouchKick: [14, 4, 24, 1, 100, ['heavy']],
        airPunch: [9, 6, 12, 1, 70, ['medium']], airKick: [10, 8, 18, 1, 80, ['heavy']],
        special: [4, 26, 20, 0, 0, []],
        forwardSpecial: [16, 20, 22, 1, 110, ['heavy']],
        downSpecial: [30, 6, 24, 1, 100, ['heavy']],
        grab: [6, 3, 26, 0, 0, []],
      },
    };
    const counter: Row = [8, 3, 16, 1, 100, ['heavy']];
    const actual = (m: (typeof lin)['moves']['punch']): Row => [
      m.startup, m.active, m.recovery, m.hits.length, m.hits.reduce((sum, h) => sum + h.damage, 0), m.hits.map((h) => h.weight),
    ];
    for (const [id, rows] of Object.entries(ALL)) {
      for (const [slot, row] of Object.entries(rows)) {
        expect(actual(characters[id].moves[slot as MoveSlot]), `${id}.${slot}`).toEqual(row);
      }
    }
    expect(actual(gonzo.subMoves!.counterPunch), 'gonzo.counterPunch').toEqual(counter);
    expect(lin.subMoves).toBeUndefined();
  });
});
