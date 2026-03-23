export type CharacterType = 'knight' | 'princess';

export interface BadgeRecord {
  id: string;       // 'daily7' | 'expression'
  awardedAt: number;
}

export interface Profile {
  nickname: string;
  birthday: string; // YYYY-MM-DD
  type: CharacterType;
  createdAt: number;
  badges?: BadgeRecord[];
  avatar_url?: string;
  teacher_name?: string; // 担当講師名（先生がSupabaseから設定）
  teacher_id?: string;   // 担当先生のUUID（招待URLから自動設定）
}

const KEY = 'student_profile_v1';

export function getProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); }
  catch { return null; }
}

export function saveProfile(p: Omit<Profile, 'createdAt'> & { type: CharacterType }): Profile {
  const full: Profile = { ...p, createdAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(full));
  return full;
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
}

/** Merge partial updates into the existing profile (preserves all other fields) */
export function patchProfile(updates: Partial<Profile>): void {
  const p = getProfile();
  if (!p) return;
  localStorage.setItem(KEY, JSON.stringify({ ...p, ...updates }));
}

// ─── Supabase 連携 ─────────────────────────────────────────────────────────────
// profiles テーブル作成 SQL (Supabase SQL Editor で実行):
//
// create table profiles (
//   id         uuid primary key default gen_random_uuid(),
//   nickname   text not null,
//   birthday   date not null,
//   type       text not null default 'knight',
//   created_at timestamptz default now()
// );
// alter table profiles enable row level security;
// create policy "public_all" on profiles for all using (true) with check (true);

import { supabase } from './supabase';

/** Supabase の profiles テーブルにも保存する（失敗しても localStorage は維持）
 *  Returns null on success, error message string on failure. */
export async function saveProfileToSupabase(p: Omit<Profile, 'createdAt'>): Promise<string | null> {
  if (!supabase) return 'Supabase が設定されていません';

  // まず teacher_id を含めて保存を試みる
  const { error } = await supabase.from('profiles').insert({
    nickname:   p.nickname,
    birthday:   p.birthday,
    type:       p.type,
    teacher_id: p.teacher_id ?? null,
  });

  if (!error) return null; // 成功

  // エラー詳細をコンソールに出力（原因特定用）
  console.error(
    '[supabase] profile INSERT failed\n',
    '  code   :', error.code,
    '\n  message:', error.message,
    '\n  details:', error.details,
    '\n  hint   :', error.hint,
  );

  // teacher_id カラムが存在しない場合 (code=42703) → カラムなしで再試行
  if (error.code === '42703') {
    console.warn('[supabase] teacher_id column missing — retrying without it');
    const { error: err2 } = await supabase.from('profiles').insert({
      nickname: p.nickname,
      birthday: p.birthday,
      type:     p.type,
    });
    if (!err2) return null; // フォールバックで成功
    console.error('[supabase] fallback INSERT also failed:', err2.code, err2.message);
    return `[${err2.code}] ${err2.message}`;
  }

  return `[${error.code}] ${error.message}`;
}
