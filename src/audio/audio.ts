import type { BattleEvent } from '../logic/battle';

/** 音量（0〜1）。調整はここだけで行う（08_architecture 2.8：全体・BGM・効果音の3つ） */
export const VOLUME = {
  master: 0.6,
  sfx: 0.8,
  bgm: 0.35,
} as const;

export type UiKind = 'move' | 'decide' | 'cancel';
export type BgmName = 'title' | 'select' | 'stage' | 'result';

export type SoundName =
  | 'hit_light' | 'hit_medium' | 'hit_heavy' | 'block' | 'clash' | 'grab' | 'throw' | 'tech' | 'armor'
  | 'super_start' | 'ko' | 'timeup' | 'draw' | 'win' | 'round' | 'fight'
  | 'ui_move' | 'ui_decide' | 'ui_cancel';

/** ダメージから重さを決める（イベントに weight が無い時の代わり） */
export const DAMAGE_THRESHOLDS = { light: 7, medium: 12 } as const;

/** BattleEvent（今後増える種類も含めてゆるく読む） */
type LooseEvent = { type: string; weight?: unknown; damage?: unknown };

function weightOf(ev: LooseEvent): 'light' | 'medium' | 'heavy' {
  if (ev.weight === 'light' || ev.weight === 'medium' || ev.weight === 'heavy') return ev.weight;
  const d = typeof ev.damage === 'number' ? ev.damage : 0;
  return d <= DAMAGE_THRESHOLDS.light ? 'light' : d <= DAMAGE_THRESHOLDS.medium ? 'medium' : 'heavy';
}

/** 出来事 → 鳴らす音。知らない種類は null（無視する） */
export function soundForEvent(ev: LooseEvent): SoundName | null {
  switch (ev.type) {
    case 'hit': return `hit_${weightOf(ev)}` as SoundName;
    case 'block': return 'block';
    case 'clash': return 'clash';
    case 'grab': return 'grab';
    case 'throw': return 'throw';
    case 'tech':
    case 'throwBreak':
    case 'throwTech': return 'tech';
    case 'armor': return 'armor';
    case 'superStart':
    case 'super': return 'super_start';
    case 'ko': return 'ko';
    case 'timeUp':
    case 'timeup': return 'timeup';
    case 'draw': return 'draw';
    case 'win': return 'win';
    case 'round': return 'round';
    case 'fight': return 'fight';
    default: return null;
  }
}

/**
 * 試合の進行の表示（hud.ts の phaseMessage）が変わった時に鳴らす音。変わっていなければ null。
 * ROUND n → round、FIGHT! → fight、K.O. → ko、TIME UP → timeup、DRAW → draw、nP WIN → win
 */
export function soundForPhaseMessage(before: string | null, after: string | null): SoundName | null {
  if (after === null || after === before) return null;
  if (after.startsWith('ROUND')) return 'round';
  if (after === 'FIGHT!') return 'fight';
  if (after.endsWith('K.O.')) return 'ko';
  if (after === 'TIME UP') return 'timeup';
  if (after.endsWith('WIN')) return 'win';
  if (after.startsWith('DRAW')) return 'draw';
  return null;
}

export interface Audio {
  unlock(): void;
  playEvents(events: BattleEvent[]): void;
  playUi(kind: UiKind): void;
  /** 名前で1つ鳴らす（試合の進行：ROUND / FIGHT / KO / TIME UP / WIN など） */
  playSound(name: SoundName): void;
  startBgm(name: BgmName): void;
  stopBgm(): void;
}

// ---- 合成 ----

type Wave = OscillatorType;
interface Tone { f: number; to?: number; dur: number; wave?: Wave; vol?: number; delay?: number }
interface Noise { dur: number; vol?: number; freq?: number; delay?: number }
interface Recipe { tones?: Tone[]; noise?: Noise[] }

