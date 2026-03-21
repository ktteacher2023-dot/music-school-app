'use client';
import { useState, useEffect } from 'react';
import { MONSTERS, getTitle, calcLevel } from '@/lib/gameData';
import { COMPANIONS } from '@/lib/companionData';
import { getProfile } from '@/lib/profile';
import { getTheme } from '@/lib/theme';
import type { MonsterState } from '@/app/student/page';

const MS_KEY = 'monster_state_v2';
function loadMS(): MonsterState | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(MS_KEY) ?? 'null'); } catch { return null; }
}

// ─── SVG Creatures ─────────────────────────────────────────────────────────────
function SlimeSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="38%" cy="32%">
        <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </radialGradient></defs>
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
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="50%" cy="40%">
        <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </radialGradient></defs>
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
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><linearGradient id={`rg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </linearGradient></defs>
      <rect x="28" y="52" width="64" height="56" rx="10" fill={`url(#rg-${uid})`}/>
      <rect x="22" y="20" width="76" height="40" rx="8" fill={`url(#rg-${uid})`}/>
      <rect x="4"  y="54" width="24" height="38" rx="8" fill={c1}/>
      <rect x="92" y="54" width="24" height="38" rx="8" fill={c1}/>
      <rect x="32" y="30" width="18" height="13" rx="4" fill="#FF6200"/>
      <rect x="70" y="30" width="18" height="13" rx="4" fill="#FF6200"/>
      <rect x="36" y="33" width="10" height="7"  rx="2" fill="#FFD700"/>
      <rect x="74" y="33" width="10" height="7"  rx="2" fill="#FFD700"/>
      <rect x="38" y="50" width="44" height="7"  rx="3.5" fill="#1a0030" opacity="0.55"/>
    </svg>
  );
}
function DragonSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="40%" cy="30%">
        <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </radialGradient></defs>
      <ellipse cx="60" cy="82" rx="30" ry="34" fill={`url(#rg-${uid})`}/>
      <ellipse cx="60" cy="46" rx="32" ry="30" fill={`url(#rg-${uid})`}/>
      <polygon points="42,24 35,4 50,20"  fill={c2}/>
      <polygon points="78,24 85,4 70,20"  fill={c2}/>
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
function NoteFairySVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="40%" cy="35%">
        <stop offset="0%" stopColor={c1}/><stop offset="60%" stopColor={c2}/>
      </radialGradient></defs>
      <ellipse cx="28" cy="52" rx="24" ry="15" fill={c1} opacity="0.32" transform="rotate(-25,28,52)"/>
      <ellipse cx="92" cy="52" rx="24" ry="15" fill={c1} opacity="0.32" transform="rotate(25,92,52)"/>
      <ellipse cx="50" cy="78" rx="17" ry="14" fill={`url(#rg-${uid})`}/>
      <rect x="61" y="38" width="8" height="46" rx="4" fill={`url(#rg-${uid})`}/>
      <ellipse cx="69" cy="75" rx="14" ry="11" fill={`url(#rg-${uid})`}/>
      <circle cx="45" cy="75" r="4" fill="#4a0060"/>
      <circle cx="55" cy="75" r="4" fill="#4a0060"/>
      <circle cx="46.5" cy="73" r="1.5" fill="white"/>
      <circle cx="56.5" cy="73" r="1.5" fill="white"/>
      <path d="M43,82 Q50,88 57,82" stroke="#4a0060" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function StarFairySVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="50%" cy="35%">
        <stop offset="0%" stopColor="white" stopOpacity="0.8"/>
        <stop offset="35%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </radialGradient></defs>
      <polygon points="60,8 71,42 106,42 80,63 90,97 60,76 30,97 40,63 14,42 49,42"
        fill={`url(#rg-${uid})`} stroke={c2} strokeWidth="1.5"/>
      <circle cx="52" cy="54" r="4.5" fill="#3d004d"/>
      <circle cx="68" cy="54" r="4.5" fill="#3d004d"/>
      <circle cx="53.5" cy="52" r="1.8" fill="white"/>
      <circle cx="69.5" cy="52" r="1.8" fill="white"/>
      <path d="M52,64 Q60,70 68,64" stroke="#3d004d" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
function MoonKittySVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="42%" cy="38%">
        <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </radialGradient></defs>
      <ellipse cx="60" cy="68" rx="32" ry="28" fill={`url(#rg-${uid})`}/>
      <ellipse cx="60" cy="48" rx="28" ry="26" fill={`url(#rg-${uid})`}/>
      <polygon points="36,34 28,10 48,28" fill={c1}/>
      <polygon points="84,34 92,10 72,28" fill={c1}/>
      <ellipse cx="47" cy="46" rx="8" ry="9" fill="white"/>
      <ellipse cx="73" cy="46" rx="8" ry="9" fill="white"/>
      <ellipse cx="48" cy="47" rx="4" ry="5.5" fill="#2d004d"/>
      <ellipse cx="74" cy="47" rx="4" ry="5.5" fill="#2d004d"/>
      <circle cx="47" cy="44" r="1.8" fill="white"/>
      <circle cx="73" cy="44" r="1.8" fill="white"/>
      <ellipse cx="60" cy="58" rx="5" ry="3.5" fill="#FFB7C5"/>
      <path d="M48,64 Q60,72 72,64" stroke="#2d004d" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <line x1="38" y1="58" x2="20" y2="54" stroke={c2} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="38" y1="62" x2="20" y2="62" stroke={c2} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="82" y1="58" x2="100" y2="54" stroke={c2} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="82" y1="62" x2="100" y2="62" stroke={c2} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function WandWitchSVG({ c1, c2, uid }: { c1:string; c2:string; uid:string }) {
  return (
    <svg viewBox="0 0 120 120" width="76" height="76" overflow="visible">
      <defs><radialGradient id={`rg-${uid}`} cx="45%" cy="35%">
        <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
      </radialGradient></defs>
      <ellipse cx="60" cy="70" rx="28" ry="36" fill={`url(#rg-${uid})`}/>
      <ellipse cx="60" cy="44" rx="24" ry="22" fill={`url(#rg-${uid})`}/>
      <path d="M36,36 Q28,8 60,6 Q92,8 84,36" fill={c2} opacity="0.85"/>
      <ellipse cx="50" cy="44" rx="8" ry="8.5" fill="white"/>
      <ellipse cx="70" cy="44" rx="8" ry="8.5" fill="white"/>
      <circle cx="51" cy="45" r="5" fill="#2d004d"/>
      <circle cx="71" cy="45" r="5" fill="#2d004d"/>
      <circle cx="50" cy="42" r="2" fill="white"/>
      <circle cx="70" cy="42" r="2" fill="white"/>
      <path d="M50,57 Q60,65 70,57" stroke="#2d004d" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <line x1="90" y1="88" x2="108" y2="22" stroke={c2} strokeWidth="3" strokeLinecap="round"/>
      <polygon points="108,22 102,30 114,30" fill="#FFD700"/>
      <circle cx="108" cy="18" r="5" fill="#FFD700"/>
      <circle cx="108" cy="18" r="2.5" fill="white" opacity="0.8"/>
    </svg>
  );
}

function CreatureSVG({ id, isPrincess, from, to }: { id:number; isPrincess:boolean; from:string; to:string }) {
  const uid = `bs${id}`;
  if (isPrincess) {
    const C = id%4===0 ? NoteFairySVG : id%4===1 ? StarFairySVG : id%4===2 ? MoonKittySVG : WandWitchSVG;
    return <C c1={from} c2={to} uid={uid}/>;
  }
  const C = id%4===0 ? SlimeSVG : id%4===1 ? BatSVG : id%4===2 ? GolemSVG : DragonSVG;
  return <C c1={from} c2={to} uid={uid}/>;
}

