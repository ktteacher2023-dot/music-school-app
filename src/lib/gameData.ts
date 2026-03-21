// ─── Monster roster (12体) ─────────────────────────────────────────────────────
export const MONSTERS = [
  { id: 0,  name: 'グリーンスライム', emoji: '👾', sub: '最弱の魔物…でも油断禁物！',      from: '#4ADE80', to: '#16A34A', baseHp: 80  },
  { id: 1,  name: 'コウモリナイト',   emoji: '🦇', sub: '闇夜を飛ぶ偵察兵',              from: '#94A3B8', to: '#334155', baseHp: 110 },
  { id: 2,  name: 'ゴブリン',         emoji: '👺', sub: 'トリッキーないたずら者',          from: '#FB923C', to: '#C2410C', baseHp: 140 },
  { id: 3,  name: 'スケルトン',       emoji: '💀', sub: '甦った骸骨の戦士',               from: '#CBD5E1', to: '#475569', baseHp: 180 },
  { id: 4,  name: 'オーガ',           emoji: '👹', sub: '怒り狂う巨大な鬼',               from: '#F87171', to: '#B91C1C', baseHp: 220 },
  { id: 5,  name: '音符の精霊',       emoji: '🎵', sub: '音楽を食らう神秘の精',           from: '#818CF8', to: '#4338CA', baseHp: 270 },
  { id: 6,  name: 'ドラゴン',         emoji: '🐉', sub: '炎を吐く古代の支配者',           from: '#FB923C', to: '#9F1239', baseHp: 340 },
  { id: 7,  name: 'まものウィザード', emoji: '🧙', sub: '暗黒魔法を操る大賢者',           from: '#A78BFA', to: '#5B21B6', baseHp: 400 },
  { id: 8,  name: 'ゴールドゴーレム', emoji: '🗿', sub: '黄金で作られた不壊の守護者',     from: '#FCD34D', to: '#B45309', baseHp: 480 },
  { id: 9,  name: 'フェニックス',     emoji: '🦅', sub: '炎から何度でも甦る不死鳥',       from: '#F97316', to: '#881337', baseHp: 560 },
  { id: 10, name: 'アイスビースト',   emoji: '❄️', sub: '氷河を統べる冷酷な支配者',       from: '#67E8F9', to: '#1D4ED8', baseHp: 650 },
  { id: 11, name: '音楽の魔王',       emoji: '👑', sub: '音楽世界の究極の支配者！討て！', from: '#F59E0B', to: '#7C3AED', baseHp: 999 },
] as const;

export type MonsterDef = typeof MONSTERS[number];

/** 周回するたびにHPが50%増し */
export function calcMonsterHp(monsterIndex: number): number {
  const cycle = Math.floor(monsterIndex / MONSTERS.length);
  const base  = MONSTERS[monsterIndex % MONSTERS.length].baseHp;
  return Math.round(base * Math.pow(1.5, cycle));
}

// ─── Title / 称号 ──────────────────────────────────────────────────────────────
export const TITLES = [
  { minLevel: 1,  title: 'ピアノ見習い',  icon: '🌱', color: '#8E8E93' },
  { minLevel: 3,  title: '音楽の卵',      icon: '🥚', color: '#34C759' },
  { minLevel: 5,  title: 'リズムの探検家',icon: '🗺️', color: '#007AFF' },
  { minLevel: 8,  title: 'メロディの戦士',icon: '⚔️', color: '#5856D6' },
  { minLevel: 12, title: '音の魔術師',    icon: '🔮', color: '#FF9F0A' },
  { minLevel: 17, title: '伝説の演奏家',  icon: '🌟', color: '#FF3B30' },
  { minLevel: 25, title: '音楽の神',      icon: '👑', color: '#FFD700' },
] as const;

export function getTitle(level: number) {
  return [...TITLES].reverse().find((t) => level >= t.minLevel) ?? TITLES[0];
}

/** Lv 計算: 累計XP → レベル (1 + floor(√(xp/50))) */
export function calcLevel(totalXp: number): number {
  return 1 + Math.floor(Math.sqrt(totalXp / 50));
}

/** Lv → 次のLvに必要な累計XP */
export function xpForLevel(level: number): number {
  return Math.pow(level, 2) * 50;
}

// ─── Streak bonus ─────────────────────────────────────────────────────────────
export function streakMultiplier(streak: number): number {
  if (streak >= 7) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

export function streakLabel(streak: number): string | null {
  if (streak >= 7) return `🔥×7 超コンボ！`;
  if (streak >= 3) return `🔥×3 コンボ！`;
  return null;
}

/** 昨日の日付文字列を返す */
export function getYesterday(today: string): string {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
