'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { saveProfile, getProfile, type CharacterType } from '@/lib/profile';

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Already logged in → skip to student page
  useEffect(() => {
    const role    = localStorage.getItem('app_role');
    const profile = getProfile();
    if (role === 'student' && profile) {
      router.replace('/student');
    }
  }, [router]);

  const handleLogin = async () => {
    const nick = nickname.trim();
    const pw   = password.trim();
    if (!nick) { setError('名前を入力してください'); return; }
    if (!pw)   { setError('パスワードを入力してください'); return; }
    setError('');
    setLoading(true);

    // ── Supabase で認証 ──────────────────────────────────────────────────────
    if (supabase) {
      const { data, error: dbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('nickname', nick)
        .eq('password', pw)
        .maybeSingle();

      if (dbErr) {
        console.error('[login] supabase error:', dbErr);
        // Supabase に繋がらなければ localStorage で試す
      } else if (data) {
        // ログイン成功 — プロフィールを localStorage に保存
        saveProfile({
          nickname:     data.nickname,
          birthday:     data.birthday,
          type:         (data.type ?? 'knight') as CharacterType,
          avatar_url:   data.avatar_url  ?? undefined,
          teacher_id:   data.teacher_id  ?? undefined,
          teacher_name: data.teacher_name ?? undefined,
          password:     data.password    ?? undefined,
        });
        localStorage.setItem('app_role', 'student');
        setLoading(false);
        router.replace('/student');
        return;
      } else {
        // 一致するレコードなし
        setLoading(false);
        setError('名前またはパスワードが違います');
        return;
      }
    }

    // ── Supabase 未設定 or 接続不可 → localStorage で照合 ──────────────────
    const local = getProfile();
    if (local && local.nickname === nick && local.password === pw) {
      localStorage.setItem('app_role', 'student');
      setLoading(false);
      router.replace('/student');
      return;
    }

    setLoading(false);
    setError('名前またはパスワードが違います');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: 'linear-gradient(160deg,#0a0e20 0%,#12102c 50%,#0e1225 100%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i * 37 + 5) % 95}%`,
            top:  `${(i * 53 + 8) % 88}%`,
            width: 2 + (i % 3), height: 2 + (i % 3),
            borderRadius: '50%',
            background: 'white',
            opacity: 0.12 + (i % 5) * 0.06,
          }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div
            className="w-20 h-20 rounded-[22px] flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(145deg,#007AFF,#5856D6)' }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6"  cy="18" r="3" fill="white" stroke="none"/>
              <circle cx="18" cy="16" r="3" fill="white" stroke="none"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight">練習ノート</h1>
            <p className="text-xs text-white/40 mt-0.5">生徒ログイン</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl px-6 py-7 space-y-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>

          {/* Nickname */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-widest uppercase text-white/40">
              ニックネーム
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="例：はなこ"
              autoComplete="username"
              className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none placeholder-white/25"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-widest uppercase text-white/40">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none pr-12 placeholder-white/25"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 active:opacity-80"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2" strokeLinecap="round">
                  {showPw
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-xs font-semibold text-[#FF453A]">{error}</p>
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-black text-base transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#34C759,#007AFF)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                確認中…
              </span>
            ) : 'ログイン'}
          </button>
        </div>

        {/* Footer links */}
        <div className="text-center space-y-2">
          <p className="text-xs text-white/30">
            初めての方は先生から招待URLをもらってください
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-white/30 underline active:text-white/60"
          >
            トップに戻る
          </button>
        </div>

      </div>
    </div>
  );
}
