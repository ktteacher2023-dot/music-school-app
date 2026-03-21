import { PracticeRecord } from '@/types';

const KEY = 'music_practice_records';

export function getRecords(): PracticeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record: PracticeRecord): void {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function getRecordsByDate(date: string): PracticeRecord[] {
  return getRecords().filter((r) => r.date === date);
}

export function getAllDatesWithRecords(): string[] {
  return [...new Set(getRecords().map((r) => r.date))];
}