/** 効果音のレシピ（発振器とノイズの組み合わせ） */
export const RECIPES: Record<SoundName, Recipe> = {
  hit_light: { tones: [{ f: 520, to: 200, dur: 0.07, wave: 'square', vol: 0.5 }], noise: [{ dur: 0.05, vol: 0.5, freq: 3000 }] },
  hit_medium: { tones: [{ f: 360, to: 120, dur: 0.11, wave: 'square', vol: 0.6 }], noise: [{ dur: 0.09, vol: 0.7, freq: 2000 }] },
  hit_heavy: { tones: [{ f: 220, to: 50, dur: 0.22, wave: 'sawtooth', vol: 0.8 }, { f: 90, to: 40, dur: 0.25, wave: 'sine', vol: 0.9 }], noise: [{ dur: 0.16, vol: 0.9, freq: 1200 }] },
  block: { tones: [{ f: 900, to: 700, dur: 0.05, wave: 'square', vol: 0.4 }], noise: [{ dur: 0.04, vol: 0.4, freq: 5000 }] },
  clash: { tones: [{ f: 1800, to: 1500, dur: 0.25, wave: 'triangle', vol: 0.5 }, { f: 2700, to: 2300, dur: 0.2, wave: 'triangle', vol: 0.3 }], noise: [{ dur: 0.04, vol: 0.5, freq: 6000 }] },
  grab: { tones: [{ f: 300, to: 180, dur: 0.08, wave: 'square', vol: 0.5 }], noise: [{ dur: 0.05, vol: 0.4, freq: 1800 }] },
  throw: { tones: [{ f: 140, to: 40, dur: 0.3, wave: 'sine', vol: 1 }], noise: [{ dur: 0.2, vol: 0.8, freq: 900 }] },
  tech: { tones: [{ f: 1100, to: 1400, dur: 0.06, wave: 'square', vol: 0.4 }], noise: [{ dur: 0.04, vol: 0.5, freq: 4000 }] },
  armor: { tones: [{ f: 180, to: 90, dur: 0.2, wave: 'sine', vol: 0.7 }, { f: 260, to: 130, dur: 0.2, wave: 'triangle', vol: 0.4, delay: 0.05 }] },
  super_start: { tones: [{ f: 400, to: 2400, dur: 0.45, wave: 'sawtooth', vol: 0.4 }, { f: 800, to: 3200, dur: 0.45, wave: 'square', vol: 0.2 }] },
  ko: { tones: [{ f: 160, to: 40, dur: 0.5, wave: 'sawtooth', vol: 0.8 }, { f: 600, to: 150, dur: 0.4, wave: 'square', vol: 0.4, delay: 0.1 }], noise: [{ dur: 0.35, vol: 0.9, freq: 1000 }] },
  timeup: { tones: [{ f: 200, dur: 0.5, wave: 'sawtooth', vol: 0.5 }] },
  draw: { tones: [{ f: 400, to: 250, dur: 0.25, wave: 'triangle', vol: 0.5 }, { f: 300, to: 180, dur: 0.3, wave: 'triangle', vol: 0.5, delay: 0.25 }] },
  win: { tones: [523, 659, 784, 1047].map((f, i) => ({ f, dur: i === 3 ? 0.4 : 0.12, wave: 'square' as Wave, vol: 0.4, delay: i * 0.13 })) },
  round: { tones: [{ f: 440, dur: 0.15, wave: 'square', vol: 0.5 }, { f: 440, dur: 0.15, wave: 'square', vol: 0.5, delay: 0.2 }] },
  fight: { tones: [{ f: 660, dur: 0.1, wave: 'square', vol: 0.5 }, { f: 880, dur: 0.1, wave: 'square', vol: 0.5, delay: 0.1 }, { f: 1320, dur: 0.25, wave: 'square', vol: 0.5, delay: 0.2 }] },
  ui_move: { tones: [{ f: 880, dur: 0.04, wave: 'square', vol: 0.3 }] },
  ui_decide: { tones: [{ f: 660, dur: 0.07, wave: 'square', vol: 0.35 }, { f: 990, dur: 0.12, wave: 'square', vol: 0.35, delay: 0.07 }] },
  ui_cancel: { tones: [{ f: 220, dur: 0.1, wave: 'square', vol: 0.35 }] },
};

// ---- BGM（音名の表） ----

