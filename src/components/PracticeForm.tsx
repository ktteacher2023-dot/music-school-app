'use client';
import { useState } from 'react';
import StarRating from './StarRating';

interface Props {
  date: string;
  onClose: () => void;
  onSave: (data: { songName: string; duration: number; rating: number }) => void;
}

export default function PracticeForm({ date, onClose, onSave }: Props) {
  const [songName, setSongName] = useState('');
  const [duration, setDuration] = useState('');
  const [rating, setRating] = useState(3);

  const canSubmit = songName.trim().length > 0 && Number(duration) > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({ songName: songName.trim(), duration: Number(duration), rating });
  };

  const formatDateLabel = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${dt.getMonth() + 1}月${dt.getDate()}日（${days[dt.getDay()]}）`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-[#F2F2F7] rounded-t-3xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#C7C7CC]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={onClose}
            className="text-[#007AFF] text-base py-1 px-0 active:opacity-60"
          >
            キャンセル
          </button>
          <div className="text-center">
            <p className="font-semibold text-[#1C1C1E] text-base">練習を記録</p>
            <p className="text-xs text-[#6C6C70]">{formatDateLabel(date)}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`text-base font-semibold py-1 px-0 transition-opacity
              ${canSubmit ? 'text-[#007AFF] active:opacity-60' : 'text-[#C7C7CC]'}`}
          >
            完了
          </button>
        </div>

        <div className="h-px bg-[#C6C6C8]/60 mx-0" />

        {/* Form fields */}
        <div className="px-4 pt-4 pb-4 space-y-3">
          {/* Song name */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-4 py-3">
              <p className="text-xs text-[#6C6C70] mb-1 font-medium">曲名</p>
              <input
                type="text"
                placeholder="例：ハノン No.1"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                autoFocus
                className="w-full text-[#1C1C1E] placeholder-[#C7C7CC] outline-none text-base bg-transparent"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3">
              <div className="flex-1">
                <p className="text-xs text-[#6C6C70] mb-0.5 font-medium">練習時間</p>
                <p className="text-[#1C1C1E] text-base">何分練習しましたか？</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  min="1"
                  max="999"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-14 text-right text-[#007AFF] font-semibold text-xl outline-none bg-transparent"
                />
                <span className="text-[#6C6C70] text-base">分</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-[#6C6C70] mb-0.5 font-medium">自己評価</p>
                <p className="text-[#1C1C1E] text-base">今日の出来は？</p>
              </div>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
