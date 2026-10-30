import type { SceneStack, FrameInput, Scene } from '../core/scene';
import { createCpu, type CpuController } from '../cpu/cpu';
import { canRematch, createMatch, stepMatch, type Match } from '../logic/match';
import type { CharacterData, Controls, InputFrame, Params } from '../logic/types';
import { soundForPhaseMessage, type Audio } from '../audio/audio';
import { addEventEffects, createEffects, stepEffects } from '../render/effects';
import { createTrail, stepTrail } from '../render/healthTrail';
import { charType } from '../render/labels';
import { fighterColor } from '../render/palette';
import { drawPortrait } from '../render/portrait';
import type { SpriteStore } from '../render/sprites';
import type { ImageStore } from '../render/images';
import { phaseMessage } from '../render/hud';
import { drawFrame, type DebugInfo, type View } from '../render/render';
import { drawBothControls, drawFightGuide, drawHint, drawMenu, drawMoveList, drawScreen } from '../render/screens';
import { LEVELS, resolveChar, resolveChars, resultTitle, stageForMatch, type MatchConfig, type Mode } from './config';
import { stepMenu } from './menu';
import { createSelect, stepSelect, type SelectState } from './select';
import { KO_SLOW_FRAMES, tickSlow } from './slowmo';

/** シーンが使う共通のもの */
export interface Game {
  stack: SceneStack;
  params: Params;
  controls: Controls;
  /** 選べるキャラ（データから並べる。キャラを足すと選択肢が増える） */
  roster: CharacterData[];
  /** 起動からのフレーム数。CPU の乱数の種に使う */
  clock(): number;
  debug(): DebugInfo;
  /** 音（無ければ鳴らさない） */
  audio?: Audio;
  /** 画像の置き場（無ければ代わりのキャラを描く） */
  sprites?: SpriteStore;
  images?: ImageStore;
}

/** メニューの効果音：動いたら move、決定は decide、取り消しは cancel */
function menuSound(game: Game, index: number, r: { index: number; decided: boolean; cancelled: boolean }): void {
  if (r.cancelled) game.audio?.playUi('cancel');
  else if (r.decided) game.audio?.playUi('decide');
  else if (r.index !== index) game.audio?.playUi('move');
}

const GAME_TITLE = 'FIGHT GAME';
const TITLE_LOGO = 'ui/title_logo.png';

export class TitleScene implements Scene {
  private frame = 0;
  constructor(private readonly game: Game) {
    game.audio?.startBgm('title');
  }

