import { hurtBoxes } from '../logic/fighter';
import type { Fighter } from '../logic/types';

interface Style {
  skin: string;
  top: string;
  pants: string;
  shoes: string;
  hair: string;
  /** 1P と 2P の服の色（2P は色違い） */
  topAlt: string;
}

const STYLES: Record<string, Style> = {
  lin: { skin: '#f3c9a0', top: '#d9302c', topAlt: '#2c6ad9', pants: '#1c1c22', shoes: '#1c1c22', hair: '#1c1c22' },
  gonzo: { skin: '#e0a577', top: '#e0a577', topAlt: '#c9a040', pants: '#15151a', shoes: '#f2c622', hair: '#15151a' },
};
const DEFAULT_STYLE: Style = { skin: '#f0cfa8', top: '#7a7a88', topAlt: '#4f9a7a', pants: '#33333c', shoes: '#222', hair: '#333' };

/**
 * 画像が無い時の代わりに、コードで描くデフォルメキャラ。食らいの箱の範囲に収まる大きさで、
 * 頭を大きく描く。screenX・groundY は足元の画面座標（ジャンプ中は高さを引いた位置）。
 */
export function drawFallbackFighter(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  screenX: number,
  groundY: number,
  colorIndex: number,
): void {
  const style = STYLES[f.char.id] ?? DEFAULT_STYLE;
  const top = colorIndex === 1 ? style.topAlt : style.top;

  // 食らいの箱を囲む長方形（足元基準・右向き基準に直す）
  const boxes = hurtBoxes(f);
  let minX = Infinity, maxX = -Infinity, maxY = 0;
  for (const b of boxes) {
    minX = Math.min(minX, b.x - f.x);
    maxX = Math.max(maxX, b.x + b.w - f.x);
    maxY = Math.max(maxY, b.y - f.y + b.h);
  }
  if (!Number.isFinite(minX)) { minX = -30; maxX = 30; maxY = 160; }
  const w = maxX - minX;
  const h = maxY;
  const cx = (minX + maxX) / 2 * f.facing;
  const gonzo = f.char.id === 'gonzo';

  const stName = f.state.name as string;
  const lying = stName === 'knockdown';

  ctx.save();
  ctx.translate(screenX + cx, groundY);
  if (lying) {
    // 寝転ぶ：体の下端を地面に合わせて横に倒す
    ctx.rotate(-Math.PI / 2 * f.facing);
    ctx.translate(0, -w / 2);
  }
  ctx.scale(f.facing, 1);
  // 以降は x=0 が箱の中央、y は上向きがマイナス（足元 0）
  const headR = Math.min(w * 0.55, h * 0.24);
  const legH = h * 0.32;
  const bodyH = h - legH - headR * 2;
  const bodyW = w * (gonzo ? 0.95 : 0.8);

  // 影
  if (!lying) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 脚（ゴンゾーは黒トランクス＋黄色いブーツ、リンは黒パンツ）
  const legW = bodyW * 0.38;
  ctx.fillStyle = style.pants;
  ctx.fillRect(-bodyW / 2, -legH, legW, legH * (gonzo ? 0.55 : 0.85));
  ctx.fillRect(bodyW / 2 - legW, -legH, legW, legH * (gonzo ? 0.55 : 0.85));
  if (gonzo) {
    ctx.fillStyle = style.skin;
    ctx.fillRect(-bodyW / 2, -legH * 0.45, legW, legH * 0.2);
    ctx.fillRect(bodyW / 2 - legW, -legH * 0.45, legW, legH * 0.2);
    ctx.fillStyle = style.shoes;
    ctx.fillRect(-bodyW / 2 - 2, -legH * 0.3, legW + 6, legH * 0.3);
    ctx.fillRect(bodyW / 2 - legW - 2, -legH * 0.3, legW + 6, legH * 0.3);
  } else {
    ctx.fillStyle = style.shoes;
    ctx.fillRect(-bodyW / 2 - 2, -6, legW + 6, 6);
    ctx.fillRect(bodyW / 2 - legW - 2, -6, legW + 6, 6);
  }

  // 胴（ゴンゾーは裸の上半身にトランクス）
  const bodyTop = -legH - bodyH;
  ctx.fillStyle = gonzo ? style.skin : top;
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, bodyTop, bodyW, bodyH + 2, 8);
  ctx.fill();
  if (gonzo) {
    ctx.fillStyle = colorIndex === 1 ? style.topAlt : style.pants;
    ctx.fillRect(-bodyW / 2, -legH - 6, bodyW, 12);
  } else {
    ctx.fillStyle = '#f2c622'; // 帯
    ctx.fillRect(-bodyW / 2, -legH - 8, bodyW, 6);
  }

  // 腕：攻撃・投げ・のけぞりで形を変える（前に突き出す／ぶら下げる）
  const st = f.state as { name: string; move?: string; attack?: { move: string } | null };
  const move = st.name === 'attack' ? st.move : st.name === 'air' ? st.attack?.move : undefined;
  const armW = bodyW * 0.28;
  const shoulderY = bodyTop + bodyH * 0.2;
  ctx.fillStyle = gonzo ? style.skin : top;
  if (move === 'punch' || move === 'airPunch' || move === 'crouchPunch' || move === 'grab' || move === 'special' || move === 'forwardSpecial' || move === 'super') {
    ctx.fillRect(0, shoulderY, w * 0.9, armW);
    ctx.fillStyle = style.skin;
    ctx.fillRect(w * 0.9 - 4, shoulderY - 2, armW + 2, armW + 4);
  } else if (st.name === 'guard' || st.name === 'blockstun') {
    ctx.fillRect(bodyW * 0.1, shoulderY - armW, armW, bodyH * 0.55);
    ctx.fillStyle = style.skin;
    ctx.fillRect(bodyW * 0.1, shoulderY - armW - 4, armW, armW);
  } else {
    ctx.fillRect(-bodyW / 2 - armW * 0.6, shoulderY, armW, bodyH * 0.5);
    ctx.fillRect(bodyW / 2 - armW * 0.4, shoulderY, armW, bodyH * 0.5);
  }
  // 蹴り：足を前に伸ばす
  if (move === 'kick' || move === 'airKick' || move === 'crouchKick') {
    ctx.fillStyle = style.pants;
    ctx.fillRect(0, -legH * 0.9, w * 0.9, legH * 0.28);
    ctx.fillStyle = style.shoes;
    ctx.fillRect(w * 0.9 - 6, -legH * 0.95, 12, legH * 0.38);
  }

  // 頭
  const headY = bodyTop - headR * 0.9;
  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.hair;
  if (gonzo) {
    // モヒカン
    ctx.beginPath();
    ctx.moveTo(-headR * 0.25, headY - headR * 0.8);
    ctx.lineTo(0, headY - headR * 1.7);
    ctx.lineTo(headR * 0.25, headY - headR * 0.8);
    ctx.closePath();
    ctx.fill();
  } else {
    // 黒いお団子2つ
    ctx.beginPath();
    ctx.arc(-headR * 0.75, headY - headR * 0.85, headR * 0.38, 0, Math.PI * 2);
    ctx.arc(headR * 0.75, headY - headR * 0.85, headR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.2, headR * 1.02, Math.PI, 0);
    ctx.fill();
  }
  // 顔：目（食らい中は×、それ以外は点）
  ctx.strokeStyle = '#111';
  ctx.fillStyle = '#111';
  ctx.lineWidth = 2;
  const ex = headR * 0.35;
  const ey = headY + headR * 0.05;
  if (st.name === 'hitstun' || st.name === 'knockdown' || st.name === 'airHit') {
    for (const dx of [ex * 0.2, ex * 1.6]) {
      ctx.beginPath();
      ctx.moveTo(dx - 3, ey - 3); ctx.lineTo(dx + 3, ey + 3);
      ctx.moveTo(dx + 3, ey - 3); ctx.lineTo(dx - 3, ey + 3);
      ctx.stroke();
    }
  } else {
    ctx.fillRect(ex * 0.2 - 2, ey - 3, 4, 6);
    ctx.fillRect(ex * 1.6 - 2, ey - 3, 4, 6);
  }
  ctx.restore();
}
