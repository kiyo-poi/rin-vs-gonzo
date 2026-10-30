import { createMatch } from '../logic/match';
import type { CharacterData, Fighter, Params } from '../logic/types';
import { drawFallbackFighter } from './characterDraw';
import { mirrorRecolor } from './palette';
import { drawFighterSprite, recoloredImage, type Pose, type SpriteStore } from './sprites';

/** 画面表示用の、立ちポーズの選手（キャラごとに使い回す） */
const cache = new WeakMap<CharacterData, Fighter>();

function displayFighter(char: CharacterData, params: Params): Fighter {
  let f = cache.get(char);
  if (!f) {
    f = createMatch([char, char], params).battle.fighters[0];
    cache.set(char, f);
  }
  return f;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 画像を縦横の比を保って枠に収める位置（左右は中央、下揃え） */
export function fitBottom(imgW: number, imgH: number, box: Box): Box {
  const s = Math.min(box.w / imgW, box.h / imgH);
  const w = imgW * s;
  const h = imgH * s;
  return { x: box.x + (box.w - w) / 2, y: box.y + box.h - h, w, h };
}

/** 立ち絵の画像（*_portrait.png）を枠に収めて描く。altColor なら 2P の色にする。画像が無ければ false */
export function drawPortraitImage(
  ctx: CanvasRenderingContext2D,
  sprites: SpriteStore | undefined,
  char: CharacterData,
  box: Box,
  altColor = false,
): boolean {
  const img = sprites?.get(char.id, 'portrait');
  if (!img) return false;
  const r = fitBottom(img.naturalWidth, img.naturalHeight, box);
  ctx.drawImage(altColor ? recoloredImage(img, mirrorRecolor(char.id)) : img, r.x, r.y, r.w, r.h);
  return true;
}

/**
 * キャラ選択・結果画面用の立ち絵。画像があればそれ、なければ代わりのデフォルメキャラ。
 * feetX・feetY は足元の画面座標。scale は画像の倍率（代わりのキャラは fallbackScale）
 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  sprites: SpriteStore | undefined,
  char: CharacterData,
  params: Params,
  pose: Pose,
  feetX: number,
  feetY: number,
  opts: { scale?: number; fallbackScale?: number; colorIndex?: number; altColor?: boolean } = {},
): void {
  const f = displayFighter(char, params);
  const img = sprites?.get(char.id, pose) ?? null;
  if (img) {
    drawFighterSprite(ctx, img, f, feetX, feetY, opts.scale ?? 0.4, opts.altColor ? mirrorRecolor(char.id) : undefined);
    return;
  }
  const s = opts.fallbackScale ?? 1.2;
  ctx.save();
  ctx.translate(feetX, feetY);
  ctx.scale(s, s);
  drawFallbackFighter(ctx, { ...f, x: 0 }, 0, 0, opts.colorIndex ?? 0);
  ctx.restore();
}
