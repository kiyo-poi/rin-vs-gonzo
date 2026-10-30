# M3b 掴みと必殺技 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2キャラの必殺技6種と掴み（投げ・投げ抜け・三すくみ）を入れ、通常技から必殺技へのキャンセル・先行入力・連続技の補正・削り・コンボ数の表示までを動かす（M3 を3回に分けた2回目）。

**Architecture:** 技データ（JSON）に 08 の形の項目（多段の当たりの区間、移動、無敵区間、アーマー、ガード固定、投げ、キャンセル先、技の種類）を足し、ロジックはデータを読んで動く。キャラの状態に「その技で当たった当たり」「先行入力」「受けている連続技」を持たせる。空中かどうかは状態名ではなく高さで決める。

**Tech Stack:** TypeScript（strict）、Vite、Vitest、Canvas 2D。依存は開発用の `typescript`・`vite`・`vitest` だけ。

**Spec:** `docs/03_moves.md`（技表と共通ルール）、`docs/04_system.md`（三すくみ・削り・キャンセル・細かいルール）、`docs/06_params.md`、`docs/08_architecture.md`（2.3 入力、2.4 判定の優先順位、5章 キャラデータ）、`docs/09_roadmap.md`（M3 の確認項目）。申し送りは `docs/open-questions.md` の「M3b・M3c で扱うこと」。

## Global Constraints

