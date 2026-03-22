'use client';
import { useState, useEffect } from 'react';
import { PracticeRecord } from '@/types';
import { getRecords, saveRecord, deleteRecord } from '@/lib/storage';
import PracticeCard from '@/components/PracticeCard';
import PracticeForm from '@/components/PracticeForm';

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatMonthJP(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

function formatDayLabel(ds: string): string {
  const d = new Date(ds + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecords(getRecords());
  }, []);

  const reload = () => setRecords(getRecords());

  const handleDelete = (id: string) => {
    deleteRecord(id);
    reload();
  };

  const handleSave = (data: { songName: string; duration: number; rating: number }) => {
    if (!selectedDate) return;
    const record: PracticeRecord = {
      id: crypto.randomUUID(),
      date: selectedDate,
      ...data,
      createdAt: Date.now(),
    };
    saveRecord(record);
    reload();
    setShowForm(false);
  };

  const recordsByDate = records.reduce<Record<string, PracticeRecord[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const todayStr = dateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const selectedRecords = selectedDate ? (recordsByDate[selectedDate] ?? []) : [];

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Header */}
      <header
        className="bg-white/80 backdrop-blur-xl sticky z-10 border-b border-[#C6C6C8]/60"
        style={{ top: 'max(20px, env(safe-area-inset-top))' }}
      >
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold text-[#1C1C1E]">カレンダー</h1>
        </div>
      </header>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Calendar card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F2F2F7] transition-colors"
            >
              <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round">
                <path d="M7.5 1.5L1.5 7.5l6 6" />
              </svg>
            </button>
            <span className="font-semibold text-[#1C1C1E] text-base">
              {formatMonthJP(year, month)}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F2F2F7] transition-colors"
            >
              <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1.5 1.5l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="h-px bg-[#F2F2F7]" />

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div
                key={day}
                className={`text-center pb-1 text-xs font-semibold
                  ${i === 0 ? 'text-[#FF3B30]' : i === 6 ? 'text-[#007AFF]' : 'text-[#6C6C70]'}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-2 pb-3">
            {/* Empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = dateStr(year, month, day);
              const hasRecords = mounted && !!recordsByDate[ds]?.length;
              const count = mounted ? (recordsByDate[ds]?.length ?? 0) : 0;
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              const col = (firstDayOfWeek + i) % 7;
              const isSunday = col === 0;
              const isSaturday = col === 6;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : ds)}
                  className="flex flex-col items-center py-1 gap-0.5 active:opacity-60 transition-opacity"
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                      ${isToday
                        ? 'bg-[#007AFF] text-white'
                        : isSelected
                        ? 'bg-[#007AFF]/15 text-[#007AFF] font-semibold'
                        : isSunday
                        ? 'text-[#FF3B30]'
                        : isSaturday
                        ? 'text-[#007AFF]'
                        : 'text-[#1C1C1E]'
                      }`}
                  >
                    {day}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors
                      ${hasRecords
                        ? isSelected ? 'bg-[#007AFF]' : 'bg-[#34C759]'
                        : 'bg-transparent'
                      }`}
                  />
                  {count > 1 && (
                    <span className="text-[9px] text-[#6C6C70] leading-none -mt-0.5">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date detail */}
        {selectedDate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-[#6C6C70]">
                {formatDayLabel(selectedDate)}の練習
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-[#007AFF] text-sm font-semibold active:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                追加
              </button>
            </div>

            {selectedRecords.length === 0 ? (
              <div className="bg-white rounded-2xl px-4 py-8 text-center">
                <p className="text-[#6C6C70] text-sm">この日の練習記録はありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRecords.map((record) => (
                  <PracticeCard key={record.id} record={record} onDelete={handleDelete} />
                ))}
                {/* Summary */}
                <div className="bg-white rounded-2xl px-4 py-3 flex justify-between">
                  <span className="text-[#6C6C70] text-sm">合計練習時間</span>
                  <span className="text-[#007AFF] font-semibold text-sm">
                    {selectedRecords.reduce((s, r) => s + r.duration, 0)}分
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && selectedDate && (
        <PracticeForm
          date={selectedDate}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
