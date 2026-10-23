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
