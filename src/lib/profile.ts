export type CharacterType = 'knight' | 'princess';

export interface Profile {
  nickname: string;
  birthday: string; // YYYY-MM-DD
  type: CharacterType;
  createdAt: number;
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

/** Supabase の profiles テーブルにも保存する（失敗しても localStorage は維持） */
export async function saveProfileToSupabase(p: Omit<Profile, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('profiles').insert({
      nickname: p.nickname,
      birthday: p.birthday,
      type:     p.type,
    });
  } catch (e) {
    console.warn('[supabase] profile save failed:', e);
  }
}
