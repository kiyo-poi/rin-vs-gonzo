import type { Fighter } from '../logic/types';

/** 07_assets.md のポーズ名（ファイル名に使う） */
export const POSES = [
  'idle', 'walk', 'jump', 'crouch', 'guard',
  'punch', 'kick', 'crouch_punch', 'crouch_kick', 'air_punch', 'air_kick',
  'grab', 'throw', 'special_n', 'special_f', 'special_d', 'super',
  'hit', 'down', 'win',
] as const;
export type Pose = (typeof POSES)[number];

/** キャンバス（640×640）内の足元の基準位置（07_assets.md） */
export const ANCHOR = { x: 320, y: 600 } as const;
export const POSE_CANVAS = 640;

const MOVE_POSE: Record<string, Pose> = {
  punch: 'punch',
  kick: 'kick',
  crouchPunch: 'crouch_punch',
  crouchKick: 'crouch_kick',
  airPunch: 'air_punch',
  airKick: 'air_kick',
  grab: 'grab',
  special: 'special_n',
  forwardSpecial: 'special_f',
  downSpecial: 'special_d',
  super: 'super',
};

/** 技の枠の名前 → ポーズ名。知らない技は idle */
export function poseForMove(move: string | undefined | null): Pose {
  return (move && MOVE_POSE[move]) || 'idle';
}

/** キャラの状態から、使うポーズ名を決める（純粋関数）。未知の状態・技は idle */
export function poseFor(f: Fighter): Pose {
  // M3b 以降で増える状態名にも対応するため、ゆるい型で読む
  const st = f.state as { name: string; move?: string; attack?: { move: string } | null; recoilLeft?: number };
  switch (st.name) {
    case 'idle': return 'idle';
    case 'walkForward':
    case 'walkBack': return 'walk';
    case 'crouch': return 'crouch';
    case 'guard':
    case 'blockstun': return 'guard';
    case 'jumpSquat':
    case 'landing': return 'crouch';
    case 'air':
      if (st.recoilLeft && st.recoilLeft > 0) return 'hit';
      return st.attack ? poseForMove(st.attack.move) : 'jump';
    case 'attack': return poseForMove(st.move);
    case 'hitstun':
    case 'recoil':
    case 'airHit':
    case 'thrown': return 'hit';
    case 'knockdown': return 'down';
    case 'throwing': return 'throw';
    default: return 'idle';
  }
}

/** 画像の URL。base は assets/ の公開先（Vite の publicDir=assets なので既定は BASE_URL） */
export function spritePath(base: string, charId: string, pose: string): string {
  const b = base === '' || base.endsWith('/') ? base : `${base}/`;
  return `${b}images/characters/${charId}/${charId}_${pose}.png`;
}

export interface SpriteStore {
  /** 読み込み済みなら画像、未読み込み・無い場合は null（初回呼び出しで読み込みを始める。例外は投げない） */
  get(charId: string, pose: string): HTMLImageElement | null;
}

export function createSpriteStore(base: string): SpriteStore {
  type Entry = { img: HTMLImageElement | null; state: 'loading' | 'ok' | 'missing' };
  const cache = new Map<string, Entry>();
  return {
    get(charId, pose) {
      const key = `${charId}/${pose}`;
      let e = cache.get(key);
      if (!e) {
        e = { img: null, state: 'loading' };
        cache.set(key, e);
        try {
          if (typeof Image === 'undefined') {
            e.state = 'missing';
          } else {
            const entry = e;
            const img = new Image();
            img.onload = () => { entry.img = img; entry.state = 'ok'; };
            img.onerror = () => { entry.state = 'missing'; };
            img.src = spritePath(base, charId, pose);
          }
        } catch {
          e.state = 'missing';
        }
      }
      return e.state === 'ok' ? e.img : null;
    },
  };
}

const tintCache = new WeakMap<CanvasImageSource, Map<string, HTMLCanvasElement>>();

/** 色味を乗せた複製を作る（画像ごと・色ごとに1回だけ。毎フレームのフィルタは使わない） */
export function tintedImage(img: HTMLImageElement, color: string): CanvasImageSource {
  let byColor = tintCache.get(img);
  if (!byColor) { byColor = new Map(); tintCache.set(img, byColor); }
  const hit = byColor.get(color);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || POSE_CANVAS;
  c.height = img.naturalHeight || POSE_CANVAS;
  const g = c.getContext('2d');
  if (!g) return img;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop'; // 不透明な部分だけ染める
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  byColor.set(color, c);
  return c;
}

/** 2P 用の色味（半透明の青）。drawFighterSprite の tint に渡す */
export const TINT_2P = 'rgba(80,120,255,0.35)';

/**
 * スプライトを描く。screenX・groundY は足元の画面座標（ジャンプ中は高さ分を引いた位置を渡す）。
 * 画像の (320,600) を足元に合わせ、左向きなら左右反転する。tint を渡すと色味を乗せた複製を使う。
 */
export function drawFighterSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  f: Pick<Fighter, 'facing'>,
  screenX: number,
  groundY: number,
  scale = 1,
  tint?: string,
): void {
  const src = tint ? tintedImage(img, tint) : img;
  const w = img.naturalWidth || POSE_CANVAS;
  const h = img.naturalHeight || POSE_CANVAS;
  ctx.save();
  ctx.translate(screenX, groundY);
  ctx.scale(f.facing * scale, scale);
  ctx.drawImage(src, -ANCHOR.x, -ANCHOR.y, w, h);
  ctx.restore();
}
