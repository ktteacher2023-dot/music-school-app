'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_KEY      = 'app_role';
const TEACHER_PIN   = '1234';
const PIN_LENGTH    = 4;

// ─── PIN pad layout ───────────────────────────────────────────────────────────
const PAD_KEYS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['','0','⌫'],
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────
function PinDots({ pin, shake, error }: { pin: string; shake: boolean; error: boolean }) {
  return (
    <div className={`flex gap-5 justify-center ${shake ? 'animate-shake' : ''}`}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-150
            ${i < pin.length
              ? error ? 'bg-[#FF3B30] border-[#FF3B30]' : 'bg-white border-white'
              : 'bg-transparent border-white/50'}`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RoleSelectPage() {
  const router = useRouter();

  // PIN pad state
  const [showPin, setShowPin]   = useState(false);
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);

  // 前回選んだロールがあれば自動リダイレクト
  useEffect(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    if (saved === 'student') router.replace('/student');
    if (saved === 'teacher') router.replace('/teacher');
  }, [router]);

  // PIN 入力処理
  const handleKey = useCallback((key: string) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);

    // 4桁入力完了 → 検証
    if (next.length === PIN_LENGTH) {
      if (next === TEACHER_PIN) {
        // 正解
        localStorage.setItem(ROLE_KEY, 'teacher');
        router.push('/teacher');
      } else {
        // 不正解 → シェイク → リセット
        setError('パスワードが違います');
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin('');
        }, 600);
      }
    }
  }, [pin, router]);

  const openPin = () => {
    setPin('');
    setError('');
    setShake(false);
    setShowPin(true);
  };

  return (
    <>
      {/* ── Role selection ── */}
      <div
        className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* App icon + title */}
        <div className="flex flex-col items-center mb-12">
          <div
            className="w-24 h-24 rounded-[26px] mb-5 flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(145deg,#007AFF,#5856D6)' }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" fill="white" stroke="none" />
              <circle cx="18" cy="16" r="3" fill="white" stroke="none" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-[#1C1C1E] tracking-tight">練習ノート</h1>
          <p className="text-sm text-[#6C6C70] mt-1">音楽教室の練習管理アプリ</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <p className="text-xs font-semibold text-[#6C6C70] text-center mb-4 tracking-widest uppercase">
            モードを選んでください
          </p>

          {/* Student */}
          <button
            onClick={() => { localStorage.setItem(ROLE_KEY, 'student'); router.push('/student'); }}
            className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm active:scale-[0.98] active:bg-[#F2F2F7] transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#34C759,#007AFF)' }}>
              <span className="text-2xl">🎵</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1C1C1E] text-base">生徒としてログイン</p>
              <p className="text-xs text-[#6C6C70] mt-0.5">練習を記録してモンスターを倒そう！</p>
            </div>
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="#C7C7CC" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1.5 1.5l6 6-6 6" />
            </svg>
          </button>

          {/* Teacher → PIN */}
          <button
            onClick={openPin}
            className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm active:scale-[0.98] active:bg-[#F2F2F7] transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#FF9F0A,#FF3B30)' }}>
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1C1C1E] text-base">先生としてログイン</p>
              <p className="text-xs text-[#6C6C70] mt-0.5">パスコードが必要です</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-[#C7C7CC] mt-10">タップするとモードに入れます</p>
      </div>

      {/* ── PIN pad overlay ── */}
      {showPin && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(24px)' }}
        >
          {/* Top safe area spacer */}
          <div style={{ height: 'env(safe-area-inset-top)' }} />

          {/* Cancel */}
          <div className="flex justify-start px-5 pt-3">
            <button
              onClick={() => setShowPin(false)}
              className="text-white/70 text-base active:text-white transition-colors"
            >
              キャンセル
            </button>
          </div>

          {/* Lock icon + title */}
          <div className="flex flex-col items-center mt-10 mb-10 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1.5" fill="white" />
              </svg>
            </div>
            <p className="text-white font-semibold text-xl">先生用パスコード</p>
            <p className="text-white/50 text-sm -mt-2">4桁のパスコードを入力</p>

            {/* Dots */}
            <PinDots pin={pin} shake={shake} error={!!error} />

            {/* Error message */}
            <div className="h-5 flex items-center">
              {error && (
                <p className="text-[#FF453A] text-sm font-medium animate-pop-in">{error}</p>
              )}
            </div>
          </div>

          {/* Number pad */}
          <div className="mt-auto mb-8 px-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {PAD_KEYS.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-6 mb-4">
                {row.map((key) => {
                  if (key === '') return <div key="empty" className="w-20 h-20" />;

                  const isDelete = key === '⌫';
                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      className={`w-20 h-20 rounded-full flex items-center justify-center
                        transition-all active:scale-90
                        ${isDelete
                          ? 'bg-transparent'
                          : 'bg-white/20 active:bg-white/40'}`}
                    >
                      {isDelete ? (
                        <svg width="26" height="20" viewBox="0 0 28 22" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                          <path d="M10 1H25a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H10L1 11z" />
                          <path d="M16 8l6 6M22 8l-6 6" />
                        </svg>
                      ) : (
                        <span className="text-white font-light text-3xl">{key}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
