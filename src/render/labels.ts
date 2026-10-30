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

/** 戦闘画面の下に出す操作の案内（2行：1P と 2P）。キー名は controls.json から作る */
export function fightGuideLines(controls: { p1: ButtonKeys; p2: ButtonKeys }): [string, string] {
  const short = (c: string) => (c.startsWith('Numpad') ? `テン${c.slice(6)}` : keyLabel(c));
  const k = (m: ButtonKeys, b: Button) => short(m[b][0]);
  const move = (m: ButtonKeys) => [m.left, m.right, m.up, m.down].map((c) => short(c[0])).join('');
  const line = (tag: string, m: ButtonKeys) =>
    `${tag} 移動${move(m)} パンチ${k(m, 'punch')} キック${k(m, 'kick')} 掴み${k(m, 'grab')} 必殺${k(m, 'special')} ガード${k(m, 'guard')} ／ 超必殺 ${k(m, 'special')}+${k(m, 'guard')}`;
  const alt = (b: Button) => controls.p2[b].slice(1).map(short).join('/');
  const hasAlt = (['punch', 'kick', 'grab', 'special', 'guard'] as Button[]).every((b) => controls.p2[b].length > 1);
  const altText = hasAlt ? `（別キー：パンチ${alt('punch')} キック${alt('kick')} 掴み${alt('grab')} 必殺${alt('special')} ガード${alt('guard')}）` : '';
  return [line('1P', controls.p1), `${line('2P', controls.p2)}${altText}`];
}

const TYPES: Record<string, string> = { lin: 'スピード型', gonzo: 'パワー型' };

/** キャラのタイプ（データに書いてあればそれを使う） */
export function charType(char: CharacterData): string {
  const fromData = (char as unknown as { type?: string }).type;
  return fromData ?? TYPES[char.id] ?? '';
}
