import type { Fighter } from '../logic/types';

/** 描画側だけが持つ演出（08_architecture.md 2.7）。座標はステージ座標（上がプラス） */
export interface Effect {
  kind: 'hitSpark' | 'blockSpark' | 'clashSpark' | 'text';
  x: number;
  y: number;
  /** 出てからのフレーム数 */
  age: number;
  life: number;
  text?: string;
  /** 文字・火花の大きさの倍率 */
  scale: number;
}

export interface EffectsState {
  list: Effect[];
  /** 画面揺れの残りフレーム */
  shake: number;
}

export const SPARK_LIFE = 12;
export const TEXT_LIFE = 36;
export const SHAKE_FRAMES = 14;
const SHAKE_AMPLITUDE = 8;
/** 火花を出す高さ（足元からの px） */
const HIT_HEIGHT = 110;
/** 重さの情報がない出来事で「重い」とみなすダメージ */
const HEAVY_DAMAGE = 80;

export function createEffects(): EffectsState {
  return { list: [], shake: 0 };
}

/** 出来事は形が増えても受け取れるよう、ゆるい型で読む */
interface LooseEvent {
  type: string;
  attacker?: number;
  damage?: number;
  weight?: string;
}

function isHeavy(e: LooseEvent): boolean {
  if (e.weight) return e.weight === 'heavy';
  return (e.damage ?? 0) >= HEAVY_DAMAGE;
}

/** 対戦ロジックの出来事から演出を足す。知らない種類の出来事は無視する */
export function addEventEffects(s: EffectsState, events: readonly { type: string }[], fighters: readonly [Fighter, Fighter]): EffectsState {
  const list = [...s.list];
  let shake = s.shake;
  const mid = { x: (fighters[0].x + fighters[1].x) / 2, y: HIT_HEIGHT };
  for (const raw of events) {
    const e = raw as LooseEvent;
    if ((e.type === 'hit' || e.type === 'block') && (e.attacker === 0 || e.attacker === 1)) {
      const a = fighters[e.attacker];
      const d = fighters[1 - e.attacker];
      // 食らった側の、殴った側に寄った所に出す
      const x = d.x + Math.sign(a.x - d.x || 1) * 30;
      const y = d.y + HIT_HEIGHT;
      if (e.type === 'hit') {
        const heavy = isHeavy(e);
        list.push({ kind: 'hitSpark', x, y, age: 0, life: SPARK_LIFE, scale: heavy ? 1.6 : 1 });
        list.push({ kind: 'text', x, y: y + 60, age: 0, life: TEXT_LIFE, text: heavy ? 'バキッ' : 'ドカッ', scale: heavy ? 1.5 : 1 });
        if (heavy) shake = SHAKE_FRAMES;
      } else {
        list.push({ kind: 'blockSpark', x, y, age: 0, life: SPARK_LIFE, scale: 1 });
      }
    } else if (e.type === 'clash') {
      list.push({ kind: 'clashSpark', ...mid, age: 0, life: SPARK_LIFE, scale: 1.4 });
      list.push({ kind: 'text', x: mid.x, y: mid.y + 70, age: 0, life: TEXT_LIFE, text: 'カキーン', scale: 1.3 });
    } else if (e.type === 'armor' && (e.attacker === 0 || e.attacker === 1)) {
      // アーマーで耐えた：耐えた側に白い火花と「ガキン」
      const d = fighters[1 - e.attacker];
      const y = d.y + HIT_HEIGHT;
      list.push({ kind: 'blockSpark', x: d.x, y, age: 0, life: SPARK_LIFE, scale: 1.4 });
      list.push({ kind: 'text', x: d.x, y: y + 60, age: 0, life: TEXT_LIFE, text: 'ガキン', scale: 1.2 });
    } else if (e.type === 'throw') {
      list.push({ kind: 'text', x: mid.x, y: mid.y + 70, age: 0, life: TEXT_LIFE, text: 'ガシッ', scale: 1.2 });
    } else if (e.type === 'tech' || e.type === 'throwBreak' || e.type === 'throwTech') {
      list.push({ kind: 'clashSpark', ...mid, age: 0, life: SPARK_LIFE, scale: 1 });
      list.push({ kind: 'text', x: mid.x, y: mid.y + 70, age: 0, life: TEXT_LIFE, text: 'パシッ', scale: 1.2 });
    }
  }
  return { list, shake };
}

/** 1フレーム進め、寿命が来た演出を消す */
export function stepEffects(s: EffectsState): EffectsState {
  return {
    list: s.list.map((e) => ({ ...e, age: e.age + 1 })).filter((e) => e.age < e.life),
    shake: Math.max(0, s.shake - 1),
  };
}

/** 画面揺れのずれ（px）。カメラに足すだけで、ロジックの位置は変えない。残りに合わせて弱まる */
export function shakeOffset(s: EffectsState): { x: number; y: number } {
  if (s.shake <= 0) return { x: 0, y: 0 };
  const power = (SHAKE_AMPLITUDE * s.shake) / SHAKE_FRAMES;
  const sign = s.shake % 2 === 0 ? 1 : -1;
  return { x: sign * power, y: (s.shake % 4 < 2 ? 1 : -1) * power * 0.5 };
}
