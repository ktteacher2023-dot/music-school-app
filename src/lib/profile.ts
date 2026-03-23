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
  password?: string;     // 生徒用パスワード（保護者が管理）
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

  // id は Supabase 側で gen_random_uuid() により自動生成されるため送らない
  const payload: Record<string, string | null> = {
    nickname:   p.nickname,
    birthday:   p.birthday,
    type:       p.type,
    teacher_id: p.teacher_id ?? null,
    avatar_url: p.avatar_url ?? null,
    password:   p.password   ?? null,
  };

  const { error } = await supabase.from('profiles').insert(payload);

  if (!error) return null; // 成功

  // エラー詳細をコンソールに出力（原因特定用）
  console.error('[supabase] profile INSERT failed', {
    code: error.code, message: error.message,
    details: error.details, hint: error.hint,
  });

  const toErrStr = (e: { code: string; message: string; details?: string | null; hint?: string | null }) =>
    [`code: ${e.code}`, `message: ${e.message}`, e.details ? `details: ${e.details}` : '', e.hint ? `hint: ${e.hint}` : '']
      .filter(Boolean).join(' | ');

  // teacher_id カラムが存在しない場合 (code=42703) → カラムなしで再試行
  if (error.code === '42703') {
    console.warn('[supabase] teacher_id column missing — retrying without it');
    const { error: err2 } = await supabase.from('profiles').insert({
      nickname: p.nickname,
      birthday: p.birthday,
      type:     p.type,
    });
    if (!err2) return null;
    console.error('[supabase] fallback INSERT also failed:', toErrStr(err2));
    return toErrStr(err2);
  }

  return toErrStr(error);
}

/** 生徒のパスワードを Supabase に保存し、localStorage も更新する */
export async function updateStudentPassword(
  nickname: string,
  birthday: string,
  newPassword: string,
): Promise<string | null> {
  patchProfile({ password: newPassword });
  if (!supabase) return null; // ローカルのみ更新して終了
  const { error } = await supabase
    .from('profiles')
    .update({ password: newPassword })
    .match({ nickname, birthday });
  if (error) {
    console.error('[supabase] password update failed', error);
    return `[${error.code}] ${error.message}`;
  }
  return null;
}
