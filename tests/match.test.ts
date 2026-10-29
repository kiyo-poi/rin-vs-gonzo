import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createMatch, stepMatch, timerSeconds, type Match } from '../src/logic/match';
import type { CharacterData, InputFrame, Params } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Pair = [InputFrame, InputFrame];
const IDLE: Pair = [NONE, NONE];
const XS: [number, number] = [400, 500];

/** テストを速くするための短い試合。体力 30 の仮キャラはパンチ1発で KO される */
const quick: Params = { ...params, round: { ...params.round, introFrames: 2, endFrames: 2, timeFrames: 30 } };
const glass: CharacterData = { ...proto, stats: { ...proto.stats, health: 30 } };

const P1_PUNCH: Pair = [inputOf([], ['punch']), NONE];
const P2_PUNCH: Pair = [NONE, inputOf([], ['punch'])];
const BOTH_PUNCH: Pair = [inputOf([], ['punch']), inputOf([], ['punch'])];

function stepTimes(m: Match, n: number, inputs: Pair, p: Params): Match {
  let cur = m;
  for (let i = 0; i < n; i++) cur = stepMatch(cur, inputs, p);
  return cur;
}

/** この呼び出しが対戦の1フレームになるか（ラウンド開始表示の最後の次から） */
function isFightCall(m: Match, p: Params): boolean {
  return m.phase === 'fight' || (m.phase === 'intro' && m.phaseFrame >= p.round.introFrames);
}

/** 1ラウンドを決着まで進める。対戦の1F目だけ first を入れ、あとは何も押さない */
function playRound(m: Match, first: Pair): Match {
  let cur = m;
  let fightFrames = 0;
  while (cur.phase === 'intro' || cur.phase === 'fight') {
    const fight = isFightCall(cur, quick);
    cur = stepMatch(cur, fight && fightFrames === 0 ? first : IDLE, quick);
    if (fight) fightFrames++;
  }
  return cur;
}

/** 決着表示を最後まで進める（次のラウンドの開始表示か、試合終了になる） */
function finishRoundEnd(m: Match): Match {
  let cur = m;
  while (cur.phase === 'roundEnd') cur = stepMatch(cur, IDLE, quick);
  return cur;
}

const playAndFinish = (m: Match, first: Pair) => finishRoundEnd(playRound(m, first));

describe('ラウンド開始表示（120F）', () => {
  it('120F の間は動けず、121F目から対戦が始まる', () => {
    const start = createMatch([proto, proto], params, XS);
    const intro = stepTimes(start, 120, [inputOf(['right']), NONE], params);
    expect(intro.phase).toBe('intro');
    expect(intro.battle.fighters[0].x).toBe(400);
    const first = stepMatch(intro, [inputOf(['right']), NONE], params);
    expect(first.phase).toBe('fight');
    expect(first.battle.fighters[0].x).toBe(405);
  });
});

describe('タイマー（99秒）', () => {
  const afterIntro = stepTimes(createMatch([proto, proto], params, XS), 120, IDLE, params);

  it('対戦の開始時は 99', () => {
    expect(timerSeconds(afterIntro)).toBe(99);
  });

  it('1秒（60F）ごとに1減る', () => {
    expect(timerSeconds(stepTimes(afterIntro, 60, IDLE, params))).toBe(98);
    expect(timerSeconds(stepTimes(afterIntro, 120, IDLE, params))).toBe(97);
  });

  it('5940F で時間切れ。体力が同じなら引き分けで両者に1勝', () => {
    const m = stepTimes(afterIntro, 5940, IDLE, params);
    expect(m.phase).toBe('roundEnd');
    expect(m.lastResult).toEqual({ reason: 'timeUp', winner: null });
    expect(m.wins).toEqual([1, 1]);
  });
});

