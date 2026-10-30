# 素材台帳（CREDITS）

使った素材は全部ここに書く（`docs/07_assets.md` の素材台帳の書式に合わせる）。

## 効果音・BGM

- すべてコード内で合成している（Web Audio API の発振器・ノイズ・エンベロープ）。音声ファイルは使っていない。
- 外部素材のライセンス表記は不要。

## 画像

- キャラ画像（全ポーズ・立ち絵・カットイン）・ステージ背景・タイトルロゴは、作者が ChatGPT（OpenAI）の画像生成で作成した。
- `tools/clean_sprites.py` で背景・切れ端の除去、大きさと足元の位置合わせをしている。蹴りの足先など、一部は手作業で描き足している。
- OpenAI の利用規約では、生成した画像の権利は利用者に帰属し、クレジット表記は求められていない。

| ファイル | 種別 | 出典 | 加工 | 作成日 |
|---|---|---|---|---|
| `characters/lin/*`, `characters/gonzo/*` | キャラ画像 | ChatGPT（OpenAI） | 背景除去・位置合わせ・一部描き足し | 2026-10-30 |
| `stages/stage_chinatown.jpg`, `stages/stage_ring.jpg` | ステージ背景 | ChatGPT（OpenAI） | サイズ調整 | 2026-10-30 |
| `ui/title_logo.png` | タイトルロゴ | ChatGPT（OpenAI） | 背景除去 | 2026-10-30 |
