# FIGHT GAME（仮）

ブラウザで遊ぶ、カジュアル・コミカルな2D格闘ゲーム。1台のキーボードで2人対戦、または CPU 戦（やさしい・ふつう・つよい）。

キャラはカンフー少女のリン（スピード型）と巨漢プロレスラーのゴンゾー（パワー型）。名前・見た目はすべて仮。

## 遊び方

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173/ を開き、画面を一度クリックする。

| 操作 | 1P | 2P |
|---|---|---|
| 移動・ジャンプ・しゃがみ | W A S D | 矢印キー |
| パンチ | F | テンキー4 または J |
| キック | G | テンキー5 または K |
| 掴み | H | テンキー6 または L |
| 必殺 | V | テンキー1 または M |
| ガード | B | テンキー2 または ,（カンマ） |
| ポーズ | Esc | Esc |

- 必殺技：必殺／→＋必殺／↓＋必殺の3種
- 超必殺：ゲージが満タンの時に 必殺＋ガード を同時押し
- しゃがみ中・ジャンプ中のパンチ・キックはそれぞれ別の技
- 通常技が当たる（ガードされる）と、必殺技でキャンセルできる

技表は `docs/03_moves.md`、ルールは `docs/04_system.md`。

## キャラの画像を差し替える

今はコードで描いた仮のキャラで表示している。AI 画像で作る手順は `docs/10_ai_image_instructions.md`。`characters/<lin|gonzo>/` に決まった名前の PNG を置くと（`assets/images/characters` はこのフォルダへのリンク）、その画像で表示される（無い画像は仮のキャラのまま）。

`assets/` と `characters/` の中身はすべて公開される。下書きや設定シートは `art-work/`（git の管理外）に置く。

## 開発

```bash
npm test        # 自動テスト
npm run build   # 公開用のファイルを dist/ に作る
```

仕様書は `docs/01〜10`、未決事項は `docs/open-questions.md`、実装計画は `docs/superpowers/plans/`。

## 公開（無料ホスティング）

`npm run build` でできる `dist/` をそのまま置けば動く（相対パスで出力している）。

- **Cloudflare Pages**：リポジトリを GitHub に置き、Cloudflare Pages で連携。ビルドコマンド `npm run build`、出力ディレクトリ `dist`
- **GitHub Pages**：リポジトリの Settings → Pages で GitHub Actions を選び、Vite の公式手順のワークフローで `dist` を公開する

効果音・BGM はコードで合成しているので、音の素材のライセンス表記は不要。画像を入れたら、使った AI ツールの規約に従って `assets/CREDITS.md` に書く。
