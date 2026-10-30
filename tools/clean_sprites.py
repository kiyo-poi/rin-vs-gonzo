"""キャラ画像の後処理：切れ端・足元の帯を消し、ポーズごとの縮尺と足元の位置をそろえる。
使い方（Pillow が必要）:
  python3 tools/clean_sprites.py art-work/originals <出力フォルダ>
  → 出力を確かめてから characters/ にコピーする。元の画像は art-work/originals/ に置いておく
やること:
  - 一覧画像から切り出した時に写り込んだ、隣の絵の切れ端を消す（左右の端に接し、本体と離れた部品）
  - ゴンゾーの足元の黄色い帯を消す
  - 待機の体の高さを基準に、ポーズごとの大きさ（HEIGHT_RATIO）にそろえ、足元を (320, 600) に置く
"""
import sys, os
from collections import deque
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
ALPHA = 40
FEET = (320, 600)

# 立ち姿（待機）の体の高さを 1 として、ポーズごとの体の高さの割合
HEIGHT_RATIO = {
    'idle': 1.0, 'walk': 1.0, 'guard': 0.97, 'punch': 1.0, 'kick': 1.0, 'grab': 0.95,
    'throw': 1.0, 'special_n': 1.0, 'special_f': 0.95, 'super': 1.0, 'win': 1.05, 'hit': 0.92,
    'jump': 0.9, 'air_punch': 0.85, 'air_kick': 0.8, 'special_d': 0.95,
    'crouch': 0.72, 'crouch_punch': 0.8, 'crouch_kick': 0.72,
    'down': 0.42,
}
POSE_SIZE = (640, 640)


def components(img):
    w, h = img.size
    a = img.getchannel('A').load()
    lab = [[-1] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if a[x, y] > ALPHA and lab[y][x] < 0:
                cid = len(comps)
                q = deque([(x, y)]); lab[y][x] = cid
                pts = []
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and lab[ny][nx] < 0 and a[nx, ny] > ALPHA:
                                lab[ny][nx] = cid; q.append((nx, ny))
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                comps.append({'pts': pts, 'n': len(pts), 'box': (min(xs), min(ys), max(xs), max(ys))})
    return comps


def clean(img):
    comps = components(img)
    if not comps:
        return img, None
    main = max(comps, key=lambda c: c['n'])
    L = min(c['box'][0] for c in comps); T = min(c['box'][1] for c in comps); R = max(c['box'][2] for c in comps)
    keep = []
    for c in comps:
        if c is main:
            keep.append(c); continue
        l, t, r, b = c['box']
        ml, mt, mr, mb = main['box']
        touches_side = l <= L + 2 or r >= R - 2          # 左右の切れ目（一覧画像の隣の絵）
        separated = r < ml - 2 or l > mr + 2               # 本体と左右で重ならない
        ratio = c['n'] / main['n']
        floor_piece = (b - t) <= 14 and b >= 588           # 足元の帯のかけら
        if ratio < 0.002 or floor_piece:
            continue
        if touches_side and (ratio < 0.15 or (separated and ratio < 0.45)):
            continue  # 隣の絵の切れ端
        keep.append(c)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    src = img.load(); dst = out.load()
    for c in keep:
        for p in c['pts']:
            dst[p] = src[p]
    return out, main['box']


def strip_floor_band(img):
    """足元の黄色い帯（靴底の下に横一本につながった帯）を消す"""
    w, h = img.size
    px = img.load()
    def row_info(y):
        xs = [x for x in range(w) if px[x, y][3] > ALPHA]
        if not xs: return None
        yel = sum(1 for x in xs if px[x, y][0] > 190 and px[x, y][1] > 140 and px[x, y][2] < 110)
        runs = 1 + sum(1 for i in range(1, len(xs)) if xs[i] != xs[i - 1] + 1)
        return len(xs), yel / len(xs), runs
    bottom = max((y for y in range(h) if row_info(y)), default=None)
    if bottom is None: return img
    base = row_info(bottom)
    if base[1] < 0.85 or base[2] != 1: return img
    band = []
    y = bottom
    while y >= 0 and len(band) <= 18:
        info = row_info(y)
        if not info or info[2] != 1 or info[1] < 0.6 or info[0] < 0.7 * base[0]: break
        band.append(y); y -= 1
    above = row_info(y) if y >= 0 else None
    if 3 <= len(band) <= 18 and (above is None or above[0] < 0.6 * base[0] or above[1] < 0.5):
        for by in band:
            for x in range(w): px[x, by] = (0, 0, 0, 0)
    return img


def bbox(img):
    return img.getchannel('A').point(lambda v: 255 if v > ALPHA else 0).getbbox()


def feet_x(img, box):
    l, t, r, b = box
    a = img.getchannel('A').load()
    xs = [x for y in range(max(t, b - 12), b) for x in range(l, r) if a[x, y] > ALPHA]
    return sum(xs) / len(xs) if xs else (l + r) / 2


def place(img, box, target_h, center_x_src):
    """体の箱の高さを target_h にして、足元（下端・足の中心）を FEET に合わせる"""
    l, t, r, b = box
    s = target_h / (b - t + 1)
    full = bbox(img)
    crop = img.crop(full)
    cw, ch = crop.size
    crop = crop.resize((max(1, round(cw * s)), max(1, round(ch * s))), Image.LANCZOS)
    out = Image.new('RGBA', POSE_SIZE, (0, 0, 0, 0))
    ox = round(FEET[0] - (center_x_src - full[0]) * s)
    oy = round(FEET[1] - (b + 1 - full[1]) * s)
    out.paste(crop, (ox, oy), crop)
    return out


def main():
    for cid in sorted(os.listdir(SRC)):
        d = os.path.join(SRC, cid)
        if not os.path.isdir(d): continue
        os.makedirs(os.path.join(DST, cid), exist_ok=True)
        cleaned = {}
        for f in sorted(os.listdir(d)):
            if not f.endswith('.png'): continue
            pose = f[len(cid) + 1:-4]
            img = Image.open(os.path.join(d, f)).convert('RGBA')
            if pose in ('cutin', 'portrait'):  # カットイン・立ち絵は切れ端だけ消す（大きさはそのまま）
                out, _ = clean(img)
                out.save(os.path.join(DST, cid, f)); continue
            img = strip_floor_band(img)
            out, mainbox = clean(img)
            cleaned[pose] = (out, mainbox)
        # 待機の体の高さを基準にする
        _, idle_box = cleaned['idle']
        base_h = idle_box[3] - idle_box[1] + 1
        for pose, (img, mainbox) in cleaned.items():
            ratio = HEIGHT_RATIO.get(pose, 1.0)
            fx = feet_x(img, mainbox) if pose != 'down' else (mainbox[0] + mainbox[2]) / 2
            out = place(img, mainbox, base_h * ratio, fx)
            out.save(os.path.join(DST, cid, f'{cid}_{pose}.png'))
        print(cid, 'base height', base_h, 'poses', len(cleaned))


main()