const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** 'A4' → 440 のように音名を周波数に直す。'-' や不正な名前は 0（休符） */
export function noteFreq(name: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const midi = (Number(m[2]) + 1) * 12 + SEMI[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface Song {
  /** 1ステップ（8分音符）の長さ秒 */
  step: number;
  melody: string[];
  bass: string[];
}

/** 短いループ曲。melody と bass は同じステップ数で、'-' は休符 */
export const SONGS: Record<BgmName, Song> = {
  title: {
    step: 0.16,
    melody: ['C5', 'E5', 'G5', 'E5', 'C5', 'E5', 'G5', '-', 'D5', 'F5', 'A5', 'F5', 'D5', 'F5', 'G5', '-'],
    bass: ['C3', '-', 'C3', '-', 'C3', '-', 'G2', '-', 'D3', '-', 'D3', '-', 'G2', '-', 'G2', '-'],
  },
  select: {
    step: 0.12,
    melody: ['A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'E5', 'F4', 'A4', 'C5', 'F5', 'E5', 'C5', 'A4', 'C5'],
    bass: ['A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'F2', 'F2', 'F2', 'F2', 'E2', 'E2', 'E2', 'E2'],
  },
  stage: {
    step: 0.13,
    melody: ['E4', 'G4', 'B4', 'E5', '-', 'D5', 'B4', 'G4', 'E4', 'G4', 'A4', 'C5', '-', 'B4', 'A4', 'G4'],
    bass: ['E2', 'E2', 'E3', 'E2', 'E2', 'E2', 'E3', 'E2', 'C2', 'C2', 'C3', 'C2', 'D2', 'D2', 'D3', 'D2'],
  },
  result: {
    step: 0.28,
    melody: ['G4', '-', 'B4', '-', 'D5', '-', 'B4', '-', 'C5', '-', 'E5', '-', 'D5', '-', 'B4', '-'],
    bass: ['G2', '-', '-', '-', 'G2', '-', '-', '-', 'C3', '-', '-', '-', 'D3', '-', '-', '-'],
  },
};

type Ctx = AudioContext;

function getAudioContextCtor(): (new () => Ctx) | null {
  const g = globalThis as unknown as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

export function createAudio(): Audio {
  let ctx: Ctx | null = null;
  let master: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let bgmBus: GainNode | null = null;
  let noiseBuf: AudioBuffer | null = null;
  let wantedBgm: BgmName | null = null;
  let bgmTimer: ReturnType<typeof setInterval> | null = null;
  let bgmStep = 0;
  let bgmNext = 0;

  const ready = (): boolean => ctx !== null && ctx.state === 'running';

  function tone(t: Tone, at: number, dest: AudioNode, vol = 1): void {
    if (!ctx) return;
    const start = at + (t.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = t.wave ?? 'square';
    osc.frequency.setValueAtTime(t.f, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), start + t.dur);
    const peak = (t.vol ?? 0.5) * vol;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g).connect(dest);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }

  function noise(n: Noise, at: number, dest: AudioNode): void {
    if (!ctx || !noiseBuf) return;
    const start = at + (n.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = n.freq ?? 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(n.vol ?? 0.5, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
    src.connect(filter).connect(g).connect(dest);
    src.start(start);
    src.stop(start + n.dur + 0.02);
  }

  function play(name: SoundName): void {
    if (!ready() || !ctx || !sfxBus) return;
    try {
      const r = RECIPES[name];
      const now = ctx.currentTime;
      for (const t of r.tones ?? []) tone(t, now, sfxBus);
      for (const n of r.noise ?? []) noise(n, now, sfxBus);
    } catch { /* 音が鳴らなくてもゲームは続ける */ }
  }

  function scheduleBgm(): void {
    if (!ctx || !bgmBus || !wantedBgm) return;
    const song = SONGS[wantedBgm];
    const len = song.melody.length;
    while (bgmNext < ctx.currentTime + 0.4) {
      const i = bgmStep % len;
      const m = noteFreq(song.melody[i]);
      const b = noteFreq(song.bass[i]);
      if (m > 0) tone({ f: m, dur: song.step * 0.9, wave: 'square', vol: 0.25 }, bgmNext, bgmBus);
      if (b > 0) tone({ f: b, dur: song.step * 0.95, wave: 'triangle', vol: 0.5 }, bgmNext, bgmBus);
      bgmNext += song.step;
      bgmStep++;
    }
  }

  function runBgm(): void {
    if (bgmTimer !== null) { clearInterval(bgmTimer); bgmTimer = null; }
    if (!ready() || !ctx || !wantedBgm) return;
    bgmStep = 0;
    bgmNext = ctx.currentTime + 0.05;
    try {
      scheduleBgm();
      bgmTimer = setInterval(() => { try { scheduleBgm(); } catch { /* ignore */ } }, 100);
    } catch { /* ignore */ }
  }

  return {
    unlock() {
      try {
        if (!ctx) {
          const Ctor = getAudioContextCtor();
          if (!Ctor) return;
          ctx = new Ctor();
          master = ctx.createGain();
          master.gain.value = VOLUME.master;
          master.connect(ctx.destination);
          sfxBus = ctx.createGain();
          sfxBus.gain.value = VOLUME.sfx;
          sfxBus.connect(master);
          bgmBus = ctx.createGain();
          bgmBus.gain.value = VOLUME.bgm;
          bgmBus.connect(master);
          const len = Math.floor(ctx.sampleRate * 0.5);
          noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') {
          void ctx.resume().then(() => { if (wantedBgm && bgmTimer === null) runBgm(); }).catch(() => {});
        } else if (wantedBgm && bgmTimer === null) {
          runBgm();
        }
      } catch { /* 音が使えない環境では黙る */ }
    },
    playEvents(events) {
      if (!ready()) return;
      const played = new Set<SoundName>();
      for (const ev of events) {
        const s = soundForEvent(ev);
        if (s && !played.has(s)) { played.add(s); play(s); }
      }
    },
    playSound(name) {
      play(name);
    },
    playUi(kind) {
      play(kind === 'move' ? 'ui_move' : kind === 'decide' ? 'ui_decide' : 'ui_cancel');
    },
    startBgm(name) {
      if (wantedBgm === name && bgmTimer !== null) return;
      wantedBgm = name;
      runBgm();
    },
    stopBgm() {
      wantedBgm = null;
      if (bgmTimer !== null) { clearInterval(bgmTimer); bgmTimer = null; }
    },
  };
}
