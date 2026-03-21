'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile, saveProfileToSupabase, type CharacterType } from '@/lib/profile';

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

  const handleSubmit = async () => {
    if (!nickname.trim()) { setError('ニックネームを入力してください'); return; }
    if (!charType)        { setError('キャラクターを選んでください'); return; }
    if (!birthday)        { setError('生年月日を入力してください'); return; }
    setError('');

    const p = { nickname: nickname.trim(), birthday, type: charType };
    saveProfile(p);
    saveProfileToSupabase(p); // 非同期・失敗しても続行

    setSavedName(nickname.trim());
    setSavedType(charType);
    setStep('celebrate');
  };

  // Pre-fill form from URL params (e.g. /setup?nick=花子&bday=2018-04-01&type=princess)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nick = params.get('nick');
    const bday = params.get('bday');
    const type = params.get('type') as CharacterType | null;
    if (nick) setNickname(nick);
    if (bday) setBirthday(bday);
    if (type === 'knight' || type === 'princess') setCharType(type);
  }, []);

  useEffect(() => {
    if (step !== 'celebrate') return;
    const t = setTimeout(() => router.replace('/student'), 3800);
    return () => clearTimeout(t);
  }, [step, router]);

  if (step === 'celebrate') {
    return <CelebrationScreen name={savedName} type={savedType} />;
  }

  const isKnight   = charType === 'knight';
  const isPrincess = charType === 'princess';

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background: isPrincess
          ? 'linear-gradient(160deg,#FDF0FF 0%,#FFE4F3 50%,#F8E8FF 100%)'
          : isKnight
          ? 'linear-gradient(160deg,#E8F4FF 0%,#EEF2FF 50%,#E0E7FF 100%)'
          : 'linear-gradient(160deg,#F2F2F7,#EAF2FF)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        transition: 'background 0.5s ease',
      }}>

      {/* ── Header ── */}
      <div className="px-6 pt-8 pb-4 text-center relative">
        {/* Floating decoration */}
        <div className="absolute top-6 left-4 text-2xl opacity-20 select-none"
          style={{ animation: 'float1 4s ease-in-out infinite' }}>
          {isPrincess ? '🌸' : isKnight ? '🏰' : '🎵'}
        </div>
        <div className="absolute top-8 right-4 text-xl opacity-20 select-none"
          style={{ animation: 'float2 5s ease-in-out infinite' }}>
          {isPrincess ? '✨' : isKnight ? '⚔️' : '🎶'}
        </div>

        <div className="text-5xl mb-3 transition-all duration-500 select-none"
          style={{ filter: isPrincess ? 'drop-shadow(0 0 12px rgba(255,107,157,0.5))' : isKnight ? 'drop-shadow(0 0 12px rgba(0,122,255,0.4))' : 'none' }}>
          {isPrincess ? '👸' : isKnight ? '⚔️' : '🎵'}
        </div>
        <h1 className="text-2xl font-black text-[#1C1C1E]">はじめまして！</h1>
        <p className="text-[#6C6C70] text-sm mt-1 leading-relaxed">
          あなたの冒険をスタートしよう
        </p>
      </div>

      <div className="mx-4 space-y-3 flex-1">

        {/* ── Nickname ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm px-4 py-4 border border-white/60">
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

        {/* ── Character Type Cards ── */}
        <div>
          <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest px-1 mb-2.5">
            きみはどっち？
          </p>
          <div className="grid grid-cols-2 gap-3">

            {/* Knight card */}
            <button
              onClick={() => setCharType('knight')}
              className="relative rounded-2xl overflow-hidden active:scale-[0.96] transition-all duration-200"
              style={{
                boxShadow: isKnight
                  ? '0 0 0 3px #007AFF, 0 8px 24px rgba(0,122,255,0.35)'
                  : '0 2px 8px rgba(0,0,0,0.12)',
                transform: isKnight ? 'scale(1.02)' : 'scale(1)',
              }}>
              <div className="flex flex-col items-center pt-4 pb-3 gap-1 relative"
                style={{ background: 'linear-gradient(160deg,#0a1628 0%,#1a3a6b 50%,#1565C0 100%)' }}>

                {/* Selected check */}
                {isKnight && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}

                {/* Top decoration */}
                <div className="flex gap-2 text-base opacity-60 mb-1">
                  <span>🛡️</span><span>⚔️</span><span>🛡️</span>
                </div>

                {/* Main icon */}
                <div className="text-5xl leading-none"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
                  ⚔️
                </div>

                {/* Label */}
                <p className="text-white font-black text-base mt-1">かっこいい騎士</p>

                {/* Gender badge */}
                <div className="bg-[#007AFF]/80 rounded-full px-3 py-0.5 mt-0.5">
                  <span className="text-white text-[11px] font-bold">男の子</span>
                </div>

                {/* Description */}
                <p className="text-white/60 text-[10px] text-center px-2 mt-1 leading-snug">
                  剣と盾でモンスターを倒す<br/>伝説の冒険者を目指せ！
                </p>

                {/* Bottom decoration */}
                <div className="flex gap-2 text-sm opacity-40 mt-1">
                  <span>🐉</span><span>🏆</span><span>🗡️</span>
                </div>

                {/* Shine effect on selected */}
                {isKnight && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 60%)' }} />
                )}
              </div>
            </button>

            {/* Princess card */}
            <button
              onClick={() => setCharType('princess')}
              className="relative rounded-2xl overflow-hidden active:scale-[0.96] transition-all duration-200"
              style={{
                boxShadow: isPrincess
                  ? '0 0 0 3px #FF6B9D, 0 8px 24px rgba(255,107,157,0.4)'
                  : '0 2px 8px rgba(0,0,0,0.12)',
                transform: isPrincess ? 'scale(1.02)' : 'scale(1)',
              }}>
              <div className="flex flex-col items-center pt-4 pb-3 gap-1 relative"
                style={{ background: 'linear-gradient(160deg,#6b2fa0 0%,#c77dff 50%,#FF6B9D 100%)' }}>

                {/* Selected check */}
                {isPrincess && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#FF6B9D] flex items-center justify-center shadow-lg">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}

                {/* Top decoration */}
                <div className="flex gap-2 text-base opacity-70 mb-1">
                  <span>🌸</span><span>✨</span><span>🌸</span>
                </div>

                {/* Main icon */}
                <div className="text-5xl leading-none"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
                  👸
                </div>

                {/* Label */}
                <p className="text-white font-black text-base mt-1">かわいいプリンセス</p>

                {/* Gender badge */}
                <div className="bg-[#FF6B9D]/80 rounded-full px-3 py-0.5 mt-0.5">
                  <span className="text-white text-[11px] font-bold">女の子</span>
                </div>

                {/* Description */}
                <p className="text-white/60 text-[10px] text-center px-2 mt-1 leading-snug">
                  妖精たちとなかよしになりながら<br/>音楽のプリンセスを目指そう！
                </p>

                {/* Bottom decoration */}
                <div className="flex gap-2 text-sm opacity-50 mt-1">
                  <span>🦄</span><span>🪄</span><span>🌺</span>
                </div>

                {/* Shine effect on selected */}
                {isPrincess && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 60%)' }} />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* ── Birthday ── */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm px-4 py-4 border border-white/60">
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
          <p className="text-center font-semibold text-sm animate-pop-in"
            style={{ color: isPrincess ? '#FF6B9D' : '#FF3B30' }}>
            {error}
          </p>
        )}

        {/* ── Submit ── */}
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl text-white text-base font-black tracking-wide shadow-lg active:scale-[0.97] transition-all"
          style={{
            background: isPrincess
              ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
              : isKnight
              ? 'linear-gradient(90deg,#007AFF,#5856D6)'
              : 'linear-gradient(90deg,#8E8E93,#6C6C70)',
            boxShadow: isPrincess
              ? '0 4px 20px rgba(255,107,157,0.45)'
              : isKnight
              ? '0 4px 20px rgba(0,122,255,0.4)'
              : 'none',
          }}>
          {isPrincess ? '🌸 プリンセスの冒険へ！' : isKnight ? '⚔️ 騎士の冒険へ！' : '冒険をはじめる'}
        </button>

        {/* Decorative footer */}
        <div className="flex justify-center gap-3 pb-4 select-none">
          {isPrincess
            ? ['🌸','🦋','🌙','⭐','🌺','🦄'].map((e,i) => (
                <span key={i} className="text-xl"
                  style={{ opacity: 0.15 + i * 0.04, animation: `float${(i%3)+1} ${3+i*0.4}s ease-in-out infinite` }}>
                  {e}
                </span>
              ))
            : isKnight
            ? ['⚔️','🛡️','🐉','🏰','👑','🗡️'].map((e,i) => (
                <span key={i} className="text-xl"
                  style={{ opacity: 0.12 + i * 0.03 }}>
                  {e}
                </span>
              ))
            : ['🎵','🎶','🎸','🎹','🎺','🥁'].map((e,i) => (
                <span key={i} className="text-xl opacity-15">{e}</span>
              ))
          }
        </div>
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-8px) rotate(5deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(5deg)}  50%{transform:translateY(-10px) rotate(-5deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0)}               50%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}

