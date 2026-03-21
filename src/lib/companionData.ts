// ─── Princess mode: 12 companions (妖精・魔法のペット) ──────────────────────────
// MONSTERS と同じ baseHp 値にすることで calcMonsterHp が共通利用できる

export const COMPANIONS = [
  { id: 0,  name: 'ドレミ妖精',     emoji: '🌸', sub: '音符をまとった元気な妖精。いつも歌っている。',           from: '#FFB7C5', to: '#FF6B9D', baseHp: 80  },
  { id: 1,  name: 'ちょうちょ精霊', emoji: '🦋', sub: '音楽にのってひらひら舞う魔法の蝶。',                     from: '#DDA0DD', to: '#9B59B6', baseHp: 110 },
  { id: 2,  name: 'お月さま妖精',   emoji: '🌙', sub: '夜空に光る神秘的な月の精霊。',                           from: '#B39DDB', to: '#7E57C2', baseHp: 140 },
  { id: 3,  name: 'きらきら星精霊', emoji: '⭐', sub: '夜空からやってきた光り輝く星の妖精。',                   from: '#FFE082', to: '#FFB300', baseHp: 180 },
  { id: 4,  name: 'お花の妖精',     emoji: '🌺', sub: '花びらをまとった春風の妖精。甘い香りがする。',           from: '#F48FB1', to: '#E91E63', baseHp: 220 },
  { id: 5,  name: 'ユニコーン',     emoji: '🦄', sub: '七色の虹を駆ける不思議な魔法の馬。',                     from: '#CE93D8', to: '#AB47BC', baseHp: 270 },
  { id: 6,  name: '音符の妖精',     emoji: '🎶', sub: '音楽の力で世界を彩る不思議な精霊。',                     from: '#80DEEA', to: '#00BCD4', baseHp: 340 },
  { id: 7,  name: '魔法のネコ',     emoji: '🐱', sub: '星の魔法を使える神秘の猫。願いを叶えてくれる。',         from: '#FFAB91', to: '#FF7043', baseHp: 400 },
  { id: 8,  name: '虹の精霊',       emoji: '🌈', sub: '雨の後に現れる七色の精霊。幸せを運ぶ。',                 from: '#A5D6A7', to: '#66BB6A', baseHp: 480 },
  { id: 9,  name: '魔法のキツネ',   emoji: '🦊', sub: '森に宿る神様のキツネ。すごい力を持っている。',           from: '#FFCC80', to: '#FF9800', baseHp: 560 },
  { id: 10, name: '虹色ドラゴン',   emoji: '🐲', sub: '虹の橋を守る心優しいドラゴン。なかなか会えない。',       from: '#80CBC4', to: '#26A69A', baseHp: 650 },
  { id: 11, name: '音楽の女王',     emoji: '👸', sub: '音楽世界を治める輝く女王。友達になれたら最高！',         from: '#F48FB1', to: '#AD1457', baseHp: 999 },
] as const;

export type CompanionDef = typeof COMPANIONS[number];
