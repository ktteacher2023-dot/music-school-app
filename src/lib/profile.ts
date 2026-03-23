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
  const { error } = await supabase.from('profiles').insert({
    nickname:   p.nickname,
    birthday:   p.birthday,
    type:       p.type,
    teacher_id: p.teacher_id ?? null,
  });
  if (error) {
    console.warn('[supabase] profile save failed:', error.message, error.details);
    return error.message;
  }
  return null;
}
