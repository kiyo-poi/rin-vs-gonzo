import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createFighter, stepFighter } from '../src/logic/fighter';
import type { Fighter, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** 相手を固定位置に置いたまま n フレーム進める */
function runFrames(f: Fighter, n: number, input: InputFrame, opponentX: number): Fighter {
  let cur = f;
  for (let i = 0; i < n; i++) cur = stepFighter(cur, input, opponentX, params);
  return cur;
}

describe('歩き', () => {
  it('前に 5px/F で進む', () => {
    const f = runFrames(createFighter(proto, 400, 1), 10, inputOf(['right']), 900);
    expect(f.x).toBe(450);
    expect(f.state.name).toBe('walkForward');
  });

  it('後ろに 5px/F で下がる（ガードにはならない）', () => {
    const f = runFrames(createFighter(proto, 400, 1), 10, inputOf(['left']), 900);
    expect(f.x).toBe(350);
    expect(f.state.name).toBe('walkBack');
  });

  it('左右同時押しはどちらも押していない扱い', () => {
    const f = runFrames(createFighter(proto, 400, 1), 5, inputOf(['left', 'right']), 900);
    expect(f.x).toBe(400);
    expect(f.state.name).toBe('idle');
  });

  it('画面端の余白より端には行けない', () => {
    const f = runFrames(createFighter(proto, 62, 1), 5, inputOf(['left']), 900);
    expect(f.x).toBe(params.stage.edgeMargin);
  });
});

describe('向き', () => {
  it('相手が左にいれば左を向き、→ は後ろ歩きになる', () => {
    const f = runFrames(createFighter(proto, 400, 1), 1, inputOf(['right']), 100);
    expect(f.facing).toBe(-1);
    expect(f.state.name).toBe('walkBack');
  });
});

describe('しゃがみ・ガード', () => {
  it('↓ でしゃがみ、動かない', () => {
    const f = runFrames(createFighter(proto, 400, 1), 3, inputOf(['down', 'right']), 900);
    expect(f.state.name).toBe('crouch');
    expect(f.x).toBe(400);
  });

  it('ガード中は歩けない', () => {
    const f = runFrames(createFighter(proto, 400, 1), 3, inputOf(['guard', 'right']), 900);
    expect(f.state.name).toBe('guard');
    expect(f.x).toBe(400);
  });

  it('同じ状態が続けばフレーム数が増える', () => {
    const f = runFrames(createFighter(proto, 400, 1), 3, inputOf(['guard']), 900);
    expect(f.state.frame).toBe(3);
  });

  it('何も押さなければ待機', () => {
    const f = runFrames(createFighter(proto, 400, 1), 1, NONE, 900);
    expect(f.state.name).toBe('idle');
  });
});
