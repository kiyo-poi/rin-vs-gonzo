import { createBattle, stepBattle, type Battle } from './battle';
import { carryGauge } from './gauge';
import type { CharacterData, InputFrame, Params } from './types';

/** 1秒のフレーム数（タイマーの表示用。ゲームは 60fps 固定） */
const FRAMES_PER_SECOND = 60;

export interface RoundResult {
  reason: 'ko' | 'timeUp';
  /** 勝った側。null は引き分け（同時KO・時間切れで体力の割合が同じ） */
  winner: 0 | 1 | null;
}

export type MatchPhase = 'intro' | 'fight' | 'roundEnd' | 'matchEnd';

export interface Match {
  chars: [CharacterData, CharacterData];
  /** 各ラウンドの開始位置（省略時はステージ中央から左右に離れた位置） */
  startXs?: [number, number];
  battle: Battle;
  /** 今のラウンド（1始まり） */
  round: number;
  /** 取ったラウンドの数 */
  wins: [number, number];
  phase: MatchPhase;
  /** 今の段階に入ってからのフレーム数 */
  phaseFrame: number;
  /** ラウンドの残り時間（フレーム） */
  timeLeft: number;
  /** 直前のラウンドの結果 */
  lastResult: RoundResult | null;
  /** 試合の勝者。matchEnd の時だけ意味がある（null は引き分け） */
  winner: 0 | 1 | null;
}

export function createMatch(chars: [CharacterData, CharacterData], params: Params, startXs?: [number, number]): Match {
  return {
    chars,
    startXs,
    battle: createBattle(chars, params, startXs),
    round: 1,
    wins: [0, 0],
    phase: 'intro',
    phaseFrame: 0,
    timeLeft: params.round.timeFrames,
    lastResult: null,
    winner: null,
  };
}

/** 残り時間の表示（秒、切り上げ） */
export function timerSeconds(m: Match): number {
  return Math.ceil(m.timeLeft / FRAMES_PER_SECOND);
}

/** ラウンドの決着を調べる。決まっていなければ null。KO と時間切れが同じフレームなら KO */
export function judgeRound(battle: Battle, timeLeft: number): RoundResult | null {
  const [f0, f1] = battle.fighters;
  if (f0.health === 0 || f1.health === 0) {
    const winner = f0.health === 0 && f1.health === 0 ? null : f0.health === 0 ? 1 : 0;
    return { reason: 'ko', winner };
  }
  if (timeLeft > 0) return null;
  // 体力の最大値はキャラで違うので、残り体力の割合で比べる
  const r0 = f0.health / f0.char.stats.health;
  const r1 = f1.health / f1.char.stats.health;
  return { reason: 'timeUp', winner: r0 === r1 ? null : r0 > r1 ? 0 : 1 };
}

/** 試合を1フレーム進める */
export function stepMatch(m: Match, inputs: [InputFrame, InputFrame], params: Params): Match {
  const frame = m.phaseFrame + 1;
  switch (m.phase) {
    case 'intro':
      if (frame <= params.round.introFrames) return { ...m, phaseFrame: frame };
      // 開始表示が終わったフレームから対戦を始める
      return fight({ ...m, phase: 'fight', phaseFrame: 0 }, inputs, params);
    case 'fight':
      return fight(m, inputs, params);
    case 'roundEnd':
      if (frame <= params.round.endFrames) return { ...m, phaseFrame: frame };
      return nextRound(m, params);
    case 'matchEnd':
      return { ...m, phaseFrame: frame };
  }
}

function fight(m: Match, inputs: [InputFrame, InputFrame], params: Params): Match {
  const battle = stepBattle(m.battle, inputs, params);
  // [超必殺] 暗転中はタイマーも止める
  const timeLeft = m.battle.freeze > 0 ? m.timeLeft : m.timeLeft - 1;
  const result = judgeRound(battle, timeLeft);
  if (!result) return { ...m, battle, timeLeft, phaseFrame: m.phaseFrame + 1 };
  // 勝者に1勝。引き分けなら両者に1勝
  const wins: [number, number] = [
    m.wins[0] + (result.winner === 1 ? 0 : 1),
    m.wins[1] + (result.winner === 0 ? 0 : 1),
  ];
  return { ...m, battle, timeLeft, phase: 'roundEnd', phaseFrame: 0, lastResult: result, wins };
}

function nextRound(m: Match, params: Params): Match {
  const [w0, w1] = m.wins;
  const need = params.round.winsToWin;
  // 先に必要な勝ち数に届いた方の勝ち。両者が同時に届いた時（両者リーチからの引き分け）は続ける
  if ((w0 >= need || w1 >= need) && w0 !== w1) {
    return { ...m, phase: 'matchEnd', phaseFrame: 0, winner: w0 > w1 ? 0 : 1 };
  }
  if (m.round >= params.round.maxRounds) return { ...m, phase: 'matchEnd', phaseFrame: 0, winner: null };
  return {
    ...m,
    round: m.round + 1,
    // [ゲージ] ゲージは次のラウンドに持ち越す
    battle: (() => { const b = createBattle(m.chars, params, m.startXs); return { ...b, fighters: carryGauge(b.fighters, m.battle.fighters) }; })(),
    phase: 'intro',
    phaseFrame: 0,
    timeLeft: params.round.timeFrames,
  };
}

/** 再戦してよいか。勝者の表示を最低これだけ（endFrames）見せる */
export function canRematch(m: Match, params: Params): boolean {
  return m.phase === 'matchEnd' && m.phaseFrame >= params.round.endFrames;
}
