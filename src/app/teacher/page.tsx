'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Submission } from '@/types';
import { getSubmissions, updateSubmission } from '@/lib/submissions';
import { getTitle, calcLevel, MONSTERS } from '@/lib/gameData';
import { getProfile, Profile } from '@/lib/profile';
import { awardBadge, hasBadge } from '@/lib/badges';
import { supabase } from '@/lib/supabase';
import AvatarUploader from '@/components/AvatarUploader';
import { uploadTeacherAvatar, getTeacherAvatarUrl } from '@/lib/avatar';
import type { MonsterState } from '@/app/student/page';
import StarRating from '@/components/StarRating';

const ROLE_KEY = 'app_role';
const MS_KEY   = 'monster_state_v2';

const STAMPS = [
  { emoji: '⭐', label: 'すごいね！',    text: 'すごいね！とってもよくできました！この調子で続けよう！' },
  { emoji: '💪', label: 'がんばれ！',    text: 'がんばれ！きみならできる！応援してるよ！' },
  { emoji: '✨', label: 'よくできました', text: 'よくできました！前よりずっと上手になったね！' },
  { emoji: '🔥', label: '毎日続けよう',  text: '毎日の練習が上達への近道だよ！続けよう！' },
  { emoji: '🎵', label: '上手になったね', text: '音がきれいになってきたね！すばらしい演奏だよ！' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const last = new Date(dateStr + 'T00:00:00');
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function dateJP(s: string) {
  const d = new Date(s + 'T00:00:00');
  return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
}

function loadMS(): MonsterState | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(MS_KEY) ?? 'null'); } catch { return null; }
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function StatCard({ icon, value, unit, label, color }: {
  icon: string; value: number; unit: string; label: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center px-2 py-3 gap-0.5">
      <span className="text-xl leading-none">{icon}</span>
      <div className="flex items-baseline gap-0.5 mt-1">
        <span className="text-[28px] font-black leading-none" style={{ color }}>{value}</span>
        <span className="text-xs font-bold text-[#8E8E93]">{unit}</span>
      </div>
      <p className="text-[10px] text-[#8E8E93] text-center leading-tight mt-0.5">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeacherPage() {
  const router  = useRouter();
  const today   = todayStr();

  const [subs,         setSubs]         = useState<Submission[]>([]);
  const [mounted,      setMounted]      = useState(false);
  const [stats,        setStats]        = useState<MonsterState | null>(null);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [stampToast,   setStampToast]   = useState('');
  const [xpGranted,       setXpGranted]       = useState(false);
  const [expressionGranted, setExpressionGranted] = useState(false);
  const [expressionAlready, setExpressionAlready] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSubs(getSubmissions());
    setStats(loadMS());
    setProfile(getProfile());
    setExpressionAlready(hasBadge('expression'));
    setTeacherAvatarUrl(getTeacherAvatarUrl());
  }, []);

  const reload = () => setSubs(getSubmissions());

  // ── Derived values ──────────────────────────────────────────────────────────
  const todaySubs          = subs.filter(s => s.date === today);
  const totalMinutes       = todaySubs.reduce((sum, s) => sum + s.duration, 0);
  const uncommented        = subs.filter(s => !s.teacherComment).length;
  const latestVideoSub     = [...subs].reverse().find(s => s.videoUrl);
  const latestUnresponded  = subs
    .filter(s => !s.teacherComment)
    .sort((a, b) => b.submittedAt - a.submittedAt)[0];

  const daysSincePractice  = stats ? daysSince(stats.lastPracticeDate) : 999;
  const isWarning          = daysSincePractice >= 3;

  const lv    = calcLevel(stats?.totalXp ?? 0);
  const title = getTitle(lv);
  const cur   = MONSTERS[(stats?.monsterIndex ?? 0) % MONSTERS.length];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleTeacherAvatarUpload = async (file: File) => {
    const url = await uploadTeacherAvatar(file);
    if (url) setTeacherAvatarUrl(url);
  };

  const handleLogout = () => {
    localStorage.removeItem(ROLE_KEY);
    router.push('/');
  };

  const handleStamp = (text: string, label: string, emoji: string) => {
    if (!latestUnresponded) return;
    const updated: Submission = {
      ...latestUnresponded,
      teacherComment: text,
      teacherCommentAt: Date.now(),
    };
    updateSubmission(updated);
    reload();
    setStampToast(`${emoji} ${label} を送信しました！`);
    setTimeout(() => setStampToast(''), 2500);
  };

  const handleExpressionAward = () => {
    const awarded = awardBadge('expression');
    if (awarded) {
      setExpressionGranted(true);
      setExpressionAlready(true);
      setTimeout(() => setExpressionGranted(false), 3000);
    } else {
      setExpressionAlready(true);
    }
  };

  const handleDeleteStudent = async () => {
    const STUDENT_KEYS = [
      'student_profile_v1', 'monster_state_v2', 'last_attack_date',
      'badge_celebrated', 'music_practice_records', 'practice_submissions_v1',
    ];
    STUDENT_KEYS.forEach(k => localStorage.removeItem(k));
    if (supabase && profile) {
      try {
        await supabase.from('profiles').delete()
          .match({ nickname: profile.nickname, birthday: profile.birthday });
      } catch (e) {
        console.warn('[supabase] delete failed:', e);
      }
    }
    setProfile(null);
    setStats(null);
    setSubs([]);
    setShowDeleteConfirm(false);
  };

  const handleBonusXp = () => {
    const raw = localStorage.getItem(MS_KEY);
    if (!raw) return;
    const s: MonsterState = JSON.parse(raw);
    s.totalXp += 50;
    s.level    = calcLevel(s.totalXp);
    localStorage.setItem(MS_KEY, JSON.stringify(s));
    setStats({ ...s });
    setXpGranted(true);
    setTimeout(() => setXpGranted(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* ── Header ── */}
      <header className="bg-white/85 backdrop-blur-xl sticky top-0 z-10 border-b border-[#C6C6C8]/60"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {mounted && (
              <AvatarUploader
                currentUrl={teacherAvatarUrl}
                onUpload={handleTeacherAvatarUpload}
                isPrincess={false}
                size={36}
                shape="circle"
                defaultContent={<span className="text-base leading-none">👨‍🏫</span>}
              />
            )}
            <h1 className="text-xl font-bold text-[#1C1C1E]">先生ダッシュボード</h1>
            {mounted && uncommented > 0 && (
              <span className="bg-[#FF3B30] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {uncommented}
              </span>
            )}
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span className="text-xs text-[#6C6C70] font-medium">ログアウト</span>
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-5">

        {/* ── 1. TODAY'S SUMMARY ── */}
        {mounted && (
          <section>
            <SectionLabel>
              今日のサマリー&nbsp;·&nbsp;
              {new Date().getMonth()+1}月{new Date().getDate()}日（{'日月火水木金土'[new Date().getDay()]}）
            </SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon="🎵" value={todaySubs.length} unit="人" label="今日の練習" color="#34C759" />
              <StatCard icon="⏱" value={totalMinutes}     unit="分" label="合計練習時間"  color="#007AFF" />
              <StatCard icon="⚔️" value={stats?.monstersDefeated ?? 0} unit="体" label="倒したモンスター" color="#FF9F0A" />
            </div>
          </section>
        )}

        {/* ── 2. STUDENT TILE ── */}
        {mounted && (
          <section>
            <SectionLabel>生徒のステータス</SectionLabel>
            {!profile ? (
              <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl">👤</span>
                <p className="text-sm font-semibold text-[#1C1C1E]">生徒が登録されていません</p>
                <p className="text-xs text-[#8E8E93]">生徒がアプリでプロフィールを作成すると表示されます</p>
              </div>
            ) : (
            <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all
              ${isWarning ? 'ring-2 ring-[#FF3B30]/50' : ''}`}>

              {/* Warning banner */}
              {isWarning && (
                <div className="bg-[#FF3B30]/10 px-4 py-2.5 flex items-center gap-2.5 border-b border-[#FF3B30]/10">
                  <span className="w-6 h-6 rounded-full bg-[#FF3B30] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-black">！</span>
                  </span>
                  <span className="text-[#FF3B30] text-xs font-semibold">
                    {daysSincePractice >= 999
                      ? 'まだ練習を始めていません'
                      : `${daysSincePractice}日間練習がありません — 声をかけてみよう`}
                  </span>
                </div>
              )}

              {/* Student info row */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="shrink-0 w-14 h-14 rounded-2xl overflow-hidden shadow-sm relative"
                  style={{ background: `linear-gradient(135deg,${cur.from},${cur.to})` }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar"
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {cur.emoji}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[17px] font-black text-[#1C1C1E]">
                      {profile?.nickname ?? '未登録'}
                    </span>
                    {todaySubs.length > 0 ? (
                      <span className="text-[11px] bg-[#34C759]/10 text-[#34C759] font-bold px-2 py-0.5 rounded-full">
                        ✅ 今日練習済み
                      </span>
                    ) : (
                      <span className="text-[11px] bg-[#FF9F0A]/10 text-[#FF9F0A] font-bold px-2 py-0.5 rounded-full">
                        今日未練習
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-[#1C1C1E]">Lv. {lv}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: title.color }}>
                      {title.icon} {title.title}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[11px] text-[#6C6C70]">
                    <span>🔥 <b className="text-[#1C1C1E]">{stats?.streak ?? 0}</b>日連続</span>
                    <span>⚔️ <b className="text-[#1C1C1E]">{stats?.monstersDefeated ?? 0}</b>体</span>
                    <span>📖 <b className="text-[#1C1C1E]">{stats?.defeatedIds.length ?? 0}</b>/{MONSTERS.length}</span>
                    <span>🪙 <b className="text-[#1C1C1E]">{stats?.coins ?? 0}</b></span>
                  </div>
                </div>
              </div>

              {/* Latest video thumbnail */}
              {latestVideoSub?.videoUrl && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1.5">
                    最新の練習動画
                  </p>
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video
                      src={latestVideoSub.videoUrl}
                      playsInline preload="metadata"
                      className="w-full max-h-44 object-contain cursor-pointer"
                      onClick={(e) => {
                        const v = e.currentTarget;
                        v.paused ? v.play() : v.pause();
                      }}
                    />
                    {/* Play overlay hint */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8E8E93] mt-1">
                    {latestVideoSub.songName} · {dateJP(latestVideoSub.date)}
                  </p>
                </div>
              )}

              {/* Bonus XP + Award buttons + Delete */}
              <div className="px-4 pb-3 space-y-2">
                <button onClick={handleBonusXp}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5856D6] to-[#007AFF] text-white text-sm font-bold active:scale-[0.98] transition-all shadow-sm">
                  🎁 ボーナス経験値 +50XP を付与する
                </button>
                {xpGranted && (
                  <div className="flex items-center gap-2 bg-[#34C759]/10 rounded-xl px-3 py-2 animate-pop-in">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-xs text-[#34C759] font-semibold">ボーナス +50 XP を付与しました！</span>
                  </div>
                )}

                {/* Expression award */}
                <button onClick={handleExpressionAward} disabled={expressionAlready}
                  className="w-full py-2.5 rounded-xl text-sm font-bold active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                  style={expressionAlready ? {
                    background: 'linear-gradient(90deg,#A0A0A0,#C0C0C0)',
                    color: 'white',
                  } : {
                    background: 'linear-gradient(90deg,#FF9F0A,#FF6B00)',
                    color: 'white',
                    boxShadow: '0 2px 12px rgba(255,107,0,0.4)',
                  }}>
                  {expressionAlready
                    ? '🏆 表現力賞 授与済み'
                    : profile?.type === 'princess'
                      ? '👠 輝くガラスの靴（表現力賞）を贈る'
                      : '🏆 黄金のインク瓶（表現力賞）を贈る'}
                </button>
                {expressionGranted && (
                  <div className="flex items-center gap-2 bg-[#FF9F0A]/10 rounded-xl px-3 py-2 animate-pop-in">
                    <span className="text-lg leading-none">
                      {profile?.type === 'princess' ? '👠' : '🏆'}
                    </span>
                    <span className="text-xs text-[#FF9F0A] font-bold">
                      表現力賞を贈りました！生徒のマイページに反映されます。
                    </span>
                  </div>
                )}

                {/* Delete student */}
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-xl border border-[#FF3B30]/40 text-[#FF3B30] text-sm font-bold active:bg-[#FF3B30]/10 transition-all flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  生徒のデータを削除する
                </button>
              </div>
            </div>
            )}
          </section>
        )}

        {/* Delete confirm dialog */}
        {showDeleteConfirm && profile && (
          <ConfirmDeleteDialog
            nickname={profile.nickname}
            onConfirm={handleDeleteStudent}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {/* ── 3. QUICK REPLY STAMPS ── */}
        {mounted && (
          <section>
            <SectionLabel>
              クイック返信
              {uncommented > 0 && (
                <span className="ml-1.5 text-[#FF3B30]">— {uncommented}件 未返信</span>
              )}
            </SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3 space-y-3">
              {uncommented === 0 ? (
                <p className="text-xs text-[#8E8E93] text-center py-1">未返信の提出はありません</p>
              ) : (
                <p className="text-[11px] text-[#8E8E93]">
                  最新の未返信提出（{latestUnresponded && fmtDate(latestUnresponded.submittedAt)}）に送信されます
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {STAMPS.map((s) => (
                  <button key={s.label}
                    onClick={() => handleStamp(s.text, s.label, s.emoji)}
                    disabled={uncommented === 0}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.96]
                      ${uncommented > 0
                        ? 'bg-[#F2F2F7] text-[#1C1C1E] active:bg-[#007AFF]/10 active:text-[#007AFF]'
                        : 'bg-[#F2F2F7] text-[#C7C7CC] cursor-not-allowed'}`}>
                    <span className="text-base leading-none">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {stampToast && (
                <div className="flex items-center gap-2 bg-[#34C759]/10 rounded-xl px-3 py-2 animate-pop-in">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-xs text-[#34C759] font-semibold">{stampToast}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 4. SUBMISSION LIST ── */}
        <section>
          <SectionLabel>受信トレイ</SectionLabel>
          {!mounted ? null : subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[#1C1C1E] font-semibold text-sm">まだ提出がありません</p>
                <p className="text-[#6C6C70] text-xs mt-1">生徒が練習を提出するとここに表示されます</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map((sub) => (
                <SubmissionItem key={sub.id} sub={sub} onUpdate={reload} profile={profile} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// ─── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDeleteDialog({ nickname, onConfirm, onCancel }: {
  nickname: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[17px] font-black text-[#1C1C1E]">
            本当に <span className="text-[#FF3B30]">{nickname}</span> のデータを削除しますか？
          </p>
          <p className="text-xs text-[#8E8E93]">練習記録・バッジ・ゲームデータがすべて消えます。元に戻せません。</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] text-sm font-bold active:bg-[#E5E5EA]">
            キャンセル
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-[#FF3B30] text-white text-sm font-bold active:opacity-80 shadow-sm">
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest mb-2 px-1">
      {children}
    </p>
  );
}

// ─── Submission card ───────────────────────────────────────────────────────────
function SubmissionItem({ sub, onUpdate, profile }: {
  sub: Submission; onUpdate: () => void; profile: Profile | null;
}) {
  const [comment,  setComment]  = useState(sub.teacherComment ?? '');
  const [editing,  setEditing]  = useState(!sub.teacherComment);
  const [saved,    setSaved]    = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!comment.trim()) return;
    const updated: Submission = {
      ...sub,
      teacherComment:   comment.trim(),
      teacherCommentAt: Date.now(),
    };
    updateSubmission(updated);
    setSaved(true); setEditing(false); onUpdate();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] shrink-0 overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
            ) : (
              <span className="text-white text-[10px] font-bold">{profile?.nickname?.[0] ?? '生'}</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1C1C1E]">{profile?.nickname ?? '生徒'}からの提出</p>
            <p className="text-[10px] text-[#8E8E93]">{dateJP(sub.date)} · {fmtDate(sub.submittedAt)}</p>
          </div>
          {!sub.teacherComment
            ? <span className="ml-auto text-[10px] bg-[#FF3B30]/10 text-[#FF3B30] font-bold px-2 py-0.5 rounded-full">未返信</span>
            : <span className="ml-auto text-[10px] bg-[#34C759]/10 text-[#34C759] font-bold px-2 py-0.5 rounded-full">返信済み</span>
          }
        </div>

        {/* Practice bubble */}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 shrink-0" />
          <div className="flex-1 bg-[#007AFF]/8 rounded-2xl rounded-tl-sm px-3 py-2.5">
            <p className="font-semibold text-[#1C1C1E] text-base">{sub.songName}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-[#6C6C70]">{sub.duration}分</span>
              <StarRating value={sub.rating} readonly size="sm" />
            </div>
            {sub.videoFileName && (
              <div className="flex items-center gap-1 mt-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <span className="text-[11px] text-[#34C759] font-medium">{sub.videoFileName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video player */}
      {sub.videoUrl && (
        <div className="px-4 pb-3">
          <video src={sub.videoUrl} controls playsInline preload="metadata"
            className="w-full rounded-xl bg-black max-h-64 object-contain" />
        </div>
      )}
      {sub.videoFileName && !sub.videoUrl && (
        <div className="mx-4 mb-3 bg-[#F2F2F7] rounded-xl px-3 py-2.5 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
          <p className="text-xs text-[#8E8E93]">動画は再読み込み後に無効になります（Supabase連携で解決）</p>
        </div>
      )}

      <div className="h-px bg-[#F2F2F7] mx-4" />

      {/* Comment section */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-[#6C6C70]">先生からのアドバイス</p>

        {sub.teacherComment && !editing && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9F0A] to-[#FF3B30] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm">👨‍🏫</span>
            </div>
            <div className="flex-1 bg-[#FF9F0A]/10 rounded-2xl rounded-tl-sm px-3 py-2.5">
              <p className="text-[#1C1C1E] text-sm leading-relaxed">{sub.teacherComment}</p>
              {sub.teacherCommentAt && (
                <p className="text-[10px] text-[#8E8E93] mt-1">{fmtDate(sub.teacherCommentAt)}</p>
              )}
            </div>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 bg-[#34C759]/10 rounded-xl px-3 py-2 animate-pop-in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-xs text-[#34C759] font-semibold">送信しました！</span>
          </div>
        )}

        {editing ? (
          <div className="space-y-2">
            <textarea ref={textareaRef} rows={3}
              placeholder="アドバイスや励ましのメッセージを入力…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-[#1C1C1E] placeholder-[#C7C7CC] outline-none text-sm resize-none"
            />
            <div className="flex gap-2">
              {sub.teacherComment && (
                <button onClick={() => { setEditing(false); setComment(sub.teacherComment ?? ''); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] text-[#6C6C70] text-sm font-medium active:bg-[#E5E5EA]">
                  キャンセル
                </button>
              )}
              <button onClick={handleSend} disabled={!comment.trim()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]
                  ${comment.trim()
                    ? 'bg-gradient-to-r from-[#FF9F0A] to-[#FF3B30] text-white shadow-sm'
                    : 'bg-[#F2F2F7] text-[#C7C7CC]'}`}>
                送信する
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="w-full flex items-center gap-2 bg-[#F2F2F7] rounded-xl px-3 py-2.5 active:bg-[#E5E5EA] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
            </svg>
            <span className="text-sm text-[#007AFF] font-medium">アドバイスを編集する</span>
          </button>
        )}
      </div>
    </div>
  );
}
