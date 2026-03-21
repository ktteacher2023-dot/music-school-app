import type { MusicQuestion } from './musicQuizData';
import { BEGINNER_QUESTIONS } from './musicQuizData';

const PROGRESS_KEY = 'music_quiz_progress_v1';

export interface QRecord {
  w: number;  // wrong count (total)
  s: number;  // current correct streak
}

export interface MusicProgress {
  level: number;          // quiz difficulty level 1–5
  records: Record<string, QRecord>;
  lastWrongIds: string[]; // wrong answers from last game
}

const DEFAULT: MusicProgress = { level: 1, records: {}, lastWrongIds: [] };

export const LEVEL_LABELS: Record<number, string> = {
  1: 'ドレミ（超かんたん）',
  2: 'ドレミファソ（かんたん）',
  3: '音符読み（ふつう）',
  4: '音楽記号（むずかしい）',
  5: '達人（超むずかしい）',
};

/** How many questions per game session for each level */
export function getSessionCount(level: number): number {
  return level === 1 ? 3 : 5;
}

export function loadProgress(): MusicProgress {
  if (typeof window === 'undefined') return { ...DEFAULT };
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null') }; }
  catch { return { ...DEFAULT }; }
}

export function saveProgress(p: MusicProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

/** IDs with ≥2 wrong answers and streak < 3 (still needs reinforcement) */
export function getWeakIds(p: MusicProgress): string[] {
  return Object.entries(p.records)
    .filter(([, r]) => r.w >= 2 && r.s < 3)
    .map(([id]) => id);
}

/** Update records + level after a game. Returns the updated progress. */
export function finishGame(
  p: MusicProgress,
  results: { id: string; correct: boolean }[],
  score: number,
  total: number,
): MusicProgress {
  const records = { ...p.records };
  const wrongIds: string[] = [];

  for (const { id, correct } of results) {
    const prev = records[id] ?? { w: 0, s: 0 };
    records[id] = correct
      ? { w: prev.w,     s: prev.s + 1 }
      : { w: prev.w + 1, s: 0 };
    if (!correct) wrongIds.push(id);
  }

  // Level 1: must get ALL correct (3/3) to advance
  // Level 2+: need ≥80% (4/5) to advance
  const threshold = p.level === 1 ? total : Math.ceil(total * 0.8);
  const newLevel = (score >= threshold && p.level < 5) ? p.level + 1 : p.level;
  return { level: newLevel, records, lastWrongIds: wrongIds };
}

/** Adaptive question selection: prioritises review + level-appropriate questions */
export function selectAdaptive(
  all: MusicQuestion[],
  p: MusicProgress,
  count = 5,
): { question: MusicQuestion; isReview: boolean }[] {
  const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  // ── Levels 1 & 2: use beginner-only pool, no adaptive review logic ──────────
  if (p.level <= 2) {
    const pool = BEGINNER_QUESTIONS.filter(q => q.difficulty === p.level);
    return shuffle(pool).slice(0, count).map(q => ({ question: q, isReview: false }));
  }

  // ── Level 3+: adaptive selection from full question set ─────────────────────
  const weakSet   = new Set(getWeakIds(p));
  const wrongSet  = new Set(p.lastWrongIds);
  const reviewSet = new Set([...weakSet, ...wrongSet]);

  const review  = shuffle(all.filter(q => reviewSet.has(q.id)));
  const onLevel = shuffle(all.filter(q =>
    !reviewSet.has(q.id) &&
    q.difficulty >= Math.max(1, p.level - 1) &&
    q.difficulty <= p.level + 1,
  ));
  const fallback = shuffle(all.filter(q => !reviewSet.has(q.id)));

  const picked: { question: MusicQuestion; isReview: boolean }[] = [];

  for (const q of review.slice(0, Math.min(2, count - 1))) {
    picked.push({ question: q, isReview: true });
  }
  for (const q of onLevel) {
    if (picked.length >= count) break;
    picked.push({ question: q, isReview: false });
  }
  const usedIds = new Set(picked.map(x => x.question.id));
  for (const q of fallback) {
    if (picked.length >= count) break;
    if (!usedIds.has(q.id)) picked.push({ question: q, isReview: false });
  }

  return shuffle(picked).slice(0, count);
}
