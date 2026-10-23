# 07 素材（画像・音）

ゲームで使う画像・効果音・BGM の一覧と、作り方・入手先・置き場所。
キャラの技とポーズは `02_characters.md`、演出は `05_screens.md`、画面サイズ（1280×720）は `04_system.md` を参照。

## 基本方針

- キャラ画像・立ち絵・カットイン顔・ステージ背景・タイトルロゴは AI 画像生成で作る
- 火花・擬音文字・効果線・残像・影・HUD（体力バーなど）はコードで描くので画像は作らない
- 効果音・BGM は無料素材を使う（入手先とライセンスは後述）
- 2P の色違い・左向きは画像を増やさず、コードで作る（色味フィルタ・左右反転）

## 画像一覧

### キャラのポーズ画像（1キャラ22枚）

`02_characters.md` の「画像（ポーズ）」の一覧と同じもの。ファイル名は `キャラ名_ポーズ名.png`（例 `lin_idle.png`、`gonzo_idle.png`）。

| 分類 | ポーズ | ポーズ名（ファイル名に使う） |
|---|---|---|
| 基本 | 待機 | idle |
| 基本 | 歩き | walk |
| 基本 | ジャンプ | jump |
| 基本 | しゃがみ | crouch |
| 基本 | ガード（しゃがみ中も共通） | guard |
| 通常技 | パンチ | punch |
| 通常技 | キック | kick |
| 通常技 | しゃがみパンチ | crouch_punch |
| 通常技 | しゃがみキック | crouch_kick |
| 通常技 | 空中パンチ | air_punch |
| 通常技 | 空中キック | air_kick |
| 掴み | 掴み（掴みに行く） | grab |
| 掴み | 投げ（投げている最中） | throw |
| 必殺 | 必殺（ニュートラル） | special_n |
| 必殺 | →＋必殺 | special_f |
| 必殺 | ↓＋必殺 | special_d |
| 必殺 | 超必殺 | super |
| 食らい | 被弾 | hit |
| 食らい | ダウン | down |
| 演出 | 勝利ポーズ | win |
| 演出 | 超必殺のカットイン用の顔アップ | cutin |
| 演出 | キャラ選択・結果画面用の立ち絵 | portrait |

- キャラ名はファイル名用の英小文字（リン＝`lin`、ゴンゾー＝`gonzo`）。正式名が決まってもファイル名は変えなくてよい
- 歩きは1枚。足の動きはコードの上下の揺れで見せる

### サイズの目安

| 画像 | サイズ | 形式 | メモ |
|---|---|---|---|
| ポーズ画像（待機〜勝利の20枚） | 640×640px | 背景透過 PNG | 全ポーズ同じキャンバスサイズにする。足元の基準位置は下記 |
| カットイン顔（cutin） | 720×360px | 背景透過 PNG | 横長。帯や背景の色はコードで描く |
| 立ち絵（portrait） | 480×720px | 背景透過 PNG | キャラ選択・結果画面で使う。全身か膝上 |
| ステージ背景（2枚） | 1920×720px | JPG（または WebP） | 透過不要なので軽い形式にする |
| タイトルロゴ | 960×360px | 背景透過 PNG | |

- ポーズ画像の中でのキャラの大きさ（待機時の身長）の目安：リン 約260px、ゴンゾー 約340px。画面の高さ 720px に対して小さすぎない大きさ
- 足元の基準位置：キャンバスの横の中央・下から 40px（640×640 なら x=320, y=600）に、立っている時の足元（両足の間の中心）を合わせる
  - ジャンプ・空中技も、地上に立っていた時と同じ位置に足が来るように置く（高さはコードで動かす）
  - ダウンは寝転んだ体の中央を x=320、体の下端を y=600 に合わせる
- 同じキャラの全ポーズは同じ縮尺にする（ポーズごとに拡大縮小しない）
- キックなどで手足がキャンバスからはみ出す場合は、全ポーズ共通でキャンバスを広げる（1枚だけサイズを変えない）

### ステージ背景（2枚）

| ファイル名 | ステージ | 内容 |
|---|---|---|
| `stage_chinatown.jpg` | リン：中華街 | 赤い提灯、中華風の門や看板、石畳の道 |
| `stage_ring.jpg` | ゴンゾー：プロレスのリング | リングのマット・ロープ・コーナーポスト、奥に観客席とスポットライト |

