import type { CharacterData, Controls, Params } from '../logic/types';
import paramsJson from './params.json';
import controlsJson from './controls.json';
import protoJson from './characters/proto.json';

// JSON の文字列（"light" など）は型の上ではただの string なので、ここで型を付ける。
// 中身の検査は M3 でキャラデータが増えた時に入れる（08_architecture.md「データの検査」）
export const params = paramsJson as unknown as Params;
export const controls = controlsJson as unknown as Controls;
export const proto = protoJson as unknown as CharacterData;
