import { activeHitbox, hurtBoxes } from '../logic/fighter';
import { timerSeconds, type Match } from '../logic/match';
import type { Box, Fighter, Params } from '../logic/types';
import { cameraX } from './camera';
import { shakeOffset, type Effect, type EffectsState } from './effects';
import type { Trail } from './healthTrail';
import { phaseMessage } from './hud';
import { drawFallbackFighter } from './characterDraw';
import { drawFighterSprite, poseFor, TINT_2P, type SpriteStore } from './sprites';

export interface DebugInfo {
  /** 開発用の表示（攻撃の箱・状態・押しているキー）を出すか */
  show: boolean;
  keys: { p1: string[]; p2: string[] };
}

/** 対戦シーンが持つ見た目だけの値 */
export interface View {
  /** 1P・2P を描く色（同じキャラ同士なら 2P は色違い） */
  colors: [string, string];
  trails: [Trail, Trail];
  effects: EffectsState;
  /** 画像の置き場（無ければ代わりのキャラを描く） */
  sprites?: SpriteStore;
}

const HEALTH_BAR = { width: 500, height: 24, top: 30, side: 40 };
/** 背景の縦線の間隔（カメラの動きを見やすくするため） */
const GRID = 160;

export function drawFrame(ctx: CanvasRenderingContext2D, match: Match, params: Params, view: View, debug: DebugInfo): void {
  const { width, height } = ctx.canvas;
  const groundY = params.render.groundY;
  const battle = match.battle;
  // 画面揺れはカメラに足すだけ（ロジックの位置は変えない）
  const shake = shakeOffset(view.effects);
  const camX = cameraX(battle.fighters, params) + shake.x;
  ctx.save();
  ctx.translate(0, shake.y);
  // ロジックはステージ座標・上がプラス、Canvas は画面座標・下がプラスなので変換する
  const toScreen = (b: Box) => ({ x: b.x - camX, y: groundY - b.y - b.h, w: b.w, h: b.h });

  ctx.fillStyle = '#223';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#334';
  ctx.lineWidth = 1;
  for (let x = 0; x <= params.stage.width; x += GRID) {
    ctx.beginPath();
    ctx.moveTo(x - camX, 0);
    ctx.lineTo(x - camX, groundY);
    ctx.stroke();
  }
  ctx.fillStyle = '#556';
  ctx.fillRect(0, groundY, width, height - groundY);
  // 超必殺の暗転：背景を暗くする（キャラはその上に描く）
  if (battle.freeze > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
  }

  const mirror = battle.fighters[0].char.id === battle.fighters[1].char.id;
  battle.fighters.forEach((f, i) => {
    // 起き上がり無敵の間は2フレームに1回だけ描いて点滅させる。決着表示中は battle.frame が止まるので、点滅させない
    const hidden = match.phase === 'fight' && f.invincible > 0 && battle.frame % 2 === 1;
    if (!hidden) {
      const screenX = f.x - camX;
      const feetY = groundY - f.y;
      const img = view.sprites?.get(f.char.id, poseFor(f)) ?? null;
      // 同じキャラ同士の時だけ 2P を色違いにする
      if (img) drawFighterSprite(ctx, img, f, screenX, feetY, 1, mirror && i === 1 ? TINT_2P : undefined);
      else drawFallbackFighter(ctx, f, screenX, feetY, mirror && i === 1 ? 1 : 0);
    }

    if (debug.show) {
      ctx.strokeStyle = view.colors[i];
      ctx.lineWidth = 1;
      for (const box of hidden ? [] : hurtBoxes(f)) {
        const s = toScreen(box);
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      }
      const active = activeHitbox(f);
      if (active) {
        const s = toScreen(active.box);
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      }
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText(`${f.state.name} ${f.state.frame}`, f.x - camX - 40, groundY - f.y - 180);
    }
  });

  for (const e of view.effects.list) drawEffect(ctx, e, e.x - camX, groundY - e.y);
  ctx.restore();

  battle.fighters.forEach((f, i) => {
    drawHealth(ctx, f, i, width, view.trails[i]);
    drawGauge(ctx, f, i, width, height, params);
  });
  drawHud(ctx, match, params, width);

  if (debug.show) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`1P のキー: ${debug.keys.p1.join(' ')}`, 16, height - 40);
    ctx.fillText(`2P のキー: ${debug.keys.p2.join(' ')}`, 16, height - 16);
  }
}

