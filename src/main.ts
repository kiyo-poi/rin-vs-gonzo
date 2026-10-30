import { createAudio } from './audio/audio';
import { createSpriteStore } from './render/sprites';
import { createImageStore } from './render/images';
import { createFixedStep } from './core/loop';
import { SceneStack } from './core/scene';
import { characters, controls, params } from './data/data';
import { allCodes, buildInputFrame, emptyHeld, heldFromKeys, keysFor } from './input/inputFrame';
import { KeyboardState } from './input/keyboard';
import type { InputFrame } from './logic/types';
import { TitleScene, type Game } from './scenes/scenes';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D が使えません');

const keyboard = new KeyboardState(allCodes(controls));
keyboard.attach(window);

const audio = createAudio();
const sprites = createSpriteStore(import.meta.env.BASE_URL);
const images = createImageStore(import.meta.env.BASE_URL);
// ブラウザの決まりで、音は最初のキー入力の後から鳴らせる
window.addEventListener('keydown', () => audio.unlock(), { once: true });

// 開発用の表示（当たり判定・状態・押しているキー）は F1 で出し入れする（開発中だけ。最初は消しておく）
let debugOn = false;
window.addEventListener('keydown', (e) => {
  if (import.meta.env.DEV && e.code === 'F1') {
    e.preventDefault();
    debugOn = !debugOn;
  }
});

let clock = 0;
const stack = new SceneStack();
const game: Game = {
  stack,
  params,
  controls,
  roster: Object.values(characters),
  clock: () => clock,
  audio,
  sprites,
  images,
  debug: () => {
    const keys = keyboard.snapshot();
    return { show: import.meta.env.DEV && debugOn, keys: { p1: keysFor(keys, controls.p1), p2: keysFor(keys, controls.p2) } };
  },
};
stack.start(new TitleScene(game));

// 対戦中にウィンドウのフォーカスが外れたら自動でポーズ（押下中のキーは KeyboardState が離した扱いにする）
let blurred = false;
window.addEventListener('blur', () => {
  blurred = true;
});

let prevHeld = [emptyHeld(), emptyHeld()];
let prevPause = false;
const fixedStep = createFixedStep();

function tick(now: number): void {
  const steps = fixedStep(now);
  if (blurred) {
    blurred = false;
    stack.blur();
  }
  for (let i = 0; i < steps; i++) {
    clock++;
    const keys = keyboard.snapshot();
    const held = [heldFromKeys(keys, controls.p1), heldFromKeys(keys, controls.p2)];
    const players: [InputFrame, InputFrame] = [buildInputFrame(held[0], prevHeld[0]), buildInputFrame(held[1], prevHeld[1])];
    prevHeld = held;
    const pauseHeld = controls.pause.some((code) => keys.has(code));
    const pause = pauseHeld && !prevPause;
    prevPause = pauseHeld;
    stack.update({ players, pause });
  }
  stack.draw(ctx!);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
