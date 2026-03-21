// Staff SVG: lines at y = [40, 52, 64, 76, 88]
// Note Y positions on treble clef:
//   C4=100(+ledger), D4=94, E4=88, F4=82, G4=76,
//   A4=70, B4=64, C5=58, D5=52, E5=46, F5=40

export interface NoteQuestion {
  id: string;
  type: 'note';
  difficulty: number;   // 1–5
  noteY: number;
  ledgerY?: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface SymbolQuestion {
  id: string;
  type: 'symbol';
  difficulty: number;   // 1–5
  symbol: string;
  symbolSize: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export type MusicQuestion = NoteQuestion | SymbolQuestion;

export const ALL_QUESTIONS: MusicQuestion[] = [

  // ─── 難易度1: ド〜ソ + シャープ・フラット ───────────────────────────────
  {
    id: 'n-c4', type: 'note', difficulty: 1,
    noteY: 100, ledgerY: 100,
    question: 'この音符は何の音？',
    choices: ['ド', 'レ', 'シ', 'ミ'], correctIndex: 0,
    explanation: '五線の下に「加線」が1本ある音がド（C）です！',
  },
  {
    id: 'n-d4', type: 'note', difficulty: 1,
    noteY: 94,
    question: 'この音符は何の音？',
    choices: ['ミ', 'ド', 'レ', 'シ'], correctIndex: 2,
    explanation: '一番下の線のすぐ下の空間がレ（D）です！',
  },
  {
    id: 'n-e4', type: 'note', difficulty: 1,
    noteY: 88,
    question: 'この音符は何の音？',
    choices: ['ド', 'ミ', 'ファ', 'レ'], correctIndex: 1,
    explanation: '一番下の線の上の音がミ（E）です！',
  },
  {
    id: 'n-f4', type: 'note', difficulty: 1,
    noteY: 82,
    question: 'この音符は何の音？',
    choices: ['ソ', 'レ', 'ミ', 'ファ'], correctIndex: 3,
    explanation: '1番目と2番目の線の間の音がファ（F）です！',
  },
  {
    id: 'n-g4', type: 'note', difficulty: 1,
    noteY: 76,
    question: 'この音符は何の音？',
    choices: ['ソ', 'ミ', 'ファ', 'ラ'], correctIndex: 0,
    explanation: '下から2番目の線の上の音がソ（G）です！',
  },
  {
    id: 's-sharp', type: 'symbol', difficulty: 1,
    symbol: '♯', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['フラット', 'ナチュラル', 'シャープ', 'フェルマータ'], correctIndex: 2,
    explanation: '♯は「シャープ」！その音を半音高くします。',
  },
  {
    id: 's-flat', type: 'symbol', difficulty: 1,
    symbol: '♭', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['フラット', 'シャープ', 'ナチュラル', 'アクセント'], correctIndex: 0,
    explanation: '♭は「フラット」！その音を半音低くします。',
  },

  // ─── 難易度2: ラ〜高いド + f/p/♮ ────────────────────────────────────────
  {
    id: 'n-a4', type: 'note', difficulty: 2,
    noteY: 70,
    question: 'この音符は何の音？',
    choices: ['シ', 'ラ', 'ファ', 'ソ'], correctIndex: 1,
    explanation: '2番目と3番目の線の間の音がラ（A）です！',
  },
  {
    id: 'n-b4', type: 'note', difficulty: 2,
    noteY: 64,
    question: 'この音符は何の音？',
    choices: ['シ', 'ソ', 'ラ', 'ド'], correctIndex: 0,
    explanation: '五線の真ん中（3本目）の線の上がシ（B）です！',
  },
  {
    id: 'n-c5', type: 'note', difficulty: 2,
    noteY: 58,
    question: 'この音符は何の音？',
    choices: ['レ', 'ド', 'シ', 'ラ'], correctIndex: 1,
    explanation: '3番目と4番目の線の間の音が高いド（C5）です♪',
  },
  {
    id: 's-forte', type: 'symbol', difficulty: 2,
    symbol: 'f', symbolSize: 80,
    question: 'この記号はどんな意味？',
    choices: ['弱く', '強く', 'だんだん強く', 'だんだん遅く'], correctIndex: 1,
    explanation: '「f（フォルテ）」は強く・大きな音で弾く記号です！',
  },
  {
    id: 's-piano', type: 'symbol', difficulty: 2,
    symbol: 'p', symbolSize: 80,
    question: 'この記号はどんな意味？',
    choices: ['強く', 'だんだん遅く', '弱く', 'だんだん速く'], correctIndex: 2,
    explanation: '「p（ピアノ）」は弱く・小さな音で弾く記号です！',
  },
  {
    id: 's-natural', type: 'symbol', difficulty: 2,
    symbol: '♮', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['シャープ', 'フラット', 'ナチュラル', 'フォルテ'], correctIndex: 2,
    explanation: '♮は「ナチュラル」！シャープ・フラットを取り消して元の音に戻します。',
  },

  // ─── 難易度3: 高いレ〜ミ + ff/pp/mf/mp ──────────────────────────────────
  {
    id: 'n-d5', type: 'note', difficulty: 3,
    noteY: 52,
    question: 'この音符は何の音？',
    choices: ['ド', '高いレ', 'シ', '高いミ'], correctIndex: 1,
    explanation: '下から4番目の線の上が高いレ（D5）です！',
  },
  {
    id: 'n-e5', type: 'note', difficulty: 3,
    noteY: 46,
    question: 'この音符は何の音？',
    choices: ['高いレ', '高いミ', '高いファ', 'ド'], correctIndex: 1,
    explanation: '4番目と5番目の線の間が高いミ（E5）です！',
  },
  {
    id: 's-ff', type: 'symbol', difficulty: 3,
    symbol: 'ff', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['少し強く', 'とても強く', '少し弱く', 'とても弱く'], correctIndex: 1,
    explanation: '「ff（フォルテッシモ）」はとても強く弾く記号！',
  },
  {
    id: 's-pp', type: 'symbol', difficulty: 3,
    symbol: 'pp', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['とても弱く', 'とても強く', '少し強く', '少し弱く'], correctIndex: 0,
    explanation: '「pp（ピアニッシモ）」はとても弱く弾く記号！',
  },
  {
    id: 's-mf', type: 'symbol', difficulty: 3,
    symbol: 'mf', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['少し弱く', 'とても強く', '少し強く', 'とても弱く'], correctIndex: 2,
    explanation: '「mf（メゾフォルテ）」は少し強めに弾く記号です！',
  },
  {
    id: 's-mp', type: 'symbol', difficulty: 3,
    symbol: 'mp', symbolSize: 64,
    question: 'この記号はどんな意味？',
    choices: ['とても弱く', '少し弱く', '少し強く', 'とても強く'], correctIndex: 1,
    explanation: '「mp（メゾピアノ）」は少し弱めに弾く記号です！',
  },

  // ─── 難易度4: 高いファ + アクセント/rit./cresc. ─────────────────────────
  {
    id: 'n-f5', type: 'note', difficulty: 4,
    noteY: 40,
    question: 'この音符は何の音？',
    choices: ['高いミ', '高いファ', '高いソ', '高いレ'], correctIndex: 1,
    explanation: '五線の一番上の線の上が高いファ（F5）です！',
  },
  {
    id: 's-accent', type: 'symbol', difficulty: 4,
    symbol: '>', symbolSize: 72,
    question: 'この記号はどんな意味？',
    choices: ['だんだん遅く', 'だんだん速く', 'とても強く', 'その音だけ強く'], correctIndex: 3,
    explanation: '「>（アクセント）」はその音だけを特に強調して弾く記号！',
  },
  {
    id: 's-rit', type: 'symbol', difficulty: 4,
    symbol: 'rit.', symbolSize: 38,
    question: 'この記号はどんな意味？',
    choices: ['だんだん速く', 'だんだん遅く', 'だんだん強く', 'だんだん弱く'], correctIndex: 1,
    explanation: '「rit.（リタルダンド）」はだんだんゆっくりしていく記号！',
  },
  {
    id: 's-cresc', type: 'symbol', difficulty: 4,
    symbol: 'cresc.', symbolSize: 32,
    question: 'この記号はどんな意味？',
    choices: ['だんだん弱く', 'だんだん強く', 'だんだん遅く', 'だんだん速く'], correctIndex: 1,
    explanation: '「cresc.（クレッシェンド）」はだんだん強くなっていく記号！',
  },

  // ─── 難易度5: 高いソ + dim./フェルマータ/スタッカート ────────────────────
  {
    id: 'n-g5', type: 'note', difficulty: 5,
    noteY: 34,
    question: 'この音符は何の音？',
    choices: ['高いソ', '高いファ', '高いラ', '高いミ'], correctIndex: 0,
    explanation: '五線の一番上の線のすぐ上の空間が高いソ（G5）です！',
  },
  {
    id: 's-dim', type: 'symbol', difficulty: 5,
    symbol: 'dim.', symbolSize: 32,
    question: 'この記号はどんな意味？',
    choices: ['だんだん強く', 'だんだん速く', 'だんだん弱く', 'だんだん遅く'], correctIndex: 2,
    explanation: '「dim.（ディミヌエンド）」はだんだん弱くなっていく記号！',
  },
  {
    id: 's-fermata', type: 'symbol', difficulty: 5,
    symbol: '𝄐', symbolSize: 72,
    question: 'この記号の名前は？',
    choices: ['アクセント', 'フェルマータ', 'スタッカート', 'テヌート'], correctIndex: 1,
    explanation: '「𝄐（フェルマータ）」はその音符を十分に伸ばして演奏する記号！',
  },
  {
    id: 's-staccato', type: 'symbol', difficulty: 5,
    symbol: '•', symbolSize: 80,
    question: 'この記号の名前は？',
    choices: ['レガート', 'テヌート', 'アクセント', 'スタッカート'], correctIndex: 3,
    explanation: '「•（スタッカート）」はその音を短く切って弾く記号！',
  },
];

/** Quick lookup by ID */
export function getQuestionById(id: string): MusicQuestion | undefined {
  return ALL_QUESTIONS.find(q => q.id === id);
}

// ─── 初心者専用問題プール（レベル1: ドレミ3択 / レベル2: ドレミファソ4択） ─────
// choices を意図的に少なく・隣接音だけに絞って確実にクリアできる設計
export const BEGINNER_QUESTIONS: NoteQuestion[] = [
  // ── Level 1: ド・レ・ミ のみ ─────────────────────────────────────────────
  {
    id: 'b-do', type: 'note', difficulty: 1,
    noteY: 100, ledgerY: 100,
    question: 'この音は何の音？',
    choices: ['ド', 'レ', 'ミ'], correctIndex: 0,
    explanation: 'これはドだよ！五線の下の小さな線（加線）の上にある音だよ。',
  },
  {
    id: 'b-re', type: 'note', difficulty: 1,
    noteY: 94,
    question: 'この音は何の音？',
    choices: ['ド', 'レ', 'ミ'], correctIndex: 1,
    explanation: 'これはレだよ！一番下の線のすぐ下の空間にある音だよ。',
  },
  {
    id: 'b-mi', type: 'note', difficulty: 1,
    noteY: 88,
    question: 'この音は何の音？',
    choices: ['ド', 'レ', 'ミ'], correctIndex: 2,
    explanation: 'これはミだよ！一番下の線の上にある音だよ。',
  },
  // ── Level 2: ド〜ソ（4択） ────────────────────────────────────────────────
  {
    id: 'b-do2', type: 'note', difficulty: 2,
    noteY: 100, ledgerY: 100,
    question: 'この音は何の音？',
    choices: ['ド', 'レ', 'ファ', 'ソ'], correctIndex: 0,
    explanation: 'これはドだよ！五線の下の加線の上にある音だよ。',
  },
  {
    id: 'b-re2', type: 'note', difficulty: 2,
    noteY: 94,
    question: 'この音は何の音？',
    choices: ['ド', 'レ', 'ミ', 'ファ'], correctIndex: 1,
    explanation: 'これはレだよ！一番下の線のすぐ下の空間にある音だよ。',
  },
  {
    id: 'b-mi2', type: 'note', difficulty: 2,
    noteY: 88,
    question: 'この音は何の音？',
    choices: ['レ', 'ミ', 'ファ', 'ソ'], correctIndex: 1,
    explanation: 'これはミだよ！一番下の線の上にある音だよ。',
  },
  {
    id: 'b-fa', type: 'note', difficulty: 2,
    noteY: 82,
    question: 'この音は何の音？',
    choices: ['ド', 'ミ', 'ファ', 'ソ'], correctIndex: 2,
    explanation: 'これはファだよ！1本目と2本目の線の間の空間にある音だよ。',
  },
  {
    id: 'b-so', type: 'note', difficulty: 2,
    noteY: 76,
    question: 'この音は何の音？',
    choices: ['ミ', 'ファ', 'ソ', 'ラ'], correctIndex: 2,
    explanation: 'これはソだよ！下から2本目の線の上にある音だよ。',
  },
];
