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
import { awardBadge, hasBadge, getBadgeInfo, getBadges, type BadgeId } from '@/lib/badges';
import AvatarUploader from '@/components/AvatarUploader';
import { uploadStudentAvatar, fetchTeacherAvatarFromSupabase } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import MusicQuizGame from '@/components/MusicQuizGame';
import MelodyQuizGame from '@/components/MelodyQuizGame';
import { fetchLessonRecords, type LessonRecord } from '@/lib/lessonRecords';

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
const LAST_ATTACK_KEY  = 'last_attack_date';
const MUSIC_GAME_KEY   = 'music_quiz_last_played';
const MELODY_GAME_KEY  = 'melody_quiz_last_played';
const ROLE_KEY         = 'app_role';

function loadMS(): MonsterState {
  if (typeof window === 'undefined') return INIT;
  try { return { ...INIT, ...JSON.parse(localStorage.getItem(MS_KEY) ?? 'null') }; }
  catch { return INIT; }
}
function saveMS(s: MonsterState) { localStorage.setItem(MS_KEY, JSON.stringify(s)); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  // Always use Japan Standard Time (UTC+9) regardless of device timezone
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
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

// ─── Badge celebration overlay ────────────────────────────────────────────────
function BadgeCelebration({ badgeId, charType, onClose }:
  { badgeId: BadgeId; charType: CharacterType; onClose: () => void }) {
  const isPrincess = charType === 'princess';
  const info = getBadgeInfo(badgeId, charType);
  useEffect(() => { const id = setTimeout(onClose, 4800); return () => clearTimeout(id); }, [onClose]);

  const ptcls = isPrincess
    ? ['✦','✧','⋆','✦','✧','⋆','✦','✧','✦','✧','⋆','✦','✧','✦','⋆','✧']
    : ['🎨','💥','⚡','🔥','⭐','💫','✨','🌟','🎖️','👑','💛','🧡'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
      onClick={onClose}>

      {/* Particle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {ptcls.map((p, i) => (
          <div key={i}
            className={`absolute select-none font-black ${isPrincess ? `pixie-${i + 1}` : `particle-${(i % 8) + 1}`}`}
            style={{
              fontSize: isPrincess ? 12 + (i % 3) * 7 : 22,
              color: isPrincess
                ? (['#FFD700','#C77DFF','#87CEEB','#FFB7C5'] as string[])[i % 4]
                : (['#FF6B00','#FFD700','#7B00FF','white']    as string[])[i % 4],
              textShadow: '0 0 14px currentColor',
              animationDelay: `${i * 0.04}s`,
            }}>
            {p}
          </div>
        ))}
        {/* Extra burst layer */}
        {['✦','✧','⋆','✦','✧','⋆','✦','✧'].map((p, i) => (
          <div key={`ex${i}`}
            className={`absolute select-none particle-${(i % 8) + 1}`}
            style={{
              fontSize: 16,
              color: info.color,
              textShadow: `0 0 10px ${info.glow}`,
              animationDelay: `${0.1 + i * 0.07}s`,
            }}>
            {p}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="animate-pop-in mx-7 rounded-3xl flex flex-col items-center gap-4 px-7 py-10 relative overflow-hidden"
        style={isPrincess ? {
          background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(199,125,255,0.10))',
          backdropFilter: 'blur(32px)',
          border: `1px solid ${info.color}55`,
          boxShadow: `0 0 80px ${info.glow}, 0 24px 80px rgba(0,0,0,0.5)`,
        } : {
          background: 'linear-gradient(135deg, rgba(10,6,30,0.97), rgba(20,10,50,0.97))',
          border: `1px solid ${info.color}55`,
          boxShadow: `0 0 80px ${info.glow}, 0 24px 80px rgba(0,0,0,0.7)`,
        }}>
        {/* Shimmer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-y-0 w-1/3 bg-white/8 skew-x-12 animate-shimmer"/>
        </div>
        <span className="text-8xl relative z-10"
          style={{ filter: `drop-shadow(0 0 28px ${info.glow})`, animation: 'floatBounce 1.2s ease-in-out infinite' }}>
          {info.icon}
        </span>
        <div className="text-center relative z-10">
          <p className="font-black text-[10px] tracking-[0.28em] uppercase mb-1"
            style={{ color: `${info.color}88` }}>
            NEW BADGE UNLOCKED!
          </p>
          <p className="font-black text-2xl leading-tight"
            style={{ color: 'white', textShadow: `0 0 24px ${info.glow}` }}>
            {info.name}
          </p>
          <p className="text-sm mt-1.5 font-bold" style={{ color: `${info.color}cc` }}>
            {info.sub}
          </p>
        </div>
        <p className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>タップして閉じる</p>
      </div>
    </div>
  );
}

// ─── Rank / Frame tier helpers ────────────────────────────────────────────────
function getRankInfo(level: number) {
  if (level >= 17) return { rank: 'S', bg: 'linear-gradient(135deg,#FFD700 0%,#FFFAAA 45%,#FF9500 70%,#FFD700 100%)', color: '#FFD700', glow: 'rgba(255,215,0,0.9)', borderColor: '#FFD700', label: 'SRANK', textColor: '#3d1a00' };
  if (level >= 10) return { rank: 'A', bg: 'linear-gradient(135deg,#B0C4DE 0%,#FFFFFF 45%,#708090 70%,#C0C0C0 100%)', color: '#C8D8E8', glow: 'rgba(192,216,232,0.8)', borderColor: '#AACCDD', label: 'ARANK', textColor: '#1a2a3a' };
  if (level >= 5)  return { rank: 'B', bg: 'linear-gradient(135deg,#4FC3F7 0%,#B3E5FC 45%,#0288D1 70%,#4FC3F7 100%)', color: '#4FC3F7', glow: 'rgba(79,195,247,0.7)', borderColor: '#29ABE2', label: 'BRANK', textColor: '#001a2e' };
  return                 { rank: 'C', bg: 'linear-gradient(135deg,#CD7F32 0%,#E8AA76 45%,#8B4513 70%,#CD7F32 100%)', color: '#CD7F32', glow: 'rgba(205,127,50,0.65)', borderColor: '#B8680A', label: 'CRANK', textColor: '#1a0a00' };
}

function getFrameTier(level: number) {
  if (level >= 17) return { grad: 'linear-gradient(135deg,#FFD700,#FFFFFF,#C77DFF,#87CEEB,#FFD700)', gems: ['💎','💎','💎','💎','💎','💎'], glow: 'rgba(255,215,0,0.85)', label: 'ダイヤモンドフレーム ✦', labelColor: '#C77DFF' };
  if (level >= 10) return { grad: 'linear-gradient(135deg,#FFD700,#FFF7AA,#FF9500,#FFD700)',         gems: ['💛','💛','💛','💛'],         glow: 'rgba(255,200,0,0.75)',  label: 'ゴールドフレーム ✦',       labelColor: '#FFD700' };
  if (level >= 5)  return { grad: 'linear-gradient(135deg,#C0C0C0,#FFFFFF,#A0A0A0,#C0C0C0)',         gems: ['🩶','🩶'],                   glow: 'rgba(192,192,192,0.6)', label: 'シルバーフレーム',          labelColor: '#B0C4DE' };
  return                 { grad: 'linear-gradient(135deg,#CD7F32,#E8AA76,#A0522D,#CD7F32)',           gems: [],                           glow: 'rgba(170,100,30,0.5)',  label: 'ブロンズフレーム',          labelColor: '#CD7F32' };
}

// ─── Name plate ───────────────────────────────────────────────────────────────
function BadgeChip({ badgeId, charType }: { badgeId: BadgeId; charType: CharacterType }) {
  const info = getBadgeInfo(badgeId, charType);
  const isPrincess = charType === 'princess';
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full animate-sparkle"
      style={isPrincess ? {
        background: `${info.color}22`,
        border: `1px solid ${info.color}66`,
        boxShadow: `0 0 10px ${info.glow}`,
      } : {
        background: `${info.color}18`,
        border: `1px solid ${info.color}55`,
        boxShadow: `0 0 10px ${info.glow}`,
      }}>
      <span className="text-sm leading-none">{info.icon}</span>
      <span className="text-[10px] font-black" style={{ color: info.color }}>{info.name}</span>
    </div>
  );
}

function NamePlate({ nickname, level, title, titleIcon, isPrincess, titleColor, badges, charType, avatarUrl, onAvatarUpload }:
  { nickname:string; level:number; title:string; titleIcon:string; isPrincess:boolean; titleColor:string; badges: BadgeId[]; charType: CharacterType; avatarUrl: string | null; onAvatarUpload: (f: File) => Promise<void>; }) {
  if (!nickname) return null;

  if (isPrincess) {
    const tier = getFrameTier(level);
    return (
      <div className="relative mx-0 overflow-visible animate-pop-in" style={{ animationDuration: '0.5s' }}>
        {/* Outer glow matching tier */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ boxShadow:`0 0 40px ${tier.glow}, 0 0 80px rgba(199,125,255,0.15)` }}/>
        <div className="rounded-3xl px-4 py-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(220,180,255,0.16) 100%)',
            backdropFilter: 'blur(24px)',
            border: `2px solid transparent`,
            backgroundClip: 'padding-box',
          }}>
          {/* Tier frame border overlay */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: tier.grad, WebkitMask:'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite:'xor', maskComposite:'exclude', padding:'2px' }}/>
          {/* Corner sparkles */}
          {[
            { top:6,  left:10,  sz:14, d:'0s',    c:'#FFD700' },
            { top:6,  right:10, sz:11, d:'0.4s',  c:'#C77DFF' },
            { bottom:6, left:12, sz:10, d:'0.8s', c:'#87CEEB' },
            { bottom:6, right:8, sz:13, d:'0.6s', c:'#FFB7C5' },
          ].map((s,i) => (
            <span key={i} className="absolute select-none"
              style={{ ...s, fontSize:s.sz, color:s.c, animation:`twinkle 2.2s ${s.d} ease-in-out infinite` }}>
              ✦
            </span>
          ))}
          {/* Shimmer sweep */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-y-0 w-1/4 bg-white/10 skew-x-12 animate-shimmer"/>
          </div>

          <div className="relative flex items-center gap-3">
            {/* Princess avatar with tier gems */}
            <div className="relative shrink-0">
              <AvatarUploader
                currentUrl={avatarUrl}
                onUpload={onAvatarUpload}
                isPrincess={true}
                size={56}
                shape="circle"
                defaultContent={<span className="text-2xl leading-none">🌸</span>}
              />
              {/* Tier frame ring */}
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: tier.grad, WebkitMask:'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite:'xor', maskComposite:'exclude', padding:'3px' }}/>
              {/* Gems orbiting avatar at higher tiers */}
              {tier.gems.slice(0,4).map((gem, i) => {
                const angles = [-35, 35, 215, 145];
                const angle = angles[i] * Math.PI / 180;
                const r = 34;
                return (
                  <span key={i} className="absolute select-none pointer-events-none text-xs"
                    style={{ left: 28 + r * Math.cos(angle), top: 28 + r * Math.sin(angle), transform:'translate(-50%,-50%)', animation:`gemSparkle ${1.2+i*0.3}s ${i*0.2}s ease-in-out infinite` }}>
                    {gem}
                  </span>
                );
              })}
              {/* Corner magic sparkles */}
              {[
                { top: -8, left: -4, c: '#FFD700', d: '0s',   f: 10 },
                { top: -8, right: -4, c: '#C77DFF', d: '0.5s', f: 8 },
              ].map((s, i) => (
                <span key={i} className="absolute select-none pointer-events-none"
                  style={{ ...s, fontSize: s.f, color: s.c, animation: `twinkle 2.2s ${s.d} ease-in-out infinite` }}>
                  ✦
                </span>
              ))}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {/* Frame tier label */}
              <p className="text-[10px] font-black tracking-[0.18em]"
                style={{ color: tier.labelColor, animation:'twinkle 3s ease-in-out infinite' }}>
                ✦ {tier.label} ✦
              </p>
              <p className="font-black leading-tight"
                style={{
                  fontSize: nickname.length > 6 ? 20 : 24,
                  background: 'linear-gradient(90deg,#FFD700,#C77DFF,#87CEEB)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none',
                }}>
                {nickname}ちゃん！
              </p>
              {/* Crystal level display */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background:'linear-gradient(135deg,rgba(199,125,255,0.3),rgba(135,206,235,0.3))', border:`1px solid ${tier.labelColor}66`, boxShadow:`0 0 12px ${tier.glow}` }}>
                  <span className="text-[10px]" style={{ animation:'crystalPulse 2s ease-in-out infinite', color: tier.labelColor }}>💎</span>
                  <span className="text-[11px] font-black" style={{ color: tier.labelColor, animation:'crystalPulse 2s ease-in-out infinite' }}>Lv.{level}</span>
                </div>
                {/* Title badge */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background:`${titleColor}20`, border:`1px solid ${titleColor}55`, boxShadow:`0 0 8px ${titleColor}44` }}>
                  <span className="text-[11px] leading-none">{titleIcon}</span>
                  <span className="text-[10px] font-black" style={{ color: titleColor }}>{title}</span>
                </div>
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {badges.map(id => <BadgeChip key={id} badgeId={id} charType={charType}/>)}
                </div>
              )}
            </div>
            {/* Right deco – tiara at high levels */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <span className="text-2xl leading-none" style={{ animation:'floatBounce 2s ease-in-out infinite', filter:`drop-shadow(0 0 8px ${tier.glow})` }}>
                {level >= 17 ? '👑' : level >= 10 ? '✨' : level >= 5 ? '⭐' : '🌸'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Knight – Splatoon ウデマエ rank plate
  const rank = getRankInfo(level);
  const inkOpacity = level >= 17 ? 0.55 : level >= 10 ? 0.42 : level >= 5 ? 0.32 : 0.22;
  return (
    <div className="relative mx-0 overflow-visible animate-pop-in" style={{ animationDuration: '0.5s' }}>
      {/* Ink splash blobs – intensity scales with rank */}
      <svg className="absolute pointer-events-none select-none"
        width="100%" height="100%" style={{ top:-10, left:-8, overflow:'visible' }} aria-hidden>
        <ellipse cx="8%"  cy="50%" rx={16+level*0.8} ry={10+level*0.5} fill="#FF6B00" opacity={inkOpacity*1.3} transform="rotate(-20,50,50)"/>
        <ellipse cx="88%" cy="35%" rx={12+level*0.6} ry={8+level*0.4}  fill="#7B00FF" opacity={inkOpacity}     transform="rotate(12,50,50)"/>
        <ellipse cx="92%" cy="72%" rx={9+level*0.5}  ry={6+level*0.3}  fill="#FF9F0A" opacity={inkOpacity*0.9}/>
        <circle  cx="4%"  cy="22%" r={5+level*0.3}  fill="#FF3B30" opacity={inkOpacity*0.85}/>
        <circle  cx="96%" cy="18%" r={7+level*0.4}  fill="#7B00FF" opacity={inkOpacity*0.75}/>
        {level >= 10 && <circle cx="50%" cy="95%" r="8" fill="#FFD700" opacity={inkOpacity*0.7}/>}
        {level >= 17 && <>
          <ellipse cx="50%" cy="5%" rx="20" ry="8" fill="#FFD700" opacity={inkOpacity*0.8}/>
          <circle cx="15%" cy="80%" r="10" fill="#FF3B30" opacity={inkOpacity}/>
        </>}
      </svg>

      <div className="rounded-2xl px-4 py-3 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(8,4,22,0.97) 0%, rgba(15,8,40,0.97) 100%)',
          border: `1.5px solid ${rank.borderColor}55`,
          boxShadow: `0 4px 32px ${rank.glow.replace('0.9','0.3')}, inset 0 1px 0 rgba(255,200,0,0.06)`,
        }}>
        {/* Concrete texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-[0.035]"
          style={{ backgroundImage:'repeating-linear-gradient(45deg,#FF6B00 0px,#FF6B00 2px,transparent 2px,transparent 14px)' }}/>
        {/* Rank-colored glow line top */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background:`linear-gradient(90deg,transparent,${rank.color},#FFD700,${rank.color},transparent)` }}/>

        <div className="relative flex items-center gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <AvatarUploader
              currentUrl={avatarUrl}
              onUpload={onAvatarUpload}
              isPrincess={false}
              size={50}
              shape="rounded"
              defaultContent={<span className="text-2xl leading-none">🎮</span>}
            />
            {/* Rank-colored border */}
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ border:`2px solid ${rank.color}88`, boxShadow:`inset 0 0 12px ${rank.glow}` }}/>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-[0.22em] uppercase"
              style={{ color:`rgba(255,107,0,0.65)` }}>
              PLAYER
            </p>
            <p className="font-black leading-none truncate"
              style={{
                fontSize: nickname.length > 6 ? 20 : 24,
                color: 'white',
                textShadow: `0 0 20px ${rank.glow}, 0 2px 4px rgba(0,0,0,0.9)`,
                letterSpacing: '0.03em',
              }}>
              {nickname}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Title adventurer badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                style={{ background:`${titleColor}18`, border:`1px solid ${titleColor}55`, boxShadow:`0 0 8px ${titleColor}44` }}>
                <span className="text-[11px] leading-none">{titleIcon}</span>
                <span className="text-[10px] font-black" style={{ color: titleColor }}>{title}</span>
              </div>
            </div>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {badges.map(id => <BadgeChip key={id} badgeId={id} charType={charType}/>)}
              </div>
            )}
          </div>

          {/* Rank plate – the MAIN attraction */}
          <div className="shrink-0 flex flex-col items-center gap-0.5" style={{ minWidth: 56 }}>
            <div className="relative flex items-center justify-center rounded-lg overflow-hidden"
              style={{
                width: 52, height: 52,
                background: rank.bg,
                boxShadow: `0 0 20px ${rank.glow}, 0 0 40px ${rank.glow.replace('0.9','0.5')}`,
                border: `1px solid ${rank.color}99`,
              }}>
              {/* Inner shine */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-y-0 w-1/3 bg-white/25 skew-x-12" style={{ animation:'shimmer 2.5s ease infinite' }}/>
              </div>
              <span className="relative font-black select-none"
                style={{ fontSize: 26, color: rank.textColor, letterSpacing:'-0.02em', textShadow:`0 1px 4px rgba(0,0,0,0.3)` }}>
                {rank.rank}
              </span>
            </div>
            <span className="text-[9px] font-black tracking-widest" style={{ color: rank.color }}>
              Lv.{level}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Background decoration layer ─────────────────────────────────────────────
function BackgroundLayer({ isPrincess }: { isPrincess: boolean }) {
  if (!isPrincess) {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Orange paint splash – top right */}
        <svg width="300" height="260" style={{ position:'absolute', top:-50, right:-70, opacity:0.16 }} aria-hidden>
          <path d="M250,45 Q275,115 230,170 Q195,210 138,188 Q72,165 95,98 Q118,35 185,16 Q228,5 250,45Z" fill="#FF6B00"/>
          <circle cx="208" cy="58" r="28" fill="#FF9F0A" opacity="0.7"/>
          <circle cx="270" cy="130" r="16" fill="#FF6B00" opacity="0.55"/>
          <circle cx="115" cy="178" r="22" fill="#FF4500" opacity="0.45"/>
          <circle cx="72" cy="102" r="14" fill="#FF9F0A" opacity="0.4"/>
          <circle cx="258" cy="70" r="10" fill="#FFD700" opacity="0.5"/>
        </svg>
        {/* Purple paint splash – bottom left */}
        <svg width="280" height="320" style={{ position:'absolute', bottom:-70, left:-55, opacity:0.16 }} aria-hidden>
          <path d="M42,205 Q18,142 62,80 Q92,28 155,50 Q218,72 206,145 Q194,218 142,248 Q88,272 42,205Z" fill="#7B00FF"/>
          <circle cx="82" cy="248" r="32" fill="#5500CC" opacity="0.65"/>
          <circle cx="18" cy="162" r="20" fill="#9B00FF" opacity="0.55"/>
          <circle cx="165" cy="208" r="24" fill="#6600DD" opacity="0.48"/>
          <circle cx="55" cy="85" r="14" fill="#AA00FF" opacity="0.45"/>
        </svg>
        {/* Splatter dots */}
        {[
          { top:'22%', left:'12%', s:11, c:'#FF6B00' },
          { top:'38%', right:'9%', s:8,  c:'#7B00FF' },
          { top:'55%', left:'6%', s:15,  c:'#FF9F0A' },
          { bottom:'28%', right:'14%', s:10, c:'#7B00FF' },
          { top:'70%', left:'18%', s:7,  c:'#FF3B30' },
          { top:'15%', left:'45%', s:9,  c:'#FF9F0A' },
        ].map((d,i) => (
          <div key={i} style={{
            position:'absolute', ...d,
            width:d.s, height:d.s, borderRadius:'50%',
            background:d.c, opacity:0.18,
          }}/>
        ))}
      </div>
    );
  }
  // Princess: twinkling stars + soft glow orbs
  const stars = [
    { left:'7%',  top:'10%', sz:16, d:'0s',    c:'#FFD700' },
    { left:'88%', top:'7%',  sz:20, d:'0.6s',  c:'#C77DFF' },
    { left:'4%',  top:'44%', sz:11, d:'1.1s',  c:'#87CEEB' },
    { left:'92%', top:'36%', sz:13, d:'0.3s',  c:'#FFB7C5' },
    { left:'14%', top:'70%', sz:9,  d:'1.6s',  c:'#FFD700' },
    { left:'80%', top:'66%', sz:17, d:'0.9s',  c:'#C77DFF' },
    { left:'50%', top:'4%',  sz:13, d:'0.45s', c:'#87CEEB' },
    { left:'24%', top:'88%', sz:11, d:'1.25s', c:'#FFB7C5' },
    { left:'74%', top:'83%', sz:9,  d:'0.75s', c:'#FFD700' },
    { left:'35%', top:'15%', sz:7,  d:'1.8s',  c:'#C77DFF' },
    { left:'62%', top:'50%', sz:8,  d:'0.55s', c:'#FFB7C5' },
  ];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:s.left, top:s.top,
          fontSize:s.sz, color:s.c, lineHeight:1,
          animation:`twinkle 2.6s ${s.d} ease-in-out infinite`,
        }}>✦</div>
      ))}
      <div style={{
        position:'absolute', top:'-12%', right:'-12%',
        width:320, height:320, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(199,125,255,0.13) 0%, transparent 70%)',
      }}/>
      <div style={{
        position:'absolute', bottom:'-12%', left:'-12%',
        width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(135,206,235,0.11) 0%, transparent 70%)',
      }}/>
      <div style={{
        position:'absolute', top:'40%', right:'-8%',
        width:200, height:200, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(255,183,197,0.09) 0%, transparent 70%)',
      }}/>
    </div>
  );
}

