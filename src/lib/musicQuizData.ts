// Staff lines are at y = [40, 52, 64, 76, 88] in the SVG
// Lines represent (bottom→top): E4=88, G4=76, B4=64, D5=52, F5=40
// Note Y positions:
//   C4(ド)=100(+ledger), D4(レ)=94, E4(ミ)=88, F4(ファ)=82
//   G4(ソ)=76, A4(ラ)=70, B4(シ)=64, C5(高ド)=58

export interface NoteQuestion {
  type: 'note';
  noteY: number;
  ledgerY?: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface SymbolQuestion {
  type: 'symbol';
  symbol: string;
  symbolSize: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export type MusicQuestion = NoteQuestion | SymbolQuestion;

export const ALL_QUESTIONS: MusicQuestion[] = [
  // ─── 音符 (Notes) ───
  {
    type: 'note', noteY: 100, ledgerY: 100,
    question: 'この音符は何の音？',
    choices: ['ド', 'レ', 'シ', 'ミ'], correctIndex: 0,
    explanation: '五線の下に「加線（かせん）」が1本ある音がド（C）です！',
  },
  {
    type: 'note', noteY: 94,
    question: 'この音符は何の音？',
    choices: ['ミ', 'ド', 'レ', 'シ'], correctIndex: 2,
    explanation: '五線の一番下の線のすぐ下の空間がレ（D）です！',
  },
  {
    type: 'note', noteY: 88,
    question: 'この音符は何の音？',
    choices: ['ド', 'ミ', 'ファ', 'レ'], correctIndex: 1,
    explanation: '五線の一番下の線の上の音がミ（E）です！',
  },
  {
    type: 'note', noteY: 82,
    question: 'この音符は何の音？',
    choices: ['ソ', 'レ', 'ミ', 'ファ'], correctIndex: 3,
    explanation: '1番目と2番目の線の間の音がファ（F）です！',
  },
  {
    type: 'note', noteY: 76,
    question: 'この音符は何の音？',
    choices: ['ソ', 'ミ', 'ファ', 'ラ'], correctIndex: 0,
    explanation: '下から2番目の線の上の音がソ（G）です！',
  },
  {
    type: 'note', noteY: 70,
    question: 'この音符は何の音？',
    choices: ['シ', 'ラ', 'ファ', 'ソ'], correctIndex: 1,
    explanation: '2番目と3番目の線の間の音がラ（A）です！',
  },
  {
    type: 'note', noteY: 64,
    question: 'この音符は何の音？',
    choices: ['シ', 'ソ', 'ラ', 'ド'], correctIndex: 0,
    explanation: '五線の真ん中（3本目）の線の上の音がシ（B）です！',
  },
  {
    type: 'note', noteY: 58,
    question: 'この音符は何の音？',
    choices: ['レ', 'ド', 'シ', 'ラ'], correctIndex: 1,
    explanation: '3番目と4番目の線の間の音が高いド（C5）です♪',
  },

  // ─── 記号 (Symbols) ───
  {
    type: 'symbol', symbol: '♯', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['フラット', 'ナチュラル', 'シャープ', 'フェルマータ'], correctIndex: 2,
    explanation: '♯は「シャープ」！その音を半音（はんおん）高くします。',
  },
  {
    type: 'symbol', symbol: '♭', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['フラット', 'シャープ', 'ナチュラル', 'アクセント'], correctIndex: 0,
    explanation: '♭は「フラット」！その音を半音（はんおん）低くします。',
  },
  {
    type: 'symbol', symbol: '♮', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['シャープ', 'フラット', 'ナチュラル', 'フォルテ'], correctIndex: 2,
    explanation: '♮は「ナチュラル」！シャープ・フラットを取り消して元の音に戻します。',
  },
  {
    type: 'symbol', symbol: 'f', symbolSize: 80,
    question: 'この記号はどんな意味？',
    choices: ['弱く', '強く', 'だんだん強く', 'だんだん遅く'], correctIndex: 1,
    explanation: '「f（フォルテ）」は強く・大きな音で弾く記号です！',
  },
  {
    type: 'symbol', symbol: 'p', symbolSize: 80,
    question: 'この記号はどんな意味？',
    choices: ['強く', 'だんだん遅く', '弱く', 'だんだん速く'], correctIndex: 2,
    explanation: '「p（ピアノ）」は弱く・小さな音で弾く記号です！',
  },
  {
    type: 'symbol', symbol: 'ff', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['少し強く', 'とても強く', '少し弱く', 'とても弱く'], correctIndex: 1,
    explanation: '「ff（フォルテッシモ）」はとても強く（とても大きな音で）弾く記号！',
  },
  {
    type: 'symbol', symbol: 'pp', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['とても弱く', 'とても強く', '少し強く', '少し弱く'], correctIndex: 0,
    explanation: '「pp（ピアニッシモ）」はとても弱く（とても小さな音で）弾く記号！',
  },
  {
    type: 'symbol', symbol: 'mf', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['少し弱く', 'とても強く', '少し強く', 'とても弱く'], correctIndex: 2,
    explanation: '「mf（メゾフォルテ）」は少し強めに弾く記号です！',
  },
  {
    type: 'symbol', symbol: '>', symbolSize: 72,
    question: 'この記号はどんな意味？',
    choices: ['だんだん遅く', 'だんだん速く', 'とても強く', 'その音だけ強く'], correctIndex: 3,
    explanation: '「>（アクセント）」はその音だけを特に強調して弾く記号！',
  },
  {
    type: 'symbol', symbol: 'rit.', symbolSize: 38,
    question: 'この記号はどんな意味？',
    choices: ['だんだん速く', 'だんだん遅く', 'だんだん強く', 'だんだん弱く'], correctIndex: 1,
    explanation: '「rit.（リタルダンド）」はだんだんゆっくりしていく記号！',
  },
];

/** Randomly pick `count` questions from the full pool */
export function sampleQuestions(count = 5): MusicQuestion[] {
  return [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, count);
}
