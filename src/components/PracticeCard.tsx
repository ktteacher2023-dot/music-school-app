'use client';
import StarRating from './StarRating';
import { PracticeRecord } from '@/types';

interface Props {
  record: PracticeRecord;
  onDelete?: (id: string) => void;
}

export default function PracticeCard({ record, onDelete }: Props) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" fill="#007AFF" stroke="none" />
          <circle cx="18" cy="16" r="3" fill="#007AFF" stroke="none" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#1C1C1E] font-semibold truncate text-base">{record.songName}</p>
        <p className="text-[#6C6C70] text-sm mt-0.5">{record.duration}分</p>
        <div className="mt-1">
          <StarRating value={record.rating} readonly size="sm" />
        </div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(record.id)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#C7C7CC] active:text-[#FF3B30] active:bg-[#FF3B30]/10 transition-colors ml-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
