export type Button = 'left' | 'right' | 'up' | 'down' | 'punch' | 'kick' | 'grab' | 'special' | 'guard';

export const BUTTONS: readonly Button[] = [
  'left', 'right', 'up', 'down', 'punch', 'kick', 'grab', 'special', 'guard',
];

/** 1フレーム分のボタン状態。対戦ロジックはこれだけを受け取る（キーボードか CPU かを区別しない） */
export interface InputFrame {
  /** このフレームに押されているか */
  held: Record<Button, boolean>;
  /** このフレームに押されたか（前のフレームは離れていた） */
  pressed: Record<Button, boolean>;
}

export type Weight = 'light' | 'medium' | 'heavy';

/** 判定の箱。x は足元の中心から箱の左端まで（右向き基準）、y は足元から箱の下端まで（上がプラス） */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HitData {
  damage: number;
  weight: Weight;
  box: Box;
}

export interface MoveData {
  name: string;
  /** 発生 */
  startup: number;
  /** 持続 */
  active: number;
  /** 硬直 */
  recovery: number;
  hits: HitData[];
}

/** 技を出すボタンの枠（M3 でしゃがみ技・掴み・必殺などが増える） */
export type MoveSlot = 'punch' | 'kick';

export interface CharacterData {
  id: string;
  name: string;
  stats: {
    health: number;
    /** 歩き速度 px/F */
    walkSpeed: number;
    /** ジャンプの滞空時間 F（踏み込みを除く） */
    jumpAirFrames: number;
    /** ジャンプの高さ px */
    jumpHeight: number;
    /** 前・後ろジャンプの横の速さ px/F */
    jumpForwardSpeed: number;
    /** 押し合いの幅 px（2人の足元の中心は、2人の幅の平均より近づけない） */
    pushWidth: number;
  };
  boxes: {
    hurt: { stand: Box[]; crouch: Box[]; air: Box[] };
  };
  moves: Record<MoveSlot, MoveData>;
}

export interface Params {
  weights: Record<Weight, { hitstun: number; blockstun: number; knockback: number }>;
  /** ガードした時のノックバックの倍率 */
  blockKnockbackRate: number;
  /** 歩いて押した時、押された側が動く割合（重なった分に対して） */
  pushRate: number;
  /** ジャンプの踏み込み（飛び上がる前の地上の時間） */
  jumpSquatFrames: number;
  stage: { width: number; edgeMargin: number; startDistance: number };
  screen: { width: number };
  round: {
    /** 1ラウンドの長さ（99秒） */
    timeFrames: number;
    /** ラウンド開始表示の長さ */
    introFrames: number;
    /** 決着表示の長さ */
    endFrames: number;
    /** 試合に勝つのに必要なラウンド数 */
    winsToWin: number;
    /** 最大ラウンド数 */
    maxRounds: number;
  };
  render: { groundY: number };
}

export type ButtonKeys = Record<Button, string[]>;

export interface Controls {
  p1: ButtonKeys;
  p2: ButtonKeys;
  pause: string[];
}

/** 自由に動ける状態 */
export type FreeStateName = 'idle' | 'walkForward' | 'walkBack' | 'crouch' | 'guard';

/**
 * キャラの状態。frame はこの状態に入ってからのフレーム数（入ったフレームが1）。
 * のけぞり・ガード硬直だけは、当たったフレームに frame: 0 で入れ、次のフレームが1になる。
 */
export type FighterState =
  | { name: FreeStateName; frame: number }
  | { name: 'jumpSquat'; frame: number; dir: -1 | 0 | 1 }
  | { name: 'air'; frame: number; dir: -1 | 0 | 1 }
  | { name: 'attack'; frame: number; move: MoveSlot }
  | { name: 'hitstun' | 'blockstun'; frame: number; duration: number };

export type FighterStateName = FighterState['name'];

export interface Fighter {
  char: CharacterData;
  x: number;
  y: number;
  /** 1＝右向き、-1＝左向き */
  facing: 1 | -1;
  health: number;
  state: FighterState;
  /** 今出している技がもう当たったか（1つの技は相手に1回だけ当たる） */
  moveHasHit: boolean;
}