// ─── Background (mirrors student page) ────────────────────────────────────────
function BackgroundLayer({ isPrincess }: { isPrincess: boolean }) {
  if (!isPrincess) {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <svg width="300" height="260" style={{ position:'absolute', top:-50, right:-70, opacity:0.14 }} aria-hidden>
          <path d="M250,45 Q275,115 230,170 Q195,210 138,188 Q72,165 95,98 Q118,35 185,16 Q228,5 250,45Z" fill="#FF6B00"/>
          <circle cx="208" cy="58" r="28" fill="#FF9F0A" opacity="0.7"/>
          <circle cx="270" cy="130" r="16" fill="#FF6B00" opacity="0.55"/>
        </svg>
        <svg width="280" height="320" style={{ position:'absolute', bottom:-70, left:-55, opacity:0.14 }} aria-hidden>
          <path d="M42,205 Q18,142 62,80 Q92,28 155,50 Q218,72 206,145 Q194,218 142,248 Q88,272 42,205Z" fill="#7B00FF"/>
          <circle cx="82" cy="248" r="32" fill="#5500CC" opacity="0.65"/>
          <circle cx="18" cy="162" r="20" fill="#9B00FF" opacity="0.55"/>
        </svg>
        {[
          { top:'22%', left:'12%', s:10, c:'#FF6B00' },
          { top:'38%', right:'8%', s:7,  c:'#7B00FF' },
          { top:'55%', left:'5%', s:13,  c:'#FF9F0A' },
          { bottom:'28%', right:'13%', s:9, c:'#7B00FF' },
        ].map((d,i) => (
          <div key={i} style={{ position:'absolute', ...d, width:d.s, height:d.s, borderRadius:'50%', background:d.c, opacity:0.16 }}/>
        ))}
      </div>
    );
  }
  const stars = [
    { left:'7%',  top:'10%', sz:15, d:'0s',    c:'#FFD700' },
    { left:'88%', top:'7%',  sz:19, d:'0.6s',  c:'#C77DFF' },
    { left:'4%',  top:'44%', sz:10, d:'1.1s',  c:'#87CEEB' },
    { left:'92%', top:'36%', sz:12, d:'0.3s',  c:'#FFB7C5' },
    { left:'14%', top:'70%', sz:8,  d:'1.6s',  c:'#FFD700' },
    { left:'80%', top:'66%', sz:16, d:'0.9s',  c:'#C77DFF' },
    { left:'50%', top:'4%',  sz:12, d:'0.45s', c:'#87CEEB' },
    { left:'24%', top:'88%', sz:10, d:'1.25s', c:'#FFB7C5' },
    { left:'74%', top:'83%', sz:8,  d:'0.75s', c:'#FFD700' },
  ];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {stars.map((s,i) => (
        <div key={i} style={{ position:'absolute', left:s.left, top:s.top, fontSize:s.sz, color:s.c, lineHeight:1, animation:`twinkle 2.6s ${s.d} ease-in-out infinite` }}>✦</div>
      ))}
      <div style={{ position:'absolute', top:'-12%', right:'-12%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(199,125,255,0.12) 0%, transparent 70%)' }}/>
      <div style={{ position:'absolute', bottom:'-12%', left:'-12%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(135,206,235,0.1) 0%, transparent 70%)' }}/>
    </div>
  );
}

