'use client';
import { useState, useEffect } from 'react';
import { MONSTERS, getTitle, calcLevel } from '@/lib/gameData';
import type { MonsterState } from '@/app/student/page';

const MS_KEY = 'monster_state_v2';

function loadMS(): MonsterState | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(MS_KEY) ?? 'null'); } catch { return null; }
}

export default function BestiaryPage() {
  const [ms, setMs] = useState<MonsterState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); setMs(loadMS()); }, []);

  const defeatedIds = ms?.defeatedIds ?? [];
  const currentIdx  = ms?.monsterIndex ?? 0;
  const level       = calcLevel(ms?.totalXp ?? 0);
  const title       = getTitle(level);

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <header className="bg-white/85 backdrop-blur-xl sticky top-0 z-10 border-b border-[#C6C6C8]/60"
        style={{ paddingTop:'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold text-[#1C1C1E]">モンスター図鑑</h1>
          <p className="text-xs mt-0.5" style={{ color: title.color }}>
            {title.icon} {title.title} · 登録 {defeatedIds.length} / {MONSTERS.length} 体
          </p>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6">
        {/* Progress bar */}
        {mounted && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-[#6C6C70]">図鑑の埋まり具合</span>
              <span className="text-xs font-bold text-[#007AFF]">{defeatedIds.length} / {MONSTERS.length}</span>
            </div>
            <div className="h-2.5 bg-[#F2F2F7] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${(defeatedIds.length/MONSTERS.length)*100}%`,
                  background:'linear-gradient(90deg,#34C759,#007AFF)' }}/>
            </div>
            {defeatedIds.length === MONSTERS.length && (
              <p className="text-center text-xs text-[#34C759] font-bold mt-1.5">🎊 全モンスター制覇！</p>
            )}
          </div>
        )}

        {/* Monster grid */}
        <div className="grid grid-cols-2 gap-3">
          {MONSTERS.map((m, i) => {
            const defeated   = defeatedIds.includes(m.id);
            const isCurrent  = i === currentIdx % MONSTERS.length && !defeated;
            const isLocked   = !defeated && !isCurrent;

            return (
              <div key={m.id}
                className={`rounded-2xl overflow-hidden shadow-sm transition-all
                  ${defeated ? '' : 'opacity-70'}`}>
                {/* Card background */}
                <div className="relative flex flex-col items-center py-5 px-2"
                  style={{ background: defeated || isCurrent
                    ? `linear-gradient(160deg,${m.from},${m.to})`
                    : 'linear-gradient(160deg,#CBD5E1,#94A3B8)' }}>

                  {/* Status badge */}
                  {defeated && (
                    <span className="absolute top-2 right-2 bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      撃破済み ✓
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute top-2 right-2 bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                      出現中 ⚔️
                    </span>
                  )}

                  {/* Emoji */}
                  <span className={`text-5xl leading-none ${isLocked ? 'grayscale' : ''}`}>
                    {isLocked ? '❓' : m.emoji}
                  </span>

                  {/* No. badge */}
                  <span className="text-white/60 text-[10px] mt-2">No.{String(m.id+1).padStart(2,'0')}</span>
                </div>

                {/* Info */}
                <div className="bg-white px-3 py-2.5">
                  <p className={`font-bold text-sm ${isLocked ? 'text-[#C7C7CC]' : 'text-[#1C1C1E]'}`}>
                    {isLocked ? '???' : m.name}
                  </p>
                  <p className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${isLocked ? 'text-[#E5E5EA]' : 'text-[#6C6C70]'}`}>
                    {isLocked ? '倒すと情報が解放されます' : m.sub}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] font-semibold ${isLocked ? 'text-[#D1D1D6]' : 'text-[#007AFF]'}`}>
                      {isLocked ? '???HP' : `${m.baseHp}HP〜`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!mounted && (
          <p className="text-center text-[#C7C7CC] text-sm py-8">読み込み中…</p>
        )}
      </div>
    </div>
  );
}
