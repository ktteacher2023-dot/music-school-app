import { Submission } from '@/types';

const KEY = 'practice_submissions_v1';

export function getSubmissions(): Submission[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveSubmission(s: Submission): void {
  const all = getSubmissions();
  all.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function updateSubmission(updated: Submission): void {
  const all = getSubmissions().map((s) => (s.id === updated.id ? updated : s));
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteSubmission(id: string): void {
  const all = getSubmissions().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

// ─── Future: swap to Supabase ─────────────────────────────────────────────────
// When NEXT_PUBLIC_SUPABASE_URL is set, replace the functions above with:
//
//   import { supabase } from './supabase';
//
//   export async function getSubmissions() {
//     const { data } = await supabase!.from('submissions').select('*').order('submitted_at', { ascending: false });
//     return data ?? [];
//   }
//   export async function saveSubmission(s: Submission) {
//     await supabase!.from('submissions').insert(s);
//   }
//   export async function updateSubmission(s: Submission) {
//     await supabase!.from('submissions').update(s).eq('id', s.id);
//   }
