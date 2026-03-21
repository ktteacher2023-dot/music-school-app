// Staff lines at y = [40, 52, 64, 76, 88]
// Note Y positions (treble clef):
//   C4=100(+ledger), D4=94, E4=88, F4=82, G4=76,
//   A4=70, B4=64, C5=58, D5=52

export interface NoteInfo {
  noteY: number;
  ledgerY?: number;
  freq: number;    // Hz for Web Audio
}

export const NOTE_DEFS: Record<string, NoteInfo> = {
  'ド':     { noteY: 100, ledgerY: 100, freq: 261.63 },
  'レ':     { noteY: 94,                freq: 293.66 },
  'ミ':     { noteY: 88,                freq: 329.63 },
  'ファ':   { noteY: 82,                freq: 349.23 },
  'ソ':     { noteY: 76,                freq: 392.00 },
  'ラ':     { noteY: 70,                freq: 440.00 },
  'シ':     { noteY: 64,                freq: 493.88 },
  '高いド': { noteY: 58,                freq: 523.25 },
  '高いレ': { noteY: 52,                freq: 587.33 },
};

// All note names in ascending pitch order
const ALL_NOTES = ['ド','レ','ミ','ファ','ソ','ラ','シ','高いド','高いレ'];

export interface MelodySequence {
  id: string;
  difficulty: number; // 1–5
  notes: string[];    // must all be keys of NOTE_DEFS
}

export const MELODIES: MelodySequence[] = [
  // ── Diff 1: 3 notes, step motion (ド–ソ range) ──────────────────────────
  { id: 'mel-1',  difficulty: 1, notes: ['ド','レ','ミ'] },
  { id: 'mel-2',  difficulty: 1, notes: ['ミ','レ','ド'] },
  { id: 'mel-3',  difficulty: 1, notes: ['ソ','ラ','ソ'] },
  { id: 'mel-4',  difficulty: 1, notes: ['レ','ミ','ファ'] },
  { id: 'mel-5',  difficulty: 1, notes: ['ファ','ミ','レ'] },

  // ── Diff 2: 4 notes, step motion (ド–ラ range) ──────────────────────────
  { id: 'mel-6',  difficulty: 2, notes: ['ド','レ','ミ','ファ'] },
  { id: 'mel-7',  difficulty: 2, notes: ['ファ','ミ','レ','ド'] },
  { id: 'mel-8',  difficulty: 2, notes: ['ソ','ラ','シ','ラ'] },
  { id: 'mel-9',  difficulty: 2, notes: ['ミ','ファ','ソ','ラ'] },
  { id: 'mel-10', difficulty: 2, notes: ['ラ','ソ','ファ','ミ'] },

  // ── Diff 3: 4 notes, small skips ────────────────────────────────────────
  { id: 'mel-11', difficulty: 3, notes: ['ド','ミ','ソ','ミ'] },
  { id: 'mel-12', difficulty: 3, notes: ['ソ','ミ','レ','ド'] },
  { id: 'mel-13', difficulty: 3, notes: ['ミ','ソ','ラ','ソ'] },
  { id: 'mel-14', difficulty: 3, notes: ['シ','ソ','ミ','ド'] },
  { id: 'mel-15', difficulty: 3, notes: ['ド','ミ','ラ','シ'] },

  // ── Diff 4: 5 notes, wider leaps ────────────────────────────────────────
  { id: 'mel-16', difficulty: 4, notes: ['ド','ミ','ソ','ミ','ド'] },
  { id: 'mel-17', difficulty: 4, notes: ['ソ','ミ','ド','レ','ミ'] },
  { id: 'mel-18', difficulty: 4, notes: ['ド','レ','ミ','ソ','ラ'] },
  { id: 'mel-19', difficulty: 4, notes: ['ラ','ソ','ミ','レ','ド'] },
  { id: 'mel-20', difficulty: 4, notes: ['ミ','ソ','シ','ソ','ミ'] },

  // ── Diff 5: 5 notes, high-note range ────────────────────────────────────
  { id: 'mel-21', difficulty: 5, notes: ['ド','ソ','高いド','ソ','ミ'] },
  { id: 'mel-22', difficulty: 5, notes: ['ミ','高いド','シ','ソ','ミ'] },
  { id: 'mel-23', difficulty: 5, notes: ['ソ','シ','高いド','高いレ','高いド'] },
  { id: 'mel-24', difficulty: 5, notes: ['ド','ミ','ソ','シ','高いド'] },
];

/**
 * Returns note buttons to show for a melody: full chromatic range between
 * (lowest note − 1) and (highest note + 1) for plausible wrong answers.
 */
export function getMelodyButtons(melody: MelodySequence): string[] {
  const indices = melody.notes.map(n => ALL_NOTES.indexOf(n)).filter(i => i >= 0);
  const lo = Math.max(0, Math.min(...indices) - 1);
  const hi = Math.min(ALL_NOTES.length - 1, Math.max(...indices) + 1);
  return ALL_NOTES.slice(lo, hi + 1);
}

/** X positions (px) for n notes across the staff (treble clef at left). */
export function getNoteXPositions(count: number): number[] {
  const startX = 78;
  const endX   = 245;
  return Array.from({ length: count }, (_, i) =>
    Math.round(count === 1 ? 160 : startX + (i * (endX - startX)) / (count - 1)),
  );
}

/** Pick 5 melodies suited to the player's quiz level. */
export function selectMelodies(quizLevel: number): MelodySequence[] {
  const lo = Math.max(1, quizLevel - 1);
  const hi = Math.min(5, quizLevel + 1);
  const primary  = MELODIES.filter(m => m.difficulty >= lo && m.difficulty <= hi);
  const fallback = MELODIES.filter(m => !primary.includes(m));
  const pool = [...primary.sort(() => Math.random() - 0.5), ...fallback.sort(() => Math.random() - 0.5)];
  return pool.slice(0, 5);
}

// ─── Web Audio helpers (called from the component) ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAudioContext = AudioContext & { state: string };

export function getOrCreateAudioCtx(ref: { current: AnyAudioContext | null }): AnyAudioContext {
  if (!ref.current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext;
    ref.current = new AC() as AnyAudioContext;
  }
  if (ref.current.state === 'suspended') ref.current.resume();
  return ref.current;
}

export function playPianoNote(freq: number, ctx: AudioContext): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.55, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  // Fundamental + harmonics for a piano-ish tone
  ([
    [freq,     0.50],
    [freq * 2, 0.18],
    [freq * 3, 0.07],
  ] as [number, number][]).forEach(([f, g]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(master);
    osc.type = 'triangle';
    osc.frequency.value = f;
    gain.gain.value = g;
    osc.start(now); osc.stop(now + 1.2);
  });
}

export function playErrorSound(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(210, now);
  osc.frequency.exponentialRampToValueAtTime(105, now + 0.18);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.start(now); osc.stop(now + 0.18);
}
