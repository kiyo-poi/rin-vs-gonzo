import { describe, expect, it } from 'vitest';
import { gonzo, lin } from '../src/data/data';
import { stageForMatch } from '../src/scenes/config';
import { imagePath, stagePath } from '../src/render/images';

describe('stageForMatch', () => {
  it('キャラごとのステージ id を持つ', () => {
    expect(lin.stageId).toBe('chinatown');
    expect(gonzo.stageId).toBe('ring');
  });
  it('2人対戦は 2P のキャラのステージ', () => {
    expect(stageForMatch([lin, gonzo], 'versus')).toBe('ring');
    expect(stageForMatch([gonzo, lin], 'versus')).toBe('chinatown');
  });
  it('CPU 戦は CPU（2P）のキャラのステージ', () => {
    expect(stageForMatch([lin, gonzo], 'cpu')).toBe('ring');
  });
});

describe('画像のパス', () => {
  it('stages/ ui/ は images/ 以下', () => {
    expect(imagePath('/', stagePath('ring'))).toBe('/images/stages/stage_ring.jpg');
    expect(imagePath('', 'ui/title_logo.png')).toBe('images/ui/title_logo.png');
  });
});
