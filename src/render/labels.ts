import { BUTTONS, type Button, type ButtonKeys, type CharacterData } from '../logic/types';

/** KeyboardEvent.code を画面に出す短い名前にする */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `テンキー${code.slice(6)}`;
  const named: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Space: 'Space', Escape: 'Esc',
  };
  return named[code] ?? code;
}

const BUTTON_NAMES: Record<Button, string> = {
  left: '左', right: '右', up: 'ジャンプ', down: 'しゃがみ',
  punch: 'パンチ', kick: 'キック', grab: '掴み', special: '必殺', guard: 'ガード',
};

/** 1人分のキー配置の行（例：「パンチ F」「パンチ テンキー4 / J」） */
export function controlLines(map: ButtonKeys): string[] {
  return BUTTONS.map((b) => `${BUTTON_NAMES[b]} ${map[b].map(keyLabel).join(' / ')}`);
}

const SLOT_NAMES: Record<string, string> = {
  punch: 'パンチ', kick: 'キック', crouchPunch: '↓+パンチ', crouchKick: '↓+キック',
  airPunch: '空中パンチ', airKick: '空中キック',
};

/** 技一覧の行。知らない枠（後で増えた技）は枠の名前のまま出す */
export function moveLines(char: CharacterData): string[] {
  return Object.entries(char.moves as Record<string, { name: string } | undefined>)
    .filter(([, m]) => m && typeof m.name === 'string')
    .map(([slot, m]) => `${SLOT_NAMES[slot] ?? slot}：${m!.name}`);
}

const TYPES: Record<string, string> = { lin: 'スピード型', gonzo: 'パワー型' };

/** キャラのタイプ（データに書いてあればそれを使う） */
export function charType(char: CharacterData): string {
  const fromData = (char as unknown as { type?: string }).type;
  return fromData ?? TYPES[char.id] ?? '';
}
