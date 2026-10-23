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
