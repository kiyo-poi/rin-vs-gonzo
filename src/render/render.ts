import { activeHitbox, hurtBoxes } from '../logic/fighter';
import { canRematch, timerSeconds, type Match } from '../logic/match';
import type { Box, Fighter, Params } from '../logic/types';
import { cameraX } from './camera';
import { phaseMessage } from './hud';

export interface DebugInfo {
  /** 開発用の表示（攻撃の箱・状態・押しているキー）を出すか */
  show: boolean;
  keys: { p1: string[]; p2: string[] };
}

const COLORS = ['#e55', '#58f'] as const;
const HEALTH_BAR = { width: 500, height: 24, top: 30, side: 40 };
/** 背景の縦線の間隔（カメラの動きを見やすくするため） */
const GRID = 160;

export function drawFrame(ctx: CanvasRenderingContext2D, match: Match, params: Params, debug: DebugInfo): void {
  const { width, height } = ctx.canvas;
  const groundY = params.render.groundY;
  const battle = match.battle;
  const camX = cameraX(battle.fighters, params);
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

  battle.fighters.forEach((f, i) => {
    ctx.fillStyle = COLORS[i];
    for (const box of hurtBoxes(f)) {
      const s = toScreen(box);
      ctx.fillRect(s.x, s.y, s.w, s.h);
      if (f.state.name === 'guard' || f.state.name === 'blockstun') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      }
    }
    drawHealth(ctx, f, i, width);

    if (debug.show) {
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

  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('●'.repeat(match.wins[0]), HEALTH_BAR.side, 80);
  ctx.textAlign = 'right';
  ctx.fillText('●'.repeat(match.wins[1]), width - HEALTH_BAR.side, 80);

  const message = phaseMessage(match, params);
  ctx.textAlign = 'center';
  if (message) {
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(message, width / 2, 300);
  }
  if (canRematch(match, params)) {
    ctx.font = '24px sans-serif';
    ctx.fillText('パンチでもう一度', width / 2, 360);
  }
  ctx.textAlign = 'left';
}

/** 体力バー。1P は左、2P は右。減ると外側から縮む（中央側に寄せて描く） */
function drawHealth(ctx: CanvasRenderingContext2D, f: Fighter, index: number, width: number): void {
  const { width: barW, height: barH, top, side } = HEALTH_BAR;
  const x = index === 0 ? side : width - side - barW;
  ctx.fillStyle = '#400';
  ctx.fillRect(x, top, barW, barH);
  const w = (barW * f.health) / f.char.stats.health;
  ctx.fillStyle = '#fc3';
  ctx.fillRect(index === 0 ? x + barW - w : x, top, w, barH);
}
