import { clampX } from './fighter';
import type { Fighter, Params } from './types';

/** 押し合うのは地上にいる時だけ（空中なら重なってよい。相手を飛び越えられるように） */
function onGround(f: Fighter): boolean {
  return f.state.name !== 'air' && f.state.name !== 'airHit';
}

/**
 * 2人が重ならないように押し合う。prev は動かす前の2人（どちらが左か・誰が押したかを決めるのに使う）。
 * 片方だけが相手に向かって進んで重なったら、押された側は重なった分 × pushRate だけ動く。
 */
export function resolvePush(moved: [Fighter, Fighter], prev: [Fighter, Fighter], params: Params): [Fighter, Fighter] {
  if (!onGround(moved[0]) || !onGround(moved[1])) return moved;

  // どちらが左か。同じ位置なら、動かす前の並びで決める
  const left: 0 | 1 = moved[0].x !== moved[1].x ? (moved[0].x < moved[1].x ? 0 : 1) : prev[0].x <= prev[1].x ? 0 : 1;
  const right: 0 | 1 = left === 0 ? 1 : 0;
  const minGap = (moved[0].char.stats.pushWidth + moved[1].char.stats.pushWidth) / 2;
  const overlap = minGap - (moved[right].x - moved[left].x);
  if (overlap <= 0) return moved;

  // 相手に向かって進んだ側が「押した側」
  const leftPushed = moved[left].x > prev[left].x;
  const rightPushed = moved[right].x < prev[right].x;
  // 左の人が下がる割合
  let leftShare = 0.5;
  if (leftPushed && !rightPushed) leftShare = 1 - params.pushRate;
  if (rightPushed && !leftPushed) leftShare = params.pushRate;

  let leftX = clampX(moved[left].x - overlap * leftShare, params);
  let rightX = clampX(moved[right].x + overlap * (1 - leftShare), params);
  // 画面端で下がれなかった分は、もう片方が受け持つ
  const remaining = minGap - (rightX - leftX);
  if (remaining > 0) {
    if (leftX <= params.stage.edgeMargin) rightX = clampX(rightX + remaining, params);
    else leftX = clampX(leftX - remaining, params);
  }

  const result: [Fighter, Fighter] = [moved[0], moved[1]];
  result[left] = { ...moved[left], x: leftX };
  result[right] = { ...moved[right], x: rightX };
  return result;
}

/**
 * 2人の距離を「画面幅 − 画面端の余白 × 2」までにする（2人とも画面に収まるように）。
 * 超えた分は、このフレームに相手から離れる向きに動いた量に応じて戻す。
 */
export function limitDistance(moved: [Fighter, Fighter], prev: [Fighter, Fighter], params: Params): [Fighter, Fighter] {
  const max = params.screen.width - 2 * params.stage.edgeMargin;
  const excess = Math.abs(moved[0].x - moved[1].x) - max;
  if (excess <= 0) return moved;

  const away = [0, 1].map((i) => {
    // 相手から離れる向き（左にいるなら -1）
    const sign = moved[i].x < moved[1 - i].x ? -1 : 1;
    return { sign, amount: Math.max(0, (moved[i].x - prev[i].x) * sign) };
  });
  const total = away[0].amount + away[1].amount;
  const share = (i: number) => (total > 0 ? away[i].amount / total : 0.5);
  return [
    { ...moved[0], x: moved[0].x - away[0].sign * excess * share(0) },
    { ...moved[1], x: moved[1].x - away[1].sign * excess * share(1) },
  ];
}