- 60fps 固定のフレーム単位。`src/logic/` で `Math.random()`・現在時刻・DOM を使わない。依存は `typescript`・`vite`・`vitest` だけ
- 調整値はコードに直接書かない。共通値は `params.json`、キャラ別の値はキャラデータ JSON
- フレームの数え方（08 5章）：技の1F目＝ボタンを押した（技が始まった）フレーム。攻撃の箱は「発生＋1」〜「発生＋持続」F目。`hits[].frames` は「持続の何F目か」（持続の1F目＝1）。`movement`・`invincible`・`armor` の区間は「技の何F目か」。のけぞり・ガード硬直・ダウン・弾かれ・投げは入ったフレームに `frame: 0`、次のフレームが1F目
- 03 の数値：連拳 7/20/16・18×5＝90・軽（最後の1発は中）・ガード固定。突進掌 12/4/18・70・中。昇り蹴り 5/8/30・100・重・無敵1〜7F・硬直は着地まで含む。マッスルポーズ 4/26/20・アーマー（持続中、打撃1発）・耐えたら反撃パンチ。ラリアット突進 16/20/22・110・重・持続中ずっと突進しアーマー1発。ヒップドロップ 30/6/24・100・重・発生中にジャンプ・衝撃波は地上の相手だけ。肩乗りエルボー 5/2/20・80。ボディスラム 6/3/26・140
- 06 の数値：連続技の補正 2発目以降 80%、削り 20%、投げ抜けの受付 8F、投げの演出 40F、リンの掴み間合い 60px、ゴンゾー 90px、突進掌の突進距離 420px、ラリアット突進 380px、反撃パンチ 発生8F・100、アーマーで耐えた時の被ダメージ 50%、ヒップドロップの衝撃波 左右 160px。入力の先行受付 6F（08 2.3）
- 04 の決まり：打撃は掴みに勝つ／掴みはガードに勝つ（ガード不能）／ガードは打撃に勝つ。投げ抜けは両者弾かれて仕切り直し。キャンセルは通常技（立ち・しゃがみのパンチ・キック）→ 必殺技のみ、ヒット時・ガード時とも可、空振りは不可。補正は2発目以降ずっと同じ割合で、多段技のヒット同士にはかけない。削りは必殺技だけ、体力1で止まる（KOしない）。アーマーは打撃だけ耐え、掴みは耐えられない。掴めない状態＝空中・のけぞり中・ガード硬直中・ダウン中・無敵中（ジャンプの踏み込み中は掴める）。ダメージの小数は切り捨て
- 08 の決まり：同じフレームの攻撃ボタンの優先順位は 必殺 ＞ 掴み ＞ キック ＞ パンチ。必殺技の向き（ニュートラル／→／↓）はボタンを押したフレームの方向で決め、↓を→より優先。← ＋必殺はニュートラル
- 範囲外（M3c）：ゲージ、超必殺、超必殺の相打ち、ジャイアントスイング。ヒットストップは M4
- 文章・コメントは日本語、識別子は英語。コミットの末尾は必ず `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

コマンド：`npx vitest run <file>`、`npm test`、`npx tsc`、`npm run build`。テストは `createBattle([lin, gonzo] など)` と `stepBattle` で、仕様の数値を直接確かめる。

## Review Focus

1. 連拳の1発目をガードしたあとに相手がガードを離しても、残りの4発はガードになる（Task 3 のテスト）
2. 通常技を空振りした時に必殺を押しても、キャンセルされない（技の最後まで動けない）（Task 7 のテスト）
3. 体力1の相手に必殺技をガードさせても、体力は1のまま（Task 8 のテスト）
4. ジャンプの踏み込み中の相手は掴める。のけぞり中・ガード硬直中の相手は掴めない（Task 6 のテスト）
5. アーマーは1発しか耐えない。連拳をマッスルポーズで受けると1発目だけ耐え、反撃パンチに移る（2発目以降は反撃パンチ中の相手に当たる）（Task 5 のテスト）

## ファイル構成

| ファイル | この計画で |
|---|---|
| `src/logic/types.ts` | 技データの新しい項目、技の枠、新しい状態、キャラの状態に持たせる値、調整値 |
| `src/logic/fighter.ts` | 技の引き方、多段の当たり、移動、無敵、空中の判定、必殺の入力、先行入力、キャンセル、投げの状態の進め方 |
| `src/logic/throw.ts`（新規） | 掴めるかどうかと、掴みの届き方 |
| `src/logic/battle.ts` | 多段・ガード固定・アーマー・投げ・投げ抜け・補正・削り・コンボの記録、ノックバック後の位置の直し |
| `src/logic/position.ts` | 地上かどうかを `isAirborne` で決める |
| `src/data/characters/lin.json`・`gonzo.json`・`params.json` | 必殺技6種・掴み2種・反撃パンチ・調整値 |
| `src/render/render.ts` | コンボ数の文字、投げ中の見た目 |

---

### Task 1: 技データの形と1発ごとの当たり、空中の判定

M3a の申し送りの土台直し。後のタスクはすべてこの形の上に乗る。

**Files:** Modify `src/logic/types.ts`, `src/logic/fighter.ts`, `src/logic/battle.ts`, `src/logic/position.ts`, 既存テスト（`moveHasHit` を使う所） / Test: `tests/multihit.test.ts`（新規）

**Interfaces:**
- Produces（types.ts）:
  - `MoveData` に `kind?: 'normal' | 'special' | 'throw'`（省略時 normal）、`movement?: MoveStep[]`、`invincible?: FrameRange[]`、`armor?: ArmorData`、`guardLock?: boolean`、`cancelInto?: 'special'[]`、`throw?: ThrowData`
  - `type FrameRange = { from: number; to: number }`、`MoveStep = { frames: FrameRange; dx: number; dy?: number }`（区間の合計の移動量。前向きがプラス、上がプラス。区間の各フレームに等分して足す）、`ArmorData = { frames: FrameRange; hits: number; onAbsorb?: string }`、`ThrowData = { range: number; damage: number; techable: boolean }`
  - `HitData` に `frames?: FrameRange`（持続の何F目か。省略時は持続全体）と `groundOnly?: boolean`
  - `CharacterData` に `subMoves?: Record<string, MoveData>`（入力では出ない派生技）
  - 技中・空中技の状態の `move` は `string`（技の枠名か `subMoves` の名前）
  - `Fighter.moveHasHit: boolean` を `hitDone: boolean[]`（今の技の `hits` の何番目が当たった（ガードされた）か）に置き換える
- Produces（fighter.ts）:
  - `getMove(char: CharacterData, id: string): MoveData`（`moves` か `subMoves` から引く。無ければ例外）
  - `activeHitbox(f)` の戻り値を `{ box: Box; hit: HitData; index: number } | null` にする。今のフレームで出ていて、まだ当たっていない最初の当たりを返す
  - `isAirborne(f: Fighter): boolean` — `y > 0` か、状態が `air`・`airHit` なら true
- `battle.ts`：当たったら `hitDone[index] = true`。空中やられにするかは `isAirborne(守る側)` で決める。`position.ts` の押し合いも `isAirborne` で決める

- [ ] **Step 1: 失敗するテストを書く** — `tests/multihit.test.ts`（テスト用に `lin` のパンチを3発の当たりにしたキャラを作る：`hits` を `frames {1,1}`・`{2,2}`・`{3,3}` の3つ、持続 3）：
  - `多段技は持続の各区間で1回ずつ当たる`：`stepBattle` で3つの当たりがそれぞれ別のフレームでヒットし、イベントが3つ
  - `当たった当たりは同じ技の間は二度と当たらない`
  - `isAirborne：y が 0 より大きい技の途中は空中扱い`（`{ ...fighter, y: 30, state: 攻撃中 }` で true、地上の待機で false）
  - `getMove は subMoves も引ける／無い名前は例外`
- [ ] **Step 2: 失敗を確かめる** — `npx vitest run tests/multihit.test.ts` → FAIL
- [ ] **Step 3: 上の Interfaces のとおりに実装し、`moveHasHit` を使う所（src とテスト）を `hitDone` に直す**
- [ ] **Step 4: 全体を通す** — `npm test && npx tsc` → PASS
- [ ] **Step 5: Commit** — `refactor: 技データの形を 08 に合わせ、1発ごとの当たりと高さによる空中判定にする`

---

### Task 2: 必殺技の入力と移動（突進掌・ラリアット突進）、ノックバック後の位置の直し

**Files:** Modify `types.ts`, `fighter.ts`, `battle.ts`, `lin.json`, `gonzo.json`, `tests/data.test.ts` / Test: `tests/special.test.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の `MoveData` の項目、`getMove`
- Produces:
  - `MoveSlot` に `'special' | 'forwardSpecial' | 'downSpecial' | 'grab'` を足す（両キャラの JSON に全部の枠が要る。この Task で `special`・`downSpecial`・`grab` に入れる中身は、Task 3〜6 で本物に置き換える仮の技でよい。仮の技は `kind: 'special'` か `'throw'`、`hits: []`）
  - `stepFree` の攻撃ボタンの優先順位：必殺 ＞ 掴み ＞ キック ＞ パンチ。必殺は押したフレームの方向で ↓（`downSpecial`）＞ 前（`forwardSpecial`）＞ それ以外（`special`）
  - 技中は `movement` の区間で毎フレーム `x += facing × dx ÷ 区間の長さ`、`y += dy ÷ 区間の長さ`（x は画面端で止める）
  - `battle.ts`：ノックバックのあとに、画面端と2人の距離の上限をもう一度かける（申し送り）