- 横幅は画面幅の1.5倍（1920px）。カメラが横に動くので、左右の端まで絵を描き切る
- 床（キャラが立つ高さ）は2ステージで揃える。目安は画面の下から約100px（y=620 付近）
- キャラが見えにくくならないよう、キャラが立つ高さの周りは色や模様を控えめにする
- 絵柄はキャラと揃える（同じ絵柄の言葉をプロンプトに入れる）

### タイトルロゴ

| ファイル名 | 内容 |
|---|---|
| `title_logo.png` | ゲーム名のロゴ。ゲーム名が未定の間は仮ロゴでよい |

- AI 画像生成は文字が崩れやすいので、文字部分はフォントで作るか手で直す前提にする

### 画像を作らないもの（コードで描く）

| もの | 画像 | 理由・メモ |
|---|---|---|
| ヒット火花・ガード火花・相打ちの火花 | 不要 | コードで図形を描く。ヒットとガードは色を変える |
| 擬音文字（「ドカッ」「バキッ」「カキーン」「パシッ」など） | 不要 | フォントで文字を描き、縁取り・傾き・拡大の動きはコードで付ける |
| 効果線・残像・伸び縮み・揺れ | 不要 | コードの演出 |
| 影（足元の楕円） | 不要 | コードで描く |
| 体力バー・タイマー・ゲージ・ラウンド勝利数の●○ | 不要 | コードで描く |
| 「ROUND 1」「FIGHT!」「K.O.」「TIME UP」「DRAW」「1P WIN」などの文字 | 不要 | フォントで描く |
| 2P の色違い | 不要 | 色味フィルタ（`04_system.md`） |
| 左向きの画像 | 不要 | 右向きの画像を左右反転 |
| 超必殺の暗転 | 不要 | 画面を暗くするのはコード |

- 文字をフォントで描くので、使う日本語フォント（擬音文字用・メニュー用）を決める必要がある（`open-questions.md`）

### 画像の枚数

| 種類 | 枚数 |
|---|---|
| リンのポーズ・カットイン・立ち絵 | 22 |
| ゴンゾーのポーズ・カットイン・立ち絵 | 22 |
| ステージ背景 | 2 |
| タイトルロゴ | 1 |
| 合計 | 47 |

キャラを1体追加するごとに、ポーズ等22枚＋ステージ1枚が増える。

## AI 画像生成で絵柄を揃える手順

### 絵柄

- 決定：**2〜3頭身のデフォルメ・アニメ調・太い輪郭線**
  - コミカルさが出しやすい
  - 太い輪郭線は小さく表示しても見やすく、背景の上でもキャラが埋もれにくい
  - 頭身が低いと手足の形が崩れにくく、枚数を揃えやすい

### 進め方

1. **キャラ設定シートを先に作る**：1キャラにつき、正面・横（右向き）・後ろの3方向が並んだ全身図を1枚作る。髪型・服・色が決まったら、使う色（髪・肌・服など）をメモしておく
2. **待機ポーズを作る**：設定シートを参照画像にして、まず待機（idle）を作る。これを全ポーズの基準にする
3. **残りのポーズを作る**：設定シートと待機画像を参照画像にして、プロンプトの「ポーズの部分」だけ入れ替えて作る
4. **背景を消す**：背景透過 PNG にする。生成ツールが透過に対応していない場合は、無地の背景（白や緑の単色）で作ってから背景除去ツールで消す
5. **キャンバスに置く**：640×640 のキャンバスに、同じ縮尺・足元の基準位置を揃えて置く
6. **並べて確認する**：全ポーズを横に並べて、顔・服・色・大きさが揃っているか見る。ずれたものは作り直すか手で直す
7. **当たり判定を合わせる**：画像ができてから、技ごとの当たり判定の大きさを決める（`open-questions.md`）

### 同じキャラを揃えるコツ

- **参照画像を毎回付ける**：キャラ設定シート（と待機画像）を毎回参照画像として渡す
- **プロンプトの骨格を使い回す**：「絵柄の部分」「キャラの部分」は一字一句同じにして、「ポーズの部分」だけ変える。ツールにシード値の固定があれば使う
- **右向きで統一する**：全ポーズを右向き（体と顔が画面の右を向く）で作る。左向きはコードで左右反転する
  - 反転しても違和感がないよう、服の片側だけのロゴや文字など、左右非対称な模様は避ける