// ─── SVG Creatures ─────────────────────────────────────────────────────────────
// Knight monsters
function SlimeSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="38%" cy="32%">
          <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <path d="M32,90 Q18,70 22,48 Q26,28 50,20 Q74,12 88,34 Q98,56 92,76 Q88,92 72,97 Q56,104 42,99Z" fill={`url(#rg-${uid})`}/>
      <ellipse cx="34" cy="93" rx="9" ry="11" fill={c1} opacity="0.65"/>
      <ellipse cx="80" cy="91" rx="7" ry="9" fill={c1} opacity="0.65"/>
      <ellipse cx="44" cy="52" rx="11" ry="12" fill="white"/>
      <ellipse cx="70" cy="50" rx="11" ry="12" fill="white"/>
      <circle cx="47" cy="54" r="6.5" fill="#1a0030"/>
      <circle cx="73" cy="52" r="6.5" fill="#1a0030"/>
      <circle cx="49" cy="51" r="2.5" fill="white"/>
      <circle cx="75" cy="49" r="2.5" fill="white"/>
      <path d="M44,70 Q57,82 74,69" stroke="#1a0030" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function BatSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="50%" cy="40%">
          <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <path d="M8,50 Q18,18 42,34 Q46,58 38,68 Q18,74 8,50Z" fill={`url(#rg-${uid})`}/>
      <path d="M112,50 Q102,18 78,34 Q74,58 82,68 Q102,74 112,50Z" fill={`url(#rg-${uid})`}/>
      <ellipse cx="60" cy="62" rx="24" ry="30" fill={`url(#rg-${uid})`}/>
      <polygon points="44,40 37,18 54,32" fill={c2}/>
      <polygon points="76,40 83,18 66,32" fill={c2}/>
      <ellipse cx="50" cy="58" rx="9" ry="10" fill="#FFE000"/>
      <ellipse cx="70" cy="58" rx="9" ry="10" fill="#FFE000"/>
      <circle cx="52" cy="59" r="5.5" fill="#1a0030"/>
      <circle cx="72" cy="59" r="5.5" fill="#1a0030"/>
      <circle cx="54" cy="57" r="2" fill="white"/>
      <circle cx="74" cy="57" r="2" fill="white"/>
      <polygon points="53,77 57,88 62,77" fill="white"/>
      <polygon points="62,77 66,88 71,77" fill="white"/>
    </svg>
  );
}
function GolemSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <linearGradient id={`rg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <rect x="28" y="52" width="64" height="56" rx="10" fill={`url(#rg-${uid})`}/>
      <rect x="22" y="20" width="76" height="40" rx="8" fill={`url(#rg-${uid})`}/>
      <rect x="4"  y="54" width="24" height="38" rx="8" fill={c1}/>
      <rect x="92" y="54" width="24" height="38" rx="8" fill={c1}/>
      <rect x="32" y="30" width="18" height="13" rx="4" fill="#FF6200"/>
      <rect x="70" y="30" width="18" height="13" rx="4" fill="#FF6200"/>
      <rect x="36" y="33" width="10" height="7"  rx="2" fill="#FFD700"/>
      <rect x="74" y="33" width="10" height="7"  rx="2" fill="#FFD700"/>
      <rect x="38" y="50" width="44" height="7"  rx="3.5" fill="#1a0030" opacity="0.55"/>
      <path d="M52,58 L50,72 L55,83 L52,98" stroke={c2} strokeWidth="2.5" fill="none" opacity="0.45"/>
    </svg>
  );
}
function DragonSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="40%" cy="30%">
          <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="82" rx="30" ry="34" fill={`url(#rg-${uid})`}/>
      <ellipse cx="60" cy="46" rx="32" ry="30" fill={`url(#rg-${uid})`}/>
      <polygon points="42,24 35,4 50,20"  fill={c2}/>
      <polygon points="78,24 85,4 70,20"  fill={c2}/>
      <polygon points="52,22 48,7 57,19"  fill={c2} opacity="0.7"/>
      <polygon points="68,22 72,7 63,19"  fill={c2} opacity="0.7"/>
      <ellipse cx="46" cy="44" rx="11" ry="12" fill="#FFD700"/>
      <ellipse cx="74" cy="44" rx="11" ry="12" fill="#FFD700"/>
      <ellipse cx="47" cy="45" rx="5.5" ry="7" fill="#1a0030"/>
      <ellipse cx="75" cy="45" rx="5.5" ry="7" fill="#1a0030"/>
      <circle cx="46" cy="42" r="2" fill="white"/>
      <circle cx="74" cy="42" r="2" fill="white"/>
      <polygon points="48,65 53,76 58,65" fill="white"/>
      <polygon points="58,65 62,77 66,65" fill="white"/>
      <polygon points="66,65 70,76 75,65" fill="white"/>
    </svg>
  );
}
// Princess companions
function NoteFairySVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={c1}/><stop offset="60%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <ellipse cx="28" cy="52" rx="24" ry="15" fill={c1} opacity="0.32" transform="rotate(-25,28,52)"/>
      <ellipse cx="92" cy="52" rx="24" ry="15" fill={c1} opacity="0.32" transform="rotate(25,92,52)"/>
      <ellipse cx="26" cy="70" rx="17" ry="11" fill={c1} opacity="0.22" transform="rotate(10,26,70)"/>
      <ellipse cx="94" cy="70" rx="17" ry="11" fill={c1} opacity="0.22" transform="rotate(-10,94,70)"/>
      <ellipse cx="50" cy="78" rx="17" ry="14" fill={`url(#rg-${uid})`}/>
      <rect x="61" y="38" width="8" height="46" rx="4" fill={`url(#rg-${uid})`}/>
      <ellipse cx="69" cy="75" rx="14" ry="11" fill={`url(#rg-${uid})`}/>
      <circle cx="45" cy="75" r="4" fill="#4a0060"/>
      <circle cx="55" cy="75" r="4" fill="#4a0060"/>
      <circle cx="46.5" cy="73" r="1.5" fill="white"/>
      <circle cx="56.5" cy="73" r="1.5" fill="white"/>
      <path d="M43,82 Q50,88 57,82" stroke="#4a0060" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <circle cx="40" cy="78" r="4.5" fill="#FFB7C5" opacity="0.4"/>
      <circle cx="60" cy="78" r="4.5" fill="#FFB7C5" opacity="0.4"/>
      <circle cx="18" cy="35" r="3.5" fill={c1} opacity="0.7"/>
      <circle cx="22" cy="27" r="2"   fill={c2} opacity="0.6"/>
      <circle cx="96" cy="32" r="3"   fill={c1} opacity="0.7"/>
      <circle cx="103" cy="40" r="2"  fill={c2} opacity="0.6"/>
    </svg>
  );
}
function StarFairySVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="50%" cy="35%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8"/>
          <stop offset="35%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <polygon points="60,8 71,42 106,42 80,63 90,97 60,76 30,97 40,63 14,42 49,42"
        fill={`url(#rg-${uid})`} stroke={c2} strokeWidth="1.5"/>
      <polyline points="40,28 44,18 50,25 56,13 60,23 64,13 70,25 76,18 80,28"
        stroke={c2} strokeWidth="2" fill="none"/>
      <circle cx="56" cy="13" r="3" fill={c2}/>
      <circle cx="64" cy="13" r="3" fill={c2}/>
      <circle cx="52" cy="54" r="4.5" fill="#3d004d"/>
      <circle cx="68" cy="54" r="4.5" fill="#3d004d"/>
      <circle cx="53.5" cy="52" r="1.8" fill="white"/>
      <circle cx="69.5" cy="52" r="1.8" fill="white"/>
      <circle cx="44" cy="62" r="5.5" fill="#FFB7C5" opacity="0.45"/>
      <circle cx="76" cy="62" r="5.5" fill="#FFB7C5" opacity="0.45"/>
      <path d="M50,64 Q60,72 70,64" stroke="#3d004d" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="14" cy="72" r="3"   fill={c1} opacity="0.6"/>
      <circle cx="106" cy="68" r="3.5" fill={c1} opacity="0.6"/>
    </svg>
  );
}
function MoonKittySVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="55" r="46" fill="none" stroke={c1} strokeWidth="4" opacity="0.22"/>
      <circle cx="60" cy="55" r="40" fill="none" stroke={c2} strokeWidth="2" opacity="0.14"/>
      <ellipse cx="60" cy="85" rx="30" ry="24" fill={`url(#rg-${uid})`}/>
      <circle cx="60" cy="52" r="30" fill={`url(#rg-${uid})`}/>
      <polygon points="34,30 26,12 44,26" fill={c1}/>
      <polygon points="86,30 94,12 76,26" fill={c1}/>
      <polygon points="36,30 30,16 44,26" fill="#FFB7C5" opacity="0.7"/>
      <polygon points="84,30 90,16 76,26" fill="#FFB7C5" opacity="0.7"/>
      <ellipse cx="48" cy="50" rx="10" ry="9" fill="white"/>
      <ellipse cx="72" cy="50" rx="10" ry="9" fill="white"/>
      <ellipse cx="49" cy="51" rx="6" ry="7" fill="#3d004d"/>
      <ellipse cx="73" cy="51" rx="6" ry="7" fill="#3d004d"/>
      <circle cx="51" cy="48" r="2.2" fill="white"/>
      <circle cx="75" cy="48" r="2.2" fill="white"/>
      <polygon points="60,61 57,66 63,66" fill="#FF9BB5"/>
      <path d="M57,66 Q54,71 50,70" stroke="#3d004d" strokeWidth="1.8" fill="none"/>
      <path d="M63,66 Q66,71 70,70" stroke="#3d004d" strokeWidth="1.8" fill="none"/>
      <line x1="24" y1="62" x2="50" y2="64" stroke={c2} strokeWidth="1.5" opacity="0.6"/>
      <line x1="24" y1="67" x2="50" y2="67" stroke={c2} strokeWidth="1.5" opacity="0.6"/>
      <line x1="70" y1="64" x2="96" y2="62" stroke={c2} strokeWidth="1.5" opacity="0.6"/>
      <line x1="70" y1="67" x2="96" y2="67" stroke={c2} strokeWidth="1.5" opacity="0.6"/>
      <path d="M88,16 Q100,22 100,34 Q92,28 82,30 Q80,18 88,16Z" fill={c2} opacity="0.8"/>
    </svg>
  );
}
function WandWitchSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" overflow="visible">
      <defs>
        <radialGradient id={`rg-${uid}`} cx="45%" cy="35%">
          <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
        </radialGradient>
      </defs>
      <polygon points="60,5 40,45 80,45" fill={c2}/>
      <ellipse cx="60" cy="45" rx="26" ry="8"   fill={c2} opacity="0.9"/>
      <ellipse cx="60" cy="44" rx="26" ry="8"   fill={c1} opacity="0.4"/>
      <rect x="34" y="40" width="52" height="8" rx="2" fill={c1} opacity="0.5"/>
      <circle cx="60" cy="66" r="26" fill={`url(#rg-${uid})`}/>
      <path d="M34,60 Q28,80 30,100 Q38,92 40,85 Q42,95 46,105 Q50,90 50,78"
        stroke={c2} strokeWidth="12" fill="none" strokeLinecap="round"/>
      <path d="M86,60 Q92,80 90,100 Q82,92 80,85 Q78,95 74,105 Q70,90 70,78"
        stroke={c2} strokeWidth="12" fill="none" strokeLinecap="round"/>
      <circle cx="50" cy="63" r="5.5" fill="#3d004d"/>
      <circle cx="70" cy="63" r="5.5" fill="#3d004d"/>
      <circle cx="52" cy="61" r="2" fill="white"/>
      <circle cx="72" cy="61" r="2" fill="white"/>
      <line x1="86" y1="42" x2="100" y2="20" stroke={c2} strokeWidth="3" strokeLinecap="round"/>
      <polygon points="100,10 103,18 112,18 105,23 108,31 100,26 92,31 95,23 88,18 97,18"
        fill="#FFD700" stroke="white" strokeWidth="1"/>
      <path d="M48,74 Q60,82 72,74" stroke="#3d004d" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="42" cy="72" r="6" fill="#FFB7C5" opacity="0.4"/>
      <circle cx="78" cy="72" r="6" fill="#FFB7C5" opacity="0.4"/>
    </svg>
  );
}
function CreatureSVG({ idx, c1, c2, isPrincess }: { idx:number; c1:string; c2:string; isPrincess:boolean }) {
  const uid = `cv${idx}`;
  if (isPrincess) {
    const comps = [NoteFairySVG, StarFairySVG, MoonKittySVG, WandWitchSVG];
    const Comp = comps[idx % comps.length];
    return <Comp c1={c1} c2={c2} uid={uid}/>;
  }
  const mons = [SlimeSVG, BatSVG, GolemSVG, DragonSVG];
  const Comp = mons[idx % mons.length];
  return <Comp c1={c1} c2={c2} uid={uid}/>;
}

