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
  punch: 'パンチ', kick: 'キック', crouchPunch: '↓＋パンチ', crouchKick: '↓＋キック',
  airPunch: '空中パンチ', airKick: '空中キック',
  special: '必殺', forwardSpecial: '→＋必殺', downSpecial: '↓＋必殺', grab: '掴み',
  super: '必殺＋ガード（超必殺）',
};

/** 技一覧の行。知らない枠（後で増えた技）は枠の名前を出さず、技の名前だけ出す */
export function moveLines(char: CharacterData): string[] {
  return Object.entries(char.moves as Record<string, { name: string } | undefined>)
    .filter(([, m]) => m && typeof m.name === 'string')
    .map(([slot, m]) => (SLOT_NAMES[slot] ? `${SLOT_NAMES[slot]}：${m!.name}` : m!.name));
}

/** 戦闘画面の下に出す操作の案内。1P・2P それぞれ2行（移動の行・ボタンの行）。キー名は controls.json から作る */
export function fightGuideLines(controls: { p1: ButtonKeys; p2: ButtonKeys }): { p1: [string, string]; p2: [string, string] } {
  // テンキーは数字だけにして、1行目に「数字はテンキー」と添える
  const short = (c: string) => (c.startsWith('Numpad') ? c.slice(6) : keyLabel(c));
  const usesNumpad = (m: ButtonKeys) => Object.values(m).some((cs) => cs.some((c) => c.startsWith('Numpad')));
  // 1つのボタンに複数のキーがあれば「4/J」のように並べる
  const k = (m: ButtonKeys, b: Button) => m[b].map(short).join('/');
  const first = (m: ButtonKeys, b: Button) => short(m[b][0]);
  const lines = (tag: string, m: ButtonKeys): [string, string] => [
    `${tag}　移動 ${first(m, 'left')} ${first(m, 'right')}　ジャンプ ${first(m, 'up')}　しゃがみ ${first(m, 'down')}${usesNumpad(m) ? '　（数字はテンキー）' : ''}`,
    `パンチ ${k(m, 'punch')}　キック ${k(m, 'kick')}　掴み ${k(m, 'grab')}　必殺 ${k(m, 'special')}　ガード ${k(m, 'guard')}　超必殺 ${first(m, 'special')}+${first(m, 'guard')}`,
  ];
  return { p1: lines('1P', controls.p1), p2: lines('2P', controls.p2) };
}

const TYPES: Record<string, string> = { lin: 'スピード型', gonzo: 'パワー型' };

/** キャラのタイプ（データに書いてあればそれを使う） */
export function charType(char: CharacterData): string {
  const fromData = (char as unknown as { type?: string }).type;
  return fromData ?? TYPES[char.id] ?? '';
}
