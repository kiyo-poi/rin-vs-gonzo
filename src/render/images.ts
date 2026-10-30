/** 画像の URL。base は assets/ の公開先（Vite の publicDir=assets なので既定は BASE_URL） */
export function imagePath(base: string, rel: string): string {
  const b = base === '' || base.endsWith('/') ? base : `${base}/`;
  return `${b}images/${rel}`;
}

/** ステージ背景の相対パス */
export function stagePath(stageId: string): string {
  return `stages/stage_${stageId}.jpg`;
}

export interface ImageStore {
  /** 読み込み済みなら画像、未読み込み・無い場合は null（初回呼び出しで読み込みを始める。例外は投げない） */
  get(rel: string): HTMLImageElement | null;
}

export function createImageStore(base: string): ImageStore {
  type Entry = { img: HTMLImageElement | null; state: 'loading' | 'ok' | 'missing' };
  const cache = new Map<string, Entry>();
  return {
    get(rel) {
      let e = cache.get(rel);
      if (!e) {
        const entry: Entry = { img: null, state: 'loading' };
        e = entry;
        cache.set(rel, entry);
        try {
          if (typeof Image === 'undefined') {
            entry.state = 'missing';
          } else {
            const img = new Image();
            img.onload = () => { entry.img = img; entry.state = 'ok'; };
            img.onerror = () => { entry.state = 'missing'; };
            img.src = imagePath(base, rel);
          }
        } catch {
          entry.state = 'missing';
        }
      }
      return e.state === 'ok' ? e.img : null;
    },
  };
}
