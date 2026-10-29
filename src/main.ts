import { createFixedStep } from './core/loop';
import { controls, params, proto } from './data/data';
import { allCodes, buildInputFrame, emptyHeld, heldFromKeys, keysFor } from './input/inputFrame';
import { KeyboardState } from './input/keyboard';
import { createMatch, stepMatch, type Match } from './logic/match';
import type { InputFrame } from './logic/types';
import { drawFrame } from './render/render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D が使えません');

const keyboard = new KeyboardState(allCodes(controls));
keyboard.attach(window);

const newMatch = (): Match => createMatch([proto, proto], params);
let match = newMatch();
let prevHeld = [emptyHeld(), emptyHeld()];
const fixedStep = createFixedStep();

function tick(now: number): void {
  const steps = fixedStep(now);
  for (let i = 0; i < steps; i++) {
    const keys = keyboard.snapshot();
    const held = [heldFromKeys(keys, controls.p1), heldFromKeys(keys, controls.p2)];
    const inputs: [InputFrame, InputFrame] = [buildInputFrame(held[0], prevHeld[0]), buildInputFrame(held[1], prevHeld[1])];
    prevHeld = held;
    // 試合が終わったら、どちらかがパンチを押すと再戦（タイトルなどの画面の流れは M4）
    if (match.phase === 'matchEnd') {
      if (inputs[0].pressed.punch || inputs[1].pressed.punch) match = newMatch();
    } else {
      match = stepMatch(match, inputs, params);
    }
  }
  const keys = keyboard.snapshot();
  drawFrame(ctx!, match, params, {
    show: import.meta.env.DEV,
    keys: { p1: keysFor(keys, controls.p1), p2: keysFor(keys, controls.p2) },
  });
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
