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
import { getProfile, type CharacterType } from '@/lib/profile';
import { getTheme } from '@/lib/theme';
import { COMPANIONS } from '@/lib/companionData';

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

// ─── Creature face ────────────────────────────────────────────────────────────
function MonsterFace({ idx, hp, maxHp, shaking, defeated, charType, accentColor }:
  { idx:number; hp:number; maxHp:number; shaking:boolean; defeated:boolean; charType: CharacterType; accentColor:string }) {
  const isPrincess = charType === 'princess';
  const list = isPrincess ? COMPANIONS : MONSTERS;
  const m = list[idx % list.length];
  const emoji = defeated
    ? (isPrincess ? '✨' : '💀')
    : hp/maxHp < 0.25 ? (isPrincess ? '🥺' : '😡') : m.emoji;
  return (
    <div className={`text-[96px] leading-none select-none transition-all
      ${shaking ? 'animate-shake' : ''} ${hp/maxHp < 0.25 && !defeated ? 'animate-pulse' : ''}
      ${defeated && !isPrincess ? 'grayscale opacity-40' : ''}`}
      style={{ filter: defeated ? undefined : `drop-shadow(0 0 24px ${accentColor}90)` }}>
      {emoji}
    </div>
  );
}

// ─── Level-up modal (with particle burst) ────────────────────────────────────
function LevelUpModal({ level, onClose, charType }: { level: number; onClose: () => void; charType: CharacterType }) {
  const t = getTitle(level);
  const isPrincess = charType === 'princess';
  useEffect(() => { const id = setTimeout(onClose, 4000); return () => clearTimeout(id); }, [onClose]);

  const ptcls = isPrincess
    ? ['🌸','✨','🌺','💫','⭐','🦋','🌙','🪄','💜','🌟','🎀','🌈']
    : ['⚔️','✨','🌟','💥','🔥','👑','⚡','🏆','💫','🛡️','🐉','🎖️'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background:'rgba(0,0,0,0.80)', backdropFilter:'blur(8px)' }}
      onClick={onClose}>

      {/* Particle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {ptcls.map((p, i) => (
          <div key={i} className={`absolute text-2xl select-none particle-${(i%8)+1}`}
            style={{ animationDelay: `${i*0.05}s` }}>
            {p}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="animate-pop-in mx-6 rounded-3xl px-8 py-10 flex flex-col items-center gap-3 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${t.color}cc, ${t.color})`,
          boxShadow: `0 0 80px ${t.color}88, 0 24px 80px rgba(0,0,0,0.6)`,
        }}>
        {/* Shimmer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 bg-white/10 skew-x-12 animate-shimmer" />
        </div>
        <span className="text-7xl" style={{ filter:'drop-shadow(0 0 20px rgba(255,255,255,0.8))' }}>
          {t.icon}
        </span>
        <p className="text-white font-black text-5xl drop-shadow" style={{ letterSpacing:'0.05em' }}>
          LEVEL UP!
        </p>
        <p className="text-white/90 font-bold text-2xl">Lv. {level}</p>
        <div className="bg-white/25 rounded-2xl px-6 py-2">
          <p className="text-white font-black text-lg text-center tracking-wide">{t.title}</p>
        </div>
        <p className="text-white/40 text-xs mt-1">タップして閉じる</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentPage() {
  const today = todayStr();
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [records,  setRecords]  = useState<PracticeRecord[]>([]);
  const [mounted,  setMounted]  = useState(false);
  const [ms,       setMs]       = useState<MonsterState>(INIT);
  const [charType, setCharType] = useState<CharacterType>('knight');

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
    const p = getProfile();
    if (!p) { router.replace('/setup'); return; }
    setCharType(p.type ?? 'knight');
    setMounted(true); load(); setMs(loadMS());
    setLastAttackDate(localStorage.getItem(LAST_ATTACK_KEY) ?? '');
  }, [load, router]);

  const theme   = getTheme(charType);
  const creatures = theme.creatures;
  const cur     = creatures[ms.monsterIndex % creatures.length];
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

  const isPrincess = charType === 'princess';

  return (
    <div className="min-h-screen" style={{ background: theme.bgPage }}>

      {/* Level-up modal */}
      {levelUpVal && <LevelUpModal level={levelUpVal} onClose={() => setLevelUpVal(null)} charType={charType} />}

      {/* Header */}
      <header className="sticky top-0 z-10"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: isPrincess
            ? 'rgba(255,240,255,0.92)'
            : 'rgba(8,12,28,0.95)',
          backdropFilter: 'blur(24px)',
          borderBottom: isPrincess
            ? '1px solid rgba(255,100,180,0.25)'
            : '1px solid rgba(255,180,0,0.18)',
        }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black" style={{ color: isPrincess ? '#7B1FA2' : 'white' }}>
                今日の練習
              </h1>
              {ms.streak >= 3 && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                  style={{
                    background: ms.streak>=7
                      ? 'linear-gradient(90deg,#FF3B30,#FF9F0A)'
                      : isPrincess ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)' : '#FF9F0A',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(255,100,0,0.4)',
                  }}>
                  🔥{ms.streak}日
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">{title.icon}</span>
              <p className="text-[11px] font-bold" style={{ color: title.color }}>{title.title}</p>
              <span style={{ color: isPrincess ? '#D4A0D0' : 'rgba(255,255,255,0.25)' }}>·</span>
              <p className="text-[11px]" style={{ color: isPrincess ? '#9E6DA0' : 'rgba(255,255,255,0.4)' }}>
                {dateJP(today)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Level badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={isPrincess
                ? { background:'rgba(199,125,255,0.2)', border:'1px solid rgba(199,125,255,0.4)' }
                : { background:'rgba(255,180,0,0.12)', border:'1px solid rgba(255,180,0,0.3)' }}>
              <span className="text-xs">⭐</span>
              <span className="text-xs font-black" style={{ color: isPrincess ? '#C77DFF' : '#FFD700' }}>
                Lv.{curLevel}
              </span>
            </div>
            {/* Coin badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={isPrincess
                ? { background:'rgba(255,107,157,0.15)', border:'1px solid rgba(255,107,157,0.3)' }
                : { background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
              <span className="text-xs">{theme.coinEmoji}</span>
              <span className="text-xs font-black" style={{ color: theme.coinColor }}>{ms.coins}</span>
            </div>
            <button onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
              style={{ background: isPrincess ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={isPrincess ? '#9B4DCA' : 'rgba(255,255,255,0.5)'} strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* ── Arena card ── */}
        <div className="rounded-3xl overflow-hidden relative"
          style={isPrincess ? {
            background: `linear-gradient(160deg, ${cur.from}30 0%, ${cur.to}45 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${cur.from}70`,
            boxShadow: `0 8px 40px ${cur.from}40, 0 2px 8px rgba(0,0,0,0.08)`,
          } : {
            background: 'linear-gradient(160deg, #080c18 0%, #0e1628 100%)',
            border: `1px solid ${cur.from}45`,
            boxShadow: `0 4px 48px ${cur.from}28, inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}>

          {/* Top strip: name + HP number */}
          <div className="flex items-start justify-between px-4 pt-4 pb-2"
            style={{ borderBottom: isPrincess ? `1px solid ${cur.from}30` : `1px solid ${cur.from}20` }}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase"
                style={{ color: isPrincess ? cur.from : `${cur.from}cc` }}>
                {theme.counterPrefix} {(ms.monsterIndex % creatures.length) + 1} / {creatures.length}
                {ms.monsterIndex >= creatures.length && ` · 周回${Math.floor(ms.monsterIndex/creatures.length)+1}`}
              </p>
              <p className="font-black text-xl leading-tight mt-0.5"
                style={{ color: isPrincess ? '#3d004d' : 'white' }}>
                {cur.name}
              </p>
              <p className="text-xs mt-0.5 leading-snug"
                style={{ color: isPrincess ? `${cur.from}dd` : 'rgba(255,255,255,0.5)' }}>
                {cur.sub}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold tracking-widest"
                style={{ color: isPrincess ? cur.from : 'rgba(255,200,100,0.7)' }}>
                {theme.hpLabel}
              </p>
              <p className="font-black text-xl tabular-nums leading-none mt-0.5"
                style={{ color: isPrincess ? '#6a0080' : '#FFD700' }}>
                {ms.hp}
                <span className="text-sm font-normal" style={{ color: isPrincess ? `${cur.from}99` : 'rgba(255,255,255,0.3)' }}>
                  /{ms.maxHp}
                </span>
              </p>
            </div>
          </div>

          {/* HP bar — thick & glowing */}
          <div className="px-4 py-2">
            <div className="h-3.5 rounded-full overflow-hidden"
              style={isPrincess
                ? { background:'rgba(255,200,230,0.3)', border:`1px solid ${cur.from}40` }
                : { background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,80,0,0.25)' }}>
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${hpPct}%`,
                  background: isPrincess
                    ? `linear-gradient(90deg, ${cur.from}, ${hpColor(hpPct)})`
                    : `linear-gradient(90deg, #7f0000, ${hpColor(hpPct)})`,
                  boxShadow: `0 0 12px ${hpColor(hpPct)}cc`,
                }}/>
            </div>
          </div>

          {/* Creature body */}
          <div className="relative flex flex-col items-center justify-center py-6 min-h-[160px]">
            <div style={{ filter: hitFlash ? 'brightness(4) saturate(0)' : undefined }}>
              <MonsterFace
                idx={ms.monsterIndex} hp={ms.hp} maxHp={ms.maxHp}
                shaking={shaking} defeated={showVic}
                charType={charType} accentColor={cur.from}
              />
            </div>
            {/* Damage number */}
            {dmgNum !== null && (
              <div className="absolute top-2 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-4xl font-black animate-float-up"
                  style={{
                    color: isPrincess ? '#FFB6D9' : '#FFD700',
                    textShadow: isPrincess
                      ? '0 0 20px rgba(255,100,180,0.9), 0 2px 8px rgba(0,0,0,0.3)'
                      : '0 0 20px rgba(255,200,0,0.9), 0 2px 8px rgba(0,0,0,0.6)',
                  }}>
                  {isPrincess ? `✨${dmgNum}` : `${mult>1?`${mult}x `:''}−${dmgNum}`}
                </span>
              </div>
            )}
            {/* Pinch indicator */}
            {hpPct < 25 && !showVic && (
              <span className="absolute top-2 right-3 text-[11px] font-black px-2.5 py-0.5 rounded-full animate-pulse"
                style={{
                  background: isPrincess
                    ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
                    : 'linear-gradient(90deg,#FF3B30,#FF9F0A)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255,0,100,0.4)',
                }}>
                {theme.pinchLabel}
              </span>
            )}
          </div>

          {/* Victory overlay */}
          {showVic && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-3">
                <span className="text-8xl" style={{ animation:'floatBounce 1s ease-in-out infinite' }}>
                  {theme.defeatEmoji}
                </span>
                <p className="font-black text-4xl text-white drop-shadow-lg tracking-wide">
                  {theme.defeatLabel}
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <span className="bg-white/20 backdrop-blur-sm text-yellow-200 font-black text-sm px-4 py-1.5 rounded-full border border-white/20">
                    ✨ +{xpGain} XP
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm text-yellow-200 font-black text-sm px-4 py-1.5 rounded-full border border-white/20">
                    {theme.coinEmoji} +{coinGain}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EXP + streak bar */}
        {mounted && (
          <div className="rounded-2xl px-4 py-3 space-y-2"
            style={isPrincess ? {
              background: 'rgba(255,240,255,0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(199,125,255,0.25)',
              boxShadow: '0 4px 20px rgba(199,125,255,0.12)',
            } : {
              background: 'rgba(14,22,40,0.92)',
              border: '1px solid rgba(255,180,0,0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black tracking-widest uppercase"
                style={{ color: isPrincess ? '#9B4DCA' : 'rgba(255,200,100,0.8)' }}>
                {theme.xpLabel}
              </span>
              <span className="text-xs font-mono tabular-nums"
                style={{ color: isPrincess ? '#C77DFF' : '#FFD700' }}>
                {xpThis} <span style={{ color: isPrincess ? 'rgba(180,100,240,0.4)' : 'rgba(255,255,255,0.2)' }}>/ {xpNext}</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden"
              style={isPrincess
                ? { background:'rgba(220,180,255,0.2)', border:'1px solid rgba(199,125,255,0.2)' }
                : { background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,200,0,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xpPct}%`,
                  background: theme.xpBarGradient,
                  boxShadow: isPrincess ? '0 0 10px rgba(199,125,255,0.6)' : '0 0 10px rgba(255,200,0,0.5)',
                }}/>
            </div>
            <div className="flex justify-between text-[11px]"
              style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.35)' }}>
              <span>{theme.enemyCountLabel} {ms.monstersDefeated} 体</span>
              <span>{theme.encyclopediaLabel} {ms.defeatedIds.length} / {creatures.length}</span>
              <span>連続 {ms.streak}日 🔥</span>
            </div>
          </div>
        )}

        {/* Attack panel */}
        {mounted && alreadyAttackedToday ? (
          <div className="rounded-2xl px-5 py-7 flex flex-col items-center gap-3 text-center"
            style={isPrincess ? {
              background: 'rgba(255,240,255,0.80)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(199,125,255,0.25)',
              boxShadow: '0 4px 24px rgba(199,125,255,0.15)',
            } : {
              background: 'rgba(14,22,40,0.92)',
              border: '1px solid rgba(255,180,0,0.15)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
            <span className="text-5xl" style={{ filter:'drop-shadow(0 0 16px rgba(150,100,255,0.5))' }}>
              {isPrincess ? '🌸' : '🌙'}
            </span>
            <p className="font-black text-base" style={{ color: isPrincess ? '#6a0080' : 'white' }}>
              今日の練習は完了しました！
            </p>
            <p className="text-sm" style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.45)' }}>
              {theme.completedNextMsg}
            </p>
            {ms.streak >= 3 && (
              <div className="mt-1 px-5 py-2 rounded-2xl"
                style={{
                  background: ms.streak>=7
                    ? 'linear-gradient(90deg,#FF3B30,#FF9F0A)'
                    : isPrincess ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)' : '#FF9F0A',
                  boxShadow: '0 2px 12px rgba(255,100,0,0.35)',
                }}>
                <p className="text-white font-black text-sm">🔥 {ms.streak}日連続継続中！</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={isPrincess ? {
              background: 'rgba(255,240,255,0.82)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(199,125,255,0.25)',
              boxShadow: '0 4px 24px rgba(199,125,255,0.15)',
            } : {
              background: 'rgba(14,22,40,0.92)',
              border: '1px solid rgba(255,180,0,0.15)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
            <div className="px-4 pt-4 pb-3 space-y-3">
              {/* Streak banner */}
              {streakLbl && (
                <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                  style={{
                    background: ms.streak>=7
                      ? 'linear-gradient(90deg,#FF3B30,#FF9F0A)'
                      : isPrincess ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)' : 'linear-gradient(90deg,#FF3B30,#FF9F0A)',
                    boxShadow: '0 2px 12px rgba(255,80,0,0.35)',
                  }}>
                  <span className="text-white font-black text-sm">{streakLbl}</span>
                  <span className="text-white/70 text-xs ml-auto">ダメージ ×{mult}</span>
                </div>
              )}

              <p className="text-xs font-black tracking-[0.18em] uppercase"
                style={{ color: isPrincess ? '#C77DFF' : 'rgba(255,200,100,0.7)' }}>
                {theme.arenaLabel}
              </p>

              <input type="text" placeholder="曲名を入力..." value={song}
                onChange={(e)=>setSong(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 outline-none text-base font-medium"
                style={isPrincess ? {
                  background: 'rgba(240,220,255,0.5)',
                  border: '1px solid rgba(199,125,255,0.3)',
                  color: '#3d004d',
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                }}/>

              <div className="flex gap-2">
                <div className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-1"
                  style={isPrincess ? {
                    background: 'rgba(240,220,255,0.5)',
                    border: '1px solid rgba(199,125,255,0.3)',
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                  <input type="number" inputMode="numeric" placeholder="0" min="1" max="999"
                    value={mins} onChange={(e)=>setMins(e.target.value)}
                    className="w-full font-bold outline-none bg-transparent text-base"
                    style={{ color: isPrincess ? '#3d004d' : 'white' }}/>
                  <span className="text-sm shrink-0 font-semibold"
                    style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.4)' }}>分</span>
                </div>
                <div className="flex-1 rounded-xl px-2 py-2.5 flex items-center justify-center"
                  style={isPrincess ? {
                    background: 'rgba(240,220,255,0.5)',
                    border: '1px solid rgba(199,125,255,0.3)',
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                  <StarRating value={rating} onChange={setRating} size="sm"/>
                </div>
              </div>

              {/* Video attachment */}
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden"/>
              {videoFile ? (
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={isPrincess ? {
                    background: 'rgba(52,199,89,0.1)',
                    border: '1px solid rgba(52,199,89,0.3)',
                  } : {
                    background: 'rgba(52,199,89,0.08)',
                    border: '1px solid rgba(52,199,89,0.25)',
                  }}>
                  <div className="w-8 h-8 rounded-lg bg-[#34C759]/20 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isPrincess ? '#1a0024' : 'white' }}>
                      {videoFile.name}
                    </p>
                    <p className="text-xs" style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.4)' }}>
                      {fmtSize(videoFile.size)}
                    </p>
                  </div>
                  <button onClick={()=>setVideoFile(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: isPrincess ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke={isPrincess ? '#9B4DCA' : 'rgba(255,255,255,0.6)'} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <button onClick={()=>videoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 active:opacity-70 transition-opacity"
                  style={isPrincess ? {
                    background: 'rgba(240,220,255,0.4)',
                    border: '1px solid rgba(199,125,255,0.2)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isPrincess ? 'rgba(199,125,255,0.2)' : 'rgba(0,122,255,0.15)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={isPrincess ? '#C77DFF' : '#007AFF'} strokeWidth="2" strokeLinecap="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>
                  <span className="text-sm" style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.45)' }}>
                    動画を添付する（任意）
                  </span>
                </button>
              )}

              {previewDmg > 0 && (
                <div className="text-center py-1">
                  <span className="text-xs" style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.45)' }}>
                    {theme.previewLabel}
                  </span>
                  <span className="font-black text-sm ml-1" style={{ color: isPrincess ? '#FF6B9D' : '#FFD700' }}>
                    {previewDmg}
                  </span>
                  {mult > 1 && (
                    <span className="font-bold text-xs ml-1" style={{ color: '#FF9F0A' }}>
                      （×{mult} コンボ中！）
                    </span>
                  )}
                  {previewDmg >= ms.hp && ms.hp > 0 && (
                    <span className="font-black text-xs ml-1" style={{ color: '#FF9F0A' }}>
                      {theme.finisherLabel}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleAttack} disabled={!canAttack}
              className="w-full py-4 text-base font-black tracking-widest transition-all active:scale-[0.97]"
              style={canAttack ? {
                background: isPrincess
                  ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
                  : 'linear-gradient(90deg,#FF3B30,#FF9F0A)',
                color: 'white',
                boxShadow: isPrincess
                  ? '0 -1px 0 rgba(0,0,0,0.08), 0 2px 16px rgba(255,107,157,0.45)'
                  : '0 -1px 0 rgba(0,0,0,0.3), 0 2px 16px rgba(255,59,48,0.35)',
                letterSpacing: '0.12em',
              } : {
                background: isPrincess ? 'rgba(220,180,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: isPrincess ? 'rgba(180,100,240,0.3)' : 'rgba(255,255,255,0.2)',
              }}>
              {streakLbl ? theme.attackStreakLabel(streakLbl) : videoFile ? theme.attackVideoLabel : theme.attackLabel}
            </button>
          </div>
        )}

        {/* Today's log */}
        {mounted && records.length>0 && (
          <div>
            <div className="flex justify-between items-center px-1 mb-2">
              <p className="text-xs font-black tracking-widest uppercase"
                style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.4)' }}>今日の記録</p>
              <p className="text-xs font-semibold"
                style={{ color: isPrincess ? '#C77DFF' : 'rgba(255,200,100,0.7)' }}>合計 {totalMins} 分</p>
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
