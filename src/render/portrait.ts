import { createMatch } from '../logic/match';
import type { CharacterData, Fighter, Params } from '../logic/types';
import { drawFallbackFighter } from './characterDraw';
import { mirrorRecolor } from './palette';
import { drawFighterSprite, type Pose, type SpriteStore } from './sprites';

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
