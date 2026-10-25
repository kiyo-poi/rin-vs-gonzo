import type { Battle } from '../logic/battle';
import { activeHitbox, hurtBoxes } from '../logic/fighter';
import type { Box, Fighter, Params } from '../logic/types';

export interface DebugInfo {
  /** 開発用の表示（攻撃の箱・状態・押しているキー）を出すか */
  show: boolean;
  keys: string[];
}

const COLORS = ['#e55', '#58f'] as const;
const HEALTH_BAR = { width: 500, height: 24, top: 30, side: 40 };

export function drawFrame(ctx: CanvasRenderingContext2D, battle: Battle, params: Params, debug: DebugInfo): void {
  const { width, height } = ctx.canvas;
  const groundY = params.render.groundY;
  // ロジックは上がプラス、Canvas は下がプラスなので変換する
  const toScreen = (b: Box) => ({ x: b.x, y: groundY - b.y - b.h, w: b.w, h: b.h });

  ctx.fillStyle = '#223';
  ctx.fillRect(0, 0, width, height);
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
      ctx.fillText(`${f.state.name} ${f.state.frame}`, f.x - 40, groundY - f.y - 180);
    }
  });

  if (debug.show) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`押しているキー: ${debug.keys.join(' ')}`, 16, height - 16);
  }
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
