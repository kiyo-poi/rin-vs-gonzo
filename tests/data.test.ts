import { describe, expect, it } from 'vitest';
import { controls, params, proto } from '../src/data/data';
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
