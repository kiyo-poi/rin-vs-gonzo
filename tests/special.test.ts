import { describe, expect, it } from 'vitest';
import { gonzo, lin, params } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { CharacterData, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** 1P が first を1F目に入力し、あとは何も押さず n フレーム進めた各フレームの結果（[0] が1F目） */
function play(chars: [CharacterData, CharacterData], xs: [number, number], first: InputFrame, n: number): Battle[] {
  const result: Battle[] = [];
  let b = createBattle(chars, params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, [i === 1 ? first : NONE, NONE], params);
    result.push(b);
  }
  return result;
}

describe('必殺技の入力', () => {
  it('→＋必殺で突進掌。1〜12F目で 420px 前へ進み、13〜16F目に攻撃の箱', () => {
    const t = play([lin, gonzo], [400, 1500], inputOf(['right'], ['special']), 20);
    expect(t[0].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'forwardSpecial' });
    expect(t[0].fighters[0].x).toBeCloseTo(435);
    expect(t[11].fighters[0].x).toBeCloseTo(820);
    expect(t[12].fighters[0].x).toBeCloseTo(820);
  });

  it('突進掌の攻撃の箱は 13〜16F目', () => {
    const t = play([lin, gonzo], [400, 1500], inputOf(['right'], ['special']), 20);
    const boxFrames = t.map((b, i) => (activeAt(b) ? i + 1 : -1)).filter((i) => i > 0);
    expect(boxFrames).toEqual([13, 14, 15, 16]);
  });

  it('←＋必殺はニュートラルの必殺（special）、↓＋→＋必殺は downSpecial', () => {
    const back = play([lin, gonzo], [400, 1500], inputOf(['left'], ['special']), 1);
    expect(back[0].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'special' });
    const neutral = play([lin, gonzo], [400, 1500], inputOf([], ['special']), 1);
    expect(neutral[0].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'special' });
    const down = play([lin, gonzo], [400, 1500], inputOf(['down', 'right'], ['special']), 1);
    expect(down[0].fighters[0].state).toEqual({ name: 'attack', frame: 1, move: 'downSpecial' });
  });

  it('同じフレームに必殺とパンチを押したら必殺、掴みとキックなら掴み', () => {
    const sp = play([lin, gonzo], [400, 1500], inputOf([], ['special', 'punch', 'kick', 'grab']), 1);
    expect(sp[0].fighters[0].state).toMatchObject({ name: 'attack', move: 'special' });
    const gr = play([lin, gonzo], [400, 1500], inputOf([], ['grab', 'kick', 'punch']), 1);
    expect(gr[0].fighters[0].state).toMatchObject({ name: 'attack', move: 'grab' });
  });

  it('2Pは左向きなので、前（左）＋必殺で forwardSpecial になり左へ進む', () => {
    let b = createBattle([gonzo, lin], params, [400, 1500]);
    b = stepBattle(b, [NONE, inputOf(['left'], ['special'])], params);
    expect(b.fighters[1].state).toMatchObject({ move: 'forwardSpecial' });
    expect(b.fighters[1].x).toBeCloseTo(1465);
  });
});

describe('ラリアット突進の移動', () => {
  it('持続の 17〜36F目で 380px 進む', () => {
    const t = play([gonzo, lin], [400, 1500], inputOf(['right'], ['special']), 40);
    expect(t[15].fighters[0].x).toBeCloseTo(400);
    expect(t[16].fighters[0].x).toBeCloseTo(419);
    expect(t[35].fighters[0].x).toBeCloseTo(780);
    expect(t[36].fighters[0].x).toBeCloseTo(780);
  });
});

describe('突進のあとの位置', () => {
  it('突進してノックバックしても、2人の距離は 1160px を超えず、画面端から出ない', () => {
    // 右端の相手に突進して当てる。ノックバックで下がれない分は攻撃側が下がる
    let b = createBattle([lin, gonzo], params, [1340, 1860]);
    for (let i = 1; i <= 40; i++) {
      b = stepBattle(b, [i === 1 ? inputOf(['right'], ['special']) : NONE, NONE], params);
      const [a, d] = b.fighters;
      expect(Math.abs(a.x - d.x)).toBeLessThanOrEqual(1160 + 1e-9);
      for (const f of [a, d]) {
        expect(f.x).toBeGreaterThanOrEqual(params.stage.edgeMargin);
        expect(f.x).toBeLessThanOrEqual(params.stage.width - params.stage.edgeMargin);
      }
    }
    expect(b.fighters[1].health).toBeLessThan(1150);
  });

  it('ノックバックで距離の上限を超えそうなら、超えた分を戻す', () => {
    // 箱が遠くまで届くキックで、距離 1140 の相手を押す（中のノックバック 35px で 1175 になるところ）
    const longKick: CharacterData = {
      ...lin,
      moves: { ...lin.moves, kick: { ...lin.moves.kick, startup: 1, hits: [{ ...lin.moves.kick.hits[0], box: { x: 20, y: 60, w: 1300, h: 24 } }] } },
    };
    let b = createBattle([longKick, gonzo], params, [400, 1540]);
    b = stepBattle(b, [inputOf([], ['kick']), NONE], params);
    b = stepBattle(b, [NONE, NONE], params);
    expect(b.events.some((e) => e.type === 'hit')).toBe(true);
    expect(Math.abs(b.fighters[0].x - b.fighters[1].x)).toBeLessThanOrEqual(1160 + 1e-9);
    expect(b.fighters[1].x).toBeCloseTo(1560);
  });
});

function activeAt(b: Battle): boolean {
  const f = b.fighters[0];
  const st = f.state;
  if (st.name !== 'attack') return false;
  const m = f.char.moves.forwardSpecial;
  return st.frame > m.startup && st.frame <= m.startup + m.active;
}
