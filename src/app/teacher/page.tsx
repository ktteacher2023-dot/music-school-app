'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { Submission } from '@/types';
import { getSubmissions, updateSubmission } from '@/lib/submissions';
import { getTitle, calcLevel, MONSTERS } from '@/lib/gameData';
import { getProfile, Profile } from '@/lib/profile';
import { getOrCreateTeacherId } from '@/lib/teacherIdentity';
import { supabase } from '@/lib/supabase';
import AvatarUploader from '@/components/AvatarUploader';
import { uploadTeacherAvatar, getTeacherAvatarUrl } from '@/lib/avatar';
import type { MonsterState } from '@/app/student/page';
import StarRating from '@/components/StarRating';
import {
  fetchLessonRecords, saveLessonRecord, uploadLessonVideo, deleteLessonRecord,
  type LessonRecord,
} from '@/lib/lessonRecords';

const ROLE_KEY      = 'app_role';
const MS_KEY        = 'monster_state_v2';
const TEACHER_PW_KEY = 'teacher_password';

const STAMPS = [
  { emoji: '⭐', label: 'すごいね！',    text: 'すごいね！とってもよくできました！この調子で続けよう！' },
  { emoji: '💪', label: 'がんばれ！',    text: 'がんばれ！きみならできる！応援してるよ！' },
  { emoji: '✨', label: 'よくできました', text: 'よくできました！前よりずっと上手になったね！' },
  { emoji: '🔥', label: '毎日続けよう',  text: '毎日の練習が上達への近道だよ！続けよう！' },
  { emoji: '🎵', label: '上手になったね', text: '音がきれいになってきたね！すばらしい演奏だよ！' },
];