- データ：
  - リン `forwardSpecial`「突進掌」：12/4/18、`kind: 'special'`、`movement: [{ frames: {from:1,to:12}, dx: 420 }]`、当たり 70・中・`{x:20,y:90,w:80,h:30}`
  - ゴンゾー `forwardSpecial`「ラリアット突進」：16/20/22、`kind: 'special'`、`movement: [{ frames: {from:17,to:36}, dx: 380 }]`、当たり 110・重・`{x:30,y:100,w:100,h:40}`（アーマーは Task 5）

- [ ] **Step 1: 失敗するテストを書く** — `tests/special.test.ts`：
  - `→＋必殺で突進掌。1〜12F目で 420px 前へ進み、13〜16F目に攻撃の箱`（相手は遠くに置く。12F目の x が 開始 x＋420）
  - `←＋必殺はニュートラルの必殺（special）、↓＋→＋必殺は downSpecial`
  - `同じフレームに必殺とパンチを押したら必殺、掴みとキックなら掴み`
  - `ラリアット突進は持続の 17〜36F目で 380px 進む`
  - `突進してノックバックしても、2人の距離は 1160px を超えず、画面端から出ない`
  - `tests/data.test.ts` に、突進掌・ラリアット突進の発生・持続・硬直・ダメージ・重さが 03 のとおりかを足す
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 全体を通す** — `npm test && npx tsc` → PASS
- [ ] **Step 5: Commit** — `feat: 必殺技の入力と突進（突進掌・ラリアット突進）を追加`

