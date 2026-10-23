// 浮動小数の誤差で 1F 分に届かないことを防ぐ余裕
const EPSILON = 1e-6;

/**
 * 固定ステップのゲームループ用。経過時間を貯めて 1/60 秒ごとに1回の更新回数を返す。
 * モニターのリフレッシュレートに関係なく、ゲームは1秒60回進む。
 */
export function createFixedStep(stepMs = 1000 / 60, maxSteps = 4): (now: number) => number {
  let last: number | null = null;
  let accumulated = 0;

  return (now: number): number => {
    if (last === null) {
      last = now;
      return 0;
    }
    accumulated += now - last;
    last = now;

    let steps = 0;
    while (accumulated >= stepMs - EPSILON && steps < maxSteps) {
      accumulated -= stepMs;
      steps++;
    }
    // タブを裏に回して戻った時などに一気に進まないよう、あふれた時間は捨てる
    if (steps === maxSteps) accumulated = 0;
    return steps;
  };
}