function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState<string | null>(null);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [teacherId,         setTeacherId]         = useState('');
  const [students,          setStudents]          = useState<Profile[]>([]);
  const [selectedStudent,   setSelectedStudent]   = useState<Profile | null>(null);
  const [loadingStudents,   setLoadingStudents]   = useState(true);
  const [studentsError,     setStudentsError]     = useState('');
  const [inviteUrlCopied,   setInviteUrlCopied]   = useState(false);

  useEffect(() => {
    setMounted(true);
    setSubs(getSubmissions());
    setStats(loadMS());
    setProfile(getProfile());
    setTeacherAvatarUrl(getTeacherAvatarUrl());

    const tid = getOrCreateTeacherId();
    setTeacherId(tid);
    loadStudents(tid);
  }, []);

  const loadStudents = (tid: string) => {
    setLoadingStudents(true);
    setStudentsError('');
    if (!supabase) { setLoadingStudents(false); setStudentsError('Supabase未設定'); return; }
    supabase.from('profiles')
      .select('*')
      .eq('teacher_id', tid)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[teacher] student fetch error:', error.message, error.details);
          setStudentsError(error.message);
        } else {
          setStudents((data as Profile[]) ?? []);
        }
        setLoadingStudents(false);
      });
  };

  const reload = () => setSubs(getSubmissions());

  // ── Derived values ──────────────────────────────────────────────────────────
  const todaySubs          = subs.filter(s => s.date === today);
  const totalMinutes       = todaySubs.reduce((sum, s) => sum + s.duration, 0);
  const uncommented        = subs.filter(s => !s.teacherComment).length;
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

  const handleDeleteStudent = async () => {
    const target = selectedStudent ?? profile;
    if (!target) { setShowDeleteConfirm(false); return; }
    // If deleting the local student, clear localStorage
    if (profile && target.nickname === profile.nickname && target.birthday === profile.birthday) {
      const STUDENT_KEYS = [
        'student_profile_v1', 'monster_state_v2', 'last_attack_date',
        'badge_celebrated', 'music_practice_records', 'practice_submissions_v1',
      ];
      STUDENT_KEYS.forEach(k => localStorage.removeItem(k));
      setProfile(null);
      setStats(null);
      setSubs([]);
    }
    if (supabase) {
      await supabase.from('profiles').delete()
        .match({ nickname: target.nickname, birthday: target.birthday });
    }
    setStudents(prev => prev.filter(s => !(s.nickname === target.nickname && s.birthday === target.birthday)));
    setSelectedStudent(null);
    setShowStudentDetail(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* ── Settings modal ── */}
      {showSettings && (
        <PasswordChangeSheet onClose={() => setShowSettings(false)} />
      )}

      {/* ── Student detail modal ── */}
      {showStudentDetail && selectedStudent && (
        <StudentDetailModal
          profile={selectedStudent}
          stats={selectedStudent.nickname === profile?.nickname ? stats : null}
          teacherId={teacherId}
          onClose={() => { setShowStudentDetail(false); setSelectedStudent(null); }}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* ── Header ── */}
      <header className="bg-white/85 backdrop-blur-xl sticky z-10 border-b border-[#C6C6C8]/60"
        style={{ top: 'max(20px, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {mounted && (
              <AvatarUploader
                currentUrl={teacherAvatarUrl}
                onUpload={handleTeacherAvatarUpload}
                isPrincess={profile?.type === 'princess'}
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C6C70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              <span className="text-xs text-[#6C6C70] font-medium">ログアウト</span>
            </button>
          </div>
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

        {/* ── 2. STUDENT LIST ── */}
        {mounted && (
          <section>
            <SectionLabel>生徒一覧</SectionLabel>

            {/* Invite section */}
            {teacherId && <InviteSection teacherId={teacherId} copied={inviteUrlCopied} onCopy={() => {
              if (typeof window === 'undefined') return;
              navigator.clipboard.writeText(`${window.location.origin}/setup?tid=${teacherId}`).then(() => {
                setInviteUrlCopied(true);
                setTimeout(() => setInviteUrlCopied(false), 2500);
              });
            }} />}

            {/* Reload button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => loadStudents(teacherId)}
                disabled={loadingStudents}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white shadow-sm text-xs font-semibold text-[#007AFF] active:bg-[#F2F2F7] disabled:opacity-40 transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                再読み込み
              </button>
            </div>

            {/* Error state */}
            {studentsError && (
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl px-4 py-3 mb-2 space-y-1">
                <p className="text-xs font-black text-[#FF3B30]">⚠️ データ取得エラー</p>
                <p className="text-[11px] text-[#FF3B30]/80 font-mono break-all">{studentsError}</p>
                <p className="text-[10px] text-[#8E8E93] mt-1">
                  Supabase の profiles テーブルに teacher_id カラムが存在するか確認してください。
                </p>
              </div>
            )}

            {/* Orphan alert: local profile not linked to this teacher */}
            {!loadingStudents && profile && !students.find(s => s.nickname === profile.nickname && s.birthday === profile.birthday) && (
              <div className="bg-[#FF9F0A]/10 border border-[#FF9F0A]/25 rounded-2xl px-4 py-3 mb-2">
                <p className="text-xs font-black text-[#FF9F0A]">⚠️ 紐付けされていない生徒を検出</p>
                <p className="text-[11px] text-[#8E8E93] mt-1">
                  このデバイスの生徒「{profile.nickname}」は teacher_id が一致しません。
                  招待URLから再登録するか、Supabase を確認してください。
                </p>
              </div>
            )}

            {loadingStudents ? (
              <div className="bg-white rounded-2xl shadow-sm flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl">👤</span>
                <p className="text-sm font-semibold text-[#1C1C1E]">生徒が登録されていません</p>
                <p className="text-xs text-[#8E8E93] text-center px-6">上の招待URLを生徒に共有してください</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((stu) => {
                  const stuCur = MONSTERS[0];
                  const isLocal = profile?.nickname === stu.nickname && profile?.birthday === stu.birthday;
                  const stuSubs = isLocal ? todaySubs : [];
                  const stuStats = isLocal ? stats : null;
                  const stuLv = calcLevel(stuStats?.totalXp ?? 0);
                  const stuTitle = getTitle(stuLv);
                  const stuDaysSince = isLocal ? daysSincePractice : 999;
                  const stuWarning = isLocal && isWarning;
                  return (
                    <div key={`${stu.nickname}-${stu.birthday}`}
                      className={`bg-white rounded-2xl shadow-sm overflow-hidden ${stuWarning ? 'ring-2 ring-[#FF3B30]/50' : ''}`}>
                      <button className="w-full text-left active:bg-[#F2F2F7] transition-colors"
                        onClick={() => { setSelectedStudent(stu); setShowStudentDetail(true); }}>
                        {stuWarning && (
                          <div className="bg-[#FF3B30]/10 px-4 py-1.5 flex items-center gap-2 border-b border-[#FF3B30]/10">
                            <span className="text-[#FF3B30] text-[11px] font-semibold">
                              {stuDaysSince >= 999 ? 'まだ練習を始めていません' : `${stuDaysSince}日間練習なし`}
                            </span>
                          </div>
                        )}
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-sm"
                            style={{ background: `linear-gradient(135deg,${stuCur.from},${stuCur.to})` }}>
                            {stu.avatar_url ? (
                              <img src={stu.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">
                                {stu.type === 'princess' ? '👸' : '🧑'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-black text-[#1C1C1E]">{stu.nickname}</span>
                              {isLocal && (stuSubs.length > 0 ? (
                                <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] font-bold px-1.5 py-0.5 rounded-full">今日練習済み</span>
                              ) : (
                                <span className="text-[10px] bg-[#FF9F0A]/10 text-[#FF9F0A] font-bold px-1.5 py-0.5 rounded-full">今日未練習</span>
                              ))}
                            </div>
                            {isLocal ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-bold text-[#6C6C70]">Lv.{stuLv}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: stuTitle.color }}>
                                  {stuTitle.icon} {stuTitle.title}
                                </span>
                                <span className="text-[10px] text-[#6C6C70]">🔥{stuStats?.streak ?? 0}日</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#8E8E93] mt-0.5">{stu.birthday}</p>
                            )}
                          </div>
                          <svg width="9" height="14" viewBox="0 0 9 15" fill="none" stroke="#C7C7CC" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M1.5 1.5l6 6-6 6"/>
                          </svg>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Delete confirm dialog */}
        {showDeleteConfirm && (selectedStudent ?? profile) && (
          <ConfirmDeleteDialog
            nickname={(selectedStudent ?? profile)!.nickname}
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

// ─── Student detail modal ──────────────────────────────────────────────────────
function StudentDetailModal({ profile, stats, teacherId, onClose, onDelete }: {
  profile: Profile; stats: MonsterState | null; teacherId: string;
  onClose: () => void; onDelete: () => void;
}) {
  const isPrincess  = profile.type === 'princess';
  const lv          = calcLevel(stats?.totalXp ?? 0);
  const title       = getTitle(lv);
  const cur         = MONSTERS[(stats?.monsterIndex ?? 0) % MONSTERS.length];
  // ── Teacher name ────────────────────────────────────────────────────────────
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [teacherNameSaving, setTeacherNameSaving] = useState(false);
  const [teacherNameSaved,  setTeacherNameSaved]  = useState(false);
  // ── Login URL / QR ──────────────────────────────────────────────────────────
  const [showQR,    setShowQR]    = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const loginUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/setup?nick=${encodeURIComponent(profile.nickname)}&bday=${profile.birthday}&type=${profile.type}${teacherId ? `&tid=${teacherId}` : ''}`
    : '';
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(loginUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    });
  }, [loginUrl]);
  const handleSaveTeacherName = async () => {
    setTeacherNameSaving(true);
    // Save to localStorage (student reads from here)
    localStorage.setItem(`teacher_name_${profile.nickname}`, teacherNameInput);
    // Save to Supabase
    if (supabase) {
      await supabase.from('profiles')
        .update({ teacher_name: teacherNameInput })
        .match({ nickname: profile.nickname, birthday: profile.birthday });
    }
    setTeacherNameSaving(false);
    setTeacherNameSaved(true);
    setTimeout(() => setTeacherNameSaved(false), 2500);
  };
  // ── Lesson records (video + memo) ──────────────────────────────────────────
  const [records,       setRecords]       = useState<LessonRecord[]>([]);
  const [loadingRecs,   setLoadingRecs]   = useState(true);
  const [recMemo,       setRecMemo]       = useState('');
  const [recVideoFile,  setRecVideoFile]  = useState<File | null>(null);
  const [recVideoPreview, setRecVideoPreview] = useState<string | null>(null);
  const [savingRec,     setSavingRec]     = useState(false);
  const [savedRec,      setSavedRec]      = useState(false);
  const [recError,      setRecError]      = useState('');
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const videoInputRef    = useRef<HTMLInputElement>(null);
  const libraryInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load current teacher name
    const storedName = localStorage.getItem(`teacher_name_${profile.nickname}`) ?? '';
    setTeacherNameInput(storedName);
    // Also try Supabase for fresh value
    if (supabase) {
      supabase.from('profiles')
        .select('teacher_name')
        .match({ nickname: profile.nickname, birthday: profile.birthday })
        .maybeSingle()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((r: any) => {
          const name = r?.data?.teacher_name ?? '';
          if (name) {
            setTeacherNameInput(name);
            localStorage.setItem(`teacher_name_${profile.nickname}`, name);
          }
        }, () => {});
    }
    fetchLessonRecords(profile.nickname, profile.birthday).then(recs => {
      setRecords(recs);
      setLoadingRecs(false);
    });
  }, [profile.nickname, profile.birthday]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecVideoFile(file);
    setRecVideoPreview(URL.createObjectURL(file));
  };

  const handleSaveRecord = async () => {
    setRecError('');
    setSavingRec(true);

    // 1. Upload video if selected
    let videoUrl: string | null = null;
    if (recVideoFile) {
      const { url, error: upErr } = await uploadLessonVideo(recVideoFile, profile.nickname);
      if (upErr || !url) {
        setRecError(upErr ?? '動画アップロード失敗');
        setSavingRec(false);
        return;
      }
      videoUrl = url;
    }

    // 2. Save record to DB
    const { record: saved, error: dbErr } = await saveLessonRecord(
      profile.nickname, profile.birthday, recMemo, videoUrl,
    );
    setSavingRec(false);

    if (dbErr || !saved) {
      setRecError(dbErr ?? 'DB保存失敗');
      return;
    }

    // 3. Success — prepend to list and clear form
    setRecords(prev => [saved, ...prev]);
    setRecMemo('');
    setRecVideoFile(null);
    setRecVideoPreview(null);
    if (videoInputRef.current)   videoInputRef.current.value = '';
    if (libraryInputRef.current) libraryInputRef.current.value = '';
    setSavedRec(true);
    setTimeout(() => setSavedRec(false), 3000);
  };

  const handleDeleteRecord = async (rec: LessonRecord) => {
    setDeletingId(rec.id);
    await deleteLessonRecord(rec.id, rec.video_url);
    setRecords(prev => prev.filter(r => r.id !== rec.id));
    setDeletingId(null);
  };

  const fmtRecDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
  };

  const fmtBirthday = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return { y: `${d.getFullYear()}年`, md: `${d.getMonth()+1}月${d.getDate()}日`, w: '日月火水木金土'[d.getDay()] };
  };
  const bd = fmtBirthday(profile.birthday);

  const bg     = isPrincess ? 'linear-gradient(180deg,#FFF0FF 0%,#F0E8FF 100%)' : 'linear-gradient(180deg,#080c18 0%,#0a0e20 100%)';
  const hdrBg  = isPrincess ? 'rgba(255,240,255,0.92)' : 'rgba(8,12,28,0.95)';
  const hdrBdr = isPrincess ? '1px solid rgba(255,100,180,0.25)' : '1px solid rgba(255,180,0,0.18)';
  const accent = isPrincess ? '#C77DFF' : '#FF9F0A';

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto" style={{ background: bg }}>

      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {isPrincess ? (
          <>
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{
                position:'absolute',
                left:`${5+i*9}%`, top:`${5+((i*37)%80)}%`,
                fontSize: 10+(i%3)*5, color:['#FFD700','#C77DFF','#87CEEB','#FFB7C5'][i%4],
                animation:`twinkle ${2+i*0.3}s ${i*0.18}s ease-in-out infinite`,
              }}>✦</div>
            ))}
            <div style={{ position:'absolute', top:'-10%', right:'-10%', width:300, height:300, borderRadius:'50%',
              background:'radial-gradient(circle,rgba(199,125,255,0.12) 0%,transparent 70%)' }}/>
            <div style={{ position:'absolute', bottom:'-10%', left:'-10%', width:260, height:260, borderRadius:'50%',
              background:'radial-gradient(circle,rgba(135,206,235,0.10) 0%,transparent 70%)' }}/>
          </>
        ) : (
          <>
            <svg width="260" height="220" style={{ position:'absolute', top:-40, right:-50, opacity:0.12 }} aria-hidden>
              <path d="M220,36 Q244,100 200,150 Q165,187 120,166 Q62,143 80,88 Q98,34 164,15 Q205,3 220,36Z" fill="#FF6B00"/>
            </svg>
            <svg width="240" height="280" style={{ position:'absolute', bottom:-50, left:-40, opacity:0.12 }} aria-hidden>
              <path d="M38,182 Q16,126 55,70 Q82,24 135,44 Q192,64 180,130 Q170,194 124,218 Q76,240 38,182Z" fill="#7B00FF"/>
            </svg>
          </>
        )}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ paddingTop:'max(20px, env(safe-area-inset-top))', background:hdrBg, backdropFilter:'blur(24px)', borderBottom:hdrBdr }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-60"
          style={{ background: isPrincess ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={isPrincess ? '#9B4DCA' : '#FF9F0A'} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase"
            style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(255,107,0,0.6)' }}>
            {isPrincess ? '✦ STUDENT JOURNAL ✦' : '▸ PLAYER CARD ◂'}
          </p>
          <h2 className="font-black text-xl leading-tight truncate"
            style={{ color: isPrincess ? '#7B1FA2' : 'white' }}>
            {profile.nickname}
          </h2>
        </div>
        <span className="text-2xl leading-none">{isPrincess ? '📖' : '📋'}</span>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-5 pb-16 space-y-4">

        {/* ── 担当講師名 ── */}
        <div className="rounded-2xl overflow-hidden"
          style={isPrincess ? {
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(199,125,255,0.3)',
          } : {
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,107,0,0.25)',
          }}>
          <div className="px-4 pt-3 pb-2 border-b"
            style={{ borderColor: isPrincess ? 'rgba(199,125,255,0.2)' : 'rgba(255,107,0,0.15)' }}>
            <p className="text-[11px] font-black tracking-widest"
              style={{ color: isPrincess ? 'rgba(199,125,255,0.7)' : 'rgba(255,107,0,0.7)' }}>
              {isPrincess ? '✦ 担当先生の名前' : '▸ INSTRUCTOR NAME'}
            </p>
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <input
              type="text"
              value={teacherNameInput}
              onChange={e => setTeacherNameInput(e.target.value)}
              placeholder="例：山田"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={isPrincess ? {
                background: 'rgba(255,240,255,0.8)',
                color: '#3d004d',
                border: '1px solid rgba(199,125,255,0.35)',
              } : {
                background: 'rgba(255,107,0,0.08)',
                color: 'white',
                border: '1px solid rgba(255,107,0,0.25)',
              }}
            />
            <button
              onClick={handleSaveTeacherName}
              disabled={teacherNameSaving}
              className="px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-[0.97]"
              style={{
                background: isPrincess ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)' : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
                color: 'white', minWidth: 52,
              }}>
              {teacherNameSaving ? '…' : teacherNameSaved ? '✓' : '保存'}
            </button>
          </div>
          {teacherNameSaved && (
            <p className="px-4 pb-2 text-[11px] font-semibold" style={{ color: '#34C759' }}>
              保存しました！生徒の画面に表示されます。
            </p>
          )}
        </div>

        {/* ── 生徒ログインURL / QRコード ── */}
        <div className="rounded-2xl overflow-hidden"
          style={isPrincess ? {
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(199,125,255,0.3)',
          } : {
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,107,0,0.25)',
          }}>
          <div className="px-4 pt-3 pb-2 border-b"
            style={{ borderColor: isPrincess ? 'rgba(199,125,255,0.2)' : 'rgba(255,107,0,0.15)' }}>
            <p className="text-[11px] font-black tracking-widest"
              style={{ color: isPrincess ? 'rgba(199,125,255,0.7)' : 'rgba(255,107,0,0.7)' }}>
              {isPrincess ? '✦ 生徒ログインURL / QR' : '▸ STUDENT LOGIN URL / QR'}
            </p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-[11px]" style={{ color: isPrincess ? 'rgba(100,0,120,0.6)' : 'rgba(255,255,255,0.4)' }}>
              このURLを生徒に送ると、名前・生年月日が自動入力されます
            </p>
            {/* URL text box */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl px-3 py-2 text-[11px] truncate"
                style={isPrincess ? {
                  background: 'rgba(255,240,255,0.8)',
                  color: '#3d004d',
                  border: '1px solid rgba(199,125,255,0.25)',
                } : {
                  background: 'rgba(255,107,0,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,107,0,0.2)',
                }}>
                {loginUrl}
              </div>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-[0.97] flex-shrink-0"
                style={{
                  background: urlCopied ? '#34C759' : isPrincess ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)' : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
                  color: 'white',
                }}>
                {urlCopied ? '✓ コピー済' : '📋 コピー'}
              </button>
            </div>
            {/* QR toggle */}
            <button
              onClick={() => setShowQR(v => !v)}
              className="w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
              style={isPrincess ? {
                background: 'rgba(199,125,255,0.12)',
                color: '#9B4DCA',
                border: '1px solid rgba(199,125,255,0.3)',
              } : {
                background: 'rgba(255,107,0,0.1)',
                color: '#FF9F0A',
                border: '1px solid rgba(255,107,0,0.25)',
              }}>
              {showQR ? '▲ QRコードを閉じる' : '▼ QRコードを表示'}
            </button>
            {showQR && (
              <div className="flex flex-col items-center py-3 gap-2">
                <div className="rounded-2xl p-3 bg-white shadow-md">
                  <QRCodeSVG value={loginUrl} size={180} />
                </div>
                <p className="text-[11px]" style={{ color: isPrincess ? 'rgba(100,0,120,0.5)' : 'rgba(255,255,255,0.35)' }}>
                  生徒のスマホで読み取るとログイン画面が開きます
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Avatar + main stats card ── */}
        <div className="rounded-3xl overflow-hidden relative"
          style={isPrincess ? {
            background: 'linear-gradient(135deg,rgba(255,255,255,0.28),rgba(220,180,255,0.18))',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,215,0,0.4)',
            boxShadow: '0 8px 32px rgba(199,125,255,0.2)',
          } : {
            background: 'linear-gradient(135deg,rgba(10,6,30,0.97),rgba(20,10,50,0.97))',
            border: '1px solid rgba(255,107,0,0.35)',
            boxShadow: '0 4px 32px rgba(255,107,0,0.15)',
          }}>
          {/* Shimmer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-y-0 w-1/4 skew-x-12 animate-shimmer"
              style={{ background: isPrincess ? 'rgba(255,255,255,0.12)' : 'rgba(255,107,0,0.05)' }}/>
          </div>
          {/* Princess corner sparkles */}
          {isPrincess && [{top:8,left:10,c:'#FFD700',d:'0s'},{top:8,right:10,c:'#C77DFF',d:'0.4s'},{bottom:8,left:10,c:'#87CEEB',d:'0.8s'},{bottom:8,right:10,c:'#FFB7C5',d:'0.6s'}].map((s,i)=>(
            <span key={i} className="absolute select-none text-sm pointer-events-none"
              style={{ ...s, color:s.c, animation:`twinkle 2.2s ${s.d} ease-in-out infinite` }}>✦</span>
          ))}

          <div className="relative px-5 py-5 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0"
              style={isPrincess ? {
                border: '2.5px solid rgba(255,215,0,0.6)',
                boxShadow: '0 0 20px rgba(199,125,255,0.4)',
                background: `linear-gradient(135deg,${cur.from}66,${cur.to}66)`,
              } : {
                border: '2.5px solid rgba(255,107,0,0.55)',
                boxShadow: '0 0 20px rgba(255,107,0,0.35)',
                background: `linear-gradient(135deg,${cur.from},${cur.to})`,
              }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {isPrincess ? '🌸' : cur.emoji}
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black tracking-widest uppercase"
                style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(255,107,0,0.6)' }}>
                {isPrincess ? 'プリンセス ✦' : 'KNIGHT ⚔️'}
              </p>
              <p className="font-black text-2xl leading-tight"
                style={isPrincess ? {
                  background:'linear-gradient(90deg,#FFD700,#C77DFF,#87CEEB)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                } : {
                  color:'white', textShadow:'0 0 20px rgba(255,107,0,0.7)',
                }}>
                {profile.nickname}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={isPrincess
                    ? { background:'rgba(199,125,255,0.2)', color:'#C77DFF', border:'1px solid rgba(199,125,255,0.4)' }
                    : { background:'rgba(255,107,0,0.2)', color:'#FF9F0A', border:'1px solid rgba(255,107,0,0.4)' }}>
                  Lv.{lv}
                </span>
                <span className="text-xs font-bold" style={{ color: title.color }}>
                  {title.icon} {title.title}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon:'⭐', val: stats?.totalXp?.toLocaleString() ?? '0', unit:'XP', label:'累計経験値' },
            { icon:'🔥', val: stats?.streak ?? 0, unit:'日', label:'連続練習' },
            { icon:'⚔️', val: stats?.monstersDefeated ?? 0, unit:'体', label:'撃破数' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-2 py-3 flex flex-col items-center gap-0.5"
              style={isPrincess ? {
                background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)',
                border:'1px solid rgba(199,125,255,0.25)', boxShadow:'0 2px 12px rgba(199,125,255,0.1)',
              } : {
                background:'rgba(10,6,30,0.9)',
                border:'1px solid rgba(255,107,0,0.2)',
              }}>
              <span className="text-xl leading-none">{s.icon}</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-[22px] font-black leading-none" style={{ color: accent }}>{s.val}</span>
                <span className="text-[10px] font-bold" style={{ color: isPrincess ? '#AB47BC' : 'rgba(255,255,255,0.4)' }}>{s.unit}</span>
              </div>
              <p className="text-[9px] font-bold text-center" style={{ color: isPrincess ? '#9E6DA0' : 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Birthday card ── */}
        <div className="rounded-2xl px-5 py-4 relative overflow-hidden"
          style={isPrincess ? {
            background: 'linear-gradient(135deg,rgba(255,107,157,0.2),rgba(199,125,255,0.15))',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,107,157,0.35)',
          } : {
            background: 'linear-gradient(135deg,rgba(10,6,30,0.97),rgba(20,10,50,0.97))',
            border: '1px solid rgba(255,107,0,0.25)',
          }}>
          <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-2"
            style={{ color: isPrincess ? 'rgba(255,107,157,0.8)' : 'rgba(255,107,0,0.6)' }}>
            {isPrincess ? '🎂 お誕生日' : '📅 BIRTHDAY'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold" style={{ color: isPrincess ? '#C77DFF' : 'rgba(255,255,255,0.4)' }}>{bd.y}</span>
            <span className="font-black text-3xl" style={{ color: isPrincess ? '#FF6B9D' : '#FFD700',
              textShadow: isPrincess ? '0 0 20px rgba(255,107,157,0.5)' : '0 0 20px rgba(255,215,0,0.5)' }}>
              {bd.md}
            </span>
            <span className="text-sm font-bold" style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(255,255,255,0.35)' }}>（{bd.w}）</span>
          </div>
        </div>

        {/* ── Video record uploader ── */}
        <div className="rounded-2xl overflow-hidden"
          style={isPrincess ? {
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(199,125,255,0.35)',
            boxShadow: '0 4px 20px rgba(199,125,255,0.15)',
          } : {
            background: 'rgba(10,6,30,0.97)',
            border: '1px solid rgba(0,200,255,0.3)',
            boxShadow: '0 4px 24px rgba(0,200,255,0.1)',
          }}>

          {/* Header */}
          <div className="px-4 py-4 border-b"
            style={{ borderColor: isPrincess ? 'rgba(199,125,255,0.2)' : 'rgba(0,200,255,0.15)' }}>
            <p className="font-black text-base"
              style={{ color: isPrincess ? '#7B1FA2' : '#00C6FF' }}>
              {isPrincess ? '✨ 成長の魔法アーカイブ' : '🎸 伝説のレッスン記録'}
            </p>
            <p className="text-[11px] mt-0.5"
              style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(0,200,255,0.5)' }}>
              {isPrincess ? '動画＋メモで成長の軌跡を永遠に残そう ✦' : '映像と記録でレジェンドを刻め ▸'}
            </p>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Memo input */}
            <textarea
              rows={3}
              value={recMemo}
              onChange={e => setRecMemo(e.target.value)}
              placeholder={isPrincess
                ? '今日のレッスンメモ…（例：左手のリズムが安定してきた！）✦'
                : '今日の分析ログを入力…（例：テンポ制御に改善あり）'}
              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none leading-relaxed"
              style={isPrincess ? {
                background: 'rgba(255,240,255,0.8)',
                color: '#3d004d',
                border: '1px solid rgba(199,125,255,0.35)',
              } : {
                background: 'rgba(0,200,255,0.06)',
                color: 'white',
                border: '1px solid rgba(0,200,255,0.2)',
              }}
            />

            {/* Hidden file inputs */}
            {/* Camera input */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={handleVideoSelect}
            />
            {/* Library input — no capture, allows picking from files/photos */}
            <input
              ref={libraryInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoSelect}
            />

            {/* Two buttons: camera + library */}
            {!recVideoFile ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                  style={isPrincess ? {
                    background: 'rgba(199,125,255,0.12)',
                    color: '#9B4DCA',
                    border: '1.5px dashed rgba(199,125,255,0.5)',
                  } : {
                    background: 'rgba(0,200,255,0.08)',
                    color: '#00C6FF',
                    border: '1.5px dashed rgba(0,200,255,0.35)',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  カメラで撮影
                </button>
                <button
                  onClick={() => libraryInputRef.current?.click()}
                  className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                  style={isPrincess ? {
                    background: 'rgba(199,125,255,0.12)',
                    color: '#9B4DCA',
                    border: '1.5px dashed rgba(199,125,255,0.5)',
                  } : {
                    background: 'rgba(0,200,255,0.08)',
                    color: '#00C6FF',
                    border: '1.5px dashed rgba(0,200,255,0.35)',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                  </svg>
                  ライブラリから選択
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={isPrincess ? {
                  background: 'rgba(199,125,255,0.08)',
                  border: '1px solid rgba(199,125,255,0.3)',
                } : {
                  background: 'rgba(0,200,255,0.06)',
                  border: '1px solid rgba(0,200,255,0.25)',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  style={{ color: isPrincess ? '#9B4DCA' : '#00C6FF', flexShrink: 0 }}>
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <span className="text-xs font-semibold truncate flex-1"
                  style={{ color: isPrincess ? '#9B4DCA' : '#00C6FF' }}>
                  {recVideoFile.name}
                </span>
                <button
                  onClick={() => { setRecVideoFile(null); setRecVideoPreview(null); if (videoInputRef.current) videoInputRef.current.value = ''; if (libraryInputRef.current) libraryInputRef.current.value = ''; }}
                  className="shrink-0 opacity-60 hover:opacity-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isPrincess ? '#9B4DCA' : '#FF3B30'} strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Video preview */}
            {recVideoPreview && (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video src={recVideoPreview} controls playsInline
                  className="w-full max-h-48 object-contain" />
              </div>
            )}

            {/* Error message */}
            {recError && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs text-[#FF3B30] font-semibold leading-snug">{recError}</p>
              </div>
            )}

            {savedRec && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 animate-pop-in"
                style={isPrincess
                  ? { background:'rgba(199,125,255,0.12)', border:'1px solid rgba(199,125,255,0.25)' }
                  : { background:'rgba(0,200,255,0.08)', border:'1px solid rgba(0,200,255,0.2)' }}>
                <span className="text-base">{isPrincess ? '✨' : '✓'}</span>
                <span className="text-xs font-bold"
                  style={{ color: isPrincess ? '#C77DFF' : '#00C6FF' }}>
                  {isPrincess ? '宝物アルバムに追加しました！' : 'アーカイブに記録しました！'}
                </span>
              </div>
            )}

            <button
              onClick={handleSaveRecord}
              disabled={savingRec || (!recMemo.trim() && !recVideoFile)}
              className="w-full py-3 rounded-xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-40"
              style={isPrincess ? {
                background: 'linear-gradient(90deg,#C77DFF,#FF6B9D)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(199,125,255,0.4)',
              } : {
                background: 'linear-gradient(90deg,#0066FF,#00C6FF)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(0,200,255,0.35)',
              }}>
              {savingRec
                ? (isPrincess ? '✦ 保存中…' : '送信中…')
                : (isPrincess ? '✦ 宝物アルバムに保存する' : '▸ アーカイブに記録する')}
            </button>
          </div>
        </div>

        {/* ── Past records timeline ── */}
        <div>
          <p className="text-[11px] font-black tracking-[0.22em] uppercase mb-3 px-1"
            style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(0,200,255,0.5)' }}>
            {isPrincess ? '✦ これまでの魔法アーカイブ' : '▸ LEGEND ARCHIVE'}
          </p>

          {loadingRecs ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <div className="animate-spin text-lg">{isPrincess ? '✨' : '⭐'}</div>
              <span className="text-xs" style={{ color: isPrincess ? '#C77DFF' : '#00C6FF' }}>読み込み中…</span>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-8 gap-2"
              style={isPrincess ? {
                background: 'rgba(255,255,255,0.4)',
                border: '1.5px dashed rgba(199,125,255,0.3)',
              } : {
                background: 'rgba(0,200,255,0.04)',
                border: '1.5px dashed rgba(0,200,255,0.2)',
              }}>
              <span className="text-2xl">{isPrincess ? '📷' : '📼'}</span>
              <p className="text-xs font-semibold"
                style={{ color: isPrincess ? '#AB47BC' : '#00C6FF' }}>
                {isPrincess ? 'まだ記録がありません' : 'アーカイブは空です'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-px"
                style={{ background: isPrincess
                  ? 'linear-gradient(to bottom,rgba(199,125,255,0.4),rgba(199,125,255,0.05))'
                  : 'linear-gradient(to bottom,rgba(0,200,255,0.35),rgba(0,200,255,0.05))' }}/>

              {records.map((rec) => (
                <div key={rec.id} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10"
                    style={isPrincess ? {
                      background: 'linear-gradient(135deg,#FF6B9D,#C77DFF)',
                      boxShadow: '0 0 12px rgba(199,125,255,0.5)',
                    } : {
                      background: 'linear-gradient(135deg,#0066FF,#00C6FF)',
                      boxShadow: '0 0 12px rgba(0,200,255,0.4)',
                    }}>
                    <span className="text-base leading-none">{isPrincess ? '✦' : '▶'}</span>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0 rounded-2xl overflow-hidden"
                    style={isPrincess ? {
                      background: 'rgba(255,255,255,0.75)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(199,125,255,0.25)',
                    } : {
                      background: 'rgba(10,6,30,0.97)',
                      border: '1px solid rgba(0,200,255,0.2)',
                    }}>

                    {/* Date header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b"
                      style={{ borderColor: isPrincess ? 'rgba(199,125,255,0.15)' : 'rgba(0,200,255,0.1)' }}>
                      <span className="text-xs font-black"
                        style={{ color: isPrincess ? '#9B4DCA' : '#00C6FF' }}>
                        {fmtRecDate(rec.recorded_at)}
                      </span>
                      <button
                        onClick={() => handleDeleteRecord(rec)}
                        disabled={deletingId === rec.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 active:opacity-60 transition-opacity disabled:opacity-30">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke={isPrincess ? '#9B4DCA' : '#FF3B30'} strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>

                    {/* Memo */}
                    {rec.teacher_memo && (
                      <div className="px-3 py-2">
                        <p className="text-sm leading-relaxed"
                          style={{ color: isPrincess ? '#3d004d' : 'rgba(255,255,255,0.85)' }}>
                          {rec.teacher_memo}
                        </p>
                      </div>
                    )}

                    {/* Video */}
                    {rec.video_url && (
                      <div className="px-3 pb-3">
                        <video
                          src={rec.video_url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full rounded-xl bg-black max-h-56 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Delete student ── */}
        <div className="mt-2">
          <button
            onClick={onDelete}
            className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
            style={{ background: 'rgba(255,59,48,0.12)', color: '#FF3B30' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            この生徒のデータを削除する
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Invite section ───────────────────────────────────────────────────────────
function InviteSection({ teacherId, copied, onCopy }: {
  teacherId: string; copied: boolean; onCopy: () => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/setup?tid=${teacherId}` : '';

  return (
    <div className="mb-3">
      {/* Main invite button */}
      <button
        onClick={onCopy}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all"
        style={{ background: copied ? '#34C759' : 'linear-gradient(135deg,#007AFF,#5856D6)' }}>
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-white text-sm font-black">コピーしました！</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
            <span className="text-white text-sm font-black">新しい生徒を招待する（URLをコピー）</span>
          </>
        )}
      </button>

      {/* URL display + QR toggle */}
      <div className="mt-2 bg-white rounded-2xl shadow-sm px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#F2F2F7] rounded-xl px-3 py-2 text-[11px] text-[#6C6C70] truncate">
            {inviteUrl}
          </div>
          <button
            onClick={() => setShowQR(v => !v)}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
            style={{ background: showQR ? '#F2F2F7' : 'linear-gradient(135deg,#FF9F0A,#FF6B00)', color: showQR ? '#6C6C70' : 'white' }}>
            {showQR ? '閉じる' : 'QR'}
          </button>
        </div>
        <p className="text-[10px] text-[#8E8E93]">
          このURLを生徒に送ると、先生との紐付けが自動で行われます
        </p>
        {showQR && inviteUrl && (
          <div className="flex flex-col items-center py-3 gap-2">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#E5E5EA]">
              <QRCodeSVG value={inviteUrl} size={160} />
            </div>
            <p className="text-[10px] text-[#8E8E93] text-center">
              生徒のスマホでスキャンして登録できます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Password change sheet ─────────────────────────────────────────────────────
function PasswordChangeSheet({ onClose }: { onClose: () => void }) {
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [loading,    setLoading]    = useState(false);

  const hasPassword = typeof window !== 'undefined' && !!localStorage.getItem(TEACHER_PW_KEY);

  const handleSubmit = async () => {
    setError('');
    if (hasPassword) {
      const stored = localStorage.getItem(TEACHER_PW_KEY) ?? '';
      if (currentPw !== stored) {
        setError('現在のパスコードが違います ✗');
        return;
      }
    }
    if (!/^\d{4}$/.test(newPw)) {
      setError('パスコードは数字4桁で入力してください');
      return;
    }
    if (newPw !== confirmPw) {
      setError('新しいパスコードが一致しません ✗');
      return;
    }
    setLoading(true);
    try {
      // ① まずローカルに保存（ログイン判定はここを見る）
      localStorage.setItem(TEACHER_PW_KEY, newPw);

      // ② Supabase auth セッションがあれば連携（任意・失敗しても続行）
      if (supabase) {
        const { error: supaError } = await supabase.auth.updateUser({ password: newPw });
        if (supaError) {
          // セッションなし等は想定内のため警告のみ
          console.warn('[auth] updateUser:', supaError.message);
        }
      }

      setSuccess(true);
      setTimeout(onClose, 2800);
    } catch (e) {
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
      // ロールバック
      localStorage.removeItem(TEACHER_PW_KEY);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      }
    </svg>
  );

  const PwField = ({ label, value, onChange, show, onToggle, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-[#6C6C70] uppercase tracking-wide">{label}</label>
      <div className="flex items-center bg-[#F2F2F7] rounded-xl overflow-hidden">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="flex-1 bg-transparent px-3.5 py-3 text-[#1C1C1E] placeholder-[#C7C7CC] outline-none text-sm"
        />
        <button type="button" onClick={onToggle}
          className="px-3 h-full flex items-center active:opacity-60 transition-opacity">
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-10 space-y-5 animate-pop-in"
        style={{ animationDuration: '0.25s' }}>

        {/* Handle */}
        <div className="w-10 h-1 bg-[#C7C7CC] rounded-full mx-auto"/>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] uppercase text-[#8E8E93]">SETTINGS</p>
            <h2 className="text-xl font-black text-[#1C1C1E]">秘密の合言葉を変える</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center active:bg-[#E5E5EA]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6C6C70" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 animate-pop-in">
            <div className="relative">
              <span className="text-6xl">🔐</span>
              {['✨','⭐','✦','💫','✧'].map((s, i) => (
                <span key={i} className="absolute text-lg select-none pointer-events-none"
                  style={{
                    top: `${['-30%','60%','-20%','55%','30%'][i]}`,
                    left: `${['80%','95%','-40%','-35%','105%'][i]}`,
                    color: ['#FFD700','#FF9F0A','#C77DFF','#007AFF','#34C759'][i],
                    animation: `twinkle 1.2s ${i * 0.15}s ease-in-out infinite`,
                  }}>
                  {s}
                </span>
              ))}
            </div>
            <p className="font-black text-lg text-[#1C1C1E] text-center">パスコードの更新が完了！</p>
            <p className="text-sm text-[#34C759] font-semibold">次回ログインから新しいパスコードが使えます ✓</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hasPassword && (
              <PwField
                label="現在のパスコード"
                value={currentPw}
                onChange={setCurrentPw}
                show={showCur}
                onToggle={() => setShowCur(v => !v)}
                placeholder="今使っている4桁の数字"
              />
            )}
            {!hasPassword && (
              <div className="bg-[#007AFF]/8 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <span className="text-base">💡</span>
                <p className="text-xs text-[#007AFF] font-semibold">
                  まだパスワードが設定されていません。新しく作ってね！
                </p>
              </div>
            )}
            <PwField
              label="新しいパスコード"
              value={newPw}
              onChange={setNewPw}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              placeholder="数字4桁（例：5678）"
            />
            <PwField
              label="もう一度入力（確認）"
              value={confirmPw}
              onChange={setConfirmPw}
              show={showConf}
              onToggle={() => setShowConf(v => !v)}
              placeholder="同じパスコードをもう一度"
            />

            {/* Error */}
            {error && (
              <div className="bg-[#FF3B30]/8 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs text-[#FF3B30] font-semibold">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !newPw || !confirmPw || (hasPassword && !currentPw)}
              className="w-full py-3.5 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: 'linear-gradient(90deg,#5856D6,#007AFF)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  更新中…
                </span>
              ) : 'パスコードを更新する 🔑'}
            </button>

            <p className="text-center text-[10px] text-[#C7C7CC]">
              数字4桁のパスコードがログイン時に使われます
            </p>
          </div>
        )}
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
