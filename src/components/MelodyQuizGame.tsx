'use client';
import { useState, useRef } from 'react';
import {
  NOTE_DEFS, MELODIES, getMelodyButtons, getNoteXPositions, selectMelodies,
  getOrCreateAudioCtx, playPianoNote, playErrorSound,
  type MelodySequence,
} from '@/lib/melodyQuizData';
import { loadProgress, LEVEL_LABELS } from '@/lib/musicProgress';

// EXP per melody: 0 mistakes → 10, 1-2 → 5, 3+ → 2
function melodyExp(mistakes: number): number {
  return mistakes === 0 ? 10 : mistakes <= 2 ? 5 : 2;
}

const STAFF_LINES = [40, 52, 64, 76, 88];

interface Props {
  isPrincess: boolean;
  onGameEnd: (expGained: number) => void;
}

// ─── Staff SVG with multiple notes ──────────────────────────────────────────
function MelodyStaff({
  melody, noteIdx, xPositions, staffColor, accent, isPrincess,
}: {
  melody: MelodySequence;
  noteIdx: number;
  xPositions: number[];
  staffColor: string;
  accent: string;
  isPrincess: boolean;
}) {
  return (
    <svg width="300" height="128"
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>

      {/* Staff lines */}
      {STAFF_LINES.map(y => (
        <line key={y} x1="48" y1={y} x2="258" y2={y} stroke={staffColor} strokeWidth="1.3"/>
      ))}

      {/* Treble clef */}
      <text x="2" y="96"
        style={{ fontSize: '76px', fontFamily: 'serif', fill: staffColor, userSelect: 'none', lineHeight: 1 } as React.CSSProperties}>
        𝄞
      </text>

      {/* Princess magic trail between completed notes */}
      {isPrincess && melody.notes.map((name, i) => {
        if (i === 0 || i > noteIdx) return null;
        const x1 = xPositions[i - 1]; const y1 = NOTE_DEFS[melody.notes[i - 1]].noteY;
        const x2 = xPositions[i];     const y2 = NOTE_DEFS[name].noteY;
        return (
          <line key={`trail-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#C77DFF" strokeWidth="2.5" strokeLinecap="round"
            opacity="0.65" strokeDasharray="6,3"/>
        );
      })}

      {/* Note heads */}
      {melody.notes.map((name, i) => {
        const def = NOTE_DEFS[name];
        if (!def) return null;
        const x = xPositions[i];
        const isCompleted = i < noteIdx;
        const isCurrent   = i === noteIdx;
        const color = isCompleted
          ? (isPrincess ? '#C77DFF' : '#34C759')
          : isCurrent ? accent : staffColor;

        const stemUp = def.noteY > 64;
        return (
          <g key={i}>
            {/* Ledger line */}
            {def.ledgerY !== undefined && (
              <line x1={x - 13} y1={def.ledgerY} x2={x + 13} y2={def.ledgerY}
                stroke={color} strokeWidth="1.4"/>
            )}
            {/* Princess sparkle dot on completed note */}
            {isPrincess && isCompleted && (
              <circle cx={x} cy={def.noteY} r="11"
                fill="rgba(199,125,255,0.18)" stroke="#C77DFF" strokeWidth="1"/>
            )}
            {/* Note head */}
            <ellipse cx={x} cy={def.noteY} rx="8.5" ry="6.2"
              fill={color} transform={`rotate(-12 ${x} ${def.noteY})`}/>
            {/* Stem */}
            {stemUp
              ? <line x1={x + 8.5} y1={def.noteY} x2={x + 8.5} y2={def.noteY - 32} stroke={color} strokeWidth="1.6"/>
              : <line x1={x - 8.5} y1={def.noteY} x2={x - 8.5} y2={def.noteY + 32} stroke={color} strokeWidth="1.6"/>
            }
            {/* Current note glow ring */}
            {isCurrent && (
              <ellipse cx={x} cy={def.noteY} rx="13" ry="10"
                fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6"
                style={{ animation: 'sparkle 1.4s ease-in-out infinite' }}/>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MelodyQuizGame({ isPrincess, onGameEnd }: Props) {
  type Phase = 'intro' | 'playing' | 'result';
  const [phase,        setPhase]        = useState<Phase>('intro');
  const [melodies,     setMelodies]     = useState<MelodySequence[]>([]);
  const [mIdx,         setMIdx]         = useState(0);  // current melody (0–4)
  const [noteIdx,      setNoteIdx]      = useState(0);  // current note position
  const [mistakes,     setMistakes]     = useState(0);  // mistakes in this melody
  const [totalExp,     setTotalExp]     = useState(0);
  const [wrongFlash,   setWrongFlash]   = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [knightX,      setKnightX]      = useState(78);
  const [knightY,      setKnightY]      = useState(40);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioRef = useRef<any>(null);

  const bgStyle: React.CSSProperties = isPrincess
    ? { background: 'linear-gradient(160deg,#f5e8ff 0%,#ffe8f8 100%)' }
    : { background: 'linear-gradient(160deg,#050a1a 0%,#0a0520 100%)' };
  const accent    = isPrincess ? '#C77DFF' : '#FF9F0A';
  const textMain  = isPrincess ? '#3d004d' : '#ffffff';
  const textSub   = isPrincess ? '#7a3090' : 'rgba(255,255,255,0.6)';
  const staffColor = isPrincess ? '#5c006e' : 'rgba(255,255,255,0.88)';

  const startGame = () => {
    const progress = loadProgress();
    const selected = selectMelodies(progress.level);
    setMelodies(selected);
    setMIdx(0); setNoteIdx(0); setMistakes(0); setTotalExp(0);
    setShowSuccess(false);
    // Position knight at first note of first melody
    const xp = getNoteXPositions(selected[0].notes.length);
    const def0 = NOTE_DEFS[selected[0].notes[0]];
    if (def0) { setKnightX(xp[0]); setKnightY(def0.noteY); }
    setPhase('playing');
  };

  const handleNoteTap = (name: string) => {
    if (phase !== 'playing' || showSuccess) return;
    const melody  = melodies[mIdx];
    const expected = melody.notes[noteIdx];
    const ctx = getOrCreateAudioCtx(audioRef);

    if (name === expected) {
      // ✅ Correct
      playPianoNote(NOTE_DEFS[name].freq, ctx);
      const nextNoteIdx = noteIdx + 1;
      const xPositions  = getNoteXPositions(melody.notes.length);

      if (nextNoteIdx < melody.notes.length) {
        // Advance to next note
        const defNext = NOTE_DEFS[melody.notes[nextNoteIdx]];
        if (defNext) { setKnightX(xPositions[nextNoteIdx]); setKnightY(defNext.noteY); }
        setNoteIdx(nextNoteIdx);
      } else {
        // Melody complete!
        const exp = melodyExp(mistakes);
        const newTotalExp = totalExp + exp;
        setTotalExp(newTotalExp);
        setShowSuccess(true);

        setTimeout(() => {
          setShowSuccess(false);
          const nextMIdx = mIdx + 1;
          if (nextMIdx >= melodies.length) {
            setPhase('result');
          } else {
            const nextMelody = melodies[nextMIdx];
            const xp2 = getNoteXPositions(nextMelody.notes.length);
            const def2 = NOTE_DEFS[nextMelody.notes[0]];
            if (def2) { setKnightX(xp2[0]); setKnightY(def2.noteY); }
            setMIdx(nextMIdx); setNoteIdx(0); setMistakes(0);
          }
        }, 1400);
      }
    } else {
      // ❌ Wrong
      playErrorSound(ctx);
      setMistakes(m => m + 1);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 380);
    }
  };

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const progress = loadProgress();
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5" style={bgStyle}>
        <div style={{ fontSize: 60, marginBottom: 8, filter: `drop-shadow(0 0 14px ${accent}bb)` }}>
          {isPrincess ? '🎵' : '🎼'}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: textMain, textAlign: 'center',
          textShadow: `0 0 20px ${accent}88`, letterSpacing: '0.06em', marginBottom: 6 }}>
          {isPrincess ? 'メロディ魔法パズル' : 'メロディ音撃バトル'}
        </h1>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: accent, marginBottom: 16 }}>
          レベル {progress.level}「{LEVEL_LABELS[progress.level]}」
        </div>

        <div style={{
          width: '100%', maxWidth: 340, borderRadius: 16, padding: '16px 20px', marginBottom: 24,
          background: isPrincess ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${accent}44`,
        }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: textMain, marginBottom: 8, textAlign: 'center' }}>
            {isPrincess ? '🎀 遊び方' : '📋 ルール'}
          </p>
          <ul style={{ fontSize: 13, color: textSub, lineHeight: 1.9, paddingLeft: 16, margin: 0 }}>
            <li>五線譜に音符が{isPrincess ? '並ぶよ' : '並ぶ'}！<span style={{ color: accent, fontWeight: 700 }}>左から順番</span>にタップ！</li>
            <li>正解すると{isPrincess ? '✨ ポーン♪と鳴るよ' : '⚡ ポーン♪と鳴る'}！</li>
            <li>5つのメロディをクリアしてEXP獲得！</li>
          </ul>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {['ミスなし+10EXP', '1-2ミス+5EXP', '3+ミス+2EXP'].map(s => (
              <span key={s} style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 20, background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}>{s}</span>
            ))}
          </div>
        </div>

        <button onClick={startGame} style={{
          width: '100%', maxWidth: 300, padding: '16px 0', borderRadius: 14,
          fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer',
          background: isPrincess ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)' : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
          color: 'white', boxShadow: `0 4px 24px ${accent}66`,
        }}>
          {isPrincess ? '✨ はじめる！' : '🎵 バトル開始！'}
        </button>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (phase === 'playing' && melodies.length > 0) {
    const melody     = melodies[mIdx];
    const xPositions = getNoteXPositions(melody.notes.length);
    const buttons    = getMelodyButtons(melody);
    const progress   = loadProgress();

    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={bgStyle}>

        {/* Melody complete burst */}
        {showSuccess && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{
              fontSize: 36, fontWeight: 900, color: accent,
              textShadow: `0 0 30px ${accent}`,
              animation: 'graffitiIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
              textAlign: 'center', lineHeight: 1.3,
            }}>
              {isPrincess ? '✨ メロディ完成！' : '🎵 メロディ音撃！'}
              <div style={{ fontSize: 20, marginTop: 4 }}>
                {melodyExp(mistakes) === 10 ? '+10 EXP 完璧！' : `+${melodyExp(mistakes)} EXP`}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          paddingRight: '20px',
          paddingBottom: '12px',
          paddingLeft: '20px',
          background: isPrincess ? 'rgba(255,240,255,0.85)' : 'rgba(8,12,28,0.9)',
          backdropFilter: 'blur(12px)', borderBottom: `1px solid ${accent}33`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: accent }}>
              {isPrincess ? '🎀 メロディ魔法パズル' : '🎼 メロディ音撃バトル'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: textSub }}>
              メロディ {mIdx + 1} / {melodies.length}
            </span>
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
            {melodies.map((_, i) => (
              <div key={i} style={{
                width: 28, height: 6, borderRadius: 3,
                background: i < mIdx
                  ? (isPrincess ? '#C77DFF' : '#34C759')
                  : i === mIdx ? accent : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
              }}/>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Staff area with knight / princess overlay */}
          <div style={{
            borderRadius: 14, padding: '14px 8px 10px',
            background: isPrincess ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${accent}33`, position: 'relative',
          }}>
            {/* Current note label */}
            <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 900, color: accent, marginBottom: 8 }}>
              {isPrincess ? `✨ ${noteIdx + 1}つ目の音はどれ？` : `▶ ${noteIdx + 1}番目の音をタップ！`}
            </p>

            {/* Staff SVG container with character overlay */}
            <div style={{ position: 'relative', width: 300, margin: '0 auto', height: 130 }}>
              <MelodyStaff
                melody={melody} noteIdx={noteIdx} xPositions={xPositions}
                staffColor={staffColor} accent={accent} isPrincess={isPrincess}/>

              {/* Knight: jumping character */}
              {!isPrincess && noteIdx < melody.notes.length && (
                <div style={{
                  position: 'absolute',
                  left: knightX - 14,
                  top: Math.max(0, knightY - 28),
                  fontSize: 22, lineHeight: 1,
                  transition: 'left 0.38s cubic-bezier(0.34,1.56,0.64,1), top 0.28s ease',
                  pointerEvents: 'none', userSelect: 'none', zIndex: 3,
                }}>
                  🏃
                </div>
              )}

              {/* Princess: sparkle cursor */}
              {isPrincess && noteIdx < melody.notes.length && (
                <div style={{
                  position: 'absolute',
                  left: xPositions[noteIdx] - 12,
                  top: Math.max(0, (NOTE_DEFS[melody.notes[noteIdx]]?.noteY ?? 64) - 28),
                  fontSize: 20,
                  transition: 'left 0.38s cubic-bezier(0.34,1.56,0.64,1), top 0.28s ease',
                  pointerEvents: 'none', userSelect: 'none', zIndex: 3,
                  animation: 'sparkle 1.4s ease-in-out infinite',
                }}>
                  ✨
                </div>
              )}
            </div>

            {/* Mistakes counter */}
            {mistakes > 0 && (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#FF3B30', marginTop: 4, fontWeight: 700 }}>
                {'❌'.repeat(Math.min(mistakes, 5))} {mistakes > 5 ? `×${mistakes}` : ''}
              </p>
            )}
          </div>

          {/* Note buttons */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            padding: '4px 0',
          }}>
            {buttons.map(name => (
              <button
                key={name}
                onClick={() => handleNoteTap(name)}
                disabled={showSuccess}
                style={{
                  width: 70, padding: '12px 4px',
                  borderRadius: 12, fontSize: name.length > 2 ? 13 : 16, fontWeight: 900,
                  cursor: showSuccess ? 'default' : 'pointer',
                  background: wrongFlash
                    ? 'rgba(255,59,48,0.2)'
                    : (isPrincess ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.09)'),
                  border: `2px solid ${wrongFlash ? '#FF3B30' : accent}55`,
                  color: textMain,
                  transition: 'all 0.15s',
                  boxShadow: `0 2px 8px ${accent}22`,
                }}>
                {name}
              </button>
            ))}
          </div>

          {/* Level label */}
          <p style={{ textAlign: 'center', fontSize: 11, color: textSub }}>
            クイズLv.{progress.level}「{LEVEL_LABELS[progress.level]}」 · 今日のEXP: +{totalExp}
          </p>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5" style={bgStyle}>
      <div style={{
        fontSize: 64, marginBottom: 12,
        filter: totalExp >= 40 ? `drop-shadow(0 0 16px ${accent}cc)` : undefined,
        animation: totalExp >= 40 ? 'floatBounce 2s ease-in-out infinite' : undefined,
      }}>
        {totalExp >= 45 ? '🏆' : totalExp >= 30 ? (isPrincess ? '🌟' : '⚡') : (isPrincess ? '🌸' : '🎮')}
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 900, color: textMain, textShadow: `0 0 24px ${accent}88`, marginBottom: 4, textAlign: 'center' }}>
        {isPrincess ? '✨ メロディ完成！' : '🎵 全メロディ音撃！'}
      </h2>

      <div style={{
        marginTop: 20, padding: '18px 32px', borderRadius: 20, textAlign: 'center',
        background: isPrincess
          ? 'linear-gradient(135deg,rgba(255,107,157,0.2),rgba(199,125,255,0.2))'
          : 'linear-gradient(135deg,rgba(255,107,0,0.2),rgba(255,215,0,0.2))',
        border: `2px solid ${accent}66`, boxShadow: `0 0 32px ${accent}44`,
        marginBottom: 8,
      }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: textSub, letterSpacing: '0.12em', marginBottom: 4 }}>
          {isPrincess ? 'ボーナス EXP ゲット！' : 'BONUS EXP 獲得！'}
        </p>
        <p style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: accent, textShadow: `0 0 24px ${accent}` }}>
          +{totalExp}
        </p>
        <p style={{ fontSize: 12, color: textSub, marginTop: 4 }}>EXP（最大 +50）</p>
      </div>

      {totalExp >= 40 && (
        <p style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 8, textAlign: 'center' }}>
          {totalExp === 50
            ? (isPrincess ? '🌟 全パーフェクト！天才！' : '🔥 全パーフェクト！最強！')
            : (isPrincess ? '✨ ほぼパーフェクト！すごい！' : '⚡ ほぼパーフェクト！ナイス！')}
        </p>
      )}

      <button onClick={() => onGameEnd(totalExp)} style={{
        marginTop: 12, width: '100%', maxWidth: 300, padding: '16px 0', borderRadius: 14,
        fontSize: 17, fontWeight: 900, border: 'none', cursor: 'pointer',
        background: isPrincess ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)' : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
        color: 'white', boxShadow: `0 4px 24px ${accent}55`,
      }}>
        {isPrincess ? '✨ ページに戻る' : '⚔️ 戻る'}
      </button>
    </div>
  );
}
