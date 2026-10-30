# 10 AI 画像でキャラを作る指示書

あなたが AI 画像ツールでキャラと背景を作るための手順書。上から順に進めればよい。
細かい決まりの元は `07_assets.md`（サイズ・ファイル名・置き場所）。この文書はそれを「作業の順番」に並べ直したもの。

作り終えて決まった場所に置けば、ゲームへの組み込みは Claude がやる。

---

## 0. 始める前に（5分）

- [ ] **使うツールの規約を確認する**：「生成した画像をゲームに使い、ネットで公開してよいか」。だめなら別のツールにする
- [ ] **キャラの見た目を決める**：下の「キャラの部分」は仮の案。変えたい所（髪型・服・色・表情）があれば、その英文を書き換えてから始める
  - リン（仮）：小柄なカンフー少女。黒髪のお団子2つ、赤いチャイナ服、黒いカンフーパンツ
  - ゴンゾー（仮）：巨漢プロレスラー。黒いモヒカン、口ひげ、黒いパンツ、黄色いブーツ
  - 2人を並べた時に「赤 対 黒と黄」で見分けやすいように選んである
- [ ] **左右で形が違う模様を避ける**：片側だけのロゴや文字は入れない（左向きは画像を反転して作るため）

## 1. 毎回使うプロンプト

英語のほうが安定するので英語で書く。**4つの部分のうち、変えるのは「ポーズの部分」だけ**。他の3つは一字一句同じにする（絵柄がそろう一番のコツ）。

### 絵柄の部分（全部共通）

```
chibi, super deformed, 2.5 heads tall, anime style, thick bold black outlines, flat cel shading, vivid colors
```

### キャラの部分

リン：

```
a small energetic kung fu girl, black hair in two round buns, big eyes, red sleeveless Chinese-style top with gold trim, black kung fu pants, black cloth shoes, white wrist wraps, confident smile
```

ゴンゾー：

```
a huge muscular professional wrestler, very broad chest and thick arms, black mohawk, thick eyebrows, mustache, black wrestling trunks, yellow wrestling boots, white tape on wrists, big cheerful grin
```

### 共通の指定（全部共通）

```
full body, side view, facing right, 2D fighting game character sprite, plain white background, no shadow, no text, single character, centered
```

### つなげ方

`絵柄の部分, キャラの部分, ポーズの部分, 共通の指定` の順に、カンマでつないで1つのプロンプトにする。

例（リンの待機）：

```
chibi, super deformed, 2.5 heads tall, anime style, thick bold black outlines, flat cel shading, vivid colors, a small energetic kung fu girl, black hair in two round buns, big eyes, red sleeveless Chinese-style top with gold trim, black kung fu pants, black cloth shoes, white wrist wraps, confident smile, kung fu fighting stance, bouncing lightly, full body, side view, facing right, 2D fighting game character sprite, plain white background, no shadow, no text, single character, centered
```

ツールに「シード値の固定」や「参照画像（キャラの一貫性）」の機能があれば、必ず使う。

## 2. 作る順番（1キャラずつ）

1. [ ] **キャラ設定シート**（1枚）：ポーズの部分を `character reference sheet, front view, side view facing right, back view, same character three times` にし、共通の指定の `side view, facing right` と `single character, centered` は外す。一番気に入った1枚を「設定シート」として保存する
2. [ ] **待機（idle）**：設定シートを参照画像にして作る。これが全ポーズの基準になる
3. [ ] **残りの20ポーズ**：設定シートと待機を毎回参照画像にして、下の表の「ポーズの部分」だけ入れ替えて作る
4. [ ] **カットイン用の顔（cutin）と立ち絵（portrait）**：共通の指定の `side view` を外して作る
5. [ ] **並べて見比べる**：全部を横に並べ、顔・服の色・体の大きさが揃っているか見る。明らかにずれたものだけ作り直す（多少の崩れは、ゲームでは小さく表示されるので目立たない）

1回で揃わなくて当たり前。何枚か出して、一番揃っている1枚を選ぶ。

### ポーズの部分（表のポーズ名がそのままファイル名になる）

