'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile, type CharacterType } from '@/lib/profile';

export default function SetupPage() {
  const router = useRouter();
  const [step,      setStep]     = useState<'form' | 'celebrate'>('form');
  const [nickname,  setNickname] = useState('');
  const [birthday,  setBirthday] = useState('');
  const [charType,  setCharType] = useState<CharacterType | null>(null);
  const [error,     setError]    = useState('');
  const [savedName, setSavedName] = useState('');
  const [savedType, setSavedType] = useState<CharacterType>('knight');

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = () => {
    if (!nickname.trim())  { setError('ニックネームを入力してください'); return; }
    if (!charType)         { setError('キャラクターを選んでください'); return; }
    if (!birthday)         { setError('生年月日を入力してください'); return; }
    setError('');
    saveProfile({ nickname: nickname.trim(), birthday, type: charType });
    setSavedName(nickname.trim());
    setSavedType(charType);
    setStep('celebrate');
  };

  useEffect(() => {
    if (step !== 'celebrate') return;
    const t = setTimeout(() => router.replace('/student'), 3500);
    return () => clearTimeout(t);
  }, [step, router]);

  if (step === 'celebrate') {
    return <CelebrationScreen name={savedName} type={savedType} />;
  }

  const isPrincess = charType === 'princess';

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background: isPrincess
          ? 'linear-gradient(160deg,#FFF0F8,#F8E8FF)'
          : 'linear-gradient(160deg,#F2F2F7,#EAF2FF)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>

      {/* Header */}
      <div className="px-6 pt-10 pb-5 text-center">
        <div className="text-5xl mb-3">{isPrincess ? '🌸' : '⚔️'}</div>
        <h1 className="text-2xl font-black text-[#1C1C1E]">はじめまして！</h1>
        <p className="text-[#6C6C70] text-sm mt-1.5 leading-relaxed">
          プロフィールを登録して冒険をスタートしよう
        </p>
      </div>

      <div className="mx-4 space-y-3">

        {/* ─ Nickname ─ */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest block mb-2">
            ニックネーム
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="例：ゆうき"
            maxLength={20}
            className="w-full bg-transparent text-[#1C1C1E] text-lg font-semibold placeholder-[#C7C7CC] outline-none"
          />
        </div>

        {/* ─ Character Type ─ */}
        <div>
          <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest px-1 mb-2">
            キャラクターを選ぼう
          </p>
          <div className="grid grid-cols-2 gap-3">
            <CharCard
              selected={charType === 'knight'}
              onSelect={() => setCharType('knight')}
              emoji="⚔️"
              label="きし"
              sub="剣と冒険の世界"
              gradFrom="#1a3a6b"
              gradTo="#0f5ba8"
              ringColor="#007AFF"
            />
            <CharCard
              selected={charType === 'princess'}
              onSelect={() => setCharType('princess')}
              emoji="👸"
              label="プリンセス"
              sub="魔法と妖精の世界"
              gradFrom="#C77DFF"
              gradTo="#FF6B9D"
              ringColor="#FF6B9D"
            />
          </div>
        </div>

        {/* ─ Birthday ─ */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest block mb-2">
            生年月日
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            max={today}
            className="w-full bg-transparent text-[#1C1C1E] text-lg font-semibold outline-none"
            style={{ colorScheme: 'light' }}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-[#FF3B30] text-sm animate-pop-in">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl text-white text-base font-bold shadow-sm active:scale-[0.98] transition-all"
          style={{
            background: isPrincess
              ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
              : 'linear-gradient(90deg,#007AFF,#5856D6)',
          }}
        >
          {isPrincess ? '✨ 冒険をはじめる' : '⚔️ 冒険をはじめる'}
        </button>

        {/* Preview */}
        <div className="flex justify-center gap-4 pb-4 opacity-25">
          <span className="text-2xl">🌸</span>
          <span className="text-2xl">⚔️</span>
          <span className="text-2xl">🐲</span>
          <span className="text-2xl">👸</span>
        </div>
      </div>
    </div>
  );
}

// ─── Character selection card ───────────────────────────────────────────────
function CharCard({ selected, onSelect, emoji, label, sub, gradFrom, gradTo, ringColor }: {
  selected: boolean; onSelect: () => void;
  emoji: string; label: string; sub: string;
  gradFrom: string; gradTo: string; ringColor: string;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-all"
      style={{
        outline: selected ? `3px solid ${ringColor}` : '3px solid transparent',
        outlineOffset: '2px',
      }}
    >
      <div className="flex flex-col items-center justify-center py-6 gap-2"
        style={{ background: `linear-gradient(160deg,${gradFrom},${gradTo})` }}>
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ringColor} strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}
        <span className="text-4xl leading-none">{emoji}</span>
        <span className="text-white font-black text-base">{label}</span>
        <span className="text-white/70 text-[11px] text-center px-2 leading-tight">{sub}</span>
      </div>
    </button>
  );
}

// ─── Celebration screen ─────────────────────────────────────────────────────
function CelebrationScreen({ name, type }: { name: string; type: CharacterType }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);

  const isPrincess = type === 'princess';
  const bgGrad = isPrincess
    ? 'linear-gradient(160deg,#2d1b4e 0%,#6b2fa0 50%,#c9218e 100%)'
    : 'linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)';
  const mainEmoji = isPrincess ? '👸' : '⚔️';
  const accentColor = isPrincess ? '#FFB6D9' : '#64D2FF';
  const nameColor   = isPrincess ? '#FFD6F0' : '#FFD60A';
  const story       = isPrincess ? 'プリンセス' : '冒険者';
  const tagline     = isPrincess
    ? '魔法と妖精の世界で\n音楽の力を解き放て！'
    : '剣と冒険の世界で\n最強の音楽家を目指せ！';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: bgGrad, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2,
              animation: `pulse ${Math.random() * 2 + 1.5}s ease-in-out infinite`,
            }} />
        ))}
      </div>

      {/* Main */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        <span className="text-7xl" style={{ animation: 'float 3s ease-in-out infinite' }}>
          {mainEmoji}
        </span>
        <div className="space-y-2">
          <p className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: accentColor }}>
            {story}
          </p>
          <h1 className="text-white text-3xl font-black leading-tight">
            「<span style={{ color: nameColor }}>{name}</span>」<br />の物語が始まる！
          </h1>
        </div>
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/40 text-xs">✦</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>
        <p className="text-white/50 text-sm leading-relaxed whitespace-pre-line">{tagline}</p>
        <div className="flex gap-1.5 mt-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40"
              style={{ animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
    </div>
  );
}