  update(input: FrameInput): void {
    this.frame++;
    if (input.players.some((p) => p.pressed.punch)) {
      this.game.audio?.playUi('decide');
      this.game.stack.replace(new ModeScene(this.game));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const logo = this.game.images?.get(TITLE_LOGO) ?? null;
    if (logo) {
      drawScreen(ctx, '');
      // 960×360 の原画を半分（480×180）にして上部中央へ
      ctx.drawImage(logo, (ctx.canvas.width - 480) / 2, 10, 480, 180);
    } else {
      drawScreen(ctx, GAME_TITLE, 96);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fc3';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('〜 少ないボタンで笑える格闘ゲーム 〜', ctx.canvas.width / 2, logo ? 215 : 170);
    // 「PRESS START」はゆっくり点滅させる
    if (Math.floor(this.frame / 30) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText('PRESS START（パンチで開始）', ctx.canvas.width / 2, 360);
    }
    drawBothControls(ctx, this.game.controls, 520);
  }
}

export class ModeScene implements Scene {
  private step: 'mode' | 'level' = 'mode';
  private index = 0;
  private levelIndex = 1;
  constructor(private readonly game: Game) {
    game.audio?.startBgm('title');
  }

  update(input: FrameInput): void {
    if (this.step === 'mode') {
      const r = stepMenu(this.index, 2, input.players);
      menuSound(this.game, this.index, r);
      this.index = r.index;
      if (r.cancelled) this.game.stack.replace(new TitleScene(this.game));
      else if (r.decided && this.index === 0) this.goSelect('versus');
      else if (r.decided) this.step = 'level';
      return;
    }
    const r = stepMenu(this.levelIndex, LEVELS.length, input.players);
    menuSound(this.game, this.levelIndex, r);
    this.levelIndex = r.index;
    if (r.cancelled) this.step = 'mode';
    else if (r.decided) this.goSelect('cpu');
  }

  private goSelect(mode: Mode): void {
    this.game.stack.replace(new SelectScene(this.game, mode, LEVELS[this.levelIndex].level));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = ctx.canvas.width / 2;
    if (this.step === 'mode') {
      drawScreen(ctx, 'モード選択');
      drawMenu(ctx, ['2人対戦', 'CPU戦'], this.index, cx, 300);
    } else {
      drawScreen(ctx, 'CPU戦：難易度');
      drawMenu(ctx, LEVELS.map((l) => l.label), this.levelIndex, cx, 280);
    }
    drawHint(ctx, '↑↓で選ぶ　パンチで決定　ガードで戻る（1P・2P どちらのキーでも）', 660);
  }
}

export class SelectScene implements Scene {
  private state: SelectState;
  private doneWait = -1;
  constructor(
    private readonly game: Game,
    private readonly mode: Mode,
    private readonly level: MatchConfig['level'],
  ) {
    const last = Math.max(0, game.roster.length - 1);
    this.state = createSelect(mode === 'cpu', [0, Math.min(1, last)]);
    game.audio?.startBgm('select');
  }

  update(input: FrameInput): void {
    const seed = this.game.clock();
    const r = stepSelect(this.state, input.players, this.game.roster.length, seed);
    this.playSelectSound(r);
    this.state = r.state;
    if (r.back) {
      this.game.stack.replace(new ModeScene(this.game));
      return;
    }
    if (r.done) {
      const [a, b] = r.state.cursors;
      const config: MatchConfig = {
        mode: this.mode,
        level: this.level,
        chars: [this.game.roster[a.index].id, this.game.roster[b.index].id],
        seed,
      };
      this.game.stack.replace(new FightScene(this.game, config));
    }
  }

  private playSelectSound(r: ReturnType<typeof stepSelect>): void {
    const audio = this.game.audio;
    if (!audio) return;
    const before = this.state.cursors;
    const after = r.state.cursors;
    if (r.back) audio.playUi('cancel');
    else if (after.some((c, i) => c.decided && !before[i].decided && !(this.state.cpu && i === 1))) audio.playUi('decide');
    else if (after.some((c, i) => !c.decided && before[i].decided)) audio.playUi('cancel');
    else if (after.some((c, i) => c.index !== before[i].index)) audio.playUi('move');
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawScreen(ctx, 'キャラ選択', 48);
    const roster = this.game.roster;
    const gap = 40;
    const cardW = Math.min(520, Math.floor((ctx.canvas.width - 80 - gap * (roster.length - 1)) / roster.length));
    const totalW = roster.length * cardW + (roster.length - 1) * gap;
    const left = (ctx.canvas.width - totalW) / 2;
    const top = 140;
    const cardH = 360;
    const ids = [roster[this.state.cursors[0].index].id, roster[this.state.cursors[1].index].id] as [string, string];
    roster.forEach((char, i) => {
      const x = left + i * (cardW + gap);
      ctx.fillStyle = '#2a2a44';
      ctx.fillRect(x, top, cardW, cardH);
      // 立ち絵（画像が無ければ代わりのキャラ）。カードの枠に収める
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 10, top + 10, 90, 160);
      ctx.clip();
      drawPortrait(ctx, this.game.sprites, char, this.game.params, 'idle', x + 55, top + 165, { scale: 0.3, fallbackScale: 0.9 });
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(char.name, x + 120, top + 50);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#fc3';
      ctx.fillText(charType(char), x + 120, top + 80);
      drawMoveList(ctx, char, x + 120, top + 115, 'left', cardW - 130);
    });
    const labels = ['1P', this.mode === 'cpu' ? 'CPU' : '2P'];
    const colors = ['#f55', '#59f'];
    this.state.cursors.forEach((c, p) => {
      if (p === 1 && this.mode === 'cpu' && !c.decided) return;
      const x = left + c.index * (cardW + gap);
      const inset = p * 8;
      ctx.strokeStyle = colors[p];
      ctx.lineWidth = c.decided ? 8 : 4;
      ctx.strokeRect(x - 6 + inset, top - 6 + inset, cardW + 12 - inset * 2, cardH + 12 - inset * 2);
      ctx.fillStyle = colors[p];
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = p === 0 ? 'left' : 'right';
      ctx.fillText(`${labels[p]}${c.decided ? ' OK!' : ''}`, p === 0 ? x : x + cardW, top - 14);
    });
    if (ids[0] === ids[1]) {
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'center';
      ctx.font = '16px sans-serif';
      ctx.fillText('同じキャラ同士は 2P が色違いになります', ctx.canvas.width / 2, top + cardH + 28);
    }
    drawHint(ctx, '←→で選ぶ　パンチで決定　ガードで取り消し・戻る（各自のキーで）', 556);
    drawBothControls(ctx, this.game.controls, 584);
  }
}

export class FightScene implements Scene {
  private match: Match;
  private readonly cpu: CpuController | null;
  private view: View;
  private slow = 0;