| ポーズ名 | リン | ゴンゾー |
|---|---|---|
| idle | kung fu fighting stance, bouncing lightly | wrestling stance, arms wide, slightly crouched |
| walk | walking forward in fighting stance | heavy step forward, arms wide |
| jump | jumping, knees tucked | jumping, arms raised |
| crouch | crouching low, guard up | crouching, hands on knees |
| guard | blocking with both forearms in front of face | blocking with crossed arms |
| punch | quick straight jab | overhead karate chop |
| kick | spinning high kick, leg extended forward | big boot, front kick with leg straight forward |
| crouch_punch | low palm strike while crouching | headbutt uppercut rising from crouch |
| crouch_kick | low sweep kick on the ground | low kick sweep |
| air_punch | mid-air palm strike straight forward | mid-air chop swinging downward |
| air_kick | mid-air flying kick angled downward | mid-air dropkick with both feet |
| grab | leaping forward with arms reaching out | reaching forward with both hands to grab |
| throw | standing on top, dropping an elbow downward | lifting arms overhead as if body slamming |
| special_n | rapid punches, many fists | flexing muscles, bodybuilder pose |
| special_f | dashing forward with palm thrust | charging forward with arm out for a lariat |
| special_d | rising flying kick upward | hip drop, falling butt first |
| super | rushing forward, flurry of punches | spinning around with arms out, giant swing |
| hit | hurt reaction, leaning back, eyes shut | hurt reaction, leaning back, mouth open |
| down | knocked down lying on back, dizzy | knocked down lying on back, dizzy |
| win | victory pose, peace sign, winking | victory pose, flexing both arms, laughing |
| cutin | close-up of face, intense determined expression, upper body | close-up of face, intense shouting expression, upper body |
| portrait | standing pose, full body, facing slightly right | standing pose, full body, facing slightly right |

- 投げ・超必殺でも、**画像には自分だけ**を描く（相手はコードで動かす）。相手まで描かれたら、その部分は消す

## 3. 背景を消して、サイズを揃える

1. [ ] **背景を透明にする**：白い背景を消して、背景透過の PNG にする（ツールに透過の機能がなければ、背景除去ツールを使う）。影も消す
2. [ ] **キャンバスに置く**：横640×縦640 の透明なキャンバスに置く
   - **足元（両足の間の真ん中）を、左右の真ん中・下から 40px（x=320, y=600）に合わせる**。全ポーズで同じ位置。ずれると、技を出すたびにキャラが跳ねて見える
   - **体の大きさ**：待機の時の身長が、リンは約 260px、ゴンゾーは約 340px。全ポーズで同じ縮尺（ポーズごとに拡大・縮小しない）
   - ジャンプ・空中技も、足が地面に立っていた時と同じ位置に来るように置く（高さはゲームが動かす）
   - ダウンは、寝た体の真ん中を x=320、体の下の端を y=600 に合わせる
   - 手足がはみ出すなら、全ポーズのキャンバスを同じだけ広げる（1枚だけ大きさを変えない）
3. [ ] **カットインと立ち絵は大きさが別**：カットイン（cutin）は 720×360、立ち絵（portrait）は 480×720。どちらも背景透過

## 4. ステージ背景（2枚）とタイトルロゴ

- [ ] 背景はキャラの部分の代わりに場所を書き、絵柄の部分に `background art, no characters, wide horizontal panorama` を足す。共通の指定は使わない
  - 中華街：`a lively chinatown street, red lanterns, chinese gate, stone pavement, daytime`
  - プロレスのリング：`a professional wrestling ring with ropes and corner posts, crowd and spotlights in the background`
- [ ] 横1920×縦720 にして JPG で保存。床（キャラが立つ高さ）は**下から約100px**。2枚とも同じ高さにする。キャラが立つ辺りは色や模様を控えめに
- [ ] タイトルロゴ（任意）：横960×縦360、背景透過 PNG。ゲーム名が決まっていなければ後回しでよい

## 5. 置き場所とファイル名

ファイル名は英小文字・数字・アンダーバーだけ。

**`assets/` の中身はすべて、公開したゲームの一部としてそのまま公開される。** キャラ設定シート・下書き・プロンプトのメモなど、公開したくないものは `assets/` の外（例：`fighting-game/art-work/`）に置く。

```
fighting-game/characters/
  lin/     lin_idle.png, lin_walk.png, … lin_cutin.png, lin_portrait.png（22枚）
  gonzo/   gonzo_idle.png, … gonzo_portrait.png（22枚）
fighting-game/assets/images/
  stages/  stage_chinatown.jpg, stage_ring.jpg
  ui/      title_logo.png（あれば）
```

- キャラ画像は `fighting-game/characters/` に置く（`assets/images/characters` はこのフォルダを指すリンク。ゲームはここから読む）

- [ ] 置いたら Claude に「画像を置いた」と伝える。足りない画像があっても、ある分から組み込み、無い分は今の四角で代わりに描く
- [ ] 使ったツールの名前と、規約で求められているクレジット表記があれば一緒に伝える（`assets/CREDITS.md` に書く）

## 6. 全部作れない時の優先順

時間がなければ、この順に作ると効果が大きい。

1. 両キャラの **idle・walk・punch・kick・hit・down**（6枚 × 2人）：これだけで対戦中の見た目がほぼ変わる
2. **guard・crouch・jump・win・portrait**
3. 必殺・掴み・空中技など残り
4. ステージ背景、カットイン、ロゴ
