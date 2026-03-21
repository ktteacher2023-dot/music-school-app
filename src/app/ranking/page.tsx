'use client';
import { useEffect, useState } from 'react';
import { getProfile, type CharacterType } from '@/lib/profile';
import { getTitle, calcLevel } from '@/lib/gameData';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Player {
  id: string;
  nickname: string;
  totalXp: number;
  level: number;
  monstersDefeated: number;
  streak: number;
  isMe: boolean;
  type?: CharacterType;
}

// ─── Demo data (other students in the school) ─────────────────────────────────
const DEMO: Omit<Player, 'isMe'>[] = [
  { id:'d1', nickname:'ゆうき',  totalXp:5800, level:17, monstersDefeated:11, streak:16, type:'knight'   },
  { id:'d2', nickname:'はると',  totalXp:4100, level:13, monstersDefeated:8,  streak:9,  type:'knight'   },
  { id:'d3', nickname:'そうた',  totalXp:3100, level:11, monstersDefeated:6,  streak:6,  type:'knight'   },
  { id:'d4', nickname:'ひまり',  totalXp:2500, level:9,  monstersDefeated:5,  streak:8,  type:'princess' },
  { id:'d5', nickname:'りん',    totalXp:1900, level:7,  monstersDefeated:4,  streak:5,  type:'princess' },
  { id:'d6', nickname:'あおい',  totalXp:1300, level:6,  monstersDefeated:3,  streak:3,  type:'princess' },
  { id:'d7', nickname:'けんと',  totalXp: 850, level:4,  monstersDefeated:2,  streak:2,  type:'knight'   },
  { id:'d8', nickname:'ゆな',    totalXp: 450, level:2,  monstersDefeated:1,  streak:2,  type:'princess' },
  { id:'d9', nickname:'かいと',  totalXp: 180, level:1,  monstersDefeated:0,  streak:1,  type:'knight'   },
];

const RANK_COLOR = ['', '#FFD700', '#C0C0C0', '#CD7F32'];
const KNIGHT_BADGE = ['', '👑', '🥈', '🥉'];
const PRINCESS_BADGE = ['', '👑', '💎', '✨'];