- **足元の基準位置を揃える**：全ポーズで足元を同じ位置に置く（上記「サイズの目安」）。ずれると歩きや技の切り替えでキャラが跳ねて見える
- **背景透過 PNG にする**：影も付けない（影はコードで描く）
- **2P の色違いは作らない**：コードの色味フィルタで作るので不要
- **1回で揃えようとしない**：何枚か作って一番揃っているものを選ぶ。手や顔の細かい崩れは、小さく表示すると目立ちにくいので、まず並べて動かしてみてから直すか決める

### プロンプトのひな形

生成ツールは英語のプロンプトの方が安定しやすいので、英語で書く。`[ ]` の部分を入れ替える。

```
[絵柄の部分]
chibi, super deformed, 2.5 heads tall, anime style, thick bold black outlines,
flat cel shading, vivid colors

[キャラの部分]
（キャラごとに下の文を入れる）

[ポーズの部分]
（ポーズごとに下の文を入れる）

[共通の指定]
full body, side view, facing right, 2D fighting game character sprite,
plain white background, no shadow, no text, single character, centered
```

#### リン（仮）のキャラの部分

```
a small energetic kung fu girl, black hair in two round buns, big eyes,
red sleeveless Chinese-style top with gold trim, black kung fu pants,
black cloth shoes, white wrist wraps, confident smile
```

#### ゴンゾー（仮）のキャラの部分

```
a huge muscular professional wrestler, very broad chest and thick arms,
black mohawk, thick eyebrows, mustache, black wrestling trunks,
yellow wrestling boots, white tape on wrists, big cheerful grin
```

- 見た目は仮決め：リンはお団子2つ・赤いチャイナ服、ゴンゾーはモヒカン・黒いパンツ・黄色いブーツ（赤と黒/黄で対比を出す）。設定シートを作る時に変えてよく、変えたらこの文も合わせて直す
- AI 画像はユーザーがすでに使っているツールで作る。使う前に「生成画像をゲームに使って公開してよいか」をそのツールの規約で確認する

#### ポーズの部分（例）

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
| throw | standing on opponent's shoulders, dropping an elbow | lifting someone overhead for a body slam |
| special_n | rapid punches, many fists | flexing muscles, bodybuilder pose |
| special_f | dashing forward with palm thrust | charging forward with arm out for a lariat |
| special_d | rising flying kick upward | hip drop, falling butt first |
| super | rushing forward, flurry of punches | spinning around holding someone's legs, giant swing |
| hit | hurt reaction, leaning back, eyes shut | hurt reaction, leaning back, mouth open |
| down | knocked down lying on back, dizzy | knocked down lying on back, dizzy |
| win | victory pose, peace sign, winking | victory pose, flexing both arms, laughing |
| cutin | close-up of face, intense determined expression, upper body | close-up of face, intense shouting expression, upper body |
| portrait | standing pose, full body, facing slightly right | standing pose, full body, facing slightly right |

- 投げ・超必殺など相手が絡むポーズも、画像には自分だけを描く（相手の位置はコードで動かす）。プロンプトに相手の言葉を入れて相手まで描かれたら、相手の部分を消す
- cutin と portrait は「側面・右向き」でなくてよいので、共通の指定の `side view` を外す
- ステージ背景は、絵柄の部分に `background art, no characters, wide horizontal panorama` などを足し、キャラの部分の代わりに場所の説明を入れる

## 効果音一覧

ファイル名は `se_内容.mp3`。技ごとの音は、似た音で足りるものは共通の音を使い回す。

### 対戦中の演出（`05_screens.md` の演出表に対応）

