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
  /** 持続の何F目に出るか（持続の1F目＝1）。省略時は持続全体 */
  frames?: FrameRange;
  /** 地上の相手だけに当たる（ヒップドロップの衝撃波など） */
  groundOnly?: boolean;
}

/** フレームの区間（from〜to を含む） */
export type FrameRange = { from: number; to: number };

/** 技の移動。区間の合計の移動量を、区間の各フレームに等分して足す（前向き・上がプラス） */
export type MoveStep = { frames: FrameRange; dx: number; dy?: number };

/** アーマー。区間の間、打撃を hits 発まで耐える */
export type ArmorData = { frames: FrameRange; hits: number; onAbsorb?: string };

/** 掴み技 */
export type ThrowData = {
  range: number;
  damage: number;
  techable: boolean;
  /** 投げ終わりに、投げられた側を投げた側から離れる向き（画面端の方）へ運ぶ距離 px（ステージ端で止まる）。無ければその場 */
  carry?: number;
};

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
  /** 省略時は normal */
  kind?: 'normal' | 'special' | 'throw' | 'super';
  /** 超必殺のゲージ消費（kind: 'super' の時だけ） */
  meterCost?: number;
  movement?: MoveStep[];
  /** 無敵のフレーム区間（技の何F目か） */
  invincible?: FrameRange[];
  armor?: ArmorData;
  /** ガード固定（途中でガードを離しても残りの当たりはガードになる） */
  guardLock?: boolean;
  cancelInto?: 'special'[];
  throw?: ThrowData;
}

/** 技を出すボタンの枠（掴み・必殺などは M3b 以降） */
export type MoveSlot =
  | 'punch' | 'kick' | 'crouchPunch' | 'crouchKick' | 'airPunch' | 'airKick'
  | 'special' | 'forwardSpecial' | 'downSpecial' | 'grab' | 'super';

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
    /** アーマーで耐えた時の被ダメージの割合（省略時は 1） */
    armorDamageRate?: number;
  };
  boxes: {
    hurt: { stand: Box[]; crouch: Box[]; air: Box[] };
  };
  moves: Record<MoveSlot, MoveData>;
  /** 入力では出ない派生技（反撃パンチなど） */
  subMoves?: Record<string, MoveData>;
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
  /** 連続技の2発目以降（技が2つ以上）のダメージの割合 */
  comboDamageRate: number;
  /** ガードされた必殺技の削りの割合 */
  chipRate: number;
  /** 先行入力の受付 F（押してから、この F 数目まで技が出せる） */
  inputBuffer: number;
  /** 投げ抜けを受け付ける F（投げられた次のフレームが1F目） */
  throwTechWindow: number;
  /** 投げの演出の長さ F（掴んだ次のフレームが1F目） */
  throwDuration: number;
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
  /** ゲージ。増える量はダメージ × 倍率（当てた側 / 食らった側 / ガードさせた側）。端数は切り捨て */
  gauge: { max: number; onHit: number; onHurt: number; onGuarded: number };
  /** 超必殺の暗転（全体停止）F */
  superFlash: number;
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
      attack: { move: string; frame: number } | null;
      /** このジャンプで出した空中技（1ジャンプに1回だけ出せる） */
      used: MoveSlot | null;
      /** 相打ちで弾かれた時の残りフレーム（0 なら弾かれていない）。着地の隙はこれ以上の長さにする */
      recoilLeft: number;
    }
  | { name: 'landing'; frame: number; duration: number }
  | { name: 'attack'; frame: number; move: string }
  /** crouch は食らった・ガードした時にしゃがんでいたか（食らいの箱をしゃがみにする） */
  | { name: 'hitstun' | 'blockstun'; frame: number; duration: number; crouch: boolean }
  /** 相打ちで弾かれた（食らいの箱は立ち） */
  | { name: 'recoil'; frame: number; duration: number }
  /** ダウン（frame 0 で入り、duration を超えたフレームで起き上がる） */
  | { name: 'knockdown'; frame: number; duration: number }
  /** 空中で食らって落下中（着地したフレームからダウン） */
  | { name: 'airHit'; frame: number }
  /** 相手を投げている最中（frame 0 で入り、duration を超えたフレームで自由になる）。この間は食らわない */
  | { name: 'throwing'; frame: number; duration: number }
  /** 投げられている最中（frame 0 で入り、duration を超えたフレームで damage 減ってダウン）。techable なら投げ抜けできる */
  | { name: 'thrown'; frame: number; duration: number; damage: number; techable: boolean; carry?: number };

export type FighterStateName = FighterState['name'];

export interface InputBuffer {
  button: 'special' | 'grab' | 'kick' | 'punch';
  down: boolean;
  /** 向きに対して前を押していたか */
  forward: boolean;
  age: number;
}

export interface Fighter {
  char: CharacterData;
  x: number;
  y: number;
  /** 1＝右向き、-1＝左向き */
  facing: 1 | -1;
  health: number;
  state: FighterState;
  /** 今の技の hits の何番目が当たった（ガードされた）か。技が始まる時にすべて false にする */
  hitDone: boolean[];
  /** 今の技の1発目がガードされた（guardLock の技の、残りの当たりをガード扱いにする）。技が始まる時に false */
  guardLocked: boolean;
  /** 今の技のアーマーが、あと何発耐えられるか。技が始まる時に armor.hits（アーマーのない技は 0） */
  armorLeft: number;
  /** 先行入力。攻撃ボタンが押されたフレームの、一番優先順位の高いボタンと方向。age は押してから何F目か（押したフレームが 0）。技を出したら null */
  buffer: InputBuffer | null;
  /** 受けている連続技。moves は当たった技の数（多段技は1つ）、hits は当たった数。自由に動ける状態になったら 0 */
  combo: { moves: number; hits: number };
  /** 起き上がり無敵の残りフレーム（0 なら無敵ではない） */
  invincible: number;
  /** 超必殺のゲージ（0〜params.gauge.max の整数）。ラウンドをまたいで持ち越す */
  gauge: number;
  /** 必殺・ガードを押してから何F経ったか（押したフレームが 0）。超必殺の同時押しの受付に使う（superMove.ts） */
  pressAge: { special: number; guard: number };
}