/** 仮の HUD：タイマー・ラウンド・勝ち数（●）・画面中央の文言 */
function drawHud(ctx: CanvasRenderingContext2D, match: Match, params: Params, width: number): void {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(String(timerSeconds(match)), width / 2, 62);
  ctx.font = '16px sans-serif';
  ctx.fillText(`ROUND ${match.round}`, width / 2, 90);

  // 体力バーの下：キャラ名と、取ったラウンドの数（●）。まだ取っていない分は ○
  const need = params.round.winsToWin;
  const marks = (n: number) => '●'.repeat(Math.min(n, need)) + '○'.repeat(Math.max(0, need - n));
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${match.chars[0].name}  ${marks(match.wins[0])}`, HEALTH_BAR.side, 82);
  ctx.textAlign = 'right';
  ctx.fillText(`${marks(match.wins[1])}  ${match.chars[1].name}`, width - HEALTH_BAR.side, 82);

  const message = phaseMessage(match, params);
  ctx.textAlign = 'center';
  if (message) {
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(message, width / 2, 300);
  }
  ctx.textAlign = 'left';
}

/** 体力バー。1P は左、2P は右。減ると外側から縮む（中央側に寄せて描く）。減った分は赤く残ってから縮む */
function drawHealth(ctx: CanvasRenderingContext2D, f: Fighter, index: number, width: number, trail: Trail): void {
  const { width: barW, height: barH, top, side } = HEALTH_BAR;
  const x = index === 0 ? side : width - side - barW;
  const max = f.char.stats.health;
  const bar = (value: number, color: string) => {
    const w = (barW * Math.max(0, value)) / max;
    ctx.fillStyle = color;
    ctx.fillRect(index === 0 ? x + barW - w : x, top, w, barH);
  };
  ctx.fillStyle = '#222';
  ctx.fillRect(x, top, barW, barH);
  bar(trail.value, '#e22');
  bar(f.health, '#fc3');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, top, barW, barH);
}

const SPARK_COLORS = { hitSpark: '#ffd23a', blockSpark: '#6cf', clashSpark: '#fff' } as const;

/** 演出1つ。火花は広がりながら薄くなる線、擬音は上に浮きながら消える文字 */
function drawEffect(ctx: CanvasRenderingContext2D, e: Effect, sx: number, sy: number): void {
  const t = e.age / e.life;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  if (e.kind === 'text') {
    ctx.font = `bold ${Math.round(40 * e.scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000';
    ctx.strokeText(e.text ?? '', sx, sy - t * 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(e.text ?? '', sx, sy - t * 30);
  } else {
    ctx.strokeStyle = SPARK_COLORS[e.kind];
    ctx.lineWidth = 4;
    const r1 = (10 + 50 * t) * e.scale;
    const r2 = r1 * 0.4;
    for (let k = 0; k < 8; k++) {
      const a = (Math.PI * 2 * k) / 8 + (e.kind === 'blockSpark' ? Math.PI / 8 : 0);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
      ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** 超必殺のゲージ。画面の下、1P は左・2P は右。満タンで色が変わる */
function drawGauge(ctx: CanvasRenderingContext2D, f: Fighter, index: number, width: number, height: number, params: Params): void {
  const barW = 300;
  const barH = 14;
  const top = height - 80;
  const x = index === 0 ? HEALTH_BAR.side : width - HEALTH_BAR.side - barW;
  ctx.fillStyle = '#113';
  ctx.fillRect(x, top, barW, barH);
  const full = f.gauge >= params.gauge.max;
  ctx.fillStyle = full ? '#6ff' : '#36c';
  const w = (barW * f.gauge) / params.gauge.max;
  ctx.fillRect(index === 0 ? x : x + barW - w, top, w, barH);
}
