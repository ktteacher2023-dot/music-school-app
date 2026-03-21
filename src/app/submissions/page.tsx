'use client';
import { useState, useEffect } from 'react';
import { Submission } from '@/types';
import { getSubmissions } from '@/lib/submissions';
import StarRating from '@/components/StarRating';

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function dateJP(s: string) {
  const d = new Date(s+'T00:00:00');
  return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
}

export default function SubmissionsPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSubs(getSubmissions());
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <header className="bg-white/85 backdrop-blur-xl sticky top-0 z-10 border-b border-[#C6C6C8]/60"
        style={{ paddingTop:'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold text-[#1C1C1E]">提出履歴</h1>
          <p className="text-xs text-[#6C6C70]">練習記録と先生からのフィードバック</p>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {!mounted ? null : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[#1C1C1E] font-semibold">まだ提出記録がありません</p>
              <p className="text-[#6C6C70] text-sm mt-1">練習画面から攻撃すると記録されます</p>
            </div>
          </div>
        ) : (
          subs.map((sub) => (
            <SubmissionCard key={sub.id} sub={sub} />
          ))
        )}
      </div>
    </div>
  );
}

function SubmissionCard({ sub }: { sub: Submission }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#F2F2F7] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3" fill="#007AFF" stroke="none"/>
            <circle cx="18" cy="16" r="3" fill="#007AFF" stroke="none"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1C1C1E] truncate">{sub.songName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#6C6C70]">{sub.duration}分</span>
            <span className="text-[#C6C6C8]">·</span>
            <span className="text-xs text-[#6C6C70]">{dateJP(sub.date)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarRating value={sub.rating} readonly size="sm" />
          {sub.videoFileName && (
            <span className="text-[10px] text-[#34C759] font-semibold flex items-center gap-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              動画あり
            </span>
          )}
        </div>
        <svg width="9" height="6" viewBox="0 0 9 6" fill="none" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1l3.5 4L8 1"/>
        </svg>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-[#F2F2F7]">
          {/* Video player */}
          {sub.videoUrl && (
            <div className="px-4 pt-3">
              <video
                src={sub.videoUrl}
                controls playsInline preload="metadata"
                className="w-full rounded-xl bg-black max-h-56 object-contain"
              />
              <p className="text-[11px] text-[#8E8E93] mt-1 text-center">
                {sub.videoFileName}
              </p>
            </div>
          )}
          {sub.videoFileName && !sub.videoUrl && (
            <div className="mx-4 mt-3 bg-[#F2F2F7] rounded-xl px-3 py-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              <p className="text-xs text-[#8E8E93]">動画はページ再読み込み後は再生できません（Supabase連携で永続化できます）</p>
            </div>
          )}

          {/* Teacher comment */}
          <div className="px-4 py-3 space-y-2">
            {sub.teacherComment ? (
              <>
                <p className="text-xs font-semibold text-[#6C6C70]">先生からのフィードバック</p>
                {/* Teacher bubble */}
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
              </>
            ) : (
              <div className="flex items-center gap-2 py-1">
                <div className="w-2 h-2 rounded-full bg-[#C7C7CC] animate-pulse" />
                <p className="text-xs text-[#8E8E93]">先生からのフィードバックを待っています…</p>
              </div>
            )}
          </div>

          {/* Submitted time */}
          <div className="px-4 pb-3">
            <p className="text-[10px] text-[#C7C7CC]">提出日時: {fmtDate(sub.submittedAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
