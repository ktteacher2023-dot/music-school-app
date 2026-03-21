'use client';
import { useState } from 'react';
import { sampleQuestions, type MusicQuestion } from '@/lib/musicQuizData';

// EXP reward indexed by score (0–5 correct out of 5)
const EXP_TABLE = [2, 4, 8, 15, 30, 50];

// Staff SVG constants (lines at y = 40, 52, 64, 76, 88)
const STAFF_LINES = [40, 52, 64, 76, 88];
const NOTE_X = 155;

interface Props {
  isPrincess: boolean;
  onGameEnd: (expGained: number) => void;
}

// ─── Staff Note SVG ──────────────────────────────────────────────────────────
function StaffNote({ noteY, ledgerY, color }: { noteY: number; ledgerY?: number; color: string }) {
  const stemUp = noteY > 64;
  return (
    <svg width="280" height="128" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {STAFF_LINES.map(y => (
        <line key={y} x1="50" y1={y} x2="246" y2={y} stroke={color} strokeWidth="1.5"/>
      ))}
      {ledgerY !== undefined && (
        <line x1={NOTE_X - 16} y1={ledgerY} x2={NOTE_X + 16} y2={ledgerY} stroke={color} strokeWidth="1.5"/>
      )}
      {/* Treble clef */}
      <text x="4" y="96"
        style={{ fontSize: '76px', fontFamily: 'serif', fill: color, userSelect: 'none', lineHeight: 1 } as React.CSSProperties}>
        𝄞
      </text>
      {/* Note head */}
      <ellipse cx={NOTE_X} cy={noteY} rx="9" ry="6.5"
        fill={color} transform={`rotate(-12 ${NOTE_X} ${noteY})`}/>
      {/* Stem */}
      {stemUp
        ? <line x1={NOTE_X + 9} y1={noteY} x2={NOTE_X + 9} y2={noteY - 36} stroke={color} strokeWidth="1.8"/>
        : <line x1={NOTE_X - 9} y1={noteY} x2={NOTE_X - 9} y2={noteY + 36} stroke={color} strokeWidth="1.8"/>
      }
    </svg>
  );
}

// ─── Symbol Display ──────────────────────────────────────────────────────────
function SymbolDisplay({ symbol, symbolSize, isPrincess }: { symbol: string; symbolSize: number; isPrincess: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 128,
      background: isPrincess ? 'rgba(199,125,255,0.12)' : 'rgba(255,107,0,0.10)',
      borderRadius: 12,
      border: isPrincess ? '1px solid rgba(199,125,255,0.28)' : '1px solid rgba(255,107,0,0.28)',
    }}>
      <span style={{
        fontSize: symbolSize,
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: /^[a-z]/.test(symbol) ? 'italic' : 'normal',
        color: isPrincess ? '#C77DFF' : '#FF9F0A',
        fontWeight: 900,
        textShadow: isPrincess
          ? '0 0 24px rgba(199,125,255,0.9)'
          : '0 0 24px rgba(255,159,10,0.9)',
        lineHeight: 1,
      }}>
        {symbol}
      </span>
    </div>
  );
}