  constructor(
    private readonly game: Game,
    private readonly config: MatchConfig,
  ) {
    const chars = resolveChars(game.roster, config.chars);
    this.match = createMatch(chars, game.params);
    this.cpu = config.mode === 'cpu' ? createCpu(config.level, game.params, config.seed) : null;
    const [f0, f1] = this.match.battle.fighters;
    this.view = {
      colors: [fighterColor(config.chars, 0), fighterColor(config.chars, 1)],
      trails: [createTrail(f0.health), createTrail(f1.health)],
      effects: createEffects(),
      sprites: game.sprites,
      images: game.images,
      stageId: stageForMatch(chars, config.mode),
    };
    game.audio?.startBgm('stage');
    // 最初の「ROUND 1」はステップ前から出ているので、ここで鳴らす
    const first = soundForPhaseMessage(null, phaseMessage(this.match, game.params));
    if (first) game.audio?.playSound(first);
  }

  /** 今の試合（テスト用） */
  get current(): Match {
    return this.match;
  }

  update(input: FrameInput): void {
    if (input.pause) {
      this.pause();
      return;
    }
    const slow = tickSlow(this.slow);
    this.slow = slow.remaining;
    if (slow.step) this.stepMatch(input);

    const fighters = this.match.battle.fighters;
    this.view = {
      ...this.view,
      trails: [
        stepTrail(this.view.trails[0], fighters[0].health, fighters[0].char.stats.health),
        stepTrail(this.view.trails[1], fighters[1].health, fighters[1].char.stats.health),
      ],
      effects: stepEffects(this.view.effects),
    };

    if (canRematch(this.match, this.game.params)) {
      this.game.stack.replace(new ResultScene(this.game, this.config, this.match.winner));
    }
  }

  private stepMatch(input: FrameInput): void {
    const before = this.match;
    const p2: InputFrame = this.cpu ? this.cpu.next(before, 1) : input.players[1];
    const after = stepMatch(before, [input.players[0], p2], this.game.params);
    this.match = after;
    // 対戦ロジックが進んだフレームだけ出来事を読む（開始表示・決着表示中は battle が同じものなので読まない）
    if (after.battle !== before.battle && after.battle.events.length > 0) {
      this.game.audio?.playEvents(after.battle.events);
      this.view = { ...this.view, effects: addEventEffects(this.view.effects, after.battle.events, after.battle.fighters) };
    }
    // 試合の進行の表示が変わったら鳴らす（ROUND / FIGHT / KO / TIME UP / WIN）
    const phaseSound = soundForPhaseMessage(phaseMessage(before, this.game.params), phaseMessage(after, this.game.params));
    if (phaseSound) this.game.audio?.playSound(phaseSound);
    // KO の瞬間から少しスローにする
    if (before.phase === 'fight' && after.phase === 'roundEnd' && after.lastResult?.reason === 'ko') {
      this.slow = KO_SLOW_FRAMES;
    }
  }

