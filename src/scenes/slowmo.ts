/** KO のスローの長さ（画面のフレーム数）。この間は対戦ロジックを2フレームに1回だけ進める */
export const KO_SLOW_FRAMES = 60;

/** スローを1フレーム進める。step は「このフレームに対戦ロジックを進めるか」 */
export function tickSlow(remaining: number): { remaining: number; step: boolean } {
  if (remaining <= 0) return { remaining: 0, step: true };
  const next = remaining - 1;
  return { remaining: next, step: next % 2 === 0 };
}
