import { getProfile, patchProfile, type CharacterType } from './profile';

export type BadgeId = 'daily7' | 'expression';

export function getBadges(): { id: BadgeId; awardedAt: number }[] {
  return (getProfile()?.badges ?? []) as { id: BadgeId; awardedAt: number }[];
}

export function hasBadge(id: BadgeId): boolean {
  return getBadges().some(b => b.id === id);
}

/** Awards a badge. Returns true if newly awarded, false if already had it. */
export function awardBadge(id: BadgeId): boolean {
  const existing = getBadges();
  if (existing.some(b => b.id === id)) return false;
  patchProfile({ badges: [...existing, { id, awardedAt: Date.now() }] });
  return true;
}

export interface BadgeDisplayInfo {
  id: BadgeId;
  icon: string;
  name: string;
  sub: string;
  color: string;
  glow: string;
}

export function getBadgeInfo(id: BadgeId, type: CharacterType): BadgeDisplayInfo {
  const isPrincess = type === 'princess';
  if (id === 'daily7') {
    return isPrincess
      ? { id, icon: '👑', name: '魔法の７日間ティアラ', sub: '7日連続練習達成！',   color: '#FFD700', glow: 'rgba(255,215,0,0.7)' }
      : { id, icon: '🎨', name: 'ガチ皆勤賞インク',    sub: '7日連続！ガチ達成！', color: '#FF6B00', glow: 'rgba(255,107,0,0.7)' };
  }
  return isPrincess
    ? { id, icon: '👠', name: '輝くガラスの靴',  sub: '先生から表現力賞！', color: '#FFB7C5', glow: 'rgba(255,183,197,0.7)' }
    : { id, icon: '🏆', name: '黄金のインク瓶', sub: '先生から表現力賞！', color: '#FFD700', glow: 'rgba(255,215,0,0.7)' };
}
