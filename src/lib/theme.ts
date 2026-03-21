import type { CharacterType } from './profile';
import { MONSTERS } from './gameData';
import { COMPANIONS } from './companionData';

type CreatureList = ReadonlyArray<{
  readonly id: number;
  readonly name: string;
  readonly emoji: string;
  readonly sub: string;
  readonly from: string;
  readonly to: string;
  readonly baseHp: number;
}>;

export interface ThemeConfig {
  type: CharacterType;
  // Colors
  bgPage: string;
  primary: string;
  coinEmoji: string;
  coinColor: string;
  xpBarGradient: string;
  // Game labels
  hpLabel: string;
  xpLabel: string;
  defeatLabel: string;
  defeatEmoji: string;
  enemyCountLabel: string;
  encyclopediaLabel: string;
  encyclopediaTitle: string;
  completedNextMsg: string;
  previewLabel: string;
  counterPrefix: string;
  pinchLabel: string;
  arenaLabel: string;
  attackLabel: string;
  attackVideoLabel: string;
  attackStreakLabel: (lbl: string) => string;
  finisherLabel: string;
  lowHpEmoji: string;
  defeatCreatureEmoji: string;
  // Creatures
  creatures: CreatureList;
  // FX
  sparkle: boolean;
}

const KNIGHT_THEME: ThemeConfig = {
  type: 'knight',
  bgPage: '#070b1a',
  primary: '#007AFF',
  coinEmoji: '🪙',
  coinColor: '#D97706',
  xpBarGradient: 'linear-gradient(90deg,#5856D6,#007AFF)',
  hpLabel: 'HP',
  xpLabel: '経験値 (EXP)',
  defeatLabel: '撃破！',
  defeatEmoji: '🎉',
  enemyCountLabel: '倒した数',
  encyclopediaLabel: '図鑑',
  encyclopediaTitle: 'モンスター図鑑',
  completedNextMsg: 'また明日モンスターを倒そう！',
  previewLabel: '予測ダメージ: ',
  counterPrefix: 'MONSTER',
  pinchLabel: 'ピンチ！',
  arenaLabel: '⚔️ 練習して攻撃！',
  attackLabel: '⚔️ 攻撃！',
  attackVideoLabel: '⚔️ 動画と一緒に攻撃！',
  attackStreakLabel: (lbl) => `🔥 ${lbl}で攻撃！`,
  finisherLabel: '— 撃破！⚡',
  lowHpEmoji: '😡',
  defeatCreatureEmoji: '💀',
  creatures: MONSTERS,
  sparkle: false,
};

const PRINCESS_THEME: ThemeConfig = {
  type: 'princess',
  bgPage: '#FFF0F8',
  primary: '#FF6B9D',
  coinEmoji: '⭐',
  coinColor: '#FF6B9D',
  xpBarGradient: 'linear-gradient(90deg,#FF6B9D,#C77DFF)',
  hpLabel: 'きずな',
  xpLabel: 'きらきら (EXP)',
  defeatLabel: 'なかよし！',
  defeatEmoji: '✨',
  enemyCountLabel: 'なかよし数',
  encyclopediaLabel: 'ずかん',
  encyclopediaTitle: 'なかまずかん',
  completedNextMsg: 'また明日妖精と遊ぼう！',
  previewLabel: 'きずなポイント: ',
  counterPrefix: 'FAIRY',
  pinchLabel: 'もうすぐ！',
  arenaLabel: '🎵 練習してなかよしになろう！',
  attackLabel: '🎵 なかよしになる！',
  attackVideoLabel: '🎵 動画といっしょに！',
  attackStreakLabel: (lbl) => `🌟 ${lbl}でなかよし！`,
  finisherLabel: '— なかよし！✨',
  lowHpEmoji: '🥺',
  defeatCreatureEmoji: '✨',
  creatures: COMPANIONS,
  sparkle: true,
};

export function getTheme(type: CharacterType = 'knight'): ThemeConfig {
  return type === 'princess' ? PRINCESS_THEME : KNIGHT_THEME;
}
