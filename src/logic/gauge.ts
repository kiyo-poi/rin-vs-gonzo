import type { Fighter, Params } from './types';

/** ゲージを足す（端数は切り捨て、上限で止める） */
export function addGauge(f: Fighter, amount: number, params: Params): Fighter {
  const gauge = Math.min(params.gauge.max, f.gauge + Math.floor(amount));
  return gauge === f.gauge ? f : { ...f, gauge };
}

export type GaugeCause = 'hit' | 'guarded' | 'armor';

/**
 * 当たった・ガードされた時のゲージ増加（06_params.md）。
 * ヒット（アーマーで耐えた分も含む）：当てた側 0.8 倍・食らった側 0.4 倍。ガード：ガードさせた側だけ 0.3 倍。
 * 超必殺を当てた側には増やさない（使った直後にゲージが戻らないように）
 */
export function gainGauge(
  fighters: [Fighter, Fighter],
  attacker: 0 | 1,
  cause: GaugeCause,
  damage: number,
  attackerIsSuper: boolean,
  params: Params,
): [Fighter, Fighter] {
  const defender = (1 - attacker) as 0 | 1;
  const out: [Fighter, Fighter] = [fighters[0], fighters[1]];
  const g = params.gauge;
  if (!attackerIsSuper) out[attacker] = addGauge(out[attacker], damage * (cause === 'guarded' ? g.onGuarded : g.onHit), params);
  if (cause !== 'guarded') out[defender] = addGauge(out[defender], damage * g.onHurt, params);
  return out;
}

/** 次のラウンドの対戦に、前のラウンドの終わりのゲージを持ち越す */
export function carryGauge(next: [Fighter, Fighter], prev: [Fighter, Fighter]): [Fighter, Fighter] {
  return [{ ...next[0], gauge: prev[0].gauge }, { ...next[1], gauge: prev[1].gauge }];
}