// ─── Button icons ─────────────────────────────────────────────────────────────
function PaintRollerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="3" width="17" height="9" rx="2.5" fill="white" opacity="0.9"/>
      <rect x="3.5" y="4.5" width="14" height="6" rx="1.5" fill="#FF6B00" opacity="0.65"/>
      <line x1="10.5" y1="12" x2="10.5" y2="17" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <rect x="7.5" y="17" width="6" height="5" rx="1.5" fill="white" opacity="0.9"/>
    </svg>
  );
}
function MagicWandIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="3" y1="21" x2="13" y2="11" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <polygon points="17,2 18.5,7 23,7 19.5,9.5 21,14 17,11 13,14 14.5,9.5 11,7 15.5,7"
        fill="white" opacity="0.95"/>
      <circle cx="5.5" cy="18.5" r="1.5" fill="#FFD700"/>
      <circle cx="3"   cy="13"   r="1"   fill="#FFD700" opacity="0.7"/>
      <circle cx="10"  cy="21"   r="1"   fill="#C77DFF" opacity="0.7"/>
    </svg>
  );
}

// ─── Creature face ────────────────────────────────────────────────────────────
function MonsterFace({ idx, hp, maxHp, shaking, defeated, charType, accentColor }:
  { idx:number; hp:number; maxHp:number; shaking:boolean; defeated:boolean; charType: CharacterType; accentColor:string }) {
  const isPrincess = charType === 'princess';
  const list = isPrincess ? COMPANIONS : MONSTERS;
  const m = list[idx % list.length];
  const lowHp = hp / maxHp < 0.25 && !defeated;
  return (
    <div className={`relative select-none transition-all
      ${shaking ? 'animate-shake' : ''}
      ${lowHp ? 'animate-pulse' : ''}
      ${defeated ? (isPrincess ? 'opacity-50' : 'grayscale opacity-35') : ''}`}
      style={{
        width: 96, height: 96,
        filter: defeated ? undefined : `drop-shadow(0 0 28px ${accentColor}88)`,
      }}>
      <CreatureSVG idx={idx % (isPrincess ? COMPANIONS.length : MONSTERS.length)}
        c1={m.from} c2={m.to} isPrincess={isPrincess}/>
      {lowHp && (
        <div className="absolute -top-3 -right-3 text-xl leading-none"
          style={{ filter:'drop-shadow(0 0 8px rgba(255,50,50,0.9))' }}>
          {isPrincess ? '🥺' : '😡'}
        </div>
      )}
    </div>
  );
}