| 場面 | ファイル名 | 音のイメージ | メモ |
|---|---|---|---|
| ラウンド開始 | `se_round.mp3`、`se_fight.mp3` | 「ROUND 1」「FIGHT!」のコール | 声にするかは未決（下記「ラウンドコール」） |
| ヒット（軽） | `se_hit_light.mp3` | 軽い「パシッ」 | 技の重さ（軽・中・重）で鳴らし分ける |
| ヒット（中） | `se_hit_medium.mp3` | 「バシッ」 | |
| ヒット（重） | `se_hit_heavy.mp3` | 重い「ドカッ」 | 画面が揺れる技 |
| ガード | `se_guard.mp3` | 「ガッ」「カッ」 | ヒットより硬く短い音 |
| 相打ち | `se_clash.mp3` | 金属的な「カキーン」 | |
| 掴み成立 | `se_grab.mp3` | 「ガシッ」 | |
| 投げ（叩きつけ） | `se_throw.mp3` | 「ドスン」 | |
| 投げ抜け | `se_throw_break.mp3` | 「パシッ」（弾く音） | |
| 超必殺（暗転） | `se_super_start.mp3` | 「キュイーン」「シャキーン」 | 暗転＋カットインの間に鳴らす |
| KO | `se_ko.mp3` | 重い一撃＋「K.O.」 | スローに合わせる |
| 時間切れ | `se_timeup.mp3` | ブザー | |
| 引き分けラウンド | `se_draw.mp3` | 間の抜けた音 | |
| 決着 | `se_win.mp3` | 勝利のジングル（短い曲） | 結果画面へ進む前 |

### キャラの動き・技

| 場面 | ファイル名 | 音のイメージ | メモ |
|---|---|---|---|
| 空振り（軽） | `se_swing_light.mp3` | 「ヒュッ」 | 軽・中の技 |
| 空振り（重） | `se_swing_heavy.mp3` | 「ブンッ」 | 重の技 |
| ジャンプ | `se_jump.mp3` | 軽い「ピョン」 | なくてもよい |
| 着地 | `se_land.mp3` | 「トッ」 | なくてもよい |
| ダウン | `se_down.mp3` | 倒れる「ドサッ」 | |
| 突進（突進掌・ラリアット突進・百裂連拳フィナーレ） | `se_dash.mp3` | 「シュッ」「ダダッ」 | |
| 昇り蹴り | `se_rising_kick.mp3` | 上昇する「シュワッ」 | |
| マッスルポーズ | `se_muscle.mp3` | 「キラーン」「ムキッ」 | コミカルに |
| アーマーで耐えた | `se_armor.mp3` | 鈍い「ボヨン」 | マッスルポーズ・ラリアット突進共通 |
| ヒップドロップの衝撃波 | `se_shockwave.mp3` | 「ズドーン」 | |
| ジャイアントスイングの回転 | `se_spin.mp3` | 「ブンブン」 | 回している間くり返す |
| ゲージ満タン | `se_gauge_full.mp3` | 「キラン」 | |

- 連拳・百裂連拳フィナーレの乱打は、ヒット音（軽）を短い間隔で鳴らす。新しい音は作らない

### メニュー操作

| 場面 | ファイル名 | 音のイメージ |
|---|---|---|
| カーソル移動 | `se_cursor.mp3` | 短い「ピッ」 |
| 決定 | `se_decide.mp3` | 「ピロン」 |
| 取り消し・戻る | `se_cancel.mp3` | 低い「ポッ」 |
| PRESS START | `se_start.mp3` | 決定より派手な音 |
| キャラ決定 | `se_select.mp3` | 「ジャーン」 |
| ポーズ開く・閉じる | `se_pause.mp3` | 短い音 |

### ラウンドコール

| ファイル名 | 内容 |
|---|---|
| `se_round1.mp3` 〜 `se_round5.mp3` | 「ROUND 1」〜「ROUND 5」（最大5ラウンド） |
| `se_fight.mp3` | 「FIGHT!」 |
| `se_ko.mp3` | 「K.O.」 |
| `se_timeup.mp3` | 「TIME UP」 |
| `se_draw.mp3` | 「DRAW」 |

- 推奨：声の素材が見つかれば声にする。見つからなければ、ジングル（短い効果音）で代用して文字表示で伝える
- キャラの掛け声（「ハッ」「オリャ」など）は最初は入れない

## BGM 一覧

ファイル名は `bgm_内容.mp3`。どれもくり返し再生（ループ）する。

| 画面 | ファイル名 | 曲のイメージ | メモ |
|---|---|---|---|
| タイトル（モード選択・難易度選択も同じ曲） | `bgm_title.mp3` | 明るく元気、コミカル | |
| キャラ選択 | `bgm_select.mp3` | わくわくする、テンポ速め | |
| 中華街ステージ（リン） | `bgm_stage_chinatown.mp3` | 中華風のアップテンポ | |
| リングステージ（ゴンゾー） | `bgm_stage_ring.mp3` | ロック調・プロレスの入場曲風 | |
| 結果画面 | `bgm_result.mp3` | 落ち着いた短いループ | 勝利のジングル（`se_win.mp3`）の後に流す |

