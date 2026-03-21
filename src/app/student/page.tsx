'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PracticeRecord, Submission } from '@/types';
import { getRecordsByDate, saveRecord, deleteRecord } from '@/lib/storage';
import { saveSubmission } from '@/lib/submissions';
import {
  MONSTERS, calcMonsterHp, getTitle, calcLevel, xpForLevel,
  streakMultiplier, streakLabel, getYesterday,
} from '@/lib/gameData';
import PracticeCard from '@/components/PracticeCard';
import StarRating from '@/components/StarRating';
import { getProfile } from '@/lib/profile';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MonsterState {
  hp: number; maxHp: number;
  monstersDefeated: number; totalXp: number;
  coins: number; level: number; monsterIndex: number;
  defeatedIds: number[];    // 図鑑用：倒したモンスターのID一覧
  streak: number;           // 連続練習日数
  streakRecord: number;     // 最高連続日数
  lastPracticeDate: string; // YYYY-MM-DD
}

const INIT: MonsterState = {
  hp: calcMonsterHp(0), maxHp: calcMonsterHp(0),
  monstersDefeated: 0, totalXp: 0, coins: 0, level: 1,
  monsterIndex: 0, defeatedIds: [], streak: 0, streakRecord: 0, lastPracticeDate: '',
};
const MS_KEY          = 'monster_state_v2'; // v2: new fields
const LAST_ATTACK_KEY = 'last_attack_date';
const ROLE_KEY        = 'app_role';

