export interface Profile {
  nickname: string;
  birthday: string; // YYYY-MM-DD
  createdAt: number;
}

const KEY = 'student_profile_v1';

export function getProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); }
  catch { return null; }
}

export function saveProfile(p: Omit<Profile, 'createdAt'>): Profile {
  const full: Profile = { ...p, createdAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(full));
  return full;
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
}

// ─── Supabase 連携（準備済み） ─────────────────────────────────────────────────
// profiles テーブル作成 SQL (Supabase SQL Editor で実行):
//
// create table profiles (
//   id         uuid primary key default gen_random_uuid(),
//   nickname   text not null,
//   birthday   date not null,
//   created_at timestamptz default now()
// );
// alter table profiles enable row level security;
// create policy "public_all" on profiles for all using (true) with check (true);
//
// 使い方（supabase.ts を有効化後）:
// import { supabase } from './supabase';
// export async function saveProfileToSupabase(p: Omit<Profile, 'createdAt'>) {
//   if (!supabase) return;
//   await supabase.from('profiles').insert({ nickname: p.nickname, birthday: p.birthday });
// }