// ─── Celebration screen ─────────────────────────────────────────────────────
function CelebrationScreen({ name, type }: { name: string; type: CharacterType }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isPrincess = type === 'princess';

  const bg = isPrincess
    ? 'linear-gradient(160deg,#1a0a2e 0%,#6b2fa0 50%,#c9218e 100%)'
    : 'linear-gradient(160deg,#070d1a 0%,#0a1f4e 40%,#0f3460 100%)';

  const particles = isPrincess
    ? ['🌸','✨','🌺','⭐','🦋','🪄','🌙','💫']
    : ['⚔️','🛡️','⭐','🏆','💫','🌟','🐉','👑'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative"
      style={{ background: bg, paddingTop:'env(safe-area-inset-top)', paddingBottom:'env(safe-area-inset-bottom)' }}>

      {/* Particle rain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="absolute text-xl select-none"
            style={{
              left: `${Math.random()*100}%`,
              top: `${Math.random()*100}%`,
              opacity: Math.random() * 0.35 + 0.05,
              fontSize: `${Math.random()*14+10}px`,
              animation: `twinkle ${Math.random()*3+2}s ease-in-out ${Math.random()*2}s infinite`,
            }}>
            {particles[Math.floor(Math.random() * particles.length)]}
          </div>
        ))}
        {/* Small star dots */}
        {[...Array(20)].map((_, i) => (
          <div key={`s${i}`} className="absolute rounded-full bg-white"
            style={{
              width: Math.random()*2.5+0.5+'px', height: Math.random()*2.5+0.5+'px',
              top: Math.random()*100+'%', left: Math.random()*100+'%',
              opacity: Math.random()*0.6+0.1,
              animation: `pulse ${Math.random()*2+1.5}s ease-in-out infinite`,
            }} />
        ))}
      </div>

      {/* Main content — slides in */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.85)',
          transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

        {/* Main emoji */}
        <div className="text-[80px] leading-none select-none"
          style={{
            filter: isPrincess
              ? 'drop-shadow(0 0 24px rgba(255,107,157,0.8))'
              : 'drop-shadow(0 0 24px rgba(100,210,255,0.8))',
            animation: 'floatBounce 3s ease-in-out infinite',
          }}>
          {isPrincess ? '👸' : '⚔️'}
        </div>

        {/* Category tag */}
        <div className="px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'scale(1)' : 'scale(0.8)',
            transition: 'opacity 0.5s ease 0.1s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
            background: isPrincess ? 'rgba(255,107,157,0.3)' : 'rgba(0,122,255,0.3)',
          }}>
          <p className="text-white/90 text-xs font-bold tracking-[0.2em] uppercase">
            {isPrincess ? 'New Princess' : 'New Knight'}
          </p>
        </div>

        {/* Name headline */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
        }}>
          <h1 className="text-white text-3xl font-black leading-tight">
            {isPrincess ? 'プリンセス' : '騎士'}<br />
            「<span style={{ color: isPrincess ? '#FFD6F0' : '#FFD60A' }}>{name}</span>」<br />
            の物語が始まる！
          </h1>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-[240px]">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/30 text-xs">{isPrincess ? '🌸' : '⚔️'}</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Tagline */}
        <p className="text-white/50 text-sm leading-relaxed">
          {isPrincess
            ? '魔法と妖精の世界で\n音楽の力を解き放て！'
            : '剣と盾で悪を倒せ\n最強の音楽家を目指せ！'}
        </p>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{
                background: isPrincess ? '#FF6B9D' : '#007AFF',
                opacity: 0.5,
                animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`,
              }} />
          ))}
        </div>
      </div>

      <style>{`@keyframes floatBounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.06)}}`}</style>
    </div>
  );
}