  private pause(): void {
    this.game.stack.push(new PauseScene(this.game, this.config));
  }

  onBlur(): void {
    this.pause();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawFrame(ctx, this.match, this.game.params, this.view, this.game.debug());
    drawFightGuide(ctx, this.game.controls);
  }
}

export class PauseScene implements Scene {
  private index = 0;
  constructor(
    private readonly game: Game,
    private readonly config: MatchConfig,
  ) {}

  update(input: FrameInput): void {
    const r = stepMenu(this.index, 3, input.players);
    menuSound(this.game, this.index, r);
    this.index = r.index;
    if (input.pause || r.cancelled || (r.decided && this.index === 0)) this.game.stack.pop();
    else if (r.decided && this.index === 1) this.game.stack.replace(new SelectScene(this.game, this.config.mode, this.config.level));
    else if (r.decided) this.game.stack.replace(new TitleScene(this.game));
  }

  // 同じウィンドウのフォーカスがまた外れても、ポーズは重ねない
  onBlur(): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('PAUSE', width / 2, 110);
    drawMenu(ctx, ['再開', 'キャラ選択へ', 'タイトルへ'], this.index, width / 2, 190, 48);
    const chars = resolveChars(this.game.roster, this.config.chars);
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f88';
    ctx.fillText(`1P ${chars[0].name} の技`, 80, 330);
    drawMoveList(ctx, chars[0], 80, 356, 'left', 540);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8af';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${this.config.mode === 'cpu' ? 'CPU' : '2P'} ${chars[1].name} の技`, width - 80, 330);
    drawMoveList(ctx, chars[1], width - 80, 356, 'right', 540);
    drawBothControls(ctx, this.game.controls, 592);
  }
}

export class ResultScene implements Scene {
  private index = 0;
  constructor(
    private readonly game: Game,
    private readonly config: MatchConfig,
    private readonly winner: 0 | 1 | null,
  ) {
    game.audio?.startBgm('result');
  }

  update(input: FrameInput): void {
    const r = stepMenu(this.index, 3, input.players);
    menuSound(this.game, this.index, r);
    this.index = r.index;
    if (!r.decided) return;
    // 再戦は CPU の乱数を変える（同じシードだと CPU が前の試合と同じ動きをする）
    if (this.index === 0) this.game.stack.replace(new FightScene(this.game, { ...this.config, seed: this.game.clock() }));
    else if (this.index === 1) this.game.stack.replace(new SelectScene(this.game, this.config.mode, this.config.level));
    else this.game.stack.replace(new TitleScene(this.game));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawScreen(ctx, resultTitle(this.winner, this.config.mode), 80);
    const cx = ctx.canvas.width / 2;
    if (this.winner !== null) {
      const char = resolveChar(this.game.roster, this.config.chars[this.winner]);
      // 勝ったキャラの立ち絵（画像が無ければ代わりのキャラ）
      drawPortrait(ctx, this.game.sprites, char, this.game.params, 'win', cx, 370, {
        scale: 0.4,
        fallbackScale: 1.3,
        colorIndex: this.winner === 1 && this.config.chars[0] === this.config.chars[1] ? 1 : 0,
        tint: this.winner === 1 && this.config.chars[0] === this.config.chars[1],
      });
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(char.name, cx, 400);
    }
    drawMenu(ctx, ['再戦', 'キャラ選択へ', 'タイトルへ'], this.index, cx, 480, 50);
    drawHint(ctx, '↑↓で選ぶ　パンチで決定（1P・2P どちらのキーでも）', 680);
  }
}
