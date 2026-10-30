import type { ButtonKeys, CharacterData, Controls } from '../logic/types';
import { controlLines, keyLabel, moveLines } from './labels';

/** メニュー画面の背景と見出し */
export function drawScreen(ctx: CanvasRenderingContext2D, title: string, titleSize = 56): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.fillText(title, width / 2, 110);
}

/** 縦に並んだメニュー。選んでいる項目に ▶ を付ける */
export function drawMenu(ctx: CanvasRenderingContext2D, items: readonly string[], index: number, x: number, y: number, gap = 54): void {
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px sans-serif';
  items.forEach((item, i) => {
    const selected = i === index;
    ctx.fillStyle = selected ? '#fc3' : '#aaa';
    ctx.fillText(selected ? `▶ ${item} ◀` : item, x, y + i * gap);
  });
}

/** 操作のヒント（画面の下） */
export function drawHint(ctx: CanvasRenderingContext2D, text: string, y: number): void {
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'center';
  ctx.font = '20px sans-serif';
  ctx.fillText(text, ctx.canvas.width / 2, y);
}

/** 1人分のキー配置 */
export function drawControls(ctx: CanvasRenderingContext2D, label: string, map: ButtonKeys, x: number, y: number, color: string): void {
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px sans-serif';
  const lines = controlLines(map);
  // 2列に分けて並べる
  const half = Math.ceil(lines.length / 2);
  lines.forEach((line, i) => ctx.fillText(line, x + (i < half ? 0 : 200), y + 26 + (i % half) * 22));
}

/** 2人分のキー配置とポーズのキー */
export function drawBothControls(ctx: CanvasRenderingContext2D, controls: Controls, y: number): void {
  const { width } = ctx.canvas;
  drawControls(ctx, '1P のキー', controls.p1, 80, y, '#f88');
  drawControls(ctx, '2P のキー', controls.p2, width - 480, y, '#8af');
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.font = '16px sans-serif';
  ctx.fillText(`ポーズ：${controls.pause.map(keyLabel).join(' / ')}`, width / 2, y + 26);
}

/** 技一覧 */
export function drawMoveList(ctx: CanvasRenderingContext2D, char: CharacterData, x: number, y: number, align: CanvasTextAlign = 'left'): void {
  ctx.textAlign = align;
  ctx.fillStyle = '#ddd';
  ctx.font = '16px sans-serif';
  moveLines(char).forEach((line, i) => ctx.fillText(line, x, y + i * 22));
}