---

### Task 3: 連拳（多段・ガード固定）

**Files:** Modify `battle.ts`, `fighter.ts`（必要なら）, `lin.json`, `tests/data.test.ts` / Test: `tests/renken.test.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の多段の当たり、Task 2 の `special` 枠
- Produces:
  - 技中の状態に `guardLocked: boolean`（1発目がガードされたら true。以降の当たりは守る側の状態に関係なくガード扱い）。技が始まる時は false
  - リン `special`「連拳」：7/20/16、`kind: 'special'`、`guardLock: true`、当たり5つ：`frames` が `{1,1}`・`{5,5}`・`{9,9}`・`{13,13}`・`{17,17}`、各 18、重さは4つ目まで軽・5つ目が中、箱 `{x:20,y:90,w:110,h:30}`

- [ ] **Step 1: 失敗するテストを書く** — `tests/renken.test.ts`（リン同士、隣り合わせ `[400, 460]`）：
  - `連拳は 8F目から 4F ごとに5回当たり、合計 90 減る`（ヒットのフレームが 8・12・16・20・24）
  - `5発目だけ重さが中（のけぞり 18F）`
  - `1発目をガードしたら、相手がガードを離しても残り4発はガードになる`（Review Focus 1。2P は 8F目までガードを押し、9F目から離す → イベントが block ×5、体力は削りの分だけ減る ※削りは Task 8 で入るので、ここでは block が5回であることだけ確かめる）
  - `tests/data.test.ts` に連拳の値（7/20/16・5発・合計 90）を足す
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 全体を通す** → PASS
- [ ] **Step 5: Commit** — `feat: 連拳（5ヒット・ガード固定）を追加`

---

### Task 4: 昇り蹴り（無敵・上昇）とヒップドロップ（ジャンプ・地上だけの衝撃波）

**Files:** Modify `fighter.ts`, `battle.ts`, `lin.json`, `gonzo.json`, `tests/data.test.ts` / Test: `tests/rising-hipdrop.test.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の `invincible`・`movement`・`groundOnly`・`isAirborne`
- Produces:
  - `isHittable(f)` は、技の `invincible` の区間に今の技のフレームが入っていても false（起き上がりの `Fighter.invincible` とは別の項目のまま、判定の関数は1つ）
  - `groundOnly` の当たりは、守る側が `isAirborne` なら当たらない
- データ：
  - リン `downSpecial`「昇り蹴り」：5/8/30・100・重、`kind: 'special'`、`invincible: [{1,7}]`、`movement: [{ frames:{6,13}, dx:30, dy:140 }, { frames:{14,43}, dx:0, dy:-140 }]`、箱 `{x:0,y:60,w:70,h:100}`
  - ゴンゾー `downSpecial`「ヒップドロップ」：30/6/24・100・重、`kind: 'special'`、`movement: [{ frames:{1,15}, dx:0, dy:120 }, { frames:{16,30}, dx:0, dy:-120 }]`、当たり `{ frames:{1,6}, groundOnly: true, box: {x:-160,y:0,w:320,h:30} }`

