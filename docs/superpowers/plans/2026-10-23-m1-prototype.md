# M1 四角で動く試作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1台のキーボードで2人が四角を動かし、パンチを当て合って体力を減らせる試作を作る（`docs/09_roadmap.md` の M1）。

**Architecture:** 対戦ロジック（`src/logic/`）は Canvas・DOM に依存しない純粋な関数で、「前の状態＋このフレームの入力 → 次の状態」を返す。ゲームループは固定 60F ステップで、描画は更新と分離する。数値はコードに直接書かず `src/data/*.json` に置く（`docs/08_architecture.md`）。

**Tech Stack:** TypeScript（strict）、Vite、Vitest、Canvas 2D。依存は開発用のこの3つだけ。

## Global Constraints

- 画面は 1280×720。60fps 固定のフレーム単位で動く（`04_system.md`）
- ゲーム用ライブラリは使わない。依存は開発用の `typescript`・`vite`・`vitest` の3つだけ（`08_architecture.md` 1章）
- 対戦ロジックの中で `Math.random()`・現在時刻・DOM を使わない（`08_architecture.md` 2.4）
- コード内に調整値を直接書かない。共通値は `src/data/params.json`、キャラ別の値はキャラデータ JSON に置く（`08_architecture.md` 6章）
- フレームの数え方：ボタンを押したフレームが技の1F目。攻撃の箱は「発生＋1」F目〜「発生＋持続」F目。全体F目の次のフレームから動ける（`08_architecture.md` 5章）
- キーは `KeyboardEvent.code` で判定する。2P はテンキーと `J K L M ,` の両方を受け付ける（`04_system.md`）
- 座標は「キャラの足元の中心」が原点、右向き基準、上がプラス（px）
- M1 の範囲外（M2 以降でやる）：押し合い、ノックバック、ヒットストップ、カメラ、ラウンド・タイマー・KO、入力バッファ、斜めジャンプ、パンチ以外の技、相打ちのルール
- 開発用の道具（`09_roadmap.md`）は、M1 では「押しているキーの表示」「攻撃の箱と状態の表示」だけ作る。コマ送り・数値の即時変更は M2 以降
- ユーザー向けの文章・コメントは日本語。識別子は英語
- コミットメッセージの末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける

作業ディレクトリはすべて `fighting-game/`（このリポジトリのルート）。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `package.json` / `tsconfig.json` / `vite.config.ts` / `index.html` / `.gitignore` | ビルド・テスト・起動の設定 |
| `src/core/loop.ts` | 固定 60F ステップ（経過時間 → 今回の更新回数） |
| `src/input/inputFrame.ts` | 押されているキーの集合 → ボタン状態（純粋な処理） |
| `src/input/keyboard.ts` | ブラウザのキーイベント → 押されているキーの集合（DOM） |
| `src/logic/types.ts` | ボタン・箱・技・キャラ・状態などの型 |
| `src/logic/boxes.ts` | 箱の座標変換と重なり判定 |
| `src/logic/fighter.ts` | 1キャラの状態遷移（歩き・しゃがみ・ガード・ジャンプ・パンチ・のけぞり） |
| `src/logic/battle.ts` | 2キャラを1F進め、ヒット・ガードを決める |
| `src/data/params.json` | 共通パラメータ（のけぞり、ジャンプの踏み込み、ステージ幅など） |
| `src/data/controls.json` | キー配置 |
| `src/data/characters/proto.json` | M1 用の仮キャラ（リンのジャブの数値） |
| `src/data/data.ts` | JSON を型付きで読み込む |
| `src/render/render.ts` | 四角・地面・体力バー・開発用表示を描く |
| `src/main.ts` | 起動（Canvas、キーボード、ループ） |
| `tests/helpers.ts` | テスト用の入力の作り方 |
| `tests/*.test.ts` | 各部のテスト |

---

### Task 1: プロジェクトの土台

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`（仮）, `tests/smoke.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `npm test`（Vitest を1回実行）、`npm run dev`（開発サーバ）、`npm run build`（型チェック＋静的ビルド）

- [ ] **Step 1: package.json を作り、開発用の依存を入れる**

`package.json`:

```json
{
  "name": "fighting-game",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  }
}
```

Run: `npm install -D typescript vite vitest`
Expected: `devDependencies` に3つが入り、`package-lock.json` ができる。

