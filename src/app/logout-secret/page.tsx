'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CLEAR_KEYS = [
  'app_role',
  'student_profile_v1',
  'monster_state_v2',
  'last_attack_date',
  'badge_celebrated',
  'music_practice_records',
  'practice_submissions_v1',
];

export default function LogoutSecretPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    CLEAR_KEYS.forEach(k => localStorage.removeItem(k));
    setDone(true);
    const t = setTimeout(() => router.replace('/'), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1C1C1E] flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-16 h-16 rounded-full bg-[#2C2C2E] flex items-center justify-center">
        {done ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <div className="w-6 h-6 border-2 border-[#FF9F0A] border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <p className="text-white font-semibold text-lg">
        {done ? 'ログアウトしました' : 'ログアウト中...'}
      </p>
      <p className="text-[#8E8E93] text-sm text-center">
        {done ? '2秒後にトップページへ移動します' : ''}
      </p>
    </div>
  );
}