- [ ] **Step 1: 失敗するテストを書く**：
  - `昇り蹴りは 1〜7F目に打撃が当たらない（8F目からは当たる）`
  - `昇り蹴りで上昇し、43F目で地面に戻る（硬直は着地まで含む）`
  - `昇り蹴りで空中の相手を落とすと空中やられになる`
  - `昇り蹴りの途中（浮いている時）に食らうと空中やられになる`（`isAirborne` が高さで決まることの確認）
  - `ヒップドロップの衝撃波は左右 160px の地上の相手に当たる（後ろ側にも当たる）`
  - `衝撃波はジャンプ中の相手には当たらない`
  - `tests/data.test.ts` に2技の値を足す
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 全体を通す** → PASS
- [ ] **Step 5: Commit** — `feat: 昇り蹴り（無敵・上昇）とヒップドロップ（地上だけの衝撃波）を追加`

---

### Task 5: アーマー（マッスルポーズと反撃パンチ、ラリアット突進）

**Files:** Modify `types.ts`, `battle.ts`, `fighter.ts`, `gonzo.json`, `tests/data.test.ts` / Test: `tests/armor.test.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の `armor`・`subMoves`・`getMove`、Task 2 のラリアット突進
- Produces:
  - `CharacterData.stats.armorDamageRate?: number`（ゴンゾー 0.5）
  - 技中の状態に `armorLeft: number`（技が始まる時に `armor.hits`、アーマーがない技は 0）
  - `BattleEvent` に `{ type: 'armor'; attacker: 0 | 1; damage: number }`
  - 打撃が当たった時、守る側が技の `armor.frames` の中で `armorLeft > 0` なら：被ダメージは `floor(ダメージ × armorDamageRate)`、のけぞり・ノックバックなし、`armorLeft -= 1`。`onAbsorb` があれば、その派生技に `frame: 0` で移る
  - 相打ち（両者の打撃が同じフレームに届いた）で片方がアーマーで耐えられるなら、相打ちにせず：アーマー側が耐え、アーマー側の打撃が当たる（08 2.4 の3番）
- データ（ゴンゾー）：
  - `special`「マッスルポーズ」：4/26/20、`kind: 'special'`、`hits: []`、`armor: { frames:{5,30}, hits:1, onAbsorb:'counterPunch' }`
  - `subMoves.counterPunch`「反撃パンチ」：8/3/16・100・重、`kind: 'special'`、箱 `{x:30,y:110,w:100,h:30}`
  - `forwardSpecial`（ラリアット突進）に `armor: { frames:{17,36}, hits:1 }`

- [ ] **Step 1: 失敗するテストを書く** — `tests/armor.test.ts`（1P リン・2P ゴンゾー）：
  - `マッスルポーズは持続中にジャブを耐え、被ダメージは 15（30 の 50%）、のけぞらない`
  - `耐えたら反撃パンチに移り、反撃パンチ（発生8F）が当たると 100 減る`
  - `アーマーは1発だけ。連拳を受けると1発目だけ耐える`（Review Focus 5。1発目のイベントは armor、2発目以降は反撃パンチ中のゴンゾーに hit）
  - `ラリアット突進は突進中に打撃を1発耐えて、そのまま当てる`
  - `アーマーとの相打ちは相打ちにならず、アーマー側が勝つ`
  - `tests/data.test.ts` にマッスルポーズ・反撃パンチの値を足す
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 全体を通す** → PASS
- [ ] **Step 5: Commit** — `feat: アーマー（マッスルポーズと反撃パンチ、ラリアット突進）を追加`

---

### Task 6: 掴み・投げ・投げ抜け・三すくみ

**Files:** Create `src/logic/throw.ts` / Modify `types.ts`, `fighter.ts`, `battle.ts`, `params.json`, `lin.json`, `gonzo.json`, `tests/data.test.ts` / Test: `tests/throw.test.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の `ThrowData`・`isAirborne`・`isHittable`、Task 2 の `grab` 枠と優先順位
- Produces:
  - `Params` に `throwTechWindow`（8）、`throwDuration`（40）
  - 新しい状態 `{ name: 'throwing'; frame: number; duration: number }`、`{ name: 'thrown'; frame: number; duration: number; damage: number; techable: boolean }`。どちらの間も `isHittable` は false。`thrown` は `duration` を超えたフレームで体力を `damage` 減らして（0 未満にしない）ダウンへ。`throwing` は超えたフレームで自由
  - `throw.ts`：`isGrabbable(f: Fighter): boolean`（`isHittable` かつ `isAirborne` でなく、`hitstun`・`blockstun`・`knockdown`・`airHit`・`thrown`・`throwing` でない。踏み込み中は掴める）、`grabReaches(attacker: Fighter, defender: Fighter, range: number): boolean`（相手が前にいて、2人の押し合いの幅の外側どうしの隙間が `range` 以下）
  - `BattleEvent` に `{ type: 'throw'; attacker: 0 | 1 }` と `{ type: 'tech' }`
  - `battle.ts` の順番（08 2.4）：打撃と掴みが同じフレームなら打撃が勝つ（掴みは不成立）。掴み同士なら両者 `clashRecoil`。掴みが届けば、ガード中・アーマー中でも成立し、攻撃側 `throwing`・守る側 `thrown`（どちらも `frame: 0`）。投げ抜け：`thrown` の 1〜`throwTechWindow` F目に守る側が掴みを押したら、両者 `clashRecoil`、イベント `tech`