// ─── Locked silhouette (magical ?) ────────────────────────────────────────────
function LockedSilhouette({ id, isPrincess, from, to }: { id:number; isPrincess:boolean; from:string; to:string }) {
  const glowColor = isPrincess ? 'rgba(199,125,255,0.7)' : 'rgba(255,107,0,0.6)';
  const qColor    = isPrincess ? 'rgba(199,125,255,0.65)' : 'rgba(255,160,0,0.6)';
  return (
    <div className="relative flex items-center justify-center" style={{ width:80, height:80 }}>
      {/* Silhouette */}
      <div style={{ filter:'grayscale(1) brightness(0.12) blur(0.4px)', opacity:0.65 }}>
        <CreatureSVG id={id} isPrincess={isPrincess} from={from} to={to}/>
      </div>
      {/* Shimmer over silhouette */}
      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
        <div className="absolute inset-y-0 w-1/3 skew-x-12 animate-shimmer"
          style={{ background: isPrincess ? 'rgba(199,125,255,0.18)' : 'rgba(255,160,0,0.15)' }}/>
      </div>
      {/* "?" with glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-black text-3xl select-none"
          style={{ color: qColor, textShadow:`0 0 18px ${glowColor}`, animation:'twinkle 2.5s ease-in-out infinite' }}>
          ？
        </span>
      </div>
      {/* Corner sparkles */}
      {[
        { top:-7, left:-5,  c:'#FFD700', d:'0s'   },
        { top:-7, right:-5, c: isPrincess?'#C77DFF':'#FF9F0A', d:'0.5s' },
        { bottom:-6, left:-4, c:'#87CEEB', d:'1s' },
        { bottom:-6, right:-4, c: isPrincess?'#FFB7C5':'#FF6B00', d:'0.7s' },
      ].map((s,i) => (
        <span key={i} className="absolute text-[10px] select-none pointer-events-none"
          style={{ ...s, color:s.c, opacity:0.7, animation:`twinkle ${1.8+i*0.35}s ${s.d} ease-in-out infinite` }}>
          ✦
        </span>
      ))}
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────
function LoadingSpinner({ isPrincess }: { isPrincess: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="animate-spin" style={{ fontSize:42, lineHeight:1 }}>
        {isPrincess ? '✨' : '⭐'}
      </div>
      <p className="text-sm font-bold" style={{ color: isPrincess ? '#C77DFF' : '#FF9F0A' }}>
        {isPrincess ? '魔法をかけています…' : '図鑑を読み込み中…'}
      </p>
    </div>
  );
}

// ─── Creature card ────────────────────────────────────────────────────────────
function CreatureCard({ m, idx, defeated, isCurrent, isLocked, isPrincess }: {
  m: { id:number; name:string; sub:string; from:string; to:string; baseHp:number };
  idx: number; defeated: boolean; isCurrent: boolean; isLocked: boolean; isPrincess: boolean;
}) {
  const imgBg = isLocked
    ? isPrincess
      ? 'rgba(180,150,210,0.06)'
      : 'rgba(10,6,30,0.55)'
    : isPrincess
      ? `linear-gradient(160deg, ${m.from}30 0%, ${m.to}50 100%)`
      : `linear-gradient(160deg, rgba(10,6,30,0.97) 0%, rgba(18,10,48,0.97) 100%)`;

  const cardBorder = isLocked
    ? isPrincess ? '1px solid rgba(199,125,255,0.12)' : '1px solid rgba(255,107,0,0.1)'
    : isPrincess ? `1px solid ${m.from}55` : `1px solid ${m.from}45`;

  const cardShadow = isLocked ? 'none'
    : isCurrent
      ? isPrincess ? `0 0 24px ${m.from}50, 0 4px 16px rgba(0,0,0,0.12)` : `0 0 24px ${m.from}45, 0 4px 16px rgba(0,0,0,0.4)`
      : isPrincess ? `0 4px 20px ${m.from}25, 0 2px 8px rgba(0,0,0,0.08)` : `0 4px 20px ${m.from}22, 0 2px 8px rgba(0,0,0,0.35)`;

  const infoBg = isLocked
    ? isPrincess ? 'rgba(255,255,255,0.55)' : 'rgba(10,6,30,0.75)'
    : isPrincess ? 'rgba(255,255,255,0.88)' : 'rgba(8,6,22,0.96)';

  const nameColor  = isLocked ? (isPrincess ? '#B0A0C0' : 'rgba(255,255,255,0.25)') : (isPrincess ? '#3d004d' : 'white');
  const subColor   = isLocked ? (isPrincess ? '#C0B0D0' : 'rgba(255,255,255,0.15)') : (isPrincess ? '#7B1FA2' : 'rgba(255,255,255,0.55)');
  const hpColor    = isLocked ? (isPrincess ? '#C0B0D0' : 'rgba(255,160,0,0.25)')   : (isPrincess ? '#AB47BC' : '#FF9F0A');

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ border: cardBorder, boxShadow: cardShadow,
        animation: isCurrent ? 'glow-pulse 2.4s ease-in-out infinite' : undefined }}>

      {/* Image area */}
      <div className="relative flex flex-col items-center pt-5 pb-2 px-2"
        style={{ background: imgBg, backdropFilter: isPrincess ? 'blur(12px)' : undefined }}>

        {/* Status badge */}
        {defeated && (
          <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={isPrincess
              ? { background:'rgba(255,183,197,0.5)', color:'#C2185B', border:'1px solid rgba(255,107,157,0.4)' }
              : { background:'rgba(255,107,0,0.2)', color:'#FF9F0A', border:'1px solid rgba(255,107,0,0.4)' }}>
            {isPrincess ? 'なかよし ✓' : '撃破済み ✓'}
          </span>
        )}
        {isCurrent && (
          <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
            style={isPrincess
              ? { background:'rgba(199,125,255,0.35)', color:'#7B1FA2', border:'1px solid rgba(199,125,255,0.5)' }
              : { background:'rgba(255,107,0,0.25)', color:'#FFD700', border:'1px solid rgba(255,180,0,0.5)' }}>
            {isPrincess ? '出会い中 🌸' : '出現中 ⚔️'}
          </span>
        )}

        {/* Creature or locked silhouette */}
        <div style={{
          filter: (!isLocked && (defeated || isCurrent))
            ? `drop-shadow(0 0 ${isPrincess ? 14 : 12}px ${m.from})`
            : undefined,
        }}>
          {isLocked
            ? <LockedSilhouette id={m.id} isPrincess={isPrincess} from={m.from} to={m.to}/>
            : <CreatureSVG id={m.id} isPrincess={isPrincess} from={m.from} to={m.to}/>
          }
        </div>

        {/* No. label */}
        <span className="text-[9px] font-bold mt-1 mb-0.5"
          style={{ color: isLocked ? 'rgba(128,100,160,0.4)' : isPrincess ? `${m.from}dd` : `${m.from}aa` }}>
          No.{String(m.id+1).padStart(2,'0')}
        </span>

        {/* Princess corner sparkles (defeated only) */}
        {isPrincess && !isLocked && [
          { top:4, left:6,   c:'#FFD700', d:'0s'   },
          { top:4, right:6,  c:'#C77DFF', d:'0.4s' },
          { bottom:22, left:5,  c:'#87CEEB', d:'0.8s' },
          { bottom:22, right:5, c:'#FFB7C5', d:'0.6s' },
        ].map((s,i) => (
          <span key={i} className="absolute text-[9px] select-none pointer-events-none"
            style={{ ...s, color:s.c, animation:`twinkle 2.2s ${s.d} ease-in-out infinite` }}>✦</span>
        ))}
      </div>

      {/* Info panel */}
      <div className="px-2.5 py-2" style={{ background: infoBg }}>
        <p className="font-black text-[13px] leading-tight truncate" style={{ color: nameColor }}>
          {isLocked ? '???' : m.name}
        </p>
        <p className="text-[10px] mt-0.5 leading-snug line-clamp-2" style={{ color: subColor }}>
          {isLocked
            ? (isPrincess ? 'なかよしになると教えてくれるよ' : '倒すと情報が解放されます')
            : m.sub}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-bold" style={{ color: hpColor }}>
            {isLocked ? '???HP' : `${m.baseHp}HP〜`}
          </span>
          {!isLocked && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={isPrincess
                ? { background:`${m.from}20`, color: m.from, border:`1px solid ${m.from}40` }
                : { background:`${m.from}18`, color: m.from, border:`1px solid ${m.from}35` }}>
              {isPrincess ? `${idx+1}体目` : `#${idx+1}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BestiaryPage() {
  const [ms,         setMs]         = useState<MonsterState | null>(null);
  const [mounted,    setMounted]    = useState(false);
  const [isPrincess, setIsPrincess] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMs(loadMS());
    const p = getProfile();
    setIsPrincess(p?.type === 'princess');
  }, []);

  const theme       = getTheme(isPrincess ? 'princess' : 'knight');
  const creatures   = isPrincess ? COMPANIONS : MONSTERS;
  const defeatedIds = ms?.defeatedIds ?? [];
  const currentIdx  = ms?.monsterIndex ?? 0;
  const level       = calcLevel(ms?.totalXp ?? 0);
  const title       = getTitle(level);
  const pct         = defeatedIds.length / creatures.length;

  return (
    <div className="min-h-screen relative"
      style={{ background: isPrincess
        ? 'linear-gradient(180deg, #FFF0FF 0%, #F5E8FF 100%)'
        : 'linear-gradient(180deg, #080c18 0%, #0a0e20 100%)' }}>

      <BackgroundLayer isPrincess={isPrincess}/>

      {/* Header */}
      <header className="sticky z-20"
        style={{
          top: 'env(safe-area-inset-top)',
          background: isPrincess ? 'rgba(255,240,255,0.92)' : 'rgba(8,12,28,0.95)',
          backdropFilter: 'blur(24px)',
          borderBottom: isPrincess ? '1px solid rgba(255,100,180,0.25)' : '1px solid rgba(255,180,0,0.18)',
        }}>
        <div className="px-4 py-3">
          <h1 className="text-2xl font-black leading-tight"
            style={isPrincess ? {
              background: 'linear-gradient(90deg,#FF6B9D,#C77DFF,#87CEEB)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            } : {
              color: 'white',
              textShadow: '0 0 20px rgba(255,107,0,0.7)',
            }}>
            {theme.encyclopediaTitle}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm">{title.icon}</span>
            <p className="text-[11px] font-bold" style={{ color: title.color }}>{title.title}</p>
            <span style={{ color: isPrincess ? 'rgba(199,125,255,0.4)' : 'rgba(255,255,255,0.2)' }}>·</span>
            <p className="text-[11px]" style={{ color: isPrincess ? '#AB47BC' : 'rgba(255,255,255,0.45)' }}>
              {isPrincess ? 'なかよし' : '登録'} {defeatedIds.length} / {creatures.length} 体
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>

        {/* Progress card */}
        {mounted && (
          <div className="rounded-2xl px-4 py-3 mb-4 overflow-hidden relative"
            style={isPrincess ? {
              background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(220,180,255,0.14))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,215,0,0.3)',
              boxShadow: '0 4px 20px rgba(199,125,255,0.15)',
            } : {
              background: 'rgba(10,6,30,0.95)',
              border: '1px solid rgba(255,107,0,0.25)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>

            {/* Shimmer */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute inset-y-0 w-1/4 skew-x-12 animate-shimmer"
                style={{ background: isPrincess ? 'rgba(255,255,255,0.12)' : 'rgba(255,107,0,0.06)' }}/>
            </div>

            <div className="relative flex justify-between items-center mb-2">
              <span className="text-xs font-black tracking-wide"
                style={{ color: isPrincess ? '#AB47BC' : 'rgba(255,200,100,0.8)' }}>
                {isPrincess ? '✦ なかまの図鑑 ✦' : '⚔ BATTLE RECORDS'}
              </span>
              <span className="text-xs font-black"
                style={{ color: isPrincess ? '#FF6B9D' : '#FF9F0A' }}>
                {defeatedIds.length} / {creatures.length}
              </span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden"
              style={{ background: isPrincess ? 'rgba(220,180,255,0.25)' : 'rgba(0,0,0,0.5)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct * 100}%`,
                  background: isPrincess
                    ? 'linear-gradient(90deg,#FF6B9D,#C77DFF,#87CEEB)'
                    : 'linear-gradient(90deg,#FF6B00,#FFD700)',
                  boxShadow: isPrincess ? '0 0 10px rgba(199,125,255,0.6)' : '0 0 10px rgba(255,160,0,0.6)',
                }}/>
            </div>
            {pct === 1 && (
              <p className="text-center text-xs font-black mt-2"
                style={{ color: isPrincess ? '#FF6B9D' : '#FFD700' }}>
                {isPrincess ? '🌸 全員となかよしになった！' : '🏆 全モンスター制覇！'}
              </p>
            )}
          </div>
        )}

        {/* Grid */}
        {!mounted ? (
          <LoadingSpinner isPrincess={isPrincess}/>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {creatures.map((m, i) => {
              const defeated  = defeatedIds.includes(m.id);
              const isCurrent = i === currentIdx % creatures.length && !defeated;
              const isLocked  = !defeated && !isCurrent;
              return (
                <CreatureCard
                  key={m.id}
                  m={m}
                  idx={i}
                  defeated={defeated}
                  isCurrent={isCurrent}
                  isLocked={isLocked}
                  isPrincess={isPrincess}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
