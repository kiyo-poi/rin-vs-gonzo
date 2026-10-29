import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createFighter } from '../src/logic/fighter';
import { cameraX } from '../src/render/camera';

const at = (x0: number, x1: number) => [createFighter(proto, x0, 1), createFighter(proto, x1, -1)] as const;

describe('cameraX', () => {
  it('2人の中間が画面の中央に来る', () => {
    expect(cameraX(at(720, 1200), params)).toBe(320);
  });

  it('ステージの左端より左は映さない', () => {
    expect(cameraX(at(60, 300), params)).toBe(0);
  });

  it('ステージの右端より右は映さない', () => {
    expect(cameraX(at(1700, 1860), params)).toBe(params.stage.width - params.screen.width);
  });
});
