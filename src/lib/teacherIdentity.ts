const KEY = 'teacher_uuid';

/** 先生の固有IDをlocalStorageから取得、なければ生成して保存する */
export function getOrCreateTeacherId(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}

export function getTeacherId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}
