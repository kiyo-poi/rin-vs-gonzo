import type { InputFrame } from '../logic/types';

/** シーンが1フレームに受け取る入力 */
export interface FrameInput {
  players: [InputFrame, InputFrame];
  /** ポーズのキー（Esc）を押した瞬間か。どちらのプレイヤーが押しても同じ */
  pause: boolean;
}

/** シーン（08_architecture.md 2.2）。更新・描画・入る・出るの4つを持つ */
export interface Scene {
  update(input: FrameInput): void;
  draw(ctx: CanvasRenderingContext2D): void;
  enter?(): void;
  exit?(): void;
  /** ブラウザのウィンドウからフォーカスが外れた時（対戦なら自動ポーズ） */
  onBlur?(): void;
}

/** フェードの片道のフレーム数（暗くなる・明るくなる それぞれ） */
export const FADE_FRAMES = 12;

interface Fade {
  phase: 'out' | 'in';
  frame: number;
  /** 暗くなりきった時に入れ替える先 */
  next: Scene | null;
}

/**
 * シーンの積み重ね。ポーズは対戦の上に積み、下のシーンは描くだけで更新しない。
 * 画面の切り替え（replace）は短い暗転を挟み、暗転中は入力を受け付けない。
 */
export class SceneStack {
  private stack: Scene[] = [];
  private fade: Fade | null = null;

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get size(): number {
    return this.stack.length;
  }

  get fading(): boolean {
    return this.fade !== null;
  }

  /** 最初のシーンを置く（フェードは明けから） */
  start(scene: Scene): void {
    this.clear();
    this.stack.push(scene);
    scene.enter?.();
    this.fade = { phase: 'in', frame: 0, next: null };
  }

  /** 積んでいるシーンをすべて下ろし、暗転を挟んで別のシーンにする。暗転中の呼び出しは無視する */
  replace(scene: Scene): void {
    if (this.fade) return;
    this.fade = { phase: 'out', frame: 0, next: scene };
  }

  /** 上に重ねる（ポーズなど）。暗転なし */
  push(scene: Scene): void {
    this.stack.push(scene);
    scene.enter?.();
  }

  /** 一番上を下ろす（ポーズの解除など）。暗転なし */
  pop(): void {
    if (this.stack.length <= 1) return;
    this.stack.pop()?.exit?.();
  }

  update(input: FrameInput): void {
    if (this.fade) {
      this.stepFade();
      return;
    }
    this.top?.update(input);
  }

  blur(): void {
    if (!this.fade) this.top?.onBlur?.();
  }

  /** 暗転の濃さ 0〜1 */
  fadeAlpha(): number {
    if (!this.fade) return 0;
    const t = this.fade.frame / FADE_FRAMES;
    return this.fade.phase === 'out' ? t : 1 - t;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const s of this.stack) s.draw(ctx);
    const a = this.fadeAlpha();
    if (a > 0) {
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  private stepFade(): void {
    const fade = this.fade!;
    fade.frame++;
    if (fade.frame < FADE_FRAMES) return;
    if (fade.phase === 'out') {
      this.clear();
      if (fade.next) {
        this.stack.push(fade.next);
        fade.next.enter?.();
      }
      this.fade = { phase: 'in', frame: 0, next: null };
    } else {
      this.fade = null;
    }
  }

  private clear(): void {
    while (this.stack.length > 0) this.stack.pop()?.exit?.();
  }
}