function loadMS(): MonsterState {
  if (typeof window === 'undefined') return INIT;
  try { return { ...INIT, ...JSON.parse(localStorage.getItem(MS_KEY) ?? 'null') }; }
  catch { return INIT; }
}
function saveMS(s: MonsterState) { localStorage.setItem(MS_KEY, JSON.stringify(s)); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateJP(s: string) {
  const d = new Date(s+'T00:00:00');
  return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
}
function hpColor(p: number) { return p>60?'#34C759':p>25?'#FF9F0A':'#FF3B30'; }
function fmtSize(b: number) {
  if (b<1024) return `${b}B`;
  if (b<1024*1024) return `${(b/1024).toFixed(1)}KB`;
  return `${(b/1024/1024).toFixed(1)}MB`;
}

// ─── Monster face ─────────────────────────────────────────────────────────────
function MonsterFace({ idx, hp, maxHp, shaking, defeated }:
  { idx:number; hp:number; maxHp:number; shaking:boolean; defeated:boolean }) {
  const m = MONSTERS[idx % MONSTERS.length];
  if (defeated) return <div className="text-[80px] leading-none select-none grayscale opacity-50">💀</div>;
  return (
    <div className={`text-[88px] leading-none select-none
      ${shaking?'animate-shake':''} ${hp/maxHp<0.25?'animate-pulse':''}`}>
      {hp/maxHp < 0.25 ? '😡' : m.emoji}
    </div>
  );
}

// ─── Level-up modal ───────────────────────────────────────────────────────────
function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  const t = getTitle(level);
  useEffect(() => { const id = setTimeout(onClose, 3500); return () => clearTimeout(id); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={onClose}>
      <div className="animate-pop-in mx-6 rounded-3xl px-8 py-10 flex flex-col items-center gap-3 shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${t.color}cc, ${t.color})` }}>
        <span className="text-6xl">{t.icon}</span>
        <p className="text-white font-black text-4xl drop-shadow">LEVEL UP!</p>
        <p className="text-white/90 font-bold text-2xl">Lv. {level}</p>
        <div className="mt-1 bg-white/20 rounded-2xl px-5 py-2">
          <p className="text-white font-bold text-lg text-center">{t.title}</p>
        </div>
        <p className="text-white/60 text-xs mt-1">タップして閉じる</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentPage() {
  const today = todayStr();
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords]   = useState<PracticeRecord[]>([]);
  const [mounted, setMounted]   = useState(false);
  const [ms, setMs]             = useState<MonsterState>(INIT);

  // monster anim
  const [shaking, setShaking]   = useState(false);
  const [dmgNum, setDmgNum]     = useState<number|null>(null);
  const [showVic, setShowVic]   = useState(false);
  const [xpGain, setXpGain]     = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const [levelUpVal, setLevelUpVal] = useState<number|null>(null);

  // daily limit
  const [lastAttackDate, setLastAttackDate] = useState('');

  // form
  const [song, setSong]         = useState('');
  const [mins, setMins]         = useState('');
  const [rating, setRating]     = useState(3);
  const [videoFile, setVideoFile] = useState<File|null>(null);

  const load = useCallback(() => setRecords(getRecordsByDate(today)), [today]);

  useEffect(() => {
    if (!getProfile()) { router.replace('/setup'); return; }
    setMounted(true); load(); setMs(loadMS());
    setLastAttackDate(localStorage.getItem(LAST_ATTACK_KEY) ?? '');
  }, [load, router]);

  const cur     = MONSTERS[ms.monsterIndex % MONSTERS.length];
  const hpPct   = ms.maxHp > 0 ? (ms.hp / ms.maxHp) * 100 : 0;
  const curLevel = calcLevel(ms.totalXp);
  const xpThis  = ms.totalXp - xpForLevel(curLevel - 1);
  const xpNext  = xpForLevel(curLevel) - xpForLevel(curLevel - 1);
  const xpPct   = Math.min(100, (xpThis / xpNext) * 100);
  const title   = getTitle(curLevel);
  const mult    = streakMultiplier(ms.streak);
  const streakLbl = streakLabel(ms.streak);

  const previewDmg = mins && parseInt(mins) > 0
    ? Math.round(Math.max(1, Math.floor(parseInt(mins) * (rating / 3))) * mult) : 0;

  const alreadyAttackedToday = lastAttackDate === today;
  const canAttack = song.trim().length>0 && parseInt(mins)>0 && !showVic && !alreadyAttackedToday;

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) setVideoFile(f); e.target.value='';
  };

  const handleAttack = () => {
    if (!canAttack) return;
    const m = parseInt(mins);

    // ── Save practice record ──
    saveRecord({ id:crypto.randomUUID(), date:today, songName:song.trim(), duration:m, rating, createdAt:Date.now() });
    load();

    // ── Create submission ──
    const videoUrl = videoFile ? URL.createObjectURL(videoFile) : undefined;
    saveSubmission({ id:crypto.randomUUID(), date:today, songName:song.trim(), duration:m, rating,
      videoUrl, videoFileName:videoFile?.name, submittedAt:Date.now() });

    // ── Streak calc ──
    const yesterday = getYesterday(today);
    const newStreak = ms.lastPracticeDate === yesterday
      ? ms.streak + 1
      : ms.lastPracticeDate === today ? ms.streak : 1;
    const newStreakRecord = Math.max(ms.streakRecord, newStreak);

    // ── Damage ──
    const baseDmg = Math.max(1, Math.floor(m * (rating / 3)));
    const dmg     = Math.round(baseDmg * streakMultiplier(newStreak));
    const newHp   = Math.max(0, ms.hp - dmg);

    setDmgNum(dmg); setShaking(true); setHitFlash(true);
    setTimeout(() => { setShaking(false); setHitFlash(false); }, 420);
    setTimeout(() => setDmgNum(null), 950);

    // ── XP gain ──
    const xpEarned = Math.floor(m * (rating / 3)) + (newStreak >= 7 ? 30 : newStreak >= 3 ? 15 : 0);
    const newTotalXp = ms.totalXp + xpEarned;
    const newLevel   = calcLevel(newTotalXp);
    const oldLevel   = ms.level;

    if (newHp === 0) {
      // ── Monster defeated ──
      const coin = 20 + ms.level * 5;
      const nextIdx = ms.monsterIndex + 1;
      const nextHp  = calcMonsterHp(nextIdx);
      const newDefeated = ms.defeatedIds.includes(cur.id)
        ? ms.defeatedIds : [...ms.defeatedIds, cur.id];

      const next: MonsterState = {
        hp: nextHp, maxHp: nextHp,
        monstersDefeated: ms.monstersDefeated + 1,
        totalXp: newTotalXp, coins: ms.coins + coin,
        level: newLevel, monsterIndex: nextIdx,
        defeatedIds: newDefeated,
        streak: newStreak, streakRecord: newStreakRecord,
        lastPracticeDate: today,
      };
      setXpGain(xpEarned); setCoinGain(coin);
      setTimeout(() => {
        setShowVic(true);
        setTimeout(() => {
          setShowVic(false); setMs(next); saveMS(next);
          if (newLevel > oldLevel) setLevelUpVal(newLevel);
        }, 2400);
      }, 350);
    } else {
      const next: MonsterState = {
        ...ms, hp: newHp, totalXp: newTotalXp,
        level: newLevel, streak: newStreak,
        streakRecord: newStreakRecord, lastPracticeDate: today,
      };
      setMs(next); saveMS(next);
      if (newLevel > oldLevel) setTimeout(() => setLevelUpVal(newLevel), 400);
    }

    setSong(''); setMins(''); setRating(3); setVideoFile(null);
    localStorage.setItem(LAST_ATTACK_KEY, today); setLastAttackDate(today);
  };

  const handleLogout = () => { localStorage.removeItem(ROLE_KEY); router.push('/'); };
  const handleDelete = (id: string) => { deleteRecord(id); load(); };
  const totalMins = records.reduce((s,r)=>s+r.duration,0);

  return (
    <div className="min-h-screen bg-[#F2F2F7]">

      {/* Level-up modal */}
      {levelUpVal && <LevelUpModal level={levelUpVal} onClose={() => setLevelUpVal(null)} />}

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-xl sticky top-0 z-10 border-b border-[#C6C6C8]/60"
        style={{ paddingTop:'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1C1C1E]">今日の練習</h1>
              {ms.streak >= 3 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: ms.streak>=7?'#FF3B30':'#FF9F0A', color:'white' }}>
                  🔥{ms.streak}日
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">{title.icon}</span>
              <p className="text-[11px] font-semibold" style={{ color: title.color }}>{title.title}</p>
              <span className="text-[#C6C6C8]">·</span>
              <p className="text-[11px] text-[#6C6C70]">{dateJP(today)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-[#FF9F0A]/10 px-2 py-1 rounded-full">
              <span className="text-xs">⭐</span>
              <span className="text-xs font-bold text-[#FF9F0A]">Lv.{curLevel}</span>
            </div>
            <div className="flex items-center gap-1 bg-[#F2F2F7] px-2 py-1 rounded-full">
              <span className="text-xs">🪙</span>
              <span className="text-xs font-bold text-[#D97706]">{ms.coins}</span>
            </div>
            <button onClick={handleLogout}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F2F2F7] active:bg-[#E5E5EA]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Monster arena */}
        <div className="rounded-3xl overflow-hidden relative shadow-lg"
          style={{ background:`linear-gradient(160deg,${cur.from},${cur.to})` }}>
          {/* Monster number & name */}
          <div className="flex items-start justify-between px-4 pt-4 pb-1">
            <div>
              <p className="text-white/60 text-[10px] font-semibold tracking-widest">
                MONSTER {(ms.monsterIndex % MONSTERS.length) + 1} / {MONSTERS.length}
                {ms.monsterIndex >= MONSTERS.length && ` (周回${Math.floor(ms.monsterIndex/MONSTERS.length)+1})`}
              </p>
              <p className="text-white font-black text-xl leading-tight">{cur.name}</p>
              <p className="text-white/70 text-xs">{cur.sub}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[10px] font-semibold">HP</p>
              <p className="text-white font-bold text-lg tabular-nums">
                {ms.hp}<span className="text-white/50 text-sm font-normal"> / {ms.maxHp}</span>
              </p>
            </div>
          </div>

          {/* HP bar */}
          <div className="px-4 pb-1">
            <div className="h-3 bg-black/25 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width:`${hpPct}%`, backgroundColor:hpColor(hpPct) }}/>
            </div>
          </div>

          {/* Monster body */}
          <div className="relative flex flex-col items-center justify-center py-6">
            <div style={{ filter:hitFlash?'brightness(3) saturate(0)':undefined }}>
              <MonsterFace idx={ms.monsterIndex} hp={ms.hp} maxHp={ms.maxHp} shaking={shaking} defeated={showVic}/>
            </div>
            {dmgNum !== null && (
              <div className="absolute top-0 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-4xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] animate-float-up">
                  {mult>1?`${mult}x `:''}−{dmgNum}
                </span>
              </div>
            )}
            {hpPct<25 && !showVic && (
              <span className="absolute top-1 right-3 text-[11px] bg-[#FF3B30] text-white px-2 py-0.5 rounded-full font-bold animate-pulse">ピンチ！</span>
            )}
          </div>

          {/* Victory overlay */}
          {showVic && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="animate-pop-in flex flex-col items-center gap-2">
                <span className="text-7xl">🎉</span>
                <p className="text-white font-black text-3xl drop-shadow-lg">撃破！</p>
                <div className="flex gap-2 mt-1 flex-wrap justify-center">
                  <span className="bg-white/20 text-yellow-200 font-bold text-sm px-3 py-1 rounded-full">+{xpGain} XP</span>
                  <span className="bg-white/20 text-yellow-200 font-bold text-sm px-3 py-1 rounded-full">+{coinGain} 🪙</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EXP + streak bar */}
        {mounted && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#6C6C70]">経験値 (EXP)</span>
              <span className="text-xs text-[#6C6C70]">{xpThis} / {xpNext}</span>
            </div>
            <div className="h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${xpPct}%`, background:'linear-gradient(90deg,#5856D6,#007AFF)' }}/>
            </div>
            <div className="flex justify-between text-[11px] text-[#8E8E93]">
              <span>倒した数 {ms.monstersDefeated} 体</span>
              <span>図鑑 {ms.defeatedIds.length} / {MONSTERS.length}</span>
              <span>連続 {ms.streak}日 🔥</span>
            </div>
          </div>
        )}

        {/* Attack panel */}
        {mounted && alreadyAttackedToday ? (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-6 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🌙</span>
            <p className="font-bold text-[#1C1C1E] text-base">今日の練習は完了しました！</p>
            <p className="text-sm text-[#6C6C70]">また明日モンスターを倒そう！</p>
            {ms.streak >= 3 && (
              <div className="mt-1 px-4 py-2 rounded-2xl"
                style={{ background: ms.streak>=7?'#FF3B30':'#FF9F0A' }}>
                <p className="text-white font-bold text-sm">🔥 {ms.streak}日連続継続中！</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 space-y-3">
              {/* Streak banner */}
              {streakLbl && (
                <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                  style={{ background: ms.streak>=7?'#FF3B30':'#FF9F0A' }}>
                  <span className="text-white font-black text-sm">{streakLbl}</span>
                  <span className="text-white/80 text-xs ml-auto">ダメージ ×{mult}</span>
                </div>
              )}

              <p className="text-xs font-bold text-[#6C6C70] tracking-widest uppercase">⚔️ 練習して攻撃！</p>

              <input type="text" placeholder="曲名を入力..." value={song}
                onChange={(e)=>setSong(e.target.value)}
                className="w-full bg-[#F2F2F7] rounded-xl px-3 py-2.5 text-[#1C1C1E] placeholder-[#C7C7CC] outline-none text-base"/>

              <div className="flex gap-2">
                <div className="flex-1 bg-[#F2F2F7] rounded-xl px-3 py-2.5 flex items-center gap-1">
                  <input type="number" inputMode="numeric" placeholder="0" min="1" max="999"
                    value={mins} onChange={(e)=>setMins(e.target.value)}
                    className="w-full text-[#1C1C1E] font-semibold outline-none bg-transparent text-base"/>
                  <span className="text-[#8E8E93] text-sm shrink-0">分</span>
                </div>
                <div className="flex-1 bg-[#F2F2F7] rounded-xl px-2 py-2.5 flex items-center justify-center">
                  <StarRating value={rating} onChange={setRating} size="sm"/>
                </div>
              </div>

              {/* Video attachment */}
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden"/>
              {videoFile ? (
                <div className="flex items-center gap-3 bg-[#34C759]/10 border border-[#34C759]/30 rounded-xl px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#34C759]/20 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1C1E] text-sm font-medium truncate">{videoFile.name}</p>
                    <p className="text-[#6C6C70] text-xs">{fmtSize(videoFile.size)}</p>
                  </div>
                  <button onClick={()=>setVideoFile(null)}
                    className="w-6 h-6 rounded-full bg-[#C7C7CC]/30 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6C6C70" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <button onClick={()=>videoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 bg-[#F2F2F7] rounded-xl px-3 py-2.5 active:bg-[#E5E5EA]">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <span className="text-[#6C6C70] text-sm">動画を添付する（任意）</span>
                </button>
              )}

              {previewDmg > 0 && (
                <div className="text-center">
                  <span className="text-xs text-[#8E8E93]">予測ダメージ: </span>
                  <span className="text-[#FF3B30] font-bold text-sm">{previewDmg}</span>
                  {mult > 1 && <span className="text-[#FF9F0A] font-bold text-xs ml-1">（×{mult} コンボ中！）</span>}
                  {previewDmg >= ms.hp && ms.hp > 0 && <span className="text-[#FF9F0A] font-bold text-xs ml-1">— 撃破！⚡</span>}
                </div>
              )}
            </div>

            <button onClick={handleAttack} disabled={!canAttack}
              className={`w-full py-4 text-base font-black tracking-widest transition-all active:scale-[0.97]
                ${canAttack
                  ? mult>1
                    ? 'bg-gradient-to-r from-[#FF3B30] to-[#FF9F0A] text-white shadow-sm'
                    : 'bg-gradient-to-r from-[#FF3B30] to-[#FF9F0A] text-white shadow-sm'
                  : 'bg-[#F2F2F7] text-[#C7C7CC]'}`}>
              {streakLbl ? `🔥 ${streakLbl}で攻撃！` : videoFile ? '⚔️ 動画と一緒に攻撃！' : '⚔️ 攻撃！'}
            </button>
          </div>
        )}

        {/* Today's log */}
        {mounted && records.length>0 && (
          <div>
            <div className="flex justify-between items-center px-1 mb-2">
              <p className="text-xs font-semibold text-[#6C6C70]">今日の記録</p>
              <p className="text-xs text-[#6C6C70]">合計 {totalMins} 分</p>
            </div>
            <div className="space-y-2">
              {records.map((r)=>(<PracticeCard key={r.id} record={r} onDelete={handleDelete}/>))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