- ループのつなぎ目で音が途切れないものを選ぶ（ループ用に作られた素材だと楽）
- ポーズ中は BGM の音量を下げる
- ブラウザは最初に何かキーを押すまで音を鳴らせないので、BGM はタイトル画面で最初のキー入力があってから流す
- 形式は mp3（対応ブラウザ4つ全部で再生できる）

## 素材の入手先候補

以下は候補。利用規約は変わることがあるので、内容はここでは断定せず、**使う前に必ず各サイトの最新の規約を確認する**。

| 種類 | 候補 |
|---|---|
| 効果音 | 効果音ラボ、OtoLogic、ポケットサウンド、魔王魂（効果音もある） |
| BGM | 魔王魂、DOVA-SYNDROME |
| ラウンドコールの声 | 上の効果音サイトで「ボイス」「掛け声」を探す |
| フォント（擬音文字・メニュー） | Google Fonts の日本語フォント（例：Dela Gothic One など太いもの） |
| 画像 | AI 画像生成（使う生成ツールの規約も確認する） |

### ライセンスで確認すること

素材ごとに次の点を確認し、下の「素材台帳」に書く。

| 確認すること | 内容 |
|---|---|
| クレジット表記 | 表記が必要か。必要ならどこに・どう書くか（サイト名・作者名・URL など） |
| 改変してよいか | 音量の調整、切り詰め、ループ加工、形式の変換（wav→mp3 など）をしてよいか |
| Web で公開してよいか | ブラウザゲームに組み込んで、誰でも遊べる URL で公開してよいか |
| 再配布にあたらないか | GitHub の公開リポジトリに素材ファイルを置くと、ファイルを誰でも取り出せる。これが禁止されている「素材の再配布」にあたらないか |
| 無料で使える範囲 | 個人・非商用・無料公開で使えるか。利用報告などの条件があるか |
| AI 生成画像の扱い | 生成ツールの規約で、生成した画像をゲームに使って公開してよいか |

- 確認した日付も残す（規約が後から変わった時に見直せるように）
- 規約がはっきりしない素材は使わない

## 素材の置き場所

```
assets/
  images/
    characters/
      lin/          lin_idle.png 〜 lin_portrait.png（22枚）
      gonzo/        gonzo_idle.png 〜 gonzo_portrait.png（22枚）
    stages/         stage_chinatown.jpg, stage_ring.jpg
    ui/             title_logo.png
  audio/
    se/             se_hit_light.mp3 など
    bgm/            bgm_title.mp3 など
  fonts/            使うフォントのファイル（自前で置く場合）
  CREDITS.md        素材台帳とクレジット表記
```

- キャラを追加する時は `assets/images/characters/キャラ名/` を1つ足し、同じポーズ名で22枚置く
- ステージを追加する時は `stage_場所.jpg` を `stages/` に足す
- ファイル名は英小文字・数字・アンダーバー（`_`）だけにする（日本語やスペースは使わない）
- 生成に使ったプロンプトとキャラ設定シートは、作り直す時のために残しておく（置き場所は `assets/` の外でもよい）

## クレジット表記の方針

- 素材台帳を `assets/CREDITS.md` に作り、使った素材を全部書く

| ファイル名 | 種類 | 入手先（サイト名・作者） | URL | クレジット表記 | 改変 | 確認日 |
|---|---|---|---|---|---|---|
| （例）`se_hit_light.mp3` | 効果音 | （サイト名） | （素材ページの URL） | 要 / 不要 | 音量調整 など | 2026-10-23 |

- 表記が不要な素材も、どこから持ってきたかは台帳に書く
- 公開ページ（リポジトリの README）に「素材提供」として、表記が必要なものをまとめて書く
- 規約でゲーム内への表記が求められている素材がある場合は、タイトル画面の下部などに小さく表記する（ゲーム内に表記を入れるかは未決。`open-questions.md`）
- AI 画像生成で作った画像は、使った生成ツール名を台帳に書く
