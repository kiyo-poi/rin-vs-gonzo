import type { CharacterData, Controls, Params } from '../logic/types';
import paramsJson from './params.json';
import controlsJson from './controls.json';

// JSON の文字列（"light" など）は型の上ではただの string なので、ここで型を付ける。
// 中身の検査（08_architecture.md「データの検査」）はまだ入れていない。追加する時はここで行う
export const params = paramsJson as unknown as Params;
export const controls = controlsJson as unknown as Controls;

// characters/ に置いた JSON を全部集め、id をキーにする
const modules = import.meta.glob('./characters/*.json', { eager: true, import: 'default' });
export const characters: Record<string, CharacterData> = Object.fromEntries(
  Object.values(modules).map((m) => [(m as CharacterData).id, m as CharacterData]),
);

export const lin = characters.lin;
export const gonzo = characters.gonzo;
/** テストの基準キャラ。リンと同じ（旧テストキャラの数値を引き継ぐ） */
export const proto = lin;
