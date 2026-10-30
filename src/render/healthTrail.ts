/** 体力バーの「赤い残り」。描画側だけが持つ見た目の値（08_architecture.md 2.6） */
export interface Trail {
  /** 赤い部分の端（体力の値） */
  value: number;
  /** 縮み始めるまでの残りフレーム */
  hold: number;
  /** 前のフレームの体力 */
  last: number;
}

/** 減ってからこのフレーム数だけ赤く残す */
export const TRAIL_HOLD = 30;
/** 縮む速さ（最大体力に対する 1F あたりの割合） */
export const TRAIL_SPEED = 0.006;

export function createTrail(health: number): Trail {
  return { value: health, hold: 0, last: health };
}

/** 1フレーム進める。減った時は TRAIL_HOLD だけ残してからゆっくり縮む。回復（新しいラウンド）ならすぐ消える */
export function stepTrail(t: Trail, health: number, maxHealth: number): Trail {
  if (health >= t.value) return createTrail(health);
  if (health < t.last) return { value: t.value, hold: TRAIL_HOLD, last: health };
  if (t.hold > 0) return { ...t, hold: t.hold - 1, last: health };
  return { value: Math.max(health, t.value - maxHealth * TRAIL_SPEED), hold: 0, last: health };
}
