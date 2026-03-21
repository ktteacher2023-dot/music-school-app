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

// ─── Name plate ───────────────────────────────────────────────────────────────
function NamePlate({ nickname, level, title, isPrincess, titleColor }:
  { nickname:string; level:number; title:string; isPrincess:boolean; titleColor:string }) {
  if (!nickname) return null;

  if (isPrincess) {
    return (
      <div className="relative mx-0 overflow-visible animate-pop-in"
        style={{ animationDuration: '0.5s' }}>
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ boxShadow:'0 0 32px rgba(199,125,255,0.3), 0 0 64px rgba(135,206,235,0.15)' }}/>
        <div className="rounded-3xl px-5 py-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(220,180,255,0.14) 100%)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,215,0,0.35)',
          }}>
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
            {/* Wand icon */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <span className="text-3xl leading-none" style={{ filter:'drop-shadow(0 0 10px rgba(199,125,255,0.8))' }}>🪄</span>
              <span className="text-lg leading-none">🎀</span>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black tracking-[0.2em] uppercase"
                style={{ color:'rgba(199,125,255,0.7)' }}>
                ✦ Welcome Back ✦
              </p>
              <p className="font-black leading-tight"
                style={{
                  fontSize: nickname.length > 6 ? 22 : 26,
                  background: 'linear-gradient(90deg,#FFD700,#C77DFF,#87CEEB)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                }}>
                こんにちは、{nickname}ちゃん！
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-bold" style={{ color: titleColor }}>
                  {title}
                </span>
                <span style={{ color:'rgba(199,125,255,0.3)' }}>·</span>
                <span className="text-xs font-bold" style={{ color:'rgba(199,125,255,0.6)' }}>
                  Lv. {level}
                </span>
              </div>
            </div>
            {/* Right deco */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <span className="text-2xl leading-none animate-sparkle">⭐</span>
              <span className="text-xl leading-none" style={{ animation:'twinkle 1.8s 0.5s ease-in-out infinite' }}>✨</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Knight – graffiti ink plate
  return (
    <div className="relative mx-0 overflow-visible animate-pop-in"
      style={{ animationDuration: '0.5s' }}>
      {/* Ink splash blobs behind plate */}
      <svg className="absolute pointer-events-none select-none"
        width="100%" height="100%" style={{ top:-8, left:-6, overflow:'visible' }} aria-hidden>
        <ellipse cx="12%" cy="50%" rx="18" ry="12" fill="#FF6B00" opacity="0.35" transform="rotate(-15,50,50)"/>
        <ellipse cx="88%" cy="40%" rx="14" ry="9"  fill="#7B00FF" opacity="0.3"  transform="rotate(10,50,50)"/>
        <ellipse cx="92%" cy="70%" rx="10" ry="7"  fill="#FF9F0A" opacity="0.28"/>
        <circle cx="5%"  cy="25%" r="6"  fill="#FF3B30" opacity="0.25"/>
        <circle cx="95%" cy="20%" r="8"  fill="#7B00FF" opacity="0.22"/>
        <circle cx="50%" cy="92%" r="5"  fill="#FF6B00" opacity="0.2"/>
      </svg>

      <div className="rounded-2xl px-5 py-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10,6,30,0.96) 0%, rgba(20,10,50,0.96) 100%)',
          border: '1px solid rgba(255,107,0,0.35)',
          boxShadow: '0 4px 32px rgba(255,107,0,0.2), inset 0 1px 0 rgba(255,200,0,0.08)',
        }}>
        {/* Diagonal stripes (stencil texture) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #FF6B00 0px, #FF6B00 2px, transparent 2px, transparent 12px)',
          }}/>
        {/* Orange glow line top */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background:'linear-gradient(90deg, transparent, #FF6B00, #FFD700, #FF6B00, transparent)' }}/>

        <div className="relative flex items-center gap-3">
          {/* Left ink icon */}
          <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#FF6B00,#FF3B30)', boxShadow:'0 2px 16px rgba(255,107,0,0.5)' }}>
            <span className="text-2xl leading-none">🎮</span>
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-[0.22em] uppercase"
              style={{ color:'rgba(255,107,0,0.7)' }}>
              PLAYER
            </p>
            <p className="font-black leading-none truncate"
              style={{
                fontSize: nickname.length > 6 ? 22 : 26,
                color: 'white',
                textShadow: '0 0 20px rgba(255,107,0,0.7), 0 2px 4px rgba(0,0,0,0.8)',
                letterSpacing: '0.02em',
              }}>
              {nickname}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background:'rgba(255,107,0,0.2)', border:'1px solid rgba(255,107,0,0.4)', color:'#FF9F0A' }}>
                Lv.{level}
              </span>
              <span className="text-[11px] font-bold" style={{ color: titleColor }}>
                {title}
              </span>
            </div>
          </div>
          {/* Right paint splat */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <span className="text-2xl leading-none" style={{ filter:'drop-shadow(0 0 8px rgba(255,107,0,0.9))' }}>🎨</span>
            <span className="text-xs font-black" style={{ color:'#FF9F0A' }}>READY</span>
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

// ─── Level-up modal (particle burst / pixie dust) ────────────────────────────
function LevelUpModal({ level, onClose, charType }: { level: number; onClose: () => void; charType: CharacterType }) {
  const t = getTitle(level);
  const isPrincess = charType === 'princess';
  useEffect(() => { const id = setTimeout(onClose, 4500); return () => clearTimeout(id); }, [onClose]);

  // Knight: 12 battle particles (pb1–pb8 cycling)
  const knightPtcls = ['⚔️','💥','🔥','👑','⚡','🏆','💫','🛡️','🐉','🎖️','✨','🌟'];
  // Princess: 16 pixie dust particles (pd1–pd16)
  const pixiePtcls  = ['✦','✧','⋆','✦','✧','⋆','✦','✧','✦','✧','⋆','✦','✧','✦','⋆','✧'];
  const pixieColors = ['#FFD700','#C77DFF','#87CEEB','#FFB7C5','#FFD700','#C77DFF','#87CEEB',
                       '#FFB7C5','#FFD700','#C77DFF','#87CEEB','#FFB7C5','#FFD700','#C77DFF','#87CEEB','#FFB7C5'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: isPrincess ? 'rgba(20,0,40,0.85)' : 'rgba(0,0,0,0.82)', backdropFilter:'blur(10px)' }}
      onClick={onClose}>

      {/* Particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isPrincess ? (
          // 16 pixie dust sparks
          <>
            {pixiePtcls.map((p, i) => (
              <div key={i} className={`absolute font-black select-none pixie-${i+1}`}
                style={{
                  fontSize: 14 + (i % 3) * 6,
                  color: pixieColors[i],
                  textShadow: `0 0 12px ${pixieColors[i]}`,
                  animationDelay: `${i * 0.04}s`,
                }}>
                {p}
              </div>
            ))}
            {/* Extra ambient twinkles */}
            {['✦','✧','⋆','✦','✧','⋆','✦','✧'].map((p,i) => (
              <div key={`ex${i}`} className={`absolute select-none particle-${(i%8)+1}`}
                style={{
                  fontSize: 10, color: pixieColors[i*2 % 16], opacity: 0.6,
                  animationDelay: `${0.15 + i*0.06}s`,
                }}>
                {p}
              </div>
            ))}
          </>
        ) : (
          knightPtcls.map((p, i) => (
            <div key={i} className={`absolute text-2xl select-none particle-${(i%8)+1}`}
              style={{ animationDelay: `${i*0.06}s` }}>
              {p}
            </div>
          ))
        )}
      </div>

      {/* Card */}
      <div className="animate-pop-in mx-6 rounded-3xl flex flex-col items-center gap-3 relative overflow-hidden"
        style={isPrincess ? {
          padding: '40px 36px',
          background: `linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))`,
          backdropFilter: 'blur(32px)',
          border: `1px solid ${t.color}66`,
          boxShadow: `0 0 80px ${t.color}60, 0 0 160px rgba(199,125,255,0.3), 0 24px 80px rgba(0,0,0,0.5)`,
        } : {
          padding: '40px 36px',
          background: `linear-gradient(135deg, ${t.color}dd, ${t.color})`,
          boxShadow: `0 0 80px ${t.color}88, 0 24px 80px rgba(0,0,0,0.6)`,
        }}>
        {/* Shimmer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 bg-white/10 skew-x-12 animate-shimmer"/>
        </div>
        {isPrincess && (
          // Pixie dust inner sparkles
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['✦','✧','⋆','✦','✧','⋆'].map((s,i) => (
              <span key={i} className="absolute text-xs" style={{
                color: pixieColors[i*2],
                left: `${15+i*14}%`, top: `${10+i*12}%`,
                animation: `twinkle ${1.5+i*0.3}s ${i*0.2}s ease-in-out infinite`,
              }}>{s}</span>
            ))}
          </div>
        )}
        <span className="text-7xl relative z-10"
          style={{ filter:`drop-shadow(0 0 24px ${isPrincess ? t.color : 'rgba(255,255,255,0.8)'})` }}>
          {t.icon}
        </span>
        <p className="relative z-10 font-black text-5xl drop-shadow"
          style={{
            color: 'white',
            letterSpacing: '0.06em',
            textShadow: isPrincess ? `0 0 30px ${t.color}, 0 2px 8px rgba(0,0,0,0.4)` : undefined,
          }}>
          {isPrincess ? '✨ LEVEL UP ✨' : 'LEVEL UP!'}
        </p>
        <p className="relative z-10 font-bold text-2xl" style={{ color: isPrincess ? t.color : 'rgba(255,255,255,0.9)' }}>
          Lv. {level}
        </p>
        <div className="relative z-10 rounded-2xl px-6 py-2"
          style={isPrincess
            ? { background: `${t.color}30`, border: `1px solid ${t.color}50` }
            : { background: 'rgba(255,255,255,0.25)' }}>
          <p className="font-black text-lg text-center tracking-wide"
            style={{ color: isPrincess ? t.color : 'white' }}>
            {t.title}
          </p>
        </div>
        <p className="relative z-10 text-xs mt-1" style={{ color: isPrincess ? `${t.color}80` : 'rgba(255,255,255,0.4)' }}>
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

  // daily limit
  const [lastAttackDate, setLastAttackDate] = useState('');

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

  const handleAttackWithInk = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canAttack) return;
    if (!isPrincess) {
      const rect = e.currentTarget.getBoundingClientRect();
      setInkPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (inkTimer.current) clearTimeout(inkTimer.current);
      inkTimer.current = setTimeout(() => setInkPos(null), 750);
    }
    handleAttack();
  };
  const handleDelete = (id: string) => { deleteRecord(id); load(); };
  const totalMins = records.reduce((s,r)=>s+r.duration,0);

  const isPrincess = charType === 'princess';

  return (
    <div className="min-h-screen relative" style={{ background: theme.bgPage }}>

      <BackgroundLayer isPrincess={isPrincess}/>

      {/* Level-up modal */}
      {levelUpVal && <LevelUpModal level={levelUpVal} onClose={() => setLevelUpVal(null)} charType={charType} />}

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
            isPrincess={isPrincess}
            titleColor={title.color}
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

            <button onClick={handleAttackWithInk} disabled={!canAttack}
              className="w-full py-4 text-base font-black tracking-widest relative overflow-hidden transition-all active:scale-[0.97]"
              style={canAttack ? {
                background: isPrincess
                  ? 'linear-gradient(90deg,#FF6B9D,#C77DFF)'
                  : 'linear-gradient(90deg,#FF3B30,#FF9F0A)',
                color: 'white',
                boxShadow: isPrincess
                  ? '0 -1px 0 rgba(0,0,0,0.08), 0 2px 20px rgba(255,107,157,0.5)'
                  : '0 -1px 0 rgba(0,0,0,0.3), 0 2px 20px rgba(255,59,48,0.4)',
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
                {isPrincess ? <MagicWandIcon/> : <PaintRollerIcon/>}
                {streakLbl ? theme.attackStreakLabel(streakLbl) : videoFile ? theme.attackVideoLabel : theme.attackLabel}
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
      </div>
    </div>
  );
}