// ─── Rank row (4th and beyond) ─────────────────────────────────────────────────
function RankRow({ rank, player, isPrincess }: { rank: number; player: Player; isPrincess: boolean }) {
  const t = getTitle(player.level);
  const isMe = player.isMe;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
      style={isMe ? (isPrincess ? {
        background: 'linear-gradient(90deg, rgba(255,215,0,0.12), rgba(199,125,255,0.18))',
        border: '1px solid rgba(255,215,0,0.45)',
        boxShadow: '0 0 20px rgba(255,215,0,0.2)',
      } : {
        background: 'linear-gradient(90deg, rgba(255,107,0,0.18), rgba(255,160,0,0.12))',
        border: '1px solid rgba(255,107,0,0.45)',
        boxShadow: '0 0 20px rgba(255,107,0,0.25)',
      }) : (isPrincess ? {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(199,125,255,0.12)',
      } : {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,107,0,0.1)',
      })}>
      {/* Rank number */}
      <div className="w-8 shrink-0 text-center">
        <span className="font-black text-lg tabular-nums"
          style={{ color: isPrincess ? 'rgba(199,125,255,0.6)' : 'rgba(255,160,0,0.7)' }}>
          {rank}
        </span>
      </div>
      {/* Type dot */}
      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-sm"
        style={{
          background: player.type === 'princess'
            ? 'linear-gradient(135deg,#FF6B9D,#C77DFF)'
            : 'linear-gradient(135deg,#FF6B00,#7B00FF)',
          boxShadow: player.type === 'princess'
            ? '0 0 8px rgba(199,125,255,0.5)'
            : '0 0 8px rgba(255,107,0,0.5)',
        }}>
        {player.type === 'princess' ? '🌸' : '⚔️'}
      </div>
      {/* Name + title */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate"
          style={{ color: isMe ? (isPrincess ? '#FFD700' : '#FF9F0A') : 'white' }}>
          {player.nickname}{isMe ? ' ◀ YOU' : ''}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={isPrincess
              ? { background:'rgba(199,125,255,0.15)', color:'#C77DFF' }
              : { background:'rgba(255,107,0,0.15)',  color:'#FF9F0A' }}>
            Lv.{player.level}
          </span>
          <span className="text-[10px]" style={{ color: t.color }}>{t.title}</span>
        </div>
      </div>
      {/* XP */}
      <div className="text-right shrink-0">
        <p className="font-black text-sm tabular-nums"
          style={{ color: isPrincess ? 'rgba(255,215,0,0.8)' : 'rgba(255,160,0,0.8)' }}>
          {player.totalXp.toLocaleString()}
        </p>
        <p className="text-[10px]"
          style={{ color: isPrincess ? 'rgba(199,125,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
          XP
        </p>
      </div>
    </div>
  );
}

// ─── Knight Podium (top 3) ─────────────────────────────────────────────────────
function KnightPodium({ top3 }: { top3: Player[] }) {
  // Display order: 2nd left, 1st center, 3rd right
  const slots   = [top3[1], top3[0], top3[2]].filter(Boolean);
  const ranks   = [2, 1, 3];
  const platH   = [60, 90, 44];  // platform heights
  const widths  = ['30%', '38%', '30%'];

  return (
    <div className="pt-2 pb-0">
      <div className="flex items-end justify-center gap-1.5">
        {slots.map((p, i) => {
          const rank = ranks[i];
          const t = getTitle(p.level);
          const rc = RANK_COLOR[rank];
          const isMe = p.isMe;
          return (
            <div key={p.id} className="flex flex-col items-center" style={{ width: widths[i] }}>
              {/* Info above podium */}
              <div className={`text-center mb-2 px-1 ${isMe ? 'animate-float-bounce' : ''}`}>
                {/* Crown / badge */}
                <div className="text-2xl leading-none mb-1"
                  style={{ filter: rank === 1 ? `drop-shadow(0 0 12px ${rc})` : undefined }}>
                  {KNIGHT_BADGE[rank]}
                </div>
                <p className="font-black text-sm leading-tight truncate w-full"
                  style={{
                    color: isMe ? rc : 'white',
                    textShadow: `0 0 12px ${rc}88, 0 1px 4px rgba(0,0,0,0.8)`,
                  }}>
                  {p.nickname}
                </p>
                {isMe && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background:'rgba(255,107,0,0.3)', color:'#FF9F0A', border:'1px solid rgba(255,107,0,0.5)' }}>
                    YOU
                  </span>
                )}
                <p className="text-[11px] font-bold mt-0.5" style={{ color: rc }}>Lv.{p.level}</p>
                <p className="text-[9px] leading-none mt-0.5" style={{ color:'rgba(255,200,100,0.6)' }}>
                  {t.title}
                </p>
                <p className="text-[9px] font-mono mt-0.5 tabular-nums"
                  style={{ color:'rgba(255,255,255,0.35)' }}>
                  {p.totalXp.toLocaleString()} XP
                </p>
              </div>
              {/* Platform */}
              <div className="w-full rounded-t-xl flex items-center justify-center"
                style={{
                  height: platH[i],
                  background: rank === 1
                    ? 'linear-gradient(180deg, #FFD700 0%, #B8860B 100%)'
                    : rank === 2
                    ? 'linear-gradient(180deg, #E8E8E8 0%, #909090 100%)'
                    : 'linear-gradient(180deg, #D2691E 0%, #8B4513 100%)',
                  boxShadow: `0 -4px 20px ${rc}55, inset 0 2px 0 rgba(255,255,255,0.25)`,
                  border: `1px solid ${rc}40`,
                  borderBottom: 'none',
                }}>
                <span className="font-black text-2xl"
                  style={{ color: rank === 1 ? '#5C3D00' : rank === 2 ? '#3A3A3A' : '#3A1A00' }}>
                  {rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Stage floor */}
      <div className="h-1.5 rounded-b-sm mx-0"
        style={{ background:'linear-gradient(90deg, rgba(255,107,0,0.2), rgba(255,160,0,0.7), rgba(255,107,0,0.2))' }}/>
    </div>
  );
}

// ─── Princess Portrait Gallery (top 3) ────────────────────────────────────────
function PrincessTop3({ top3 }: { top3: Player[] }) {
  const frameColors = [
    'linear-gradient(135deg,#FFD700,#FFA500,#FFD700,#DAA520)',
    'linear-gradient(135deg,#C0C0C0,#E8E8E8,#A0A0A0,#D0D0D0)',
    'linear-gradient(135deg,#CD7F32,#E8A060,#C06820,#E09050)',
  ];
  return (
    <div className="pt-2">
      {/* 1st place — full width portrait */}
      {top3[0] && (() => {
        const p = top3[0];
        const t = getTitle(p.level);
        return (
          <div className="mb-3 mx-4">
            <div className="p-[3px] rounded-3xl" style={{ background: frameColors[0] }}>
              <div className="rounded-[22px] px-5 py-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,0,40,0.95), rgba(40,0,60,0.95))',
                  backdropFilter: 'blur(16px)',
                }}>
                {/* Shimmer */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-y-0 w-1/3 bg-white/5 skew-x-12 animate-shimmer"/>
                </div>
                {/* Corner stars */}
                {[{t:8,l:10},{t:8,r:10},{b:8,l:10},{b:8,r:10}].map((s,i)=>(
                  <span key={i} className="absolute text-sm select-none"
                    style={{ ...s, color:'#FFD700', animation:`twinkle ${1.8+i*0.3}s ${i*0.25}s ease-in-out infinite` }}>
                    ✦
                  </span>
                ))}
                <div className="relative flex items-center gap-4">
                  {/* Medal */}
                  <div className="w-14 h-14 rounded-full shrink-0 flex flex-col items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg,#FFD700,#B8860B)',
                      boxShadow: '0 0 24px rgba(255,215,0,0.6), 0 0 48px rgba(255,215,0,0.2)',
                    }}>
                    <span className="text-2xl leading-none">👑</span>
                    <span className="text-[10px] font-black text-yellow-900">1st</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase"
                      style={{ color:'rgba(255,215,0,0.6)' }}>
                      1st Place ✦ Champion
                    </p>
                    <p className="font-black text-xl leading-tight"
                      style={{
                        background:'linear-gradient(90deg,#FFD700,#FFF0A0,#FFD700)',
                        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                      }}>
                      {p.nickname}{p.isMe ? ' ◀ YOU' : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black" style={{ color:'#FFD700' }}>Lv.{p.level}</span>
                      <span className="text-xs" style={{ color: t.color }}>{t.title}</span>
                    </div>
                  </div>
                  {/* XP */}
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg tabular-nums" style={{ color:'#FFD700' }}>
                      {p.totalXp.toLocaleString()}
                    </p>
                    <p className="text-[10px]" style={{ color:'rgba(255,215,0,0.5)' }}>XP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2nd and 3rd — side by side */}
      <div className="flex gap-2 px-4">
        {[top3[1], top3[2]].map((p, i) => {
          if (!p) return null;
          const rank = i + 2;
          const t = getTitle(p.level);
          const badge = PRINCESS_BADGE[rank];
          return (
            <div key={p.id} className="flex-1">
              <div className="p-[2px] rounded-2xl" style={{ background: frameColors[rank - 1] }}>
                <div className="rounded-[18px] px-3 py-3 text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20,0,40,0.95), rgba(40,0,60,0.95))',
                  }}>
                  <span className="text-xl leading-none">{badge}</span>
                  <p className="font-black text-sm mt-1 truncate"
                    style={{ color: RANK_COLOR[rank], textShadow:`0 0 12px ${RANK_COLOR[rank]}66` }}>
                    {p.nickname}{p.isMe ? ' ◀' : ''}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: RANK_COLOR[rank] }}>Lv.{p.level}</p>
                  <p className="text-[9px]" style={{ color: t.color }}>{t.title}</p>
                  <p className="text-[10px] font-mono tabular-nums mt-0.5"
                    style={{ color:'rgba(255,215,0,0.55)' }}>
                    {p.totalXp.toLocaleString()} XP
                  </p>
                  <span className="absolute top-2 right-2 text-[10px] font-black"
                    style={{ color: RANK_COLOR[rank], opacity:0.6 }}>{rank}位</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RankingPage() {
  const [players,  setPlayers]  = useState<Player[]>([]);
  const [charType, setCharType] = useState<CharacterType>('knight');
  const [mounted,  setMounted]  = useState(false);
  const [myRank,   setMyRank]   = useState(0);

  useEffect(() => {
    const p = getProfile();
    const type = p?.type ?? 'knight';
    setCharType(type);

    let myXp = 0, myMonsters = 0, myStreak = 0;
    try {
      const ms = JSON.parse(localStorage.getItem('monster_state_v2') ?? 'null');
      if (ms) { myXp = ms.totalXp ?? 0; myMonsters = ms.monstersDefeated ?? 0; myStreak = ms.streak ?? 0; }
    } catch { /* noop */ }

    const me: Player = {
      id: 'me',
      nickname: p?.nickname ?? 'あなた',
      totalXp: myXp,
      level: calcLevel(myXp),
      monstersDefeated: myMonsters,
      streak: myStreak,
      isMe: true,
      type,
    };

    const all = [...DEMO.map(d => ({ ...d, isMe: false })), me]
      .sort((a, b) => b.totalXp - a.totalXp);

    setPlayers(all);
    setMyRank(all.findIndex(pl => pl.isMe) + 1);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isPrincess = charType === 'princess';
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="min-h-screen relative"
      style={{
        background: isPrincess ? '#0f0020' : '#080c18',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
      }}>

      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        {isPrincess ? (
          <>
            {[...Array(16)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${6 + i * 5.8}%`,
                top: `${8 + ((i * 41) % 80)}%`,
                fontSize: 8 + (i % 3) * 5,
                color: ['#FFD700','#C77DFF','#87CEEB','#FFB7C5'][i % 4],
                animation: `twinkle ${2.2 + i * 0.28}s ${i * 0.16}s ease-in-out infinite`,
              }}>✦</div>
            ))}
            <div style={{ position:'absolute', top:'-15%', right:'-12%', width:420, height:420, borderRadius:'50%',
              background:'radial-gradient(circle, rgba(199,125,255,0.14) 0%, transparent 65%)' }}/>
            <div style={{ position:'absolute', bottom:'-12%', left:'-10%', width:340, height:340, borderRadius:'50%',
              background:'radial-gradient(circle, rgba(135,206,235,0.10) 0%, transparent 65%)' }}/>
            <div style={{ position:'absolute', top:'45%', right:'-8%', width:240, height:240, borderRadius:'50%',
              background:'radial-gradient(circle, rgba(255,183,197,0.08) 0%, transparent 65%)' }}/>
          </>
        ) : (
          <>
            <svg width="270" height="230" style={{ position:'absolute', top:-35, right:-55, opacity:0.15 }} aria-hidden>
              <path d="M230,38 Q256,106 208,158 Q172,196 125,174 Q66,151 85,92 Q104,33 172,16 Q213,4 230,38Z" fill="#FF6B00"/>
              <circle cx="195" cy="53" r="24" fill="#FF9F0A" opacity="0.65"/>
              <circle cx="248" cy="115" r="14" fill="#FF6B00" opacity="0.5"/>
            </svg>
            <svg width="250" height="290" style={{ position:'absolute', bottom:-55, left:-45, opacity:0.15 }} aria-hidden>
              <path d="M40,190 Q17,132 58,74 Q86,26 142,47 Q202,68 190,136 Q178,202 130,228 Q80,250 40,190Z" fill="#7B00FF"/>
              <circle cx="75" cy="230" r="28" fill="#5500CC" opacity="0.6"/>
              <circle cx="18" cy="152" r="18" fill="#9B00FF" opacity="0.5"/>
            </svg>
            {[
              {top:'22%',left:'8%',s:10,c:'#FF6B00'},{top:'40%',right:'6%',s:8,c:'#7B00FF'},
              {top:'62%',left:'5%',s:14,c:'#FF9F0A'},{bottom:'30%',right:'10%',s:9,c:'#7B00FF'},
            ].map((d,i)=>(
              <div key={i} style={{ position:'absolute',...d,width:d.s,height:d.s,borderRadius:'50%',background:d.c,opacity:0.18 }}/>
            ))}
          </>
        )}
      </div>

      {/* Header */}
      <div className="relative z-10 text-center px-4 pt-safe"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        {isPrincess ? (
          <>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-1"
              style={{ color:'rgba(199,125,255,0.6)' }}>Hall of Magic</p>
            <h1 className="font-black text-2xl mb-0.5"
              style={{
                background:'linear-gradient(90deg,#FFD700 0%,#C77DFF 40%,#87CEEB 70%,#FFD700 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                letterSpacing:'0.05em',
              }}>✦ 魔法の殿堂 ✦</h1>
            <p className="text-xs" style={{ color:'rgba(199,125,255,0.5)' }}>
              あなたの順位: <span style={{ color:'#FFD700', fontWeight:900 }}>{myRank}位</span>
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-0.5"
              style={{ color:'rgba(255,107,0,0.6)' }}>STREET BATTLE</p>
            <h1 className="font-black text-2xl text-white mb-0.5"
              style={{
                textShadow:'0 0 28px rgba(255,107,0,0.7), 0 2px 6px rgba(0,0,0,0.9)',
                letterSpacing:'0.06em',
              }}>
              BATTLE RANKING
            </h1>
            <p className="text-[11px] font-bold"
              style={{ color:'rgba(255,160,0,0.7)' }}>
              ウデマエ順位: <span style={{ color:'#FF9F0A', fontWeight:900 }}>{myRank}位</span>
            </p>
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 mt-4 space-y-4">
        {/* Top 3 */}
        {isPrincess
          ? <PrincessTop3 top3={top3}/>
          : <KnightPodium top3={top3}/>
        }

        {/* Section label */}
        <div className="px-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: isPrincess
              ? 'linear-gradient(90deg, transparent, rgba(199,125,255,0.3))'
              : 'linear-gradient(90deg, transparent, rgba(255,107,0,0.3))' }}/>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase"
              style={{ color: isPrincess ? 'rgba(199,125,255,0.5)' : 'rgba(255,107,0,0.5)' }}>
              {isPrincess ? '✦ 魔法使いたち ✦' : '▸ CHALLENGERS ◂'}
            </span>
            <div className="flex-1 h-px" style={{ background: isPrincess
              ? 'linear-gradient(90deg, rgba(199,125,255,0.3), transparent)'
              : 'linear-gradient(90deg, rgba(255,107,0,0.3), transparent)' }}/>
          </div>
        </div>

        {/* 4th and beyond */}
        <div className="px-4 space-y-2">
          {rest.map((p, i) => (
            <RankRow key={p.id} rank={i + 4} player={p} isPrincess={isPrincess}/>
          ))}
        </div>
      </div>
    </div>
  );
}