// ─── Score pips ─────────────────────────────────────────────────────────────
function ScorePips({ total, filled, isPrincess }: { total: number; filled: number; isPrincess: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: i < filled
            ? (isPrincess ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)' : 'linear-gradient(135deg,#FF6B00,#FFD700)')
            : 'rgba(255,255,255,0.12)',
          border: i < filled ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
          boxShadow: i < filled ? (isPrincess ? '0 0 8px rgba(199,125,255,0.7)' : '0 0 8px rgba(255,107,0,0.7)') : 'none',
          transition: 'all 0.3s',
        }}/>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MusicQuizGame({ isPrincess, onGameEnd }: Props) {
  const [phase, setPhase] = useState<'intro' | 'question' | 'feedback' | 'result'>('intro');
  const [questions, setQuestions] = useState<MusicQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [showInk, setShowInk] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const bgStyle: React.CSSProperties = isPrincess
    ? { background: 'linear-gradient(160deg,#f5e8ff 0%,#ffe8f8 100%)' }
    : { background: 'linear-gradient(160deg,#050a1a 0%,#0a0520 100%)' };

  const accent = isPrincess ? '#C77DFF' : '#FF9F0A';
  const textMain = isPrincess ? '#3d004d' : '#ffffff';
  const textSub = isPrincess ? '#7a3090' : 'rgba(255,255,255,0.6)';
  const staffColor = isPrincess ? '#5c006e' : 'rgba(255,255,255,0.88)';

  const startGame = () => {
    setQuestions(sampleQuestions(5));
    setIdx(0);
    setScore(0);
    setFinalScore(0);
    setSelectedIdx(null);
    setPhase('question');
  };

  const handleChoice = (choiceIdx: number) => {
    if (phase !== 'question') return;
    const q = questions[idx];
    const correct = choiceIdx === q.correctIndex;
    const newScore = correct ? score + 1 : score;
    setLastCorrect(correct);
    setSelectedIdx(choiceIdx);
    if (correct) setScore(newScore);

    if (correct && !isPrincess) { setAnimKey(k => k + 1); setShowInk(true); setTimeout(() => setShowInk(false), 900); }
    if (correct && isPrincess)  { setAnimKey(k => k + 1); setShowSparkle(true); setTimeout(() => setShowSparkle(false), 1200); }

    setPhase('feedback');
    const isLast = idx + 1 >= questions.length;
    setTimeout(() => {
      if (isLast) { setFinalScore(newScore); setPhase('result'); }
      else        { setIdx(i => i + 1); setSelectedIdx(null); setPhase('question'); }
    }, 2200);
  };

  const q = questions[idx];

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5" style={bgStyle}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 8, filter: isPrincess ? 'drop-shadow(0 0 12px rgba(199,125,255,0.7))' : 'drop-shadow(0 0 12px rgba(255,107,0,0.8))' }}>
            {isPrincess ? '🎼' : '🎵'}
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: textMain,
            textShadow: isPrincess ? '0 0 20px rgba(199,125,255,0.6)' : '0 0 20px rgba(255,107,0,0.8)',
            letterSpacing: '0.06em', marginBottom: 4,
          }}>
            {isPrincess ? '音楽パズル' : '音撃クイズ'}
          </h1>
          {!isPrincess && (
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: 'rgba(255,107,0,0.7)', textTransform: 'uppercase' }}>
              MUSIC BATTLE
            </div>
          )}
        </div>

        {/* Description card */}
        <div style={{
          width: '100%', maxWidth: 340, borderRadius: 16, padding: '16px 20px',
          background: isPrincess ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${accent}44`,
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 14, color: textMain, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
            {isPrincess ? '✨ ゲームのルール' : '⚔️ バトルルール'}
          </p>
          <ul style={{ fontSize: 13, color: textSub, lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
            <li>全5問の音符・記号クイズ！</li>
            <li>正解するほど{isPrincess ? '星のかけらが集まるよ！' : 'インクで攻撃！'}</li>
            <li>終わると{isPrincess ? 'ボーナス✨EXPゲット！' : 'ボーナス⚡EXP獲得！'}</li>
          </ul>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {['5問正解→+50EXP', '4問→+30', '3問→+15'].map(s => (
              <span key={s} style={{
                fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 20,
                background: `${accent}22`, color: accent, border: `1px solid ${accent}55`,
              }}>{s}</span>
            ))}
          </div>
        </div>

        {/* START button */}
        <button
          onClick={startGame}
          style={{
            width: '100%', maxWidth: 300, padding: '16px 0', borderRadius: 14,
            fontSize: 18, fontWeight: 900, letterSpacing: '0.06em',
            border: 'none', cursor: 'pointer',
            background: isPrincess
              ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)'
              : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
            color: 'white',
            boxShadow: isPrincess
              ? '0 4px 24px rgba(199,125,255,0.5)'
              : '0 4px 24px rgba(255,107,0,0.6)',
          }}>
          {isPrincess ? '✨ はじめる！' : '⚔️ バトル開始！'}
        </button>
      </div>
    );
  }

  // ── Question / Feedback ────────────────────────────────────────────────────
  if ((phase === 'question' || phase === 'feedback') && q) {
    const choiceBg = (i: number): React.CSSProperties => {
      if (phase === 'question') {
        return {
          background: isPrincess ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.07)',
          border: `1.5px solid ${accent}55`,
          color: textMain,
        };
      }
      if (i === q.correctIndex) return { background: 'rgba(52,199,89,0.25)', border: '1.5px solid #34C759', color: isPrincess ? '#006020' : '#34C759' };
      if (i === selectedIdx)    return { background: 'rgba(255,59,48,0.22)', border: '1.5px solid #FF3B30', color: '#FF3B30' };
      return { background: 'rgba(0,0,0,0.08)', border: '1.5px solid transparent', color: textSub, opacity: 0.5 };
    };

    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={bgStyle}>

        {/* Knight ink splash (correct) */}
        {showInk && (
          <div key={animKey} style={{
            position: 'fixed', top: '50%', left: '50%',
            width: 60, height: 60, borderRadius: '50%',
            background: 'radial-gradient(circle,#FF9F0A,#FF6B00)',
            transform: 'translate(-50%,-50%)',
            animation: 'inkSpread 0.9s ease-out forwards',
            pointerEvents: 'none', zIndex: 60,
          }}/>
        )}

        {/* Princess sparkle (correct) */}
        {showSparkle && ['✦','✧','⋆','★','✦','✧'].map((s, i) => (
          <div key={`${animKey}-${i}`} style={{
            position: 'fixed',
            top: `${30 + Math.sin(i * 60 * Math.PI / 180) * 20}%`,
            left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 25}%`,
            fontSize: 22 + i * 2, color: ['#FFD700','#C77DFF','#FF6B9D','#87CEEB','#FFD700','#C77DFF'][i],
            animation: 'floatUp 1.2s ease-out forwards',
            pointerEvents: 'none', zIndex: 60,
          }}>{s}</div>
        ))}

        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          background: isPrincess ? 'rgba(255,240,255,0.85)' : 'rgba(8,12,28,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${accent}33`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: accent }}>
              {isPrincess ? '🎼 音楽パズル' : '🎵 音撃クイズ'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: textSub }}>
              {idx + 1} / 5 問
            </span>
          </div>
          <ScorePips total={5} filled={score} isPrincess={isPrincess}/>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* Display area */}
          <div style={{
            borderRadius: 14,
            background: isPrincess ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${accent}33`,
            padding: '16px 8px',
            marginBottom: 12,
          }}>
            {q.type === 'note'
              ? <StaffNote noteY={q.noteY} ledgerY={q.ledgerY} color={staffColor}/>
              : <SymbolDisplay symbol={q.symbol} symbolSize={q.symbolSize} isPrincess={isPrincess}/>
            }
          </div>

          {/* Question text */}
          <p style={{
            fontSize: 17, fontWeight: 900, color: textMain, textAlign: 'center',
            marginBottom: 16, lineHeight: 1.4,
          }}>
            {q.question}
          </p>

          {/* Choices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {q.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoice(i)}
                disabled={phase === 'feedback'}
                style={{
                  padding: '14px 8px',
                  borderRadius: 12,
                  fontSize: 16, fontWeight: 900,
                  cursor: phase === 'question' ? 'pointer' : 'default',
                  transition: 'all 0.25s',
                  ...choiceBg(i),
                }}>
                {phase === 'feedback' && i === q.correctIndex && '✅ '}
                {phase === 'feedback' && i === selectedIdx && i !== q.correctIndex && '❌ '}
                {choice}
              </button>
            ))}
          </div>

          {/* Feedback explanation */}
          {phase === 'feedback' && (
            <div style={{
              marginTop: 14, borderRadius: 12, padding: '12px 14px',
              background: lastCorrect
                ? 'rgba(52,199,89,0.15)'
                : 'rgba(255,59,48,0.12)',
              border: `1px solid ${lastCorrect ? '#34C75966' : '#FF3B3066'}`,
            }}>
              <p style={{
                fontSize: 15, fontWeight: 900, marginBottom: 4,
                color: lastCorrect ? '#34C759' : '#FF3B30',
              }}>
                {lastCorrect
                  ? (isPrincess ? '✨ せいかい！' : '🎨 音撃ヒット！')
                  : (isPrincess ? '💔 ちがうよ！' : '💀 ミス！')}
              </p>
              {!lastCorrect && (
                <p style={{ fontSize: 13, color: textSub, lineHeight: 1.6 }}>
                  {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  const expGained = EXP_TABLE[finalScore];
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5" style={bgStyle}>

      {/* Result emoji */}
      <div style={{
        fontSize: 64, marginBottom: 12,
        filter: finalScore >= 4
          ? (isPrincess ? 'drop-shadow(0 0 16px rgba(255,215,0,0.9))' : 'drop-shadow(0 0 16px rgba(255,107,0,0.9))')
          : undefined,
        animation: finalScore >= 4 ? 'floatBounce 2s ease-in-out infinite' : undefined,
      }}>
        {finalScore === 5 ? '🏆' : finalScore >= 3 ? (isPrincess ? '✨' : '⚡') : (isPrincess ? '🌸' : '🎮')}
      </div>

      {/* Score */}
      <h2 style={{
        fontSize: 32, fontWeight: 900, color: textMain,
        textShadow: `0 0 24px ${accent}88`, marginBottom: 4,
      }}>
        {finalScore} / 5 問正解！
      </h2>
      <ScorePips total={5} filled={finalScore} isPrincess={isPrincess}/>

      {/* EXP gain */}
      <div style={{
        marginTop: 24, marginBottom: 8,
        padding: '18px 32px', borderRadius: 20,
        background: isPrincess
          ? 'linear-gradient(135deg,rgba(255,107,157,0.2),rgba(199,125,255,0.2))'
          : 'linear-gradient(135deg,rgba(255,107,0,0.2),rgba(255,215,0,0.2))',
        border: `2px solid ${accent}66`,
        boxShadow: `0 0 32px ${accent}44`,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: textSub, letterSpacing: '0.12em', marginBottom: 4 }}>
          {isPrincess ? 'ボーナス EXP ゲット！' : 'BONUS EXP 獲得！'}
        </p>
        <p style={{
          fontSize: 48, fontWeight: 900, lineHeight: 1,
          color: accent,
          textShadow: `0 0 24px ${accent}`,
        }}>
          +{expGained}
        </p>
        <p style={{ fontSize: 12, color: textSub, marginTop: 4 }}>EXP</p>
      </div>

      {finalScore >= 4 && (
        <p style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 8, textAlign: 'center' }}>
          {finalScore === 5
            ? (isPrincess ? '🌟 パーフェクト！すごい！' : '🔥 パーフェクト！鬼強い！')
            : (isPrincess ? '✨ すごい！ほぼパーフェクト！' : '⚡ ナイス！ほぼパーフェクト！')}
        </p>
      )}

      {/* Close button */}
      <button
        onClick={() => onGameEnd(expGained)}
        style={{
          marginTop: 16, width: '100%', maxWidth: 300,
          padding: '16px 0', borderRadius: 14,
          fontSize: 17, fontWeight: 900, border: 'none', cursor: 'pointer',
          background: isPrincess
            ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)'
            : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
          color: 'white',
          boxShadow: isPrincess ? '0 4px 24px rgba(199,125,255,0.5)' : '0 4px 24px rgba(255,107,0,0.6)',
        }}>
        {isPrincess ? '✨ ページに戻る' : '⚔️ 戻る'}
      </button>
    </div>
  );
}