- [ ] **Step 2: 設定ファイルを作る**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages のサブパスでも Cloudflare Pages のルートでも動くように相対パスで出力する
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FIGHT GAME（仮）</title>
    <style>
      html, body { margin: 0; height: 100%; background: #111; }
      body { display: flex; align-items: center; justify-content: center; }
      canvas { max-width: 100vw; max-height: 100vh; aspect-ratio: 16 / 9; background: #223; }
    </style>
  </head>
  <body>
    <canvas id="game" width="1280" height="720"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules/
dist/
```

`src/main.ts`（Task 9 で置き換える仮のもの）:

```ts
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (ctx) {
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.fillText('M1 準備中', 40, 60);
}
```

- [ ] **Step 3: テストが動くことを確かめる smoke テストを書く**

`tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('土台', () => {
  it('テストが動く', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: テストと型チェックを実行する**

Run: `npm test`
Expected: PASS（1 test）

Run: `npx tsc`
Expected: エラーなしで終わる

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src/main.ts tests/smoke.test.ts
git commit -m "chore: Vite + TypeScript + Vitest の土台を作る

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 固定 60F ステップ

**Files:**
- Create: `src/core/loop.ts`
- Test: `tests/loop.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `createFixedStep(stepMs?: number, maxSteps?: number): (now: number) => number` — `requestAnimationFrame` の時刻（ms）を渡すと、今回行う更新の回数を返す

- [ ] **Step 1: 失敗するテストを書く**

`tests/loop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFixedStep } from '../src/core/loop';

const STEP = 1000 / 60;

describe('createFixedStep', () => {
  it('最初の呼び出しでは更新しない', () => {
    const step = createFixedStep();
    expect(step(0)).toBe(0);
  });

  it('1/60秒ごとに1回更新する（60Hz のモニター）', () => {
    const step = createFixedStep();
    step(0);
    expect(step(STEP)).toBe(1);
    expect(step(STEP * 2)).toBe(1);
    expect(step(STEP * 3)).toBe(1);
  });

  it('120Hz のモニターでは2回に1回だけ更新する', () => {
    const step = createFixedStep();
    step(0);
    const counts = [1, 2, 3, 4].map((i) => step((i * 1000) / 120));
    expect(counts).toEqual([0, 1, 0, 1]);
  });

  it('1回で最大4回まで更新し、あふれた時間は捨てる', () => {
    const step = createFixedStep();
    step(0);
    expect(step(1000)).toBe(4);
    expect(step(1000 + STEP)).toBe(1);
  });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run tests/loop.test.ts`
Expected: FAIL（`../src/core/loop` が見つからない）

- [ ] **Step 3: 実装する**

`src/core/loop.ts`:

```ts
// 浮動小数の誤差で 1F 分に届かないことを防ぐ余裕
const EPSILON = 1e-6;

/**
 * 固定ステップのゲームループ用。経過時間を貯めて 1/60 秒ごとに1回の更新回数を返す。
 * モニターのリフレッシュレートに関係なく、ゲームは1秒60回進む。
 */
export function createFixedStep(stepMs = 1000 / 60, maxSteps = 4): (now: number) => number {
  let last: number | null = null;
  let accumulated = 0;

  return (now: number): number => {
    if (last === null) {
      last = now;
      return 0;
    }
    accumulated += now - last;
    last = now;

    let steps = 0;
    while (accumulated >= stepMs - EPSILON && steps < maxSteps) {
      accumulated -= stepMs;
      steps++;
    }
    // タブを裏に回して戻った時などに一気に進まないよう、あふれた時間は捨てる
    if (steps === maxSteps) accumulated = 0;
    return steps;
  };
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx vitest run tests/loop.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add src/core/loop.ts tests/loop.test.ts
git commit -m "feat: 固定 60F ステップを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 型・データ・テスト用の入力

**Files:**
- Create: `src/logic/types.ts`, `src/data/params.json`, `src/data/controls.json`, `src/data/characters/proto.json`, `src/data/data.ts`, `tests/helpers.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Consumes: なし
- Produces（`src/logic/types.ts`）:
  - `type Button = 'left' | 'right' | 'up' | 'down' | 'punch' | 'kick' | 'grab' | 'special' | 'guard'`
  - `const BUTTONS: readonly Button[]`
  - `interface InputFrame { held: Record<Button, boolean>; pressed: Record<Button, boolean> }`
  - `type Weight = 'light' | 'medium' | 'heavy'`
  - `interface Box { x: number; y: number; w: number; h: number }` — `x` は足元の中心から箱の左端まで（右向き基準）、`y` は足元から箱の下端まで（上がプラス）
  - `interface HitData { damage: number; weight: Weight; box: Box }`
  - `interface MoveData { name: string; startup: number; active: number; recovery: number; hits: HitData[] }`
  - `interface CharacterData { id: string; name: string; stats: { health: number; walkSpeed: number; jumpAirFrames: number; jumpHeight: number }; boxes: { hurt: { stand: Box[]; crouch: Box[]; air: Box[] } }; moves: { punch: MoveData } }`
  - `interface Params { weights: Record<Weight, { hitstun: number; blockstun: number }>; jumpSquatFrames: number; stage: { width: number; edgeMargin: number; startDistance: number }; render: { groundY: number } }`
  - `type ButtonKeys = Record<Button, string[]>`、`interface Controls { p1: ButtonKeys; p2: ButtonKeys; pause: string[] }`
  - `type FighterStateName = 'idle' | 'walkForward' | 'walkBack' | 'crouch' | 'guard' | 'jumpSquat' | 'air' | 'attack' | 'hitstun' | 'blockstun'`
  - `interface FighterState { name: FighterStateName; frame: number; duration?: number }`
  - `interface Fighter { char: CharacterData; x: number; y: number; facing: 1 | -1; health: number; state: FighterState; moveHasHit: boolean }`
- Produces（`src/data/data.ts`）: `params: Params`、`controls: Controls`、`proto: CharacterData`
- Produces（`tests/helpers.ts`）: `inputOf(held?: Button[], pressed?: Button[]): InputFrame`（`pressed` に入れたボタンは `held` にも入る）、`NONE: InputFrame`

- [ ] **Step 1: 型を書く**

`src/logic/types.ts`:

```ts
export type Button = 'left' | 'right' | 'up' | 'down' | 'punch' | 'kick' | 'grab' | 'special' | 'guard';

export const BUTTONS: readonly Button[] = [
  'left', 'right', 'up', 'down', 'punch', 'kick', 'grab', 'special', 'guard',
];

/** 1フレーム分のボタン状態。対戦ロジックはこれだけを受け取る（キーボードか CPU かを区別しない） */
export interface InputFrame {
  /** このフレームに押されているか */
  held: Record<Button, boolean>;
  /** このフレームに押されたか（前のフレームは離れていた） */
  pressed: Record<Button, boolean>;
}

export type Weight = 'light' | 'medium' | 'heavy';

/** 判定の箱。x は足元の中心から箱の左端まで（右向き基準）、y は足元から箱の下端まで（上がプラス） */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HitData {
  damage: number;
  weight: Weight;
  box: Box;
}

export interface MoveData {
  name: string;
  /** 発生 */
  startup: number;
  /** 持続 */
  active: number;
  /** 硬直 */
  recovery: number;
  hits: HitData[];
}

export interface CharacterData {
  id: string;
  name: string;
  stats: {
    health: number;
    /** 歩き速度 px/F */
    walkSpeed: number;
    /** ジャンプの滞空時間 F（踏み込みを除く） */
    jumpAirFrames: number;
    /** ジャンプの高さ px */
    jumpHeight: number;
  };
  boxes: {
    hurt: { stand: Box[]; crouch: Box[]; air: Box[] };
  };
  moves: { punch: MoveData };
}

export interface Params {
  weights: Record<Weight, { hitstun: number; blockstun: number }>;
  /** ジャンプの踏み込み（飛び上がる前の地上の時間） */
  jumpSquatFrames: number;
  stage: { width: number; edgeMargin: number; startDistance: number };
  render: { groundY: number };
}

export type ButtonKeys = Record<Button, string[]>;

export interface Controls {
  p1: ButtonKeys;
  p2: ButtonKeys;
  pause: string[];
}

export type FighterStateName =
  | 'idle' | 'walkForward' | 'walkBack' | 'crouch' | 'guard'
  | 'jumpSquat' | 'air' | 'attack' | 'hitstun' | 'blockstun';

export interface FighterState {
  name: FighterStateName;
  /** この状態に入ってからのフレーム数（入ったフレームが1） */
  frame: number;
  /** のけぞり・ガード硬直の長さ */
  duration?: number;
}

export interface Fighter {
  char: CharacterData;
  x: number;
  y: number;
  /** 1＝右向き、-1＝左向き */
  facing: 1 | -1;
  health: number;
  state: FighterState;
  /** 今出している技がもう当たったか（1つの技は相手に1回だけ当たる） */
  moveHasHit: boolean;
}
```

- [ ] **Step 2: データの JSON を書く**

`src/data/params.json`（値は `06_params.md` の初期値。M1 はカメラがないのでステージ幅は画面幅と同じ 1280。M2 で 1920 にする）:

```json
{
  "weights": {
    "light": { "hitstun": 14, "blockstun": 10 },
    "medium": { "hitstun": 18, "blockstun": 13 },
    "heavy": { "hitstun": 24, "blockstun": 17 }
  },
  "jumpSquatFrames": 3,
  "stage": { "width": 1280, "edgeMargin": 60, "startDistance": 480 },
  "render": { "groundY": 620 }
}
```

`src/data/controls.json`（`04_system.md` の仮配置）:

```json
{
  "p1": {
    "left": ["KeyA"], "right": ["KeyD"], "up": ["KeyW"], "down": ["KeyS"],
    "punch": ["KeyF"], "kick": ["KeyG"], "grab": ["KeyH"], "special": ["KeyV"], "guard": ["KeyB"]
  },
  "p2": {
    "left": ["ArrowLeft"], "right": ["ArrowRight"], "up": ["ArrowUp"], "down": ["ArrowDown"],
    "punch": ["Numpad4", "KeyJ"], "kick": ["Numpad5", "KeyK"], "grab": ["Numpad6", "KeyL"],
    "special": ["Numpad1", "KeyM"], "guard": ["Numpad2", "Comma"]
  },
  "pause": ["Escape"]
}
```

`src/data/characters/proto.json`（M1 用の仮キャラ。キャラ差はまだ入れず、両者ともこれを使う。パンチはリンのジャブの数値。箱の大きさは仮）:

```json
{
  "id": "proto",
  "name": "四角",
  "stats": { "health": 850, "walkSpeed": 5, "jumpAirFrames": 36, "jumpHeight": 200 },
  "boxes": {
    "hurt": {
      "stand": [{ "x": -30, "y": 0, "w": 60, "h": 160 }],
      "crouch": [{ "x": -30, "y": 0, "w": 60, "h": 100 }],
      "air": [{ "x": -30, "y": 20, "w": 60, "h": 120 }]
    }
  },
  "moves": {
    "punch": {
      "name": "ジャブ",
      "startup": 4,
      "active": 2,
      "recovery": 8,
      "hits": [{ "damage": 30, "weight": "light", "box": { "x": 20, "y": 100, "w": 70, "h": 20 } }]
    }
  }
}
```

`src/data/data.ts`:

```ts
import type { CharacterData, Controls, Params } from '../logic/types';
import paramsJson from './params.json';
import controlsJson from './controls.json';
import protoJson from './characters/proto.json';

// JSON の文字列（"light" など）は型の上ではただの string なので、ここで型を付ける。
// 中身の検査は M3 でキャラデータが増えた時に入れる（08_architecture.md「データの検査」）
export const params = paramsJson as unknown as Params;
export const controls = controlsJson as unknown as Controls;
export const proto = protoJson as unknown as CharacterData;
```

- [ ] **Step 3: テスト用の入力の作り方を書く**

`tests/helpers.ts`:

```ts
import { BUTTONS, type Button, type InputFrame } from '../src/logic/types';

/** テスト用の InputFrame。pressed に入れたボタンは held にも入る */
export function inputOf(held: Button[] = [], pressed: Button[] = []): InputFrame {
  const isHeld = (b: Button) => held.includes(b) || pressed.includes(b);
  return {
    held: Object.fromEntries(BUTTONS.map((b) => [b, isHeld(b)])) as Record<Button, boolean>,
    pressed: Object.fromEntries(BUTTONS.map((b) => [b, pressed.includes(b)])) as Record<Button, boolean>,
  };
}

export const NONE: InputFrame = inputOf();
```

- [ ] **Step 4: データが仕様の数値どおりかのテストを書く**

`tests/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { controls, params, proto } from '../src/data/data';
import { inputOf } from './helpers';

describe('データ', () => {
  it('仮キャラのパンチはリンのジャブの数値（03_moves.md）', () => {
    const punch = proto.moves.punch;
    expect([punch.startup, punch.active, punch.recovery]).toEqual([4, 2, 8]);
    expect(punch.hits[0].damage).toBe(30);
    expect(punch.hits[0].weight).toBe('light');
  });

  it('歩き速度とジャンプは 06_params.md の初期値', () => {
    expect(proto.stats.walkSpeed).toBe(5);
    expect(proto.stats.jumpAirFrames).toBe(36);
    expect(params.jumpSquatFrames).toBe(3);
  });

  it('のけぞり・ガード硬直（軽）は 14F / 10F', () => {
    expect(params.weights.light).toEqual({ hitstun: 14, blockstun: 10 });
  });

  it('2P のパンチはテンキー4と J の両方', () => {
    expect(controls.p2.punch).toEqual(['Numpad4', 'KeyJ']);
    expect(controls.p1.punch).toEqual(['KeyF']);
  });

  it('inputOf は pressed を held にも入れる', () => {
    const input = inputOf(['left'], ['punch']);
    expect(input.held.left && input.held.punch).toBe(true);
    expect(input.pressed.punch).toBe(true);
    expect(input.pressed.left).toBe(false);
  });
});
```

- [ ] **Step 5: テストと型チェックを実行する**

Run: `npm test && npx tsc`
Expected: すべて PASS、型エラーなし

- [ ] **Step 6: Commit**

```bash
git add src/logic/types.ts src/data tests/helpers.ts tests/data.test.ts
git commit -m "feat: 型・調整値・キー配置・M1 用の仮キャラデータを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: キー → ボタン状態

**Files:**
- Create: `src/input/inputFrame.ts`
- Test: `tests/inputFrame.test.ts`

**Interfaces:**
- Consumes: `Button`, `BUTTONS`, `ButtonKeys`, `Controls`, `InputFrame`（Task 3）
- Produces:
  - `emptyHeld(): Record<Button, boolean>`（全部 false）
  - `heldFromKeys(keys: ReadonlySet<string>, map: ButtonKeys): Record<Button, boolean>` — ボタンに割り当てたキーのどれかが押されていれば true
  - `buildInputFrame(held: Record<Button, boolean>, prevHeld: Record<Button, boolean>): InputFrame`
  - `allCodes(controls: Controls): Set<string>` — ゲームで使う全キー（ブラウザの既定動作を止める対象）

- [ ] **Step 1: 失敗するテストを書く**

`tests/inputFrame.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { controls } from '../src/data/data';
import { allCodes, buildInputFrame, emptyHeld, heldFromKeys } from '../src/input/inputFrame';

describe('heldFromKeys', () => {
  it('1P の F でパンチ', () => {
    const held = heldFromKeys(new Set(['KeyF']), controls.p1);
    expect(held.punch).toBe(true);
    expect(held.kick).toBe(false);
  });

  it('2P はテンキー4でも J でもパンチ', () => {
    expect(heldFromKeys(new Set(['Numpad4']), controls.p2).punch).toBe(true);
    expect(heldFromKeys(new Set(['KeyJ']), controls.p2).punch).toBe(true);
  });

  it('2P はテンキー系と J〜, 系を混ぜて押してよい', () => {
    const held = heldFromKeys(new Set(['Numpad4', 'KeyK', 'Comma']), controls.p2);
    expect([held.punch, held.kick, held.guard]).toEqual([true, true, true]);
  });

  it('1P のキーは 2P に反応しない', () => {
    expect(heldFromKeys(new Set(['KeyF']), controls.p2).punch).toBe(false);
  });
});

describe('buildInputFrame', () => {
  it('押した最初のフレームだけ pressed になる', () => {
    const none = emptyHeld();
    const down = { ...emptyHeld(), punch: true };
    const first = buildInputFrame(down, none);
    const second = buildInputFrame(down, down);
    expect(first.pressed.punch).toBe(true);
    expect(second.pressed.punch).toBe(false);
    expect(second.held.punch).toBe(true);
  });
});

describe('allCodes', () => {
  it('1P・2P・ポーズの全キーを含む', () => {
    const codes = allCodes(controls);
    for (const code of ['KeyA', 'KeyF', 'Numpad4', 'KeyJ', 'Comma', 'ArrowUp', 'Escape']) {
      expect(codes.has(code)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run tests/inputFrame.test.ts`
Expected: FAIL（`../src/input/inputFrame` が見つからない）

- [ ] **Step 3: 実装する**

`src/input/inputFrame.ts`:

```ts
import { BUTTONS, type Button, type ButtonKeys, type Controls, type InputFrame } from '../logic/types';

export function emptyHeld(): Record<Button, boolean> {
  return Object.fromEntries(BUTTONS.map((b) => [b, false])) as Record<Button, boolean>;
}

/** 押されているキーの集合から、1人分のボタン状態を作る。割り当てたキーのどれかが押されていれば押している扱い */
export function heldFromKeys(keys: ReadonlySet<string>, map: ButtonKeys): Record<Button, boolean> {
  return Object.fromEntries(BUTTONS.map((b) => [b, map[b].some((code) => keys.has(code))])) as Record<Button, boolean>;
}

export function buildInputFrame(held: Record<Button, boolean>, prevHeld: Record<Button, boolean>): InputFrame {
  const pressed = Object.fromEntries(BUTTONS.map((b) => [b, held[b] && !prevHeld[b]])) as Record<Button, boolean>;
  return { held, pressed };
}

/** ゲームで使う全キー。矢印キーでのスクロールなど、ブラウザの既定動作を止める対象 */
export function allCodes(controls: Controls): Set<string> {
  const codes = new Set<string>(controls.pause);
  for (const map of [controls.p1, controls.p2]) {
    for (const b of BUTTONS) map[b].forEach((code) => codes.add(code));
  }
  return codes;
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx vitest run tests/inputFrame.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add src/input/inputFrame.ts tests/inputFrame.test.ts
git commit -m "feat: キーの集合からボタン状態を作る処理を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 箱の計算と、歩き・しゃがみ・ガード・向き

**Files:**
- Create: `src/logic/boxes.ts`, `src/logic/fighter.ts`
- Test: `tests/boxes.test.ts`, `tests/fighter.test.ts`

**Interfaces:**
- Consumes: `Box`, `CharacterData`, `Fighter`, `FighterState`, `InputFrame`, `Params`（Task 3）、`proto`, `params`（Task 3）、`inputOf`, `NONE`（Task 3）
- Produces（`src/logic/boxes.ts`）:
  - `toWorld(box: Box, origin: { x: number; y: number; facing: 1 | -1 }): Box` — 足元基準の箱をステージ上の座標に直す（`x` は左端、`y` は下端）
  - `overlaps(a: Box, b: Box): boolean` — 辺が接しているだけでは重ならない
- Produces（`src/logic/fighter.ts`）:
  - `createFighter(char: CharacterData, x: number, facing: 1 | -1): Fighter`
  - `stepFighter(f: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter` — 1F 進める（この Task では自由に動ける状態だけ。Task 6・7 で足す）
  - `clampX(x: number, params: Params): number`

- [ ] **Step 1: 箱の失敗するテストを書く**

`tests/boxes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { overlaps, toWorld } from '../src/logic/boxes';

const box = { x: 20, y: 100, w: 70, h: 20 };

describe('toWorld', () => {
  it('右向きは足元の位置に足すだけ', () => {
    expect(toWorld(box, { x: 400, y: 0, facing: 1 })).toEqual({ x: 420, y: 100, w: 70, h: 20 });
  });

  it('左向きは左右を反転する', () => {
    expect(toWorld(box, { x: 400, y: 0, facing: -1 })).toEqual({ x: 310, y: 100, w: 70, h: 20 });
  });

  it('空中なら高さの分だけ上がる', () => {
    expect(toWorld(box, { x: 400, y: 50, facing: 1 }).y).toBe(150);
  });
});

describe('overlaps', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  it('重なっていれば true', () => {
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it('辺が接しているだけなら false', () => {
    expect(overlaps(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('離れていれば false', () => {
    expect(overlaps(a, { x: 0, y: 20, w: 10, h: 10 })).toBe(false);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run tests/boxes.test.ts`
Expected: FAIL（`../src/logic/boxes` が見つからない）

- [ ] **Step 3: 箱の処理を実装する**

`src/logic/boxes.ts`:

```ts
import type { Box } from './types';

/** 足元基準・右向き基準の箱を、ステージ上の座標（x＝左端、y＝下端）に直す */
export function toWorld(box: Box, origin: { x: number; y: number; facing: 1 | -1 }): Box {
  const left = origin.facing === 1 ? origin.x + box.x : origin.x - box.x - box.w;
  return { x: left, y: origin.y + box.y, w: box.w, h: box.h };
}

/** 2つの箱が重なっているか。辺が接しているだけでは重ならない */
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
```

- [ ] **Step 4: 箱のテストが通ることを確かめる**

Run: `npx vitest run tests/boxes.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: 動きの失敗するテストを書く**

`tests/fighter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createFighter, stepFighter } from '../src/logic/fighter';
import type { Fighter, InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

/** 相手を固定位置に置いたまま n フレーム進める */
function runFrames(f: Fighter, n: number, input: InputFrame, opponentX: number): Fighter {
  let cur = f;
  for (let i = 0; i < n; i++) cur = stepFighter(cur, input, opponentX, params);
  return cur;
}

describe('歩き', () => {
  it('前に 5px/F で進む', () => {
    const f = runFrames(createFighter(proto, 400, 1), 10, inputOf(['right']), 900);
    expect(f.x).toBe(450);
    expect(f.state.name).toBe('walkForward');
  });

  it('後ろに 5px/F で下がる（ガードにはならない）', () => {
    const f = runFrames(createFighter(proto, 400, 1), 10, inputOf(['left']), 900);
    expect(f.x).toBe(350);
    expect(f.state.name).toBe('walkBack');
  });

  it('左右同時押しはどちらも押していない扱い', () => {
    const f = runFrames(createFighter(proto, 400, 1), 5, inputOf(['left', 'right']), 900);
    expect(f.x).toBe(400);
    expect(f.state.name).toBe('idle');
  });

  it('画面端の余白より端には行けない', () => {
    const f = runFrames(createFighter(proto, 62, 1), 5, inputOf(['left']), 900);
    expect(f.x).toBe(params.stage.edgeMargin);
  });
});

describe('向き', () => {
  it('相手が左にいれば左を向き、→ は後ろ歩きになる', () => {
    const f = runFrames(createFighter(proto, 400, 1), 1, inputOf(['right']), 100);
    expect(f.facing).toBe(-1);
    expect(f.state.name).toBe('walkBack');
  });
});

describe('しゃがみ・ガード', () => {
  it('↓ でしゃがみ、動かない', () => {
    const f = runFrames(createFighter(proto, 400, 1), 3, inputOf(['down', 'right']), 900);
    expect(f.state.name).toBe('crouch');
    expect(f.x).toBe(400);
  });

  it('ガード中は歩けない', () => {
    const f = runFrames(createFighter(proto, 400, 1), 3, inputOf(['guard', 'right']), 900);
    expect(f.state.name).toBe('guard');
    expect(f.x).toBe(400);
  });

  it('同じ状態が続けばフレーム数が増える', () => {
    const f = runFrames(createFighter(proto, 400, 1), 3, inputOf(['guard']), 900);
    expect(f.state.frame).toBe(3);
  });

  it('何も押さなければ待機', () => {
    const f = runFrames(createFighter(proto, 400, 1), 1, NONE, 900);
    expect(f.state.name).toBe('idle');
  });
});
```

- [ ] **Step 6: 失敗することを確かめる**

Run: `npx vitest run tests/fighter.test.ts`
Expected: FAIL（`../src/logic/fighter` が見つからない）

- [ ] **Step 7: 実装する**

`src/logic/fighter.ts`:

```ts
import type { CharacterData, Fighter, FighterStateName, InputFrame, Params } from './types';

export function createFighter(char: CharacterData, x: number, facing: 1 | -1): Fighter {
  return {
    char,
    x,
    y: 0,
    facing,
    health: char.stats.health,
    state: { name: 'idle', frame: 1 },
    moveHasHit: false,
  };
}

/** 画面端の余白より端に行かないようにする */
export function clampX(x: number, params: Params): number {
  const { width, edgeMargin } = params.stage;
  return Math.min(width - edgeMargin, Math.max(edgeMargin, x));
}

/** 1フレーム進める */
export function stepFighter(f: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter {
  return stepFree(f, input, opponentX, params);
}

/** 自由に動ける状態（待機・歩き・しゃがみ・ガード）で、このフレームの行動を決める */
function stepFree(f: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter {
  const facing: 1 | -1 = opponentX === f.x ? f.facing : opponentX > f.x ? 1 : -1;
  const held = input.held;
  // 左右同時押しは 0（どちらも押していない扱い）
  const horizontal = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  const base: Fighter = { ...f, facing, moveHasHit: false };

  const enter = (name: FighterStateName, x = base.x): Fighter => ({
    ...base,
    x,
    state: { name, frame: f.state.name === name ? f.state.frame + 1 : 1 },
  });

  if (held.guard) return enter('guard');
  if (held.down) return enter('crouch');
  if (horizontal !== 0) {
    const x = clampX(base.x + horizontal * f.char.stats.walkSpeed, params);
    return enter(horizontal * facing > 0 ? 'walkForward' : 'walkBack', x);
  }
  return enter('idle');
}
```

- [ ] **Step 8: テストが通ることを確かめる**

Run: `npm test && npx tsc`
Expected: すべて PASS、型エラーなし

- [ ] **Step 9: Commit**

```bash
git add src/logic/boxes.ts src/logic/fighter.ts tests/boxes.test.ts tests/fighter.test.ts
git commit -m "feat: 箱の計算と、歩き・しゃがみ・ガード・向きを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ジャンプ（真上）

M1 は ↑ の真上ジャンプだけ。前・後ろのジャンプは M2 で足す。

**Files:**
- Modify: `src/logic/fighter.ts`
- Test: `tests/jump.test.ts`

**Interfaces:**
- Consumes: Task 5 の `createFighter`, `stepFighter`
- Produces: `jumpY(frame: number, total: number, height: number): number`（放物線。`frame = total / 2` で `height`）。`stepFighter` が `jumpSquat` → `air` → `idle` を扱う

ジャンプの流れ（`06_params.md`：踏み込み 3F、滞空 36F）：
- ↑ を押したフレームが踏み込みの1F目。踏み込み 1〜3F は地上（y＝0）
- 4フレーム目から空中。空中の t F目の高さは `jumpY(t, 36, 200)`
- 空中の36F目で着地（y＝0、待機）。踏み込みから数えて 39F目

- [ ] **Step 1: 失敗するテストを書く**

`tests/jump.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createFighter, jumpY, stepFighter } from '../src/logic/fighter';
import type { Fighter } from '../src/logic/types';
import { inputOf } from './helpers';

/** 1フレーム目だけ ↑ を押して、各フレームの状態を記録する */
function jumpTimeline(frames: number): Fighter[] {
  const result: Fighter[] = [];
  let f = createFighter(proto, 400, 1);
  for (let i = 1; i <= frames; i++) {
    f = stepFighter(f, i === 1 ? inputOf([], ['up']) : inputOf(), 900, params);
    result.push(f);
  }
  return result;
}

describe('jumpY', () => {
  it('滞空の半分で一番高い', () => {
    expect(jumpY(18, 36, 200)).toBe(200);
  });
  it('始まりと終わりは地面', () => {
    expect(jumpY(0, 36, 200)).toBe(0);
    expect(jumpY(36, 36, 200)).toBe(0);
  });
});

describe('ジャンプ', () => {
  const t = jumpTimeline(40); // t[0] が1F目

  it('1〜3F目は踏み込み（地上）', () => {
    for (const f of t.slice(0, 3)) {
      expect(f.state.name).toBe('jumpSquat');
      expect(f.y).toBe(0);
    }
  });

  it('4F目から空中', () => {
    expect(t[3].state.name).toBe('air');
    expect(t[3].y).toBeGreaterThan(0);
  });

  it('38F目はまだ空中、39F目に着地して待機（踏み込み3F＋滞空36F）', () => {
    expect(t[37].state.name).toBe('air');
    expect(t[37].y).toBeGreaterThan(0);
    expect(t[38].state.name).toBe('idle');
    expect(t[38].y).toBe(0);
  });

  it('空中で → を押しても横に動かない（M1 は真上ジャンプだけ）', () => {
    let f = stepFighter(createFighter(proto, 400, 1), inputOf([], ['up']), 900, params);
    for (let i = 0; i < 10; i++) f = stepFighter(f, inputOf(['right']), 900, params);
    expect(f.x).toBe(400);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run tests/jump.test.ts`
Expected: FAIL（`jumpY` がない、またはジャンプしない）

- [ ] **Step 3: 実装する**

`src/logic/fighter.ts` に `jumpY` を足し、`stepFighter` を次に置き換え、`stepFree` に ↑ の行を足す。

```ts
/** ジャンプの放物線。空中の frame F目の高さ（frame = total / 2 で一番高い） */
export function jumpY(frame: number, total: number, height: number): number {
  const t = frame / total;
  return 4 * height * t * (1 - t);
}

/** 1フレーム進める */
export function stepFighter(f: Fighter, input: InputFrame, opponentX: number, params: Params): Fighter {
  const st = f.state;
  switch (st.name) {
    case 'jumpSquat': {
      if (st.frame + 1 <= params.jumpSquatFrames) return { ...f, state: { ...st, frame: st.frame + 1 } };
      const { jumpAirFrames, jumpHeight } = f.char.stats;
      return { ...f, y: jumpY(1, jumpAirFrames, jumpHeight), state: { name: 'air', frame: 1 } };
    }
    case 'air': {
      const { jumpAirFrames, jumpHeight } = f.char.stats;
      const frame = st.frame + 1;
      if (frame >= jumpAirFrames) return { ...f, y: 0, state: { name: 'idle', frame: 1 } };
      return { ...f, y: jumpY(frame, jumpAirFrames, jumpHeight), state: { name: 'air', frame } };
    }
  }
  return stepFree(f, input, opponentX, params);
}
```

`stepFree` の `if (held.guard)` の前に1行足す：

```ts
  if (held.up) return { ...base, state: { name: 'jumpSquat', frame: 1 } };
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test && npx tsc`
Expected: すべて PASS、型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/logic/fighter.ts tests/jump.test.ts
git commit -m "feat: 真上ジャンプ（踏み込み3F・滞空36F）を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: パンチのフレームと判定の箱

**Files:**
- Modify: `src/logic/fighter.ts`
- Test: `tests/punch.test.ts`

**Interfaces:**
- Consumes: Task 5 の `toWorld`, `stepFighter`、Task 6 の `stepFighter`
- Produces:
  - `moveTotalFrames(move: MoveData): number` — 発生＋持続＋硬直
  - `activeHitbox(f: Fighter): { box: Box; hit: HitData } | null` — 攻撃の箱が出ていて、まだ当たっていなければステージ座標の箱を返す
  - `hurtBoxes(f: Fighter): Box[]` — 状態に合った食らいの箱（しゃがみ・空中・それ以外は立ち）をステージ座標で返す
  - `stepFighter` が `attack` / `hitstun` / `blockstun` を扱う。`hitstun` / `blockstun` は `state.frame` が `state.duration` を超えたフレームで自由になる（Task 8 が `frame: 0` で入れる）

- [ ] **Step 1: 失敗するテストを書く**

`tests/punch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { activeHitbox, createFighter, hurtBoxes, stepFighter } from '../src/logic/fighter';
import type { Fighter, InputFrame } from '../src/logic/types';
import { inputOf } from './helpers';

/** frame番目（1始まり）の入力を返す関数で n フレーム進め、各フレームの状態を記録する */
function timeline(n: number, inputAt: (frame: number) => InputFrame): Fighter[] {
  const result: Fighter[] = [];
  let f = createFighter(proto, 400, 1);
  for (let i = 1; i <= n; i++) {
    f = stepFighter(f, inputAt(i), 900, params);
    result.push(f);
  }
  return result;
}

const punchAtFirst = (i: number) => (i === 1 ? inputOf([], ['punch']) : inputOf());

describe('パンチ（発生4・持続2・硬直8）', () => {
  const t = timeline(16, punchAtFirst); // t[0] が1F目

  it('押したフレームが技の1F目', () => {
    expect(t[0].state).toEqual({ name: 'attack', frame: 1 });
  });

  it('攻撃の箱は 5〜6F目だけ出る', () => {
    const active = t.map((f) => activeHitbox(f) !== null);
    expect(active.slice(0, 8)).toEqual([false, false, false, false, true, true, false, false]);
  });

  it('攻撃の箱は前に出る（右向きなら足元より右）', () => {
    const hit = activeHitbox(t[4]);
    expect(hit?.box).toEqual({ x: 420, y: 100, w: 70, h: 20 });
    expect(hit?.hit.damage).toBe(30);
  });

  it('14F目までは技の途中、15F目から待機に戻る', () => {
    expect(t[13].state).toEqual({ name: 'attack', frame: 14 });
    expect(t[14].state.name).toBe('idle');
  });

  it('技の途中は歩けず、パンチも出し直せない', () => {
    const busy = timeline(14, (i) => (i === 1 ? inputOf([], ['punch']) : inputOf(['right'], i % 2 === 0 ? ['punch'] : [])));
    expect(busy[13].state).toEqual({ name: 'attack', frame: 14 });
    expect(busy[13].x).toBe(400);
  });

  it('15F目に押せば次のパンチが出る', () => {
    const again = timeline(15, (i) => (i === 1 || i === 15 ? inputOf([], ['punch']) : inputOf()));
    expect(again[14].state).toEqual({ name: 'attack', frame: 1 });
  });

  it('当たったあとは攻撃の箱が消える', () => {
    expect(activeHitbox({ ...t[4], moveHasHit: true })).toBeNull();
  });
});

describe('食らいの箱', () => {
  it('立ちとしゃがみで高さが変わる', () => {
    const stand = createFighter(proto, 400, 1);
    const crouch = stepFighter(stand, inputOf(['down']), 900, params);
    expect(hurtBoxes(stand)[0]).toEqual({ x: 370, y: 0, w: 60, h: 160 });
    expect(hurtBoxes(crouch)[0].h).toBe(100);
  });
});

describe('のけぞり・ガード硬直', () => {
  it('duration のフレームが過ぎるまで動けない', () => {
    let f: Fighter = { ...createFighter(proto, 400, 1), state: { name: 'hitstun', frame: 0, duration: 14 } };
    for (let i = 0; i < 14; i++) f = stepFighter(f, inputOf(['right'], ['punch']), 900, params);
    expect(f.state).toEqual({ name: 'hitstun', frame: 14, duration: 14 });
    expect(f.x).toBe(400);
    f = stepFighter(f, inputOf([], ['punch']), 900, params);
    expect(f.state).toEqual({ name: 'attack', frame: 1 });
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run tests/punch.test.ts`
Expected: FAIL（`activeHitbox` などがない）

- [ ] **Step 3: 実装する**

`src/logic/fighter.ts` の import を次に変える：

```ts
import { toWorld } from './boxes';
import type { Box, CharacterData, Fighter, FighterStateName, HitData, InputFrame, MoveData, Params } from './types';
```

関数を足す：

```ts
export function moveTotalFrames(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

/** 攻撃の箱（ステージ座標）。持続中で、まだ当たっていない時だけ返す */
export function activeHitbox(f: Fighter): { box: Box; hit: HitData } | null {
  if (f.state.name !== 'attack' || f.moveHasHit) return null;
  const move = f.char.moves.punch;
  const frame = f.state.frame;
  if (frame <= move.startup || frame > move.startup + move.active) return null;
  const hit = move.hits[0];
  return { box: toWorld(hit.box, f), hit };
}

/** 食らいの箱（ステージ座標）。しゃがみ・空中・それ以外（立ち）で使い分ける */
export function hurtBoxes(f: Fighter): Box[] {
  const hurt = f.char.boxes.hurt;
  const local = f.state.name === 'crouch' ? hurt.crouch : f.state.name === 'air' ? hurt.air : hurt.stand;
  return local.map((box) => toWorld(box, f));
}
```

`stepFighter` の `switch` に3つの `case` を足す（`jumpSquat` の前）：

```ts
    case 'attack': {
      // 全体フレームが終わるまでは技の途中。終わったフレームは自由に動ける
      if (st.frame + 1 <= moveTotalFrames(f.char.moves.punch)) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
    case 'hitstun':
    case 'blockstun': {
      if (st.frame + 1 <= (st.duration ?? 0)) return { ...f, state: { ...st, frame: st.frame + 1 } };
      break;
    }
```

`stepFree` の `if (held.up)` の前に1行足す（パンチは押した瞬間だけ）：

```ts
  if (input.pressed.punch) return { ...base, state: { name: 'attack', frame: 1 } };
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test && npx tsc`
Expected: すべて PASS、型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/logic/fighter.ts tests/punch.test.ts
git commit -m "feat: パンチのフレームと攻撃・食らいの箱を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 2人を1F進めて、ヒットとガードを決める

**Files:**
- Create: `src/logic/battle.ts`
- Test: `tests/battle.test.ts`

**Interfaces:**
- Consumes: Task 7 の `createFighter`, `stepFighter`, `activeHitbox`, `hurtBoxes`、Task 5 の `overlaps`
- Produces:
  - `interface BattleEvent { type: 'hit' | 'block'; attacker: 0 | 1; damage: number }`
  - `interface Battle { frame: number; fighters: [Fighter, Fighter]; events: BattleEvent[] }` — `events` はそのフレームに起きたことだけ
  - `createBattle(chars: [CharacterData, CharacterData], params: Params, xs?: [number, number]): Battle` — 省略時はステージ中央から左右に `startDistance / 2` ずつ離れた位置。1P は右向き、2P は左向き
  - `stepBattle(b: Battle, inputs: [InputFrame, InputFrame], params: Params): Battle`

処理順（`08_architecture.md` 2.4 の M1 で使う部分）：
1. 両者を `stepFighter` で動かす（向きは動かす前の相手の位置で決める）
2. 両者の攻撃が相手に届いたかを、両方とも「動かしたあとの同じ状態」で調べる（1P が先に処理されて有利にならない）
3. 結果を反映：ガード中（`guard` か `blockstun`）なら体力は減らずガード硬直、そうでなければダメージとのけぞり。のけぞり・ガード硬直は `frame: 0` で入れる（次のフレームが1F目）
4. 同じフレームに両者が当てた場合は、M1 では両方に当たる（相打ちのルールは M3）

- [ ] **Step 1: 失敗するテストを書く**

`tests/battle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { params, proto } from '../src/data/data';
import { createBattle, stepBattle, type Battle } from '../src/logic/battle';
import type { InputFrame } from '../src/logic/types';
import { inputOf, NONE } from './helpers';

type Inputs = (frame: number) => [InputFrame, InputFrame];

/** frame番目（1始まり）の入力で n フレーム進め、各フレームの結果を記録する */
function play(xs: [number, number], n: number, inputsAt: Inputs): Battle[] {
  const result: Battle[] = [];
  let b = createBattle([proto, proto], params, xs);
  for (let i = 1; i <= n; i++) {
    b = stepBattle(b, inputsAt(i), params);
    result.push(b);
  }
  return result;
}

const p1PunchAtFirst: Inputs = (i) => [i === 1 ? inputOf([], ['punch']) : NONE, NONE];

describe('createBattle', () => {
  it('ステージ中央から左右に離れて、向かい合って始まる', () => {
    const b = createBattle([proto, proto], params);
    expect(b.fighters.map((f) => f.x)).toEqual([400, 880]);
    expect(b.fighters.map((f) => f.facing)).toEqual([1, -1]);
  });
});

describe('ヒット', () => {
  const t = play([400, 500], 20, p1PunchAtFirst); // t[0] が1F目

  it('4F目までは当たらず、5F目に当たって体力が 30 減る', () => {
    expect(t[3].fighters[1].health).toBe(850);
    expect(t[4].fighters[1].health).toBe(820);
    expect(t[4].events).toEqual([{ type: 'hit', attacker: 0, damage: 30 }]);
  });

  it('1回のパンチは1回だけ当たる', () => {
    expect(t[13].fighters[1].health).toBe(820);
    expect(t.flatMap((b) => b.events)).toHaveLength(1);
  });

  it('当たった相手はのけぞる（軽：14F）。のけぞりが終わる20F目から動ける', () => {
    expect(t[4].fighters[1].state).toEqual({ name: 'hitstun', frame: 0, duration: 14 });
    const recover = play([400, 500], 20, (i) => [
      i === 1 ? inputOf([], ['punch']) : NONE,
      i >= 6 ? inputOf([], ['punch']) : NONE,
    ]);
    expect(recover[18].fighters[1].state.name).toBe('hitstun');
    expect(recover[19].fighters[1].state).toEqual({ name: 'attack', frame: 1 });
  });

  it('届かない距離では当たらない', () => {
    const far = play([400, 700], 14, p1PunchAtFirst);
    expect(far[13].fighters[1].health).toBe(850);
  });
});

describe('ガード', () => {
  const t = play([400, 500], 14, (i) => [i === 1 ? inputOf([], ['punch']) : NONE, inputOf(['guard'])]);

  it('ガードを押していればパンチで体力が減らない', () => {
    expect(t[13].fighters[1].health).toBe(850);
  });

  it('ガードしたらガード硬直（軽：10F）になる', () => {
    expect(t[4].events).toEqual([{ type: 'block', attacker: 0, damage: 0 }]);
    expect(t[4].fighters[1].state).toEqual({ name: 'blockstun', frame: 0, duration: 10 });
  });
});

describe('同時', () => {
  it('同じフレームに当て合えば両方の体力が減る（相打ちのルールは M3）', () => {
    const t = play([400, 500], 5, (i) => (i === 1 ? [inputOf([], ['punch']), inputOf([], ['punch'])] : [NONE, NONE]));
    expect(t[4].fighters.map((f) => f.health)).toEqual([820, 820]);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run tests/battle.test.ts`
Expected: FAIL（`../src/logic/battle` が見つからない）

- [ ] **Step 3: 実装する**

`src/logic/battle.ts`:

```ts
import { overlaps } from './boxes';
import { activeHitbox, createFighter, hurtBoxes, stepFighter } from './fighter';
import type { CharacterData, Fighter, HitData, InputFrame, Params } from './types';

export interface BattleEvent {
  type: 'hit' | 'block';
  attacker: 0 | 1;
  damage: number;
}

export interface Battle {
  frame: number;
  fighters: [Fighter, Fighter];
  /** このフレームに起きたことだけ。描画・音はこれを見て演出する */
  events: BattleEvent[];
}

export function createBattle(chars: [CharacterData, CharacterData], params: Params, xs?: [number, number]): Battle {
  const center = params.stage.width / 2;
  const half = params.stage.startDistance / 2;
  const [x0, x1] = xs ?? [center - half, center + half];
  return {
    frame: 0,
    fighters: [createFighter(chars[0], x0, 1), createFighter(chars[1], x1, -1)],
    events: [],
  };
}

/** 2人を1フレーム進める */
export function stepBattle(b: Battle, inputs: [InputFrame, InputFrame], params: Params): Battle {
  const [before0, before1] = b.fighters;
  const moved: [Fighter, Fighter] = [
    stepFighter(before0, inputs[0], before1.x, params),
    stepFighter(before1, inputs[1], before0.x, params),
  ];

  // 両者とも「動かしたあとの同じ状態」で調べる（1P が先に処理されて有利にならないように）
  const results = [resolveAttack(moved[0], moved[1]), resolveAttack(moved[1], moved[0])];

  const fighters: [Fighter, Fighter] = [moved[0], moved[1]];
  const events: BattleEvent[] = [];
  results.forEach((result, i) => {
    if (!result) return;
    const attacker = i as 0 | 1;
    const defender = (1 - i) as 0 | 1;
    const weight = params.weights[result.hit.weight];
    fighters[attacker] = { ...fighters[attacker], moveHasHit: true };
    if (result.blocked) {
      fighters[defender] = {
        ...fighters[defender],
        state: { name: 'blockstun', frame: 0, duration: weight.blockstun },
      };
      events.push({ type: 'block', attacker, damage: 0 });
    } else {
      fighters[defender] = {
        ...fighters[defender],
        health: Math.max(0, fighters[defender].health - result.hit.damage),
        state: { name: 'hitstun', frame: 0, duration: weight.hitstun },
      };
      events.push({ type: 'hit', attacker, damage: result.hit.damage });
    }
  });

  return { frame: b.frame + 1, fighters, events };
}

/** 攻撃側の攻撃の箱が、守る側の食らいの箱に重なったか。重なったらガードできたかも返す */
function resolveAttack(attacker: Fighter, defender: Fighter): { hit: HitData; blocked: boolean } | null {
  const active = activeHitbox(attacker);
  if (!active) return null;
  if (!hurtBoxes(defender).some((box) => overlaps(active.box, box))) return null;
  const blocked = defender.state.name === 'guard' || defender.state.name === 'blockstun';
  return { hit: active.hit, blocked };
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test && npx tsc`
Expected: すべて PASS、型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/logic/battle.ts tests/battle.test.ts
git commit -m "feat: 2人を1F進めてヒットとガードを決める処理を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: キーボード・描画・起動と、実機での確認

**Files:**
- Create: `src/input/keyboard.ts`, `src/render/render.ts`
- Modify: `src/main.ts`（Task 1 の仮のものを置き換える）、`.claude/launch.json`（なければ作る）
- Delete: `tests/smoke.test.ts`（他のテストができたので不要）

**Interfaces:**
- Consumes: Task 2 `createFixedStep`、Task 3 `params`, `controls`, `proto`、Task 4 `allCodes`, `buildInputFrame`, `emptyHeld`, `heldFromKeys`、Task 7 `activeHitbox`, `hurtBoxes`、Task 8 `createBattle`, `stepBattle`, `Battle`
- Produces:
  - `class KeyboardState { constructor(gameCodes: ReadonlySet<string>); attach(target: Window): void; snapshot(): ReadonlySet<string> }`
  - `interface DebugInfo { show: boolean; keys: string[] }`
  - `drawFrame(ctx: CanvasRenderingContext2D, battle: Battle, params: Params, debug: DebugInfo): void`

この Task はブラウザでの確認が中心なので、自動テストは書かない（DOM と描画のため）。

- [ ] **Step 1: キーボードを書く**

`src/input/keyboard.ts`:

```ts
/** ブラウザのキーイベントから「今押されているキー」の集合を持つ。ゲームはフレームの頭で snapshot() を1回読む */
export class KeyboardState {
  private readonly keys = new Set<string>();

  constructor(private readonly gameCodes: ReadonlySet<string>) {}

  attach(target: Window): void {
    target.addEventListener('keydown', (e) => {
      // 矢印キーでのスクロールなど、ゲームで使うキーのブラウザ既定動作を止める
      if (this.gameCodes.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    target.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    // 別ウィンドウに移ると離した操作が届かず押しっぱなしになるので、全部離した扱いにする
    target.addEventListener('blur', () => this.keys.clear());
  }

  snapshot(): ReadonlySet<string> {
    return new Set(this.keys);
  }
}
```

- [ ] **Step 2: 描画を書く**

`src/render/render.ts`:

```ts
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

/** 体力バー。1P は左、2P は右。減ると中央側から縮む */
function drawHealth(ctx: CanvasRenderingContext2D, f: Fighter, index: number, width: number): void {
  const { width: barW, height: barH, top, side } = HEALTH_BAR;
  const x = index === 0 ? side : width - side - barW;
  ctx.fillStyle = '#400';
  ctx.fillRect(x, top, barW, barH);
  const w = (barW * f.health) / f.char.stats.health;
  ctx.fillStyle = '#fc3';
  ctx.fillRect(index === 0 ? x + barW - w : x, top, w, barH);
}
```

- [ ] **Step 3: 起動処理を書く**

`src/main.ts`（全体を置き換える）:

```ts
import { createFixedStep } from './core/loop';
import { controls, params, proto } from './data/data';
import { allCodes, buildInputFrame, emptyHeld, heldFromKeys } from './input/inputFrame';
import { KeyboardState } from './input/keyboard';
import { createBattle, stepBattle } from './logic/battle';
import { drawFrame } from './render/render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D が使えません');

const keyboard = new KeyboardState(allCodes(controls));
keyboard.attach(window);

let battle = createBattle([proto, proto], params);
let prevHeld = [emptyHeld(), emptyHeld()];
const fixedStep = createFixedStep();

function tick(now: number): void {
  const steps = fixedStep(now);
  for (let i = 0; i < steps; i++) {
    const keys = keyboard.snapshot();
    const held = [heldFromKeys(keys, controls.p1), heldFromKeys(keys, controls.p2)];
    battle = stepBattle(
      battle,
      [buildInputFrame(held[0], prevHeld[0]), buildInputFrame(held[1], prevHeld[1])],
      params,
    );
    prevHeld = held;
  }
  drawFrame(ctx!, battle, params, { show: import.meta.env.DEV, keys: [...keyboard.snapshot()] });
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
```

- [ ] **Step 4: 不要になった smoke テストを消し、テスト・型チェック・ビルドを通す**

Run: `git rm tests/smoke.test.ts && npm test && npm run build`
Expected: すべて PASS、`dist/` ができる（`dist/` は `.gitignore` 済み）

- [ ] **Step 5: 開発サーバを起動して画面を確認する**

`.claude/launch.json`（なければ作る）:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "fighting-game", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

ブラウザのプレビューで開き、次を確かめる：
- 地面と赤（1P）・青（2P）の四角が向かい合って表示される
- 上部に体力バーが2本ある
- 画面下に「押しているキー」が出て、押したキーの名前（`KeyF`、`Numpad4` など）が表示される
- コンソールにエラーがない

- [ ] **Step 6: 自動テストできない確認をユーザーと行う**

`09_roadmap.md` M1 の「手動」の項目。2人で同時に押す確認は人にしかできないので、ユーザーに次を依頼して結果を聞く：

| 確認すること | 基準 |
|---|---|
| 同時押し | 1P が「D＋W＋F」、2P が「←＋テンキー2＋テンキー4」を同時に押し続けて、画面下の「押しているキー」に6つ全部出るか |
| 同時押し（多め） | 1P・2P で合計8キー前後を同時に押して、取りこぼすキーがないか。取りこぼしたら、その組み合わせを記録する |
| テンキーなし | 2P を J K L M , で操作して、テンキーと同じに動くか |
| 手触り | 押してから動くまでに遅れを感じないか |
| 完成条件 | 2人で四角を動かしてパンチを当て合い、体力が減るか。ガードを押していればパンチで減らないか |

- [ ] **Step 7: 確認結果を仕様書に反映する**

- 取りこぼしがなければ：`docs/04_system.md` の「キー配置（仮）」の見出しを「キー配置」に変え、「実機で試して確定する」の行を「M1 で実機確認済み（取りこぼしなし）」に変える。`docs/open-questions.md` の「キー配置の確定」の行を消す
- 取りこぼしがあれば：記録した組み合わせを `docs/open-questions.md` の「キー配置の確定」の行に書き足し、配置の変更案をユーザーに選択肢で聞いてから `src/data/controls.json` と `docs/04_system.md` を直す

- [ ] **Step 8: Commit**

```bash
git add src/input/keyboard.ts src/render/render.ts src/main.ts .claude/launch.json docs
git commit -m "feat: キーボード・描画・起動をつなぎ、M1 の試作を動かす

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## M1 の完成条件（09_roadmap.md より）

- 2人で1台のキーボードを使い、四角を動かしてパンチを当て合い、体力を減らせる
- ガードを押していればパンチでは体力が減らない
- 自動テストの確認項目（パンチの発生・全体・ダメージ・ガード・歩き速度・ジャンプ）がすべて通る
- 手動の確認項目（同時押し・テンキーなし・手触り）の結果が仕様書に反映されている