- データ：リン `grab`「肩乗りエルボー」5/2/20、`kind:'throw'`、`hits: []`、`throw: { range: 60, damage: 80, techable: true }`。ゴンゾー `grab`「ボディスラム」6/3/26、`throw: { range: 90, damage: 140, techable: true }`

- [ ] **Step 1: 失敗するテストを書く** — `tests/throw.test.ts`：
  - `掴みはガード中の相手を掴み、40F 後に 80 減ってダウン`（リン同士、隣り合わせ）
  - `掴みの発生前に打撃が当たれば打撃が勝つ`
  - `掴まれてから 8F 以内に掴みを押すと両者弾かれる（tech）。9F目に押しても投げられる`
  - `ジャンプ中の相手は掴めない。ジャンプの踏み込み中の相手は掴める`（Review Focus 4）
  - `のけぞり中・ガード硬直中の相手は掴めない`（Review Focus 4）
  - `ゴンゾーの掴み間合いはリンより広い（隙間 80px：ゴンゾーは掴め、リンは掴めない）`
  - `アーマー中のゴンゾーも掴める`
  - `tests/data.test.ts` に掴み2技の値を足す
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 全体を通す** → PASS
- [ ] **Step 5: Commit** — `feat: 掴み・投げ・投げ抜けと三すくみを追加`

---

### Task 7: 先行入力とキャンセル

**Files:** Modify `types.ts`, `fighter.ts`, `params.json`, `lin.json`, `gonzo.json` / Test: `tests/cancel.test.ts`（新規）

**Interfaces:**
- Consumes: Task 2 の必殺の入力
- Produces:
  - `Params.inputBuffer`（6）
  - `Fighter.buffer: { button: 'special' | 'grab' | 'kick' | 'punch'; down: boolean; forward: boolean; age: number } | null` — 攻撃ボタンが押されたフレームに、優先順位の一番高いボタンと、そのフレームの方向（前は向きに対して）で作る。毎フレーム `age` を1増やし、`inputBuffer` を超えたら消す。技を出したら消す
  - 自由に動ける状態の攻撃は、そのフレームに押したボタンではなく `buffer` から出す（押したフレームは `age` 0 なので今までどおり出る）
  - 通常技4種（`punch`・`kick`・`crouchPunch`・`crouchKick`）の JSON に `cancelInto: ['special']`。技中に、その技の当たりのどれかが当たった（ガードされた）あと、`buffer` に必殺があれば、その場で必殺技を1F目から出す（空振りではキャンセルできない）

