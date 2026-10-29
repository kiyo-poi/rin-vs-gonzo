import type { Fighter, Params } from '../logic/types';

/** 画面の左端のステージ座標。2人の中間を画面の中央にし、ステージの外は映さない（縦は固定、ズームなし） */
export function cameraX(fighters: readonly [Fighter, Fighter], params: Params): number {
  const middle = (fighters[0].x + fighters[1].x) / 2;
  const max = params.stage.width - params.screen.width;
  return Math.min(max, Math.max(0, middle - params.screen.width / 2));
}
