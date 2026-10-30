import { describe, expect, it } from 'vitest';
import { FADE_FRAMES, SceneStack, type FrameInput } from '../src/core/scene';
import { characters, controls, params } from '../src/data/data';
import type { Button } from '../src/logic/types';
import { FightScene, ModeScene, PauseScene, ResultScene, SelectScene, TitleScene, type Game } from '../src/scenes/scenes';
import { inputOf, NONE } from './helpers';

function setup() {
  const stack = new SceneStack();
  const game: Game = {
    stack, params, controls, roster: Object.values(characters),
    clock: () => 3,
    debug: () => ({ show: false, keys: { p1: [], p2: [] } }),
  };
  const run = (input: FrameInput) => stack.update(input);
  const settle = () => { for (let i = 0; i < FADE_FRAMES * 2; i++) run({ players: [NONE, NONE], pause: false }); };
  const press = (player: 0 | 1, ...buttons: Button[]) => {
    const players: FrameInput['players'] = [NONE, NONE];
    players[player] = inputOf([], buttons);
    run({ players, pause: false });
    settle();
  };
  return { stack, game, run, settle, press };
}

describe('画面の流れ', () => {
  it('タイトル → モード → キャラ選択 → 対戦。ガードで1つ前へ戻れる', () => {
    const { stack, game, settle, press } = setup();
    stack.start(new TitleScene(game));
    settle();
    press(1, 'punch');
    expect(stack.top).toBeInstanceOf(ModeScene);
    press(0, 'guard');
    expect(stack.top).toBeInstanceOf(TitleScene);
    press(0, 'punch');
    press(0, 'punch'); // 2人対戦
    expect(stack.top).toBeInstanceOf(SelectScene);
    press(0, 'guard');
    expect(stack.top).toBeInstanceOf(ModeScene);
    press(0, 'down');
    press(0, 'punch'); // CPU戦
    press(0, 'punch'); // ふつう
    expect(stack.top).toBeInstanceOf(SelectScene);
    press(0, 'punch'); // 1P が決めると CPU も決まる
    expect(stack.top).toBeInstanceOf(FightScene);
  });

  it('ポーズ中はタイマーもキャラも1Fも進まない。Esc で再開', () => {
    const { stack, game, run, settle } = setup();
    stack.start(new FightScene(game, { mode: 'versus', level: 'normal', chars: ['lin', 'lin'], seed: 1 }));
    settle();
    const fight = stack.top as FightScene;
    run({ players: [NONE, NONE], pause: true });
    expect(stack.top).toBeInstanceOf(PauseScene);
    const frozen = fight.current;
    for (let i = 0; i < 200; i++) run({ players: [inputOf(['right']), NONE], pause: false });
    expect(fight.current).toBe(frozen);
    run({ players: [NONE, NONE], pause: true });
    expect(stack.top).toBe(fight);
    run({ players: [NONE, NONE], pause: false });
    expect(fight.current).not.toBe(frozen);
  });

  it('フォーカスが外れたら自動でポーズ', () => {
    const { stack, game, settle } = setup();
    stack.start(new FightScene(game, { mode: 'cpu', level: 'easy', chars: ['lin', 'gonzo'], seed: 1 }));
    settle();
    stack.blur();
    stack.blur();
    expect(stack.top).toBeInstanceOf(PauseScene);
    expect(stack.size).toBe(2);
  });

  it('試合が終わると結果画面へ。再戦は同じ設定で対戦に戻る', () => {
    const { stack, game, run, settle, press } = setup();
    const config = { mode: 'versus' as const, level: 'normal' as const, chars: ['lin', 'gonzo'] as [string, string], seed: 1 };
    stack.start(new FightScene(game, config));
    settle();
    // 何もしないで時間切れを繰り返すと、引き分けのまま最終ラウンドまで進んで決着する
    for (let i = 0; i < 60 * 60 * 10 && !(stack.top instanceof ResultScene); i++) run({ players: [NONE, NONE], pause: false });
    expect(stack.top).toBeInstanceOf(ResultScene);
    settle();
    press(0, 'punch');
    expect(stack.top).toBeInstanceOf(FightScene);
    expect((stack.top as FightScene).current.chars.map((c) => c.id)).toEqual(['lin', 'gonzo']);
  });
});