- [ ] **Step 1: 失敗するテストを書く** — `tests/cancel.test.ts`：
  - `のけぞり中に押した攻撃は、6F 以内なら動けるようになった最初のフレームに出る。7F 以上前なら出ない`
  - `ジャブがヒットしたあと、硬直中に →＋必殺を押すと、その場で突進掌が出る`
  - `ガードされた時もキャンセルできる`
  - `空振りしたジャブは、必殺を押してもキャンセルされない`（Review Focus 2）
  - `必殺技から必殺技へはキャンセルできない`
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**。既存テストで、押したボタンが後のフレームに出てしまうようになったものがあれば、テストの意図を変えずに入力を直す
- [ ] **Step 4: 全体を通す** → PASS
- [ ] **Step 5: Commit** — `feat: 先行入力（6F）と、通常技から必殺技へのキャンセルを追加`

---

### Task 8: 連続技の補正・削り・コンボの記録

**Files:** Modify `types.ts`, `battle.ts`, `fighter.ts`, `params.json` / Test: `tests/combo.test.ts`（新規）

**Interfaces:**
- Consumes: Task 7 のキャンセル、Task 3 の多段
- Produces:
  - `Params` に `comboDamageRate`（0.8）、`chipRate`（0.2）
  - `Fighter.combo: { moves: number; hits: number }`（受けている連続技。当たったら `hits` を1増やし、攻撃側の今の技で最初に当たった当たりなら `moves` も1増やす。守る側が自由に動ける状態になったら 0 に戻す）
  - ヒットのダメージ：`moves` が2以上（増やしたあと）なら `floor(ダメージ × comboDamageRate)`。同じ技の多段同士は `moves` が増えないので補正しない
  - ガードの削り：技の `kind` が `special` なら `floor(ダメージ × chipRate)` を減らし、体力1で止める。通常技は削りなし

- [ ] **Step 1: 失敗するテストを書く** — `tests/combo.test.ts`：
  - `ジャブ→突進掌のキャンセルで 30＋56＝86 減る`（09 の例）
  - `連拳の5発は補正されず合計 90`
  - `突進掌をガードさせると 14（70 の 20%）減る`
  - `体力1の相手に必殺技をガードさせても1のまま`（Review Focus 3）
  - `通常技をガードさせても減らない`
  - `相手が動けるようになったら、次の当たりは補正なし`
- [ ] **Step 2: 失敗を確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 全体を通す** → PASS
- [ ] **Step 5: Commit** — `feat: 連続技の補正と必殺技の削りを追加`

---

### Task 9: 表示・技表の確認・申し送り

**Files:** Modify `src/render/render.ts`, `tests/data.test.ts`, `docs/open-questions.md`

- [ ] **Step 1: 技表のテストをまとめる** — `tests/data.test.ts` の 03 との突き合わせ表に、必殺技6種・掴み2種・反撃パンチを入れ、両キャラの全17技（通常6＋必殺3＋掴み1＋反撃パンチ）が表どおりかを1つのテストで確かめる（`hits` が複数の連拳は、当たりの数・合計ダメージ・各当たりの重さで比べる）
- [ ] **Step 2: 描画を足す** — 守る側の `combo.hits` が2以上の間、攻撃側の体力バーの下に `N HIT` を出す（05）。`throwing`・`thrown` の間は、投げられる側を少し持ち上げて描く（仮の見た目でよい）。`armor` の間は、ゴンゾーの体に白い縁取り
- [ ] **Step 3: 申し送りを整理する** — `docs/open-questions.md` の「M3b・M3c で扱うこと」から済んだ項目（空中の判定、掴めない状態、1発ごとの当たり、無敵の仕組み、アーマーと相打ち、ノックバック後の位置）を消し、超必殺だけ M3c として残す
- [ ] **Step 4: 全体を通す** — `npm test && npm run build` → PASS
- [ ] **Step 5: Commit** — `feat: コンボ数・投げ・アーマーの表示を追加し、技表を確認する`
- [ ] **Step 6: 確かめる（コントローラーが行う）** — ブラウザが使えれば遊んで確かめる。使えなければユーザーに遊んでもらう（掴み・投げ抜け・必殺技6種・キャンセル・コンボ数）