// ─── Teacher message card ─────────────────────────────────────────────────────
function TeacherMessageCard({ note, isNew, teacherAvatar, isPrincess }: {
  note: string; isNew: boolean; teacherAvatar: string | null; isPrincess: boolean;
}) {
  if (!note) return null;

  if (isPrincess) {
    return (
      <div className="relative rounded-3xl overflow-hidden animate-pop-in" style={{ animationDuration:'0.5s' }}>
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ boxShadow:'0 0 32px rgba(255,107,157,0.3), 0 0 64px rgba(199,125,255,0.15)' }}/>
        <div className="relative overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg,rgba(255,255,255,0.28) 0%,rgba(255,220,255,0.22) 100%)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,215,0,0.45)',
          }}>
          {/* Shimmer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-y-0 w-1/4 bg-white/12 skew-x-12 animate-shimmer"/>
          </div>
          {/* Corner sparkles */}
          {[{t:6,l:10,c:'#FFD700',d:'0s',f:12},{t:6,r:10,c:'#C77DFF',d:'0.5s',f:10},{b:6,l:12,c:'#FFB7C5',d:'1s',f:9},{b:6,r:8,c:'#87CEEB',d:'0.7s',f:11}].map((s,i)=>(
            <span key={i} className="absolute select-none pointer-events-none"
              style={{ top:s.t,left:s.l,bottom:s.b,right:s.r, fontSize:s.f, color:s.c, animation:`twinkle 2.4s ${s.d} ease-in-out infinite` }}>✦</span>
          ))}

          {/* Header – ribbon banner */}
          <div className="relative flex items-center justify-between px-4 pt-3 pb-2"
            style={{ borderBottom:'1px solid rgba(255,215,0,0.2)' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none" style={{ filter:'drop-shadow(0 0 8px rgba(255,107,157,0.7))' }}>💌</span>
              <span className="text-[11px] font-black tracking-[0.18em]"
                style={{ background:'linear-gradient(90deg,#FF6B9D,#C77DFF,#FFD700)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                ✦ 先生からの魔法の手紙 ✦
              </span>
            </div>
            {isNew && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                style={{ background:'linear-gradient(90deg,#FF6B9D,#C77DFF)', color:'white', boxShadow:'0 2px 8px rgba(199,125,255,0.5)' }}>
                ✨ NEW
              </span>
            )}
          </div>

          {/* Ribbon decoration SVG */}
          <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none select-none" style={{ zIndex:1 }}>
            <svg width="80" height="14" viewBox="0 0 80 14" fill="none">
              <path d="M0,7 Q20,0 40,7 Q60,14 80,7" stroke="#FFD700" strokeWidth="1.5" opacity="0.6" fill="none"/>
            </svg>
          </div>

          {/* Message body */}
          <div className="relative z-10 flex items-start gap-3.5 px-4 pt-3 pb-4">
            {/* Teacher avatar – gold portrait brooch */}
            <div className="shrink-0 relative" style={{ width:56, height:56 }}>
              {/* Outer aura glow */}
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow:'0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(199,125,255,0.3)', borderRadius:'50%' }}/>
              {/* Gold ornate frame ring */}
              <svg className="absolute pointer-events-none select-none" style={{ top:-6,left:-6,zIndex:2 }} width="68" height="68" viewBox="0 0 68 68">
                {/* Outer decorative ring */}
                <circle cx="34" cy="34" r="32" fill="none" stroke="url(#goldRing)" strokeWidth="2.5" opacity="0.9"/>
                {/* Inner ring */}
                <circle cx="34" cy="34" r="26" fill="none" stroke="url(#goldRing)" strokeWidth="1" opacity="0.5"/>
                {/* Gem dots at N/E/S/W */}
                <circle cx="34" cy="2"  r="3.5" fill="#FFD700" filter="url(#gemGlow)"/>
                <circle cx="66" cy="34" r="3.5" fill="#C77DFF" filter="url(#gemGlow)"/>
                <circle cx="34" cy="66" r="3.5" fill="#FFB7C5" filter="url(#gemGlow)"/>
                <circle cx="2"  cy="34" r="3.5" fill="#87CEEB" filter="url(#gemGlow)"/>
                {/* Diagonal gem dots */}
                <circle cx="11" cy="11" r="2" fill="#FFD700" opacity="0.7"/>
                <circle cx="57" cy="11" r="2" fill="#C77DFF" opacity="0.7"/>
                <circle cx="11" cy="57" r="2" fill="#87CEEB" opacity="0.7"/>
                <circle cx="57" cy="57" r="2" fill="#FFB7C5" opacity="0.7"/>
                <defs>
                  <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#FFD700"/>
                    <stop offset="40%"  stopColor="#FFFAAA"/>
                    <stop offset="70%"  stopColor="#FF9500"/>
                    <stop offset="100%" stopColor="#FFD700"/>
                  </linearGradient>
                  <filter id="gemGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
              </svg>
              {/* Photo or fallback */}
              {teacherAvatar ? (
                <img src={teacherAvatar} alt="teacher"
                  className="w-full h-full rounded-full object-cover"
                  style={{ border:'3px solid rgba(255,215,0,0.8)', boxShadow:'0 0 14px rgba(199,125,255,0.5)', position:'relative', zIndex:1 }}/>
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-2xl leading-none"
                  style={{ background:'linear-gradient(135deg,rgba(255,215,0,0.35),rgba(199,125,255,0.35))', border:'3px solid rgba(255,215,0,0.7)', boxShadow:'0 0 14px rgba(199,125,255,0.5)', position:'relative', zIndex:1 }}>
                  🧚
                </div>
              )}
              {/* Sparkle at top-right */}
              <span className="absolute select-none pointer-events-none" style={{ top:-4, right:-4, fontSize:12, color:'#FFD700', animation:'twinkle 1.8s ease-in-out infinite', zIndex:3 }}>✦</span>
              <span className="absolute select-none pointer-events-none" style={{ bottom:-2, left:-4, fontSize:9, color:'#C77DFF', animation:'twinkle 2.4s 0.6s ease-in-out infinite', zIndex:3 }}>✦</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black mb-1.5" style={{ color:'rgba(199,125,255,0.7)' }}>
                ✦ 先生より ✦
              </p>
              <p className="text-sm leading-relaxed font-medium" style={{ color:'#3d004d' }}>
                {note}
              </p>
              {/* Wax seal */}
              <div className="flex justify-end mt-2">
                <span className="text-xl leading-none" style={{ filter:'drop-shadow(0 0 8px rgba(255,107,157,0.8))', animation:'floatBounce 3s ease-in-out infinite' }}>🌸</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Knight – graffiti bulletin board (street / neon night)
  return (
    <div className="relative animate-pop-in" style={{ animationDuration:'0.5s' }}>
      {/* ── Large ink explosion blobs BEHIND the card ── */}
      <svg className="absolute pointer-events-none select-none"
        style={{ top:-14, left:-10, overflow:'visible', zIndex:0 }} width="100%" height="100%" aria-hidden>
        <ellipse cx="3%"   cy="22%"  rx="26" ry="16" fill="#FF6B00" opacity="0.48" transform="rotate(-22,50,50)"/>
        <ellipse cx="97%"  cy="18%"  rx="22" ry="13" fill="#7B00FF" opacity="0.42" transform="rotate(14,50,50)"/>
        <ellipse cx="4%"   cy="78%"  rx="20" ry="12" fill="#FF9F0A" opacity="0.40" transform="rotate(8,50,50)"/>
        <ellipse cx="96%"  cy="75%"  rx="18" ry="11" fill="#FF3B30" opacity="0.36" transform="rotate(-10,50,50)"/>
        {/* splatter dots */}
        <circle cx="8%"   cy="5%"   r="5"   fill="#FFD700" opacity="0.55"/>
        <circle cx="92%"  cy="6%"   r="4"   fill="#FF6B00" opacity="0.50"/>
        <circle cx="2%"   cy="50%"  r="3.5" fill="#7B00FF" opacity="0.45"/>
        <circle cx="98%"  cy="48%"  r="4"   fill="#FF9F0A" opacity="0.45"/>
        <circle cx="50%"  cy="102%" r="5"   fill="#FF3B30" opacity="0.40"/>
        <circle cx="25%"  cy="-2%"  r="3"   fill="#FF6B00" opacity="0.48"/>
        <circle cx="75%"  cy="-3%"  r="2.5" fill="#7B00FF" opacity="0.42"/>
      </svg>

      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg,rgba(6,3,18,0.98) 0%,rgba(12,6,32,0.98) 100%)',
          border: '2px solid rgba(255,107,0,0.55)',
          boxShadow: '0 6px 40px rgba(255,107,0,0.25), 0 0 0 1px rgba(123,0,255,0.3), inset 0 1px 0 rgba(255,200,0,0.08)',
          borderRadius: '1rem',
          zIndex: 1,
        }}>

        {/* Concrete wall texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.045,
            backgroundImage: 'repeating-linear-gradient(45deg,#FF6B00 0px,#FF6B00 2px,transparent 2px,transparent 16px)',
          }}/>

        {/* Top neon glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background:'linear-gradient(90deg,#7B00FF,#FF6B00,#FFD700,#FF3B30,#FF6B00,#7B00FF)', opacity:0.85 }}/>
        {/* Bottom subtle line */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background:'linear-gradient(90deg,transparent,rgba(255,107,0,0.35),transparent)' }}/>

        {/* ── Header: neon sign board ── */}
        <div className="relative flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom:'1px solid rgba(255,107,0,0.22)', background:'rgba(255,107,0,0.06)' }}>
          <div className="flex items-center gap-2.5">
            {/* Neon traffic-light dots */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full"
                style={{ background:'#FF3B30', boxShadow:'0 0 6px #FF3B30, 0 0 14px rgba(255,59,48,0.8)', animation:'nearLevelUp 2.1s ease-in-out infinite' }}/>
              <div className="w-2 h-2 rounded-full"
                style={{ background:'#FFD700', boxShadow:'0 0 6px #FFD700, 0 0 14px rgba(255,215,0,0.7)', animation:'nearLevelUp 2.1s 0.4s ease-in-out infinite' }}/>
              <div className="w-2 h-2 rounded-full"
                style={{ background:'#34C759', boxShadow:'0 0 6px #34C759, 0 0 14px rgba(52,199,89,0.7)', animation:'nearLevelUp 2.1s 0.8s ease-in-out infinite' }}/>
            </div>
            {/* Graffiti label */}
            <span className="font-black tracking-[0.16em] uppercase"
              style={{
                fontSize: 12,
                background: 'linear-gradient(90deg,#FF9F0A,#FFD700,#FF6B00)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                letterSpacing: '0.18em',
              }}>
              SENSEI BOARD
            </span>
            <span className="text-[10px] font-black tracking-[0.1em]"
              style={{ color:'rgba(255,107,0,0.55)' }}>
              ▸ 先生より
            </span>
          </div>
          {isNew && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background:'#FF3B30', boxShadow:'0 0 6px #FF3B30', animation:'nearLevelUp 0.6s ease-in-out infinite' }}/>
              <span className="text-[10px] font-black px-2 py-0.5 rounded"
                style={{ background:'linear-gradient(90deg,#FF3B30,#FF6B00)', color:'white', boxShadow:'0 0 12px rgba(255,59,48,0.7)', letterSpacing:'0.08em' }}>
                NEW!
              </span>
            </div>
          )}
        </div>

        {/* ── Message body ── */}
        <div className="flex items-start gap-3.5 px-4 py-3.5">
          {/* Teacher avatar – circular ink sticker */}
          <div className="shrink-0 relative" style={{ width:56, height:56 }}>
            {/* Large ink explosion blobs behind the circle */}
            <svg style={{ position:'absolute', overflow:'visible', pointerEvents:'none', top:0, left:0, zIndex:0 }}
              width="56" height="56" aria-hidden>
              <ellipse cx="-4" cy="-4" rx="18" ry="10" fill="#FF6B00" opacity="0.72" transform="rotate(-20,-4,-4)"/>
              <ellipse cx="60" cy="-3" rx="15" ry="9"  fill="#7B00FF" opacity="0.65" transform="rotate(15,60,-3)"/>
              <ellipse cx="-3" cy="60" rx="14" ry="8"  fill="#FF9F0A" opacity="0.60" transform="rotate(10,-3,60)"/>
              <ellipse cx="60" cy="60" rx="13" ry="8"  fill="#FF3B30" opacity="0.58" transform="rotate(-8,60,60)"/>
              {/* splatter dots */}
              <circle cx="50" cy="-8" r="4"  fill="#FFD700" opacity="0.75"/>
              <circle cx="-8" cy="28" r="3"  fill="#FF6B00" opacity="0.68"/>
              <circle cx="64" cy="42" r="3.5" fill="#7B00FF" opacity="0.62"/>
              <circle cx="20" cy="64" r="4"  fill="#FF3B30" opacity="0.65"/>
              <circle cx="-5" cy="50" r="2.5" fill="#FF9F0A" opacity="0.58"/>
            </svg>
            {/* Neon circle border ring */}
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ zIndex:2,
              border:'3px solid rgba(255,107,0,0.9)',
              boxShadow:'0 0 16px rgba(255,107,0,0.8), 0 0 32px rgba(255,107,0,0.45), 0 0 0 1.5px rgba(123,0,255,0.55), inset 0 0 10px rgba(255,107,0,0.2)',
            }}/>
            {/* Photo or squid fallback */}
            {teacherAvatar ? (
              <img src={teacherAvatar} alt="teacher"
                className="w-full h-full rounded-full object-cover"
                style={{ position:'relative', zIndex:1 }}/>
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-2xl leading-none"
                style={{
                  background:'linear-gradient(135deg,rgba(10,4,22,0.95),rgba(20,8,44,0.95))',
                  position:'relative', zIndex:1,
                }}>
                🦑
              </div>
            )}
            {/* "SENSEI" arc text effect – small badge */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 pointer-events-none select-none"
              style={{ zIndex:3 }}>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{ background:'linear-gradient(90deg,#FF6B00,#FFD700)', color:'rgba(0,0,0,0.8)', letterSpacing:'0.1em', boxShadow:'0 0 8px rgba(255,107,0,0.7)' }}>
                SENSEI
              </span>
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            {/* "FROM TEACHER" label */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-px flex-1" style={{ background:'linear-gradient(90deg,rgba(255,107,0,0.5),transparent)' }}/>
              <span className="text-[9px] font-black uppercase tracking-[0.25em]"
                style={{ color:'rgba(255,107,0,0.65)' }}>
                FROM TEACHER
              </span>
              <div className="h-px flex-1" style={{ background:'linear-gradient(90deg,transparent,rgba(255,107,0,0.5))' }}/>
            </div>

            {/* Message text */}
            <p className="text-sm leading-relaxed font-medium" style={{ color:'rgba(255,255,255,0.92)' }}>
              {note}
            </p>

            {/* Paint stroke bar decoration */}
            <div className="mt-2.5 flex items-center gap-1">
              {[
                { w:28, c:'#FF6B00', op:0.7 },
                { w:18, c:'#FFD700', op:0.55 },
                { w:22, c:'#7B00FF', op:0.6 },
                { w:14, c:'#FF3B30', op:0.5 },
                { w:8,  c:'#FF9F0A', op:0.45 },
              ].map((s,i) => (
                <div key={i} className="rounded-full" style={{ width:s.w, height:3, background:s.c, opacity:s.op }}/>
              ))}
              <span className="ml-1 text-[9px] font-black" style={{ color:'rgba(255,107,0,0.4)' }}>▮▮▮</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Level-up modal (particle burst / pixie dust) ────────────────────────────
function LevelUpModal({ level, onClose, charType }: { level: number; onClose: () => void; charType: CharacterType }) {
  const t = getTitle(level);
  const isPrincess = charType === 'princess';
  const rank = getRankInfo(level);
  const tier = getFrameTier(level);
  useEffect(() => { const id = setTimeout(onClose, 5200); return () => clearTimeout(id); }, [onClose]);

  // Knight: ink explosion particles
  const knightPtcls = ['⚔️','💥','🔥','👑','⚡','🏆','💫','🛡️','🐉','🎖️','✨','🌟'];
  // Princess: 16 pixie dust particles
  const pixiePtcls  = ['✦','✧','⋆','✦','✧','⋆','✦','✧','✦','✧','⋆','✦','✧','✦','⋆','✧'];
  const pixieColors = ['#FFD700','#C77DFF','#87CEEB','#FFB7C5','#FFD700','#C77DFF','#87CEEB',
                       '#FFB7C5','#FFD700','#C77DFF','#87CEEB','#FFB7C5','#FFD700','#C77DFF','#87CEEB','#FFB7C5'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: isPrincess ? 'rgba(15,0,35,0.88)' : 'rgba(0,0,0,0.85)', backdropFilter:'blur(12px)' }}
      onClick={onClose}>

      {/* ── Particles ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isPrincess ? (
          <>
            {pixiePtcls.map((p, i) => (
              <div key={i} className={`absolute font-black select-none pixie-${i+1}`}
                style={{ fontSize: 14+(i%3)*8, color: pixieColors[i], textShadow:`0 0 16px ${pixieColors[i]}`, animationDelay:`${i*0.04}s` }}>
                {p}
              </div>
            ))}
            {['✦','✧','⋆','✦','✧','⋆','✦','✧'].map((p,i) => (
              <div key={`ex${i}`} className={`absolute select-none particle-${(i%8)+1}`}
                style={{ fontSize:12, color: pixieColors[i*2%16], opacity:0.7, animationDelay:`${0.2+i*0.07}s` }}>
                {p}
              </div>
            ))}
          </>
        ) : (
          <>
            {knightPtcls.map((p, i) => (
              <div key={i} className={`absolute text-3xl select-none particle-${(i%8)+1}`}
                style={{ animationDelay:`${i*0.06}s`, filter:`drop-shadow(0 0 12px ${rank.color})` }}>
                {p}
              </div>
            ))}
            {/* Extra ink splat circles */}
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={`ink${i}`} className={`absolute rounded-full particle-${i+1}`}
                style={{
                  width: 18+i*4, height: 18+i*4,
                  background: [rank.color,'#FF6B00','#FFD700','#7B00FF','#FF3B30','#FF9F0A',rank.color,'#FFD700'][i],
                  opacity: 0.55,
                  animationDelay: `${0.1+i*0.05}s`,
                }}/>
            ))}
          </>
        )}
      </div>

      {/* ── Main Card ── */}
      <div className="animate-pop-in mx-5 rounded-3xl flex flex-col items-center gap-3 relative overflow-hidden"
        style={isPrincess ? {
          padding: '36px 32px',
          background: 'linear-gradient(135deg,rgba(255,255,255,0.18),rgba(220,180,255,0.12))',
          backdropFilter: 'blur(40px)',
          border: `2px solid transparent`,
          backgroundClip: 'padding-box',
          boxShadow: `0 0 80px ${tier.glow}, 0 0 160px rgba(199,125,255,0.3), 0 24px 80px rgba(0,0,0,0.55)`,
        } : {
          padding: '36px 28px',
          background: 'linear-gradient(135deg,rgba(8,4,22,0.97),rgba(14,8,38,0.97))',
          border: `2px solid ${rank.color}88`,
          boxShadow: `0 0 80px ${rank.glow}, 0 0 160px ${rank.glow.replace('0.9','0.4')}, 0 24px 80px rgba(0,0,0,0.7)`,
        }}>

        {/* Princess tier frame ring */}
        {isPrincess && (
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: tier.grad, WebkitMask:'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite:'xor', maskComposite:'exclude', padding:'2px' }}/>
        )}

        {/* Shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute inset-y-0 w-1/3 bg-white/10 skew-x-12 animate-shimmer"/>
        </div>

        {/* Princess inner sparkles */}
        {isPrincess && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            {['✦','✧','⋆','✦','✧','⋆','✦','✧'].map((s,i) => (
              <span key={i} className="absolute" style={{
                color: pixieColors[i*2], fontSize: 10,
                left:`${8+i*12}%`, top:`${8+i*11}%`,
                animation:`twinkle ${1.4+i*0.25}s ${i*0.18}s ease-in-out infinite`,
              }}>{s}</span>
            ))}
          </div>
        )}

        {/* Knight: ink splat background blobs */}
        {!isPrincess && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
            <ellipse cx="15%" cy="20%" rx="40" ry="28" fill={rank.color} opacity="0.08" transform="rotate(-20,50,50)"/>
            <ellipse cx="85%" cy="80%" rx="35" ry="22" fill="#7B00FF"   opacity="0.08" transform="rotate(15,50,50)"/>
            <ellipse cx="80%" cy="25%" rx="25" ry="16" fill="#FF6B00"   opacity="0.06"/>
          </svg>
        )}

        {/* Title icon */}
        <span className="text-7xl relative z-10"
          style={{ filter:`drop-shadow(0 0 32px ${isPrincess ? tier.glow : rank.glow})`, animation:'floatBounce 1s ease-in-out infinite' }}>
          {t.icon}
        </span>

        {/* Knight: GRAFFITI "LEVEL UP!" text */}
        {!isPrincess ? (
          <div className="relative z-10 flex flex-col items-center gap-1" style={{ animation:'graffitiIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <p className="font-black leading-none"
              style={{
                fontSize: 52,
                letterSpacing: '0.04em',
                color: rank.color,
                textShadow: `0 0 40px ${rank.glow}, 0 0 80px ${rank.glow.replace('0.9','0.5')}, 0 4px 0 rgba(0,0,0,0.8), -2px 2px 0 ${rank.textColor === '#3d1a00' ? '#7B4400' : 'rgba(0,0,0,0.5)'}`,
                WebkitTextStroke: `1px ${rank.color}cc`,
              }}>
              LEVEL UP!
            </p>
            {/* Ink drips under text */}
            <div className="flex gap-2 pointer-events-none select-none">
              {[rank.color,'#FF6B00','#FFD700','#7B00FF',rank.color].map((c,i) => (
                <div key={i} className="w-1 rounded-b-full"
                  style={{ height: 8+i*5, background:c, opacity:0.7, animation:`inkDrip 0.4s ${0.6+i*0.1}s ease-out both` }}/>
              ))}
            </div>
          </div>
        ) : (
          <p className="relative z-10 font-black text-5xl"
            style={{
              letterSpacing:'0.05em',
              background: `linear-gradient(90deg,#FFD700,${tier.labelColor},#87CEEB,${tier.labelColor},#FFD700)`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              textShadow:'none',
              animation:'graffitiIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}>
            ✨ LEVEL UP ✨
          </p>
        )}

        {/* Level number with rank/crystal display */}
        {!isPrincess ? (
          <div className="relative z-10 flex items-center gap-2.5 px-4 py-2 rounded-xl"
            style={{ background: rank.bg, boxShadow:`0 0 24px ${rank.glow}, 0 0 48px ${rank.glow.replace('0.9','0.5')}`, border:`1px solid ${rank.color}88` }}>
            <span className="font-black text-3xl" style={{ color: rank.textColor, letterSpacing:'-0.02em' }}>
              {rank.rank}
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black" style={{ color:`${rank.textColor}88` }}>ランク</span>
              <span className="font-black text-xl" style={{ color: rank.textColor }}>Lv.{level}</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: tier.grad, boxShadow:`0 0 24px ${tier.glow}, 0 0 48px ${tier.glow}`, border:`1px solid rgba(255,255,255,0.3)` }}>
            <span className="text-lg" style={{ animation:'gemSparkle 1.5s ease-in-out infinite' }}>💎</span>
            <span className="font-black text-2xl text-white" style={{ textShadow:`0 0 16px ${tier.glow}` }}>Lv.{level}</span>
          </div>
        )}

        {/* Frame tier evolution (princess) */}
        {isPrincess && tier.gems.length > 0 && (
          <div className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full"
            style={{ background:`${tier.labelColor}22`, border:`1px solid ${tier.labelColor}55` }}>
            {tier.gems.slice(0,4).map((g,i) => (
              <span key={i} style={{ animation:`gemSparkle ${1+i*0.2}s ${i*0.15}s ease-in-out infinite` }}>{g}</span>
            ))}
            <span className="text-xs font-black" style={{ color: tier.labelColor }}>{tier.label}に進化！</span>
          </div>
        )}

        {/* Title badge */}
        <div className="relative z-10 flex items-center gap-2 rounded-2xl px-5 py-2"
          style={isPrincess
            ? { background:`${t.color}28`, border:`1px solid ${t.color}50` }
            : { background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)' }}>
          <span className="text-xl leading-none" style={{ filter:`drop-shadow(0 0 8px ${t.color})` }}>{t.icon}</span>
          <p className="font-black text-base tracking-wide"
            style={{ color: isPrincess ? t.color : 'white', textShadow: isPrincess ? `0 0 12px ${t.color}` : undefined }}>
            {t.title}
          </p>
        </div>

        <p className="relative z-10 text-xs mt-0.5" style={{ color: isPrincess ? `${t.color}70` : 'rgba(255,255,255,0.3)' }}>
          タップして閉じる
        </p>
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
  const [charType,  setCharType]  = useState<CharacterType>('knight');
  const [nickname,  setNickname]  = useState('');

  // monster anim
  const [shaking, setShaking]   = useState(false);
  const [dmgNum, setDmgNum]     = useState<number|null>(null);
  const [showVic, setShowVic]   = useState(false);
  const [xpGain, setXpGain]     = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const [levelUpVal, setLevelUpVal] = useState<number|null>(null);

  // badge celebration
  const [newBadgeId, setNewBadgeId] = useState<BadgeId | null>(null);
  const [myBadges,   setMyBadges]   = useState<BadgeId[]>([]);

  // avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // teacher message
  const [teacherNote,      setTeacherNote]      = useState('');
  const [noteIsNew,        setNoteIsNew]        = useState(false);
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState<string | null>(null);

  // music quiz game (single-note)
  const [showMusicGame,  setShowMusicGame]  = useState(false);
  // melody quiz game
  const [showMelodyGame, setShowMelodyGame] = useState(false);
  // ── game-played flags: computed fresh every render from localStorage ──────
  // Always scoped to student. Even with empty nickname this gives 'music_quiz_last_played_'
  // which is distinct from the legacy unscoped key and avoids stale-data collisions.
  const musicGameKey  = `${MUSIC_GAME_KEY}_${nickname}`;
  const melodyGameKey = `${MELODY_GAME_KEY}_${nickname}`;
  // Using state as a tick counter so handlers can force a re-render after writing localStorage
  const [gameTick, setGameTick] = useState(0);
  const gamePlayedToday   = mounted ? localStorage.getItem(musicGameKey)  === today : false;
  const melodyPlayedToday = mounted ? localStorage.getItem(melodyGameKey) === today : false;
  void gameTick; // consumed only to trigger re-render
  // treasure videos (teacher lesson records)
  const [treasureRecs,     setTreasureRecs]     = useState<LessonRecord[]>([]);
  const [loadingTreasure,  setLoadingTreasure]  = useState(false);
  const [treasureLoaded,   setTreasureLoaded]   = useState(false);

  // daily limit
  const [lastAttackDate, setLastAttackDate] = useState('');

  // submission in-flight state (shows 送信中... on button)
  const [submitting, setSubmitting] = useState(false);

  // ink animation (knight attack button)
  const [inkPos, setInkPos] = useState<{x:number; y:number}|null>(null);
  const inkTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

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
    setNickname(p.nickname ?? '');
    setAvatarUrl(p.avatar_url ?? null);
    setMounted(true); load(); setMs(loadMS());
    setLastAttackDate(localStorage.getItem(LAST_ATTACK_KEY) ?? '');
    // Debug: log date comparison values so timezone issues can be spotted in DevTools
    const dbgToday = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    const dbgNick  = p.nickname ?? '';
    const dbgMusicKey  = `${MUSIC_GAME_KEY}_${dbgNick}`;
    const dbgMelodyKey = `${MELODY_GAME_KEY}_${dbgNick}`;
    console.log(
      '[GameDebug] today(JST):', dbgToday,
      '| charType:', p.type,
      '| nick:', dbgNick,
      '| musicKey:', dbgMusicKey, '=', localStorage.getItem(dbgMusicKey),
      '| melodyKey:', dbgMelodyKey, '=', localStorage.getItem(dbgMelodyKey),
      '| legacy_unscoped:', localStorage.getItem(MUSIC_GAME_KEY),
    );
    // gamePlayedToday / melodyPlayedToday are now computed directly from localStorage each render
    // Load current badges; if expression badge was just awarded by teacher, celebrate
    const currentBadges = getBadges().map(b => b.id);
    setMyBadges(currentBadges);
    const celebKey = 'badge_celebrated';
    const celebrated = (localStorage.getItem(celebKey) ?? '').split(',').filter(Boolean);
    const newOnes = currentBadges.filter(id => !celebrated.includes(id));
    if (newOnes.length > 0) {
      setNewBadgeId(newOnes[0] as BadgeId);
      localStorage.setItem(celebKey, [...celebrated, ...newOnes].join(','));
    }

    // ── Teacher note & avatar ──
    const nick = p.nickname;
    const localNote = localStorage.getItem(`lesson_notes_${nick}`) ?? '';
    if (localNote) {
      setTeacherNote(localNote);
      const updatedAt = parseInt(localStorage.getItem(`lesson_notes_updated_at_${nick}`) ?? '0');
      const seenAt    = parseInt(localStorage.getItem(`lesson_notes_seen_at_${nick}`)    ?? '0');
      if (updatedAt > seenAt && updatedAt > 0) setNoteIsNew(true);
      localStorage.setItem(`lesson_notes_seen_at_${nick}`, Date.now().toString());
    }
    // Load teacher avatar: localStorage first (instant), then Supabase (fresh/cross-device)
    setTeacherAvatarUrl(localStorage.getItem('teacher_avatar_url'));
    fetchTeacherAvatarFromSupabase().then(url => { if (url) setTeacherAvatarUrl(url); }, () => {});
    // Also attempt fresher data from Supabase
    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from('profiles').select('lesson_notes').match({ nickname: p.nickname, birthday: p.birthday }).maybeSingle().then((r: any) => {
        if (r?.data?.lesson_notes && r.data.lesson_notes !== localNote) {
          setTeacherNote(r.data.lesson_notes);
          localStorage.setItem(`lesson_notes_${nick}`, r.data.lesson_notes);
        }
      }, () => {});
    }
  }, [load, router]);

  const loadTreasureRecs = useCallback(async () => {
    if (treasureLoaded) return;
    const p = getProfile();
    if (!p) return;
    setLoadingTreasure(true);
    const recs = await fetchLessonRecords(p.nickname, p.birthday);
    setTreasureRecs(recs);
    setLoadingTreasure(false);
    setTreasureLoaded(true);
  }, [treasureLoaded]);

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

    // ── Auto-award daily7 badge ──
    if (newStreak >= 7 && !hasBadge('daily7')) {
      const awarded = awardBadge('daily7');
      if (awarded) {
        setMyBadges(prev => [...prev, 'daily7']);
        const celebKey = 'badge_celebrated';
        const celebrated = (localStorage.getItem(celebKey) ?? '').split(',').filter(Boolean);
        localStorage.setItem(celebKey, [...celebrated, 'daily7'].join(','));
        setTimeout(() => setNewBadgeId('daily7'), 600);
      }
    }

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
          syncStatsToSupabase(newTotalXp, newLevel, next.monstersDefeated, newStreak);
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
      syncStatsToSupabase(newTotalXp, newLevel, next.monstersDefeated, newStreak);
      if (newLevel > oldLevel) setTimeout(() => setLevelUpVal(newLevel), 400);
    }

    setSong(''); setMins(''); setRating(3); setVideoFile(null);
    localStorage.setItem(LAST_ATTACK_KEY, today); setLastAttackDate(today);
    // Force re-render so gamePlayedToday/melodyPlayedToday re-read localStorage with correct scoped keys
    setGameTick(t => t + 1);
    console.log('[GameDebug] practice submitted — today(JST):', today,
      '| musicKey:', musicGameKey, '=', localStorage.getItem(musicGameKey),
      '| melodyKey:', melodyGameKey, '=', localStorage.getItem(melodyGameKey));
  };

  // Music quiz game: award EXP and close
  const handleGameEnd = (expGained: number) => {
    setShowMusicGame(false);
    // Mark today as played (localStorage + Supabase)
    localStorage.setItem(musicGameKey, today);
    setGameTick(t => t + 1); // force re-render so gamePlayedToday re-reads localStorage
    if (supabase) {
      const p = getProfile();
      if (p) {
        supabase.from('profiles')
          .update({ last_game_at: today })
          .match({ nickname: p.nickname, birthday: p.birthday })
          .then(() => {}, () => {});
      }
    }
    if (expGained <= 0) return;
    const newTotalXp = ms.totalXp + expGained;
    const newLevel   = calcLevel(newTotalXp);
    const next: MonsterState = { ...ms, totalXp: newTotalXp, level: newLevel };
    setMs(next);
    saveMS(next);
    syncStatsToSupabase(newTotalXp, newLevel, ms.monstersDefeated, ms.streak);
    if (newLevel > ms.level) setTimeout(() => setLevelUpVal(newLevel), 300);
  };

  // Melody game end handler (same EXP logic as handleGameEnd)
  const handleMelodyGameEnd = (expGained: number) => {
    setShowMelodyGame(false);
    localStorage.setItem(melodyGameKey, today);
    setGameTick(t => t + 1); // force re-render so melodyPlayedToday re-reads localStorage
    if (expGained <= 0) return;
    const newTotalXp = ms.totalXp + expGained;
    const newLevel   = calcLevel(newTotalXp);
    const next: MonsterState = { ...ms, totalXp: newTotalXp, level: newLevel };
    setMs(next); saveMS(next);
    syncStatsToSupabase(newTotalXp, newLevel, ms.monstersDefeated, ms.streak);
    if (newLevel > ms.level) setTimeout(() => setLevelUpVal(newLevel), 300);
  };

  // Fire-and-forget: sync game stats to Supabase profiles table
  const syncStatsToSupabase = (xp: number, lv: number, defeated: number, streak: number) => {
    if (!supabase) return;
    const p = getProfile();
    if (!p) return;
    supabase.from('profiles')
      .update({ total_xp: xp, level: lv, monsters_defeated: defeated, streak })
      .match({ nickname: p.nickname, birthday: p.birthday })
      .then(() => {}, (e: unknown) => console.warn('[supabase] stats sync failed:', e));
  };

  const handleAvatarUpload = async (file: File) => {
    const url = await uploadStudentAvatar(file);
    if (url) setAvatarUrl(url);
  };

  const handleLogout = () => { localStorage.removeItem(ROLE_KEY); router.push('/'); };

  const handleAttackWithInk = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canAttack || submitting) return;
    if (!isPrincess) {
      const rect = e.currentTarget.getBoundingClientRect();
      setInkPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (inkTimer.current) clearTimeout(inkTimer.current);
      inkTimer.current = setTimeout(() => setInkPos(null), 750);
    }
    setSubmitting(true);
    // Brief delay so "送信中..." is visible before completion card appears
    setTimeout(() => handleAttack(), 350);
  };
  const handleDelete = (id: string) => { deleteRecord(id); load(); };
  const totalMins = records.reduce((s,r)=>s+r.duration,0);

  const isPrincess = charType === 'princess';

  return (
    <div className="min-h-screen relative" style={{ background: theme.bgPage }}>

      <BackgroundLayer isPrincess={isPrincess}/>

      {/* Badge celebration */}
      {newBadgeId && (
        <BadgeCelebration badgeId={newBadgeId} charType={charType}
          onClose={() => setNewBadgeId(null)}/>
      )}

      {/* Level-up modal */}
      {levelUpVal && <LevelUpModal level={levelUpVal} onClose={() => setLevelUpVal(null)} charType={charType} />}

      {/* Music quiz game */}
      {showMusicGame && (
        <MusicQuizGame isPrincess={isPrincess} onGameEnd={handleGameEnd}/>
      )}

      {/* Melody quiz game */}
      {showMelodyGame && (
        <MelodyQuizGame isPrincess={isPrincess} onGameEnd={handleMelodyGameEnd}/>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20"
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
            {/* Teacher message notification badge */}
            {noteIsNew && (
              <div className="relative w-8 h-8 flex items-center justify-center rounded-full"
                style={isPrincess
                  ? { background:'linear-gradient(135deg,rgba(255,107,157,0.25),rgba(199,125,255,0.25))', border:'1px solid rgba(255,107,157,0.5)' }
                  : { background:'rgba(255,107,0,0.18)', border:'1px solid rgba(255,107,0,0.45)' }}>
                <span className="text-base leading-none">{isPrincess ? '💌' : '📋'}</span>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                  style={{ background:'#FF3B30', boxShadow:'0 0 6px rgba(255,59,48,0.7)', animation:'nearLevelUp 0.9s ease-in-out infinite' }}>
                  ！
                </span>
              </div>
            )}
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

      <div className="relative z-10 px-4 pt-4 space-y-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>

        {/* ── Name plate ── */}
        {mounted && nickname && (
          <NamePlate
            nickname={nickname}
            level={curLevel}
            title={title.title}
            titleIcon={title.icon}
            isPrincess={isPrincess}
            titleColor={title.color}
            badges={myBadges}
            charType={charType}
            avatarUrl={avatarUrl}
            onAvatarUpload={handleAvatarUpload}
          />
        )}

        {/* ── Teacher message card ── */}
        {mounted && teacherNote && (
          <TeacherMessageCard
            note={teacherNote}
            isNew={noteIsNew}
            teacherAvatar={teacherAvatarUrl}
            isPrincess={isPrincess}
          />
        )}

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

        {/* EXP + rank bar ── RICH REDESIGN */}
        {mounted && (() => {
          const rank = getRankInfo(curLevel);
          const tier = getFrameTier(curLevel);
          const nearMax = xpPct >= 78;
          if (isPrincess) {
            return (
              <div className="rounded-2xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(135deg,rgba(255,240,255,0.82),rgba(240,220,255,0.78))',
                  backdropFilter: 'blur(20px)',
                  border: nearMax ? `2px solid transparent` : `1px solid rgba(199,125,255,0.3)`,
                  boxShadow: nearMax
                    ? `0 0 0 2px ${tier.glow}, 0 4px 32px ${tier.glow}`
                    : `0 4px 24px rgba(199,125,255,0.14)`,
                  animation: nearMax ? 'nearLevelUp 1.1s ease-in-out infinite' : undefined,
                }}>
                {/* Shimmer */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-y-0 w-1/4 bg-white/15 skew-x-12 animate-shimmer"/>
                </div>
                <div className="relative px-4 pt-3 pb-2">
                  {/* Header row: crystal level + XP label */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Crystal level badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{ background: tier.grad, boxShadow:`0 0 16px ${tier.glow}, 0 0 32px ${tier.glow}` }}>
                        <span className="text-xs leading-none" style={{ animation:'gemSparkle 2s ease-in-out infinite' }}>💎</span>
                        <span className="font-black text-sm" style={{ color: '#fff', textShadow:`0 0 12px ${tier.glow}` }}>
                          Lv.{curLevel}
                        </span>
                      </div>
                      <span className="text-[11px] font-black tracking-widest" style={{ color:'#9B4DCA' }}>
                        {theme.xpLabel}
                      </span>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-black" style={{ color:'#C77DFF' }}>
                      {xpThis}<span style={{ color:'rgba(160,80,220,0.4)' }}>/{xpNext}</span>
                    </span>
                  </div>

                  {/* XP bar – crystal tube */}
                  <div className="h-4 rounded-full overflow-hidden relative"
                    style={{
                      background:'rgba(180,120,240,0.15)',
                      border:`1px solid rgba(199,125,255,0.35)`,
                      boxShadow: nearMax ? `0 0 0 2px rgba(199,125,255,0.5), 0 0 20px rgba(199,125,255,0.6)` : undefined,
                    }}>
                    <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                      style={{
                        width:`${xpPct}%`,
                        background: nearMax
                          ? 'linear-gradient(90deg,#C77DFF,#FFD700,#C77DFF)'
                          : theme.xpBarGradient,
                        boxShadow: nearMax
                          ? '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(199,125,255,0.6)'
                          : '0 0 12px rgba(199,125,255,0.7)',
                      }}>
                      {/* Gem sparkles along bar at near-max */}
                      {nearMax && [20,40,60,80].map((p,i) => (
                        <span key={i} className="absolute top-1/2 -translate-y-1/2 text-[8px] select-none pointer-events-none"
                          style={{ left:`${p}%`, animation:`twinkle ${1+i*0.2}s ${i*0.15}s ease-in-out infinite` }}>✦</span>
                      ))}
                      {/* Inner shine */}
                      <div className="absolute inset-y-0 w-1/3 bg-white/30 rounded-full" style={{ left:'-10%' }}/>
                    </div>
                  </div>

                  {/* Near level-up alert */}
                  {nearMax && (
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-black" style={{ color:'#FFD700', animation:'nearLevelUp 0.8s ease-in-out infinite', textShadow:'0 0 12px rgba(255,215,0,0.8)' }}>
                        ✦ もうすぐレベルアップ！ ✦
                      </span>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex justify-between text-[11px] mt-1.5"
                    style={{ color:'#B06CC0' }}>
                    <span>{theme.enemyCountLabel} {ms.monstersDefeated}体</span>
                    <span>{theme.encyclopediaLabel} {ms.defeatedIds.length}/{creatures.length}</span>
                    <span>🔥{ms.streak}日連続</span>
                  </div>
                </div>
              </div>
            );
          }

          // Knight version
          return (
            <div className="rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg,rgba(8,4,22,0.97),rgba(14,8,38,0.97))',
                border: nearMax ? `1.5px solid ${rank.color}` : `1px solid rgba(255,180,0,0.18)`,
                boxShadow: nearMax
                  ? `0 0 0 1px ${rank.color}55, 0 0 32px ${rank.glow}, 0 4px 24px rgba(0,0,0,0.4)`
                  : `0 4px 24px rgba(0,0,0,0.35)`,
                animation: nearMax ? 'nearLevelUp 1.1s ease-in-out infinite' : undefined,
              }}>
              {/* Concrete texture */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage:'repeating-linear-gradient(45deg,#FF6B00 0px,#FF6B00 2px,transparent 2px,transparent 14px)' }}/>
              {/* Rank-colored top line */}
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background:`linear-gradient(90deg,transparent,${rank.color},#FFD700,${rank.color},transparent)` }}/>

              <div className="relative px-4 pt-3 pb-2">
                {/* Header: rank plate + XP */}
                <div className="flex items-center gap-2.5 mb-2">
                  {/* Rank plate badge */}
                  <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg overflow-hidden"
                    style={{ background: rank.bg, boxShadow:`0 0 16px ${rank.glow}, 0 0 32px ${rank.glow.replace('0.9','0.5')}` }}>
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute inset-y-0 w-1/3 bg-white/20 skew-x-12" style={{ animation:'shimmer 2.5s ease infinite' }}/>
                    </div>
                    <span className="relative font-black text-lg leading-none" style={{ color: rank.textColor, letterSpacing:'-0.02em' }}>
                      {rank.rank}
                    </span>
                    <span className="relative text-[10px] font-black" style={{ color:`${rank.textColor}cc` }}>
                      ランク
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black tracking-widest uppercase"
                        style={{ color:'rgba(255,200,100,0.75)' }}>
                        {theme.xpLabel}
                      </span>
                      <span className="text-xs font-mono tabular-nums font-black" style={{ color:'#FFD700' }}>
                        {xpThis}<span style={{ color:'rgba(255,255,255,0.2)' }}>/{xpNext}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP bar – neon graffiti gauge */}
                <div className="h-5 rounded-md overflow-hidden relative"
                  style={{
                    background:'rgba(0,0,0,0.7)',
                    border:`1px solid ${nearMax ? rank.color : 'rgba(255,200,0,0.12)'}`,
                    boxShadow: nearMax ? `0 0 20px ${rank.glow}, 0 0 40px ${rank.glow.replace('0.9','0.5')}` : undefined,
                  }}>
                  <div className="h-full rounded-md transition-all duration-700 relative overflow-hidden"
                    style={{
                      width:`${xpPct}%`,
                      background: nearMax
                        ? `linear-gradient(90deg,${rank.color},#FFD700,${rank.color})`
                        : theme.xpBarGradient,
                      boxShadow: nearMax
                        ? `0 0 20px ${rank.glow}, 0 0 40px ${rank.glow.replace('0.9','0.6')}`
                        : `0 0 12px rgba(255,200,0,0.55)`,
                    }}>
                    {/* Shine */}
                    <div className="absolute inset-0 bg-white/15 rounded-md" style={{ background:'linear-gradient(180deg,rgba(255,255,255,0.25) 0%,transparent 60%)' }}/>
                    {/* Sparks at near-max */}
                    {nearMax && ['⚡','💥','⚡'].map((s,i) => (
                      <span key={i} className="absolute top-1/2 -translate-y-1/2 text-[10px] select-none pointer-events-none"
                        style={{ left:`${25+i*28}%`, animation:`twinkle ${0.8+i*0.15}s ${i*0.1}s ease-in-out infinite` }}>{s}</span>
                    ))}
                  </div>
                  {/* % text overlay */}
                  <span className="absolute inset-0 flex items-center justify-end pr-1.5 text-[9px] font-black"
                    style={{ color: xpPct > 30 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)' }}>
                    {Math.round(xpPct)}%
                  </span>
                </div>

                {/* Near level-up graffiti alert */}
                {nearMax && (
                  <div className="mt-1.5 flex items-center justify-center">
                    <span className="font-black text-[12px] tracking-widest uppercase"
                      style={{ color: rank.color, textShadow:`0 0 16px ${rank.glow}`, animation:'nearLevelUp 0.75s ease-in-out infinite', letterSpacing:'0.12em' }}>
                      ⚡ あと少しでLEVEL UP! ⚡
                    </span>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex justify-between text-[11px] mt-1.5"
                  style={{ color:'rgba(255,255,255,0.33)' }}>
                  <span>{theme.enemyCountLabel} {ms.monstersDefeated}体</span>
                  <span>{theme.encyclopediaLabel} {ms.defeatedIds.length}/{creatures.length}</span>
                  <span>🔥{ms.streak}日連続</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Attack panel */}
        {mounted && alreadyAttackedToday ? (
          <div className="rounded-2xl px-5 py-7 flex flex-col items-center gap-3 text-center"
            style={isPrincess ? {
              background: 'rgba(255,240,255,0.80)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(199,125,255,0.25)',
              boxShadow: '0 4px 24px rgba(199,125,255,0.15)',
            } : {
              background: 'rgba(3,6,18,0.97)',
              border: '1px solid rgba(255,180,0,0.3)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
            }}>
            <span className="text-5xl" style={{ filter:'drop-shadow(0 0 16px rgba(150,100,255,0.5))' }}>
              {isPrincess ? '🌸' : '🌙'}
            </span>
            <p className="font-black text-base" style={{ color: isPrincess ? '#6a0080' : '#ffffff' }}>
              今日の練習は完了しました！
            </p>
            <p className="text-sm" style={{ color: isPrincess ? '#B06CC0' : 'rgba(255,255,255,0.45)' }}>
              {theme.completedNextMsg}
            </p>
            {/* Game buttons / already-played messages — unified logic */}
            {gamePlayedToday && melodyPlayedToday ? (
              /* ── 両方プレイ済み: 1つのメッセージに統合 ── */
              <div className="w-full rounded-2xl py-4 px-4 text-center"
                style={{
                  background: isPrincess ? 'rgba(199,125,255,0.12)' : 'rgba(255,255,255,0.06)',
                  border: isPrincess ? '1.5px solid rgba(199,125,255,0.3)' : '1.5px solid rgba(255,255,255,0.12)',
                }}>
                <p className="text-sm font-black mb-1" style={{ color: isPrincess ? '#C77DFF' : '#FF9F0A' }}>
                  {isPrincess
                    ? '✨ 今日の魔法は使い果たしたわ！'
                    : '🦑 今日の修行は完了だ！'}
                </p>
                <p className="text-xs" style={{ color: isPrincess ? 'rgba(90,0,110,0.6)' : 'rgba(255,255,255,0.4)' }}>
                  {isPrincess
                    ? 'また明日一緒に挑戦しようね ✦'
                    : '明日のためにインクを貯めておけよ！'}
                </p>
              </div>
            ) : (
              /* ── 未プレイのゲームがある: 個別に表示 ── */
              <>
                {gamePlayedToday ? (
                  <p className="text-xs text-center"
                    style={{ color: isPrincess ? 'rgba(199,125,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
                    {isPrincess ? '🎼 音楽パズル: 今日は挑戦済み ✓' : '🎵 音撃クイズ: 今日は挑戦済み ✓'}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowMusicGame(true)}
                    className="w-full rounded-2xl py-3.5 font-black text-base text-white"
                    style={{
                      background: isPrincess
                        ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)'
                        : 'linear-gradient(135deg,#FF6B00,#FF9F0A)',
                      boxShadow: isPrincess
                        ? '0 4px 20px rgba(199,125,255,0.5)'
                        : '0 4px 20px rgba(255,107,0,0.6)',
                      border: 'none', cursor: 'pointer',
                      animation: 'floatBounce 3s ease-in-out infinite',
                    }}>
                    {isPrincess ? '🎼 音楽パズルに挑戦！' : '🎵 音撃クイズに挑戦！'}
                  </button>
                )}

                {melodyPlayedToday ? (
                  <p className="text-xs text-center"
                    style={{ color: isPrincess ? 'rgba(199,125,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
                    {isPrincess ? '🎵 メロディ魔法: 今日は挑戦済み ✓' : '🎼 メロディ音撃: 今日は挑戦済み ✓'}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowMelodyGame(true)}
                    className="w-full rounded-2xl py-3.5 font-black text-base text-white"
                    style={{
                      background: isPrincess
                        ? 'linear-gradient(135deg,#9B59B6,#FF6B9D)'
                        : 'linear-gradient(135deg,#0066FF,#00C6FF)',
                      boxShadow: isPrincess
                        ? '0 4px 20px rgba(155,89,182,0.5)'
                        : '0 4px 20px rgba(0,102,255,0.5)',
                      border: 'none', cursor: 'pointer',
                      animation: 'floatBounce 3s ease-in-out infinite',
                    }}>
                    {isPrincess ? '🎵 メロディ魔法パズルに挑戦！' : '🎼 メロディ音撃バトルに挑戦！'}
                  </button>
                )}
              </>
            )}

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

            <button onClick={handleAttackWithInk} disabled={!canAttack || submitting}
              className="w-full py-4 text-base font-black tracking-widest relative overflow-hidden transition-all active:scale-[0.97]"
              style={canAttack && !submitting ? {
                background: isPrincess
                  ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
                  : 'linear-gradient(90deg,#FF3B30,#FF9F0A)',
                color: 'white',
                boxShadow: isPrincess
                  ? '0 -1px 0 rgba(0,0,0,0.08), 0 2px 20px rgba(255,107,157,0.5)'
                  : '0 -1px 0 rgba(0,0,0,0.3), 0 2px 20px rgba(255,59,48,0.4)',
                letterSpacing: '0.12em',
              } : submitting ? {
                background: isPrincess
                  ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
                  : 'linear-gradient(90deg,#FF3B30,#FF9F0A)',
                color: 'white',
                opacity: 0.7,
                letterSpacing: '0.12em',
              } : {
                background: isPrincess ? 'rgba(220,180,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: isPrincess ? 'rgba(180,100,240,0.3)' : 'rgba(255,255,255,0.2)',
              }}>
              {/* Ink spread ripple (knight only) */}
              {inkPos && !isPrincess && (
                <span className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 56, height: 56,
                    top: inkPos.y - 28, left: inkPos.x - 28,
                    background: 'rgba(255,200,0,0.35)',
                    animation: 'inkSpread 0.7s ease-out forwards',
                  }}/>
              )}
              <span className="relative flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⏳</span>
                    {isPrincess ? '✨ 送信中…' : '🚀 送信中…'}
                  </>
                ) : (
                  <>
                    {isPrincess ? <MagicWandIcon/> : <PaintRollerIcon/>}
                    {streakLbl ? theme.attackStreakLabel(streakLbl) : videoFile ? theme.attackVideoLabel : theme.attackLabel}
                  </>
                )}
              </span>
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

        {/* ── Treasure videos (teacher lesson records) ── */}
        {mounted && (
          <div className="rounded-2xl overflow-hidden"
            style={isPrincess ? {
              background: 'linear-gradient(135deg,rgba(255,240,255,0.82),rgba(220,180,255,0.6))',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(199,125,255,0.35)',
              boxShadow: '0 4px 24px rgba(199,125,255,0.15)',
            } : {
              background: 'rgba(5,10,28,0.97)',
              border: '1px solid rgba(0,200,255,0.2)',
              boxShadow: '0 4px 24px rgba(0,200,255,0.08)',
            }}>

            {/* Section header */}
            <button
              className="w-full text-left px-4 py-3 flex items-center gap-3"
              onClick={loadTreasureRecs}
              style={{ borderBottom: treasureLoaded
                ? isPrincess ? '1px solid rgba(199,125,255,0.2)' : '1px solid rgba(0,200,255,0.12)'
                : 'none' }}>
              <span className="text-2xl leading-none">{isPrincess ? '🎀' : '📼'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm"
                  style={{ color: isPrincess ? '#7B1FA2' : '#00C6FF' }}>
                  {isPrincess ? '✦ 魔法の思い出シアター' : '▸ MISSION ARCHIVE'}
                </p>
                <p className="text-[10px]"
                  style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(0,200,255,0.45)' }}>
                  {isPrincess ? '先生からの宝物ビデオを見よう！' : '先生が記録した任務映像アーカイブ'}
                </p>
              </div>
              {!treasureLoaded && (
                <span className="text-[10px] font-black px-2 py-1 rounded-full"
                  style={isPrincess ? {
                    background: 'rgba(199,125,255,0.15)',
                    color: '#C77DFF',
                    border: '1px solid rgba(199,125,255,0.3)',
                  } : {
                    background: 'rgba(0,200,255,0.08)',
                    color: '#00C6FF',
                    border: '1px solid rgba(0,200,255,0.25)',
                  }}>
                  {isPrincess ? '見る ✦' : '開く ▶'}
                </span>
              )}
            </button>

            {treasureLoaded && (
              <div className="px-4 py-3 space-y-4">
                {loadingTreasure ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <div className="animate-spin text-lg">{isPrincess ? '✨' : '⭐'}</div>
                    <span className="text-xs" style={{ color: isPrincess ? '#C77DFF' : '#00C6FF' }}>読み込み中…</span>
                  </div>
                ) : treasureRecs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <span className="text-3xl">{isPrincess ? '📷' : '📭'}</span>
                    <p className="text-xs font-semibold"
                      style={{ color: isPrincess ? '#AB47BC' : '#00C6FF' }}>
                      {isPrincess ? 'まだ宝物ビデオがないよ' : 'アーカイブはまだ空だ'}
                    </p>
                    <p className="text-[10px]"
                      style={{ color: isPrincess ? 'rgba(199,125,255,0.5)' : 'rgba(0,200,255,0.4)' }}>
                      {isPrincess ? '先生がレッスン後に追加してくれるよ！' : 'ミッション完了後に先生が記録を残す'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 relative">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-5 bottom-5 w-px"
                      style={{ background: isPrincess
                        ? 'linear-gradient(to bottom,rgba(199,125,255,0.4),rgba(199,125,255,0.05))'
                        : 'linear-gradient(to bottom,rgba(0,200,255,0.35),rgba(0,200,255,0.05))' }}/>

                    {treasureRecs.map((rec) => {
                      const d = new Date(rec.recorded_at);
                      const label = `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
                      return (
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
                            <span className="text-sm leading-none">{isPrincess ? '✦' : '▶'}</span>
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

                            <div className="px-3 py-2 border-b"
                              style={{ borderColor: isPrincess ? 'rgba(199,125,255,0.15)' : 'rgba(0,200,255,0.1)' }}>
                              <p className="text-xs font-black"
                                style={{ color: isPrincess ? '#9B4DCA' : '#00C6FF' }}>
                                {isPrincess ? `✦ ${label}` : `▸ ${label}`}
                              </p>
                            </div>

                            {rec.teacher_memo && (
                              <div className="px-3 py-2.5">
                                <p className="text-sm leading-relaxed"
                                  style={{ color: isPrincess ? '#3d004d' : 'rgba(255,255,255,0.85)' }}>
                                  {rec.teacher_memo}
                                </p>
                              </div>
                            )}

                            {rec.video_url && (
                              <div className="px-3 pb-3">
                                <video
                                  src={rec.video_url}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full rounded-xl bg-black max-h-64 object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