describe('ラウンドの決着', () => {
  it('KO：体力0にした側が1勝', () => {
    const m = playRound(createMatch([glass, glass], quick, XS), P1_PUNCH);
    expect(m.phase).toBe('roundEnd');
    expect(m.lastResult).toEqual({ reason: 'ko', winner: 0 });
    expect(m.wins).toEqual([1, 0]);
  });

  it('時間切れ：残り体力の割合が多い方の勝ち', () => {
    const m = playRound(createMatch([proto, proto], quick, XS), P1_PUNCH);
    expect(m.lastResult).toEqual({ reason: 'timeUp', winner: 0 });
    expect(m.wins).toEqual([1, 0]);
  });

  it('時間切れは割合で比べる（体力の最大値が違っても公平に）', () => {
    // 1P：最大 850 で 820（96.5%）、2P：最大 1150 で 1150（100%）→ 2P の勝ち
    const tank: CharacterData = { ...proto, stats: { ...proto.stats, health: 1150 } };
    const m = playRound(createMatch([proto, tank], quick, XS), P2_PUNCH);
    expect(m.battle.fighters[0].health).toBe(820);
    expect(m.lastResult).toEqual({ reason: 'timeUp', winner: 1 });
  });

  it('同時KO：両者に1勝', () => {
    const m = playRound(createMatch([glass, glass], quick, XS), BOTH_PUNCH);
    expect(m.lastResult).toEqual({ reason: 'ko', winner: null });
    expect(m.wins).toEqual([1, 1]);
  });

  it('決着表示のあとは次のラウンド。体力・位置・残り時間は戻り、勝ち数は残る', () => {
    const ended = playRound(createMatch([glass, glass], quick, XS), P1_PUNCH);
    const stillEnd = stepTimes(ended, 2, IDLE, quick);
    expect(stillEnd.phase).toBe('roundEnd');
    const next = stepMatch(stillEnd, IDLE, quick);
    expect(next.phase).toBe('intro');
    expect(next.round).toBe(2);
    expect(next.wins).toEqual([1, 0]);
    expect(next.timeLeft).toBe(30);
    expect(next.battle.fighters.map((f) => [f.x, f.health])).toEqual([[400, 30], [500, 30]]);
  });
});

describe('試合の決着', () => {
  it('2ラウンド先取で勝ち', () => {
    let m = createMatch([glass, glass], quick, XS);
    m = playAndFinish(m, P1_PUNCH);
    m = playAndFinish(m, P1_PUNCH);
    expect(m.phase).toBe('matchEnd');
    expect(m.winner).toBe(0);
    expect(m.wins).toEqual([2, 0]);
  });

  it('1勝1敗からの引き分けで両者2勝なら、決着がつくまで続く', () => {
    let m = createMatch([glass, glass], quick, XS);
    m = playAndFinish(m, P1_PUNCH);
    m = playAndFinish(m, P2_PUNCH);
    m = playAndFinish(m, BOTH_PUNCH);
    expect(m.wins).toEqual([2, 2]);
    expect(m.phase).toBe('intro');
    expect(m.round).toBe(4);
    m = playAndFinish(m, P2_PUNCH);
    expect(m.phase).toBe('matchEnd');
    expect(m.winner).toBe(1);
  });

  it('5ラウンドで決まらなければ引き分け', () => {
    let m = createMatch([glass, glass], quick, XS);
    for (let i = 0; i < 5; i++) m = playAndFinish(m, BOTH_PUNCH);
    expect(m.round).toBe(5);
    expect(m.phase).toBe('matchEnd');
    expect(m.winner).toBeNull();
  });

  it('試合が終わったら何も変わらない', () => {
    let m = createMatch([glass, glass], quick, XS);
    m = playAndFinish(m, P1_PUNCH);
    m = playAndFinish(m, P1_PUNCH);
    const later = stepTimes(m, 10, P2_PUNCH, quick);
    expect(later.phase).toBe('matchEnd');
    expect(later.wins).toEqual([2, 0]);
  });
});
