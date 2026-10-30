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
  /** 当たるとダウンさせる（足払いなど） */
  knockdown?: boolean;
}

/** 技を出す時の姿勢 */
export type Posture = 'stand' | 'crouch' | 'air';

export interface MoveData {
  name: string;
  posture: Posture;
  /** 発生 */
  startup: number;
  /** 持続 */
  active: number;
  /** 硬直 */
  recovery: number;
  /** 空中技の着地の隙 F。省略時は共通値 */
  landingRecovery?: number;
  hits: HitData[];
}

/** 技を出すボタンの枠（掴み・必殺などは M3b 以降） */
export type MoveSlot = 'punch' | 'kick' | 'crouchPunch' | 'crouchKick' | 'airPunch' | 'airKick';

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
  /** 相打ちで弾かれて動けない時間 F（当たった次のフレームが1F目） */
  clashRecoil: number;
  /** ダウンしている時間 F（当たった次のフレームが1F目） */
  knockdownFrames: number;
  /** 起き上がってからの無敵 F */
  wakeupInvincible: number;
  /** 空中で食らってから落ちる速さ px/F */
  airHitFallSpeed: number;
  /** 空中技を出して着地した時の隙 F（技ごとの landingRecovery があればそちらを使う） */
  airLandingRecovery: number;
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
  /** CPU の難易度ごとの値（reaction は反応の遅れ F） */
  cpu?: Record<'easy' | 'normal' | 'hard', { reaction: number; guardRate: number; specialRate: number }>;
}

export type ButtonKeys = Record<Button, string[]>;

export interface Controls {
  p1: ButtonKeys;
  p2: ButtonKeys;
  pause: string[];
}

/** 自由に動ける状態 */
export type FreeStateName = 'idle' | 'walkForward' | 'walkBack' | 'crouch';

/**
 * キャラの状態。frame はこの状態に入ってからのフレーム数（入ったフレームが1）。
 * のけぞり・ガード硬直だけは、当たったフレームに frame: 0 で入れ、次のフレームが1になる。
 */
export type FighterState =
  | { name: FreeStateName; frame: number }
  | { name: 'guard'; frame: number; crouch: boolean }
  | { name: 'jumpSquat'; frame: number; dir: -1 | 0 | 1 }
  | {
      name: 'air';
      frame: number;
      dir: -1 | 0 | 1;
      /** 出している空中技（frame は技に入ってからのフレーム数） */
      attack: { move: MoveSlot; frame: number } | null;
      /** このジャンプで出した空中技（1ジャンプに1回だけ出せる） */
      used: MoveSlot | null;
      /** 相打ちで弾かれた時の残りフレーム（0 なら弾かれていない）。着地の隙はこれ以上の長さにする */
      recoilLeft: number;
    }
  | { name: 'landing'; frame: number; duration: number }
  | { name: 'attack'; frame: number; move: MoveSlot }
  /** crouch は食らった・ガードした時にしゃがんでいたか（食らいの箱をしゃがみにする） */
  | { name: 'hitstun' | 'blockstun'; frame: number; duration: number; crouch: boolean }
  /** 相打ちで弾かれた（食らいの箱は立ち） */
  | { name: 'recoil'; frame: number; duration: number }
  /** ダウン（frame 0 で入り、duration を超えたフレームで起き上がる） */
  | { name: 'knockdown'; frame: number; duration: number }
  /** 空中で食らって落下中（着地したフレームからダウン） */
  | { name: 'airHit'; frame: number };

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
  /** 起き上がり無敵の残りフレーム（0 なら無敵ではない） */
  invincible: number;
}
