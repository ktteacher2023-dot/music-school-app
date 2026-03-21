'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/lib/profile';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'celebrate'>('form');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [savedName, setSavedName] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = () => {
    if (!nickname.trim()) { setError('ニックネームを入力してください'); return; }
    if (!birthday) { setError('生年月日を入力してください'); return; }
    setError('');
    saveProfile({ nickname: nickname.trim(), birthday });
    setSavedName(nickname.trim());
    setStep('celebrate');
  };

  useEffect(() => {
    if (step !== 'celebrate') return;
    const t = setTimeout(() => router.replace('/student'), 3500);
    return () => clearTimeout(t);
  }, [step, router]);

  if (step === 'celebrate') {
    return <CelebrationScreen name={savedName} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-2xl font-black text-[#1C1C1E]">はじめまして！</h1>
        <p className="text-[#6C6C70] text-sm mt-2 leading-relaxed">
          あなたの冒険をスタートするために<br />プロフィールを登録しよう
        </p>
      </div>

      {/* Form card */}
      <div className="mx-4 bg-white rounded-3xl shadow-sm overflow-hidden">

        {/* Nickname */}
        <div className="px-4 py-4 border-b border-[#F2F2F7]">
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

        {/* Birthday */}
        <div className="px-4 py-4">
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
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-[#FF3B30] text-sm mt-3 px-4 animate-pop-in">{error}</p>
      )}

      {/* Submit button */}
      <div className="mx-4 mt-6">
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white text-base font-bold shadow-sm active:scale-[0.98] transition-all"
        >
          冒険をはじめる ✨
        </button>
      </div>

      {/* Decorative monster preview */}
      <div className="flex-1 flex flex-col items-center justify-end pb-8 mt-8 gap-1">
        <div className="flex gap-3 text-3xl opacity-30">
          <span>👾</span><span>🐲</span><span>👑</span>
        </div>
        <p className="text-[11px] text-[#C7C7CC] mt-1">練習してモンスターを倒そう！</p>
      </div>
    </div>
  );
}

function CelebrationScreen({ name }: { name: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>

      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.7 + 0.3,
              animation: `pulse ${Math.random() * 2 + 1.5}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 px-8"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Monster emoji */}
        <div
          className="text-7xl"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(100, 200, 255, 0.6))',
            animation: 'float 3s ease-in-out infinite',
          }}
        >
          👾
        </div>

        {/* Title text */}
        <div className="text-center space-y-2">
          <p className="text-[#64D2FF] text-sm font-bold tracking-[0.2em] uppercase">New Adventurer</p>
          <h1 className="text-white text-3xl font-black leading-tight">
            冒険者<br />
            <span className="text-[#FFD60A]">「{name}」</span><br />
            の物語が始まる！
          </h1>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/40 text-xs">✦</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <p className="text-white/50 text-sm text-center leading-relaxed">
          練習を重ね、モンスターを倒して<br />最強の音楽家を目指せ！
        </p>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
