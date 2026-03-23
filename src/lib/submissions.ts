import { Submission } from '@/types';
import { supabase } from './supabase';

const LOCAL_KEY = 'practice_submissions_v1';

// ─── localStorage（ローカルキャッシュ）────────────────────────────────────────

export function getSubmissions(): Submission[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveSubmission(s: Submission): void {
  const all = getSubmissions();
  all.unshift(s);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

export function updateSubmission(updated: Submission): void {
  const all = getSubmissions().map((s) => (s.id === updated.id ? updated : s));
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

export function deleteSubmission(id: string): void {
  const all = getSubmissions().filter((s) => s.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

// ─── Supabase Storage: 練習動画アップロード ───────────────────────────────────

/** 動画ファイルを Supabase Storage (practice-videos) にアップロードして公開URLを返す */
export async function uploadPracticeVideo(
  file: File,
  nickname: string,
): Promise<string | null> {
  if (!supabase) return null;
  const ext  = file.name.split('.').pop() ?? 'mp4';
  const path = `${nickname}/${Date.now()}.${ext}`;
  try {
    const { data, error } = await supabase.storage
      .from('practice-videos')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) { console.error('[video] upload failed:', error.message); return null; }
    return supabase.storage.from('practice-videos').getPublicUrl(data.path).data.publicUrl;
  } catch (e) {
    console.error('[video] upload error:', e);
    return null;
  }
}

// ─── Supabase DB: 提出データの保存と取得 ─────────────────────────────────────

/** Supabase の submissions テーブルに保存する（失敗してもローカルは維持） */
export async function saveSubmissionToSupabase(s: Submission, teacherId?: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('submissions').insert({
    id:               s.id,
    student_nickname: s.studentNickname ?? '',
    teacher_id:       teacherId         ?? null,
    date:             s.date,
    song_name:        s.songName,
    duration:         s.duration,
    rating:           s.rating,
    video_url:        s.videoUrl      ?? null,
    video_file_name:  s.videoFileName ?? null,
    submitted_at:     new Date(s.submittedAt).toISOString(),
  });
  if (error) console.error('[submissions] insert failed:', error.code, error.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSubmission(row: any): Submission {
  return {
    id:               row.id,
    studentNickname:  row.student_nickname,
    date:             row.date,
    songName:         row.song_name,
    duration:         row.duration,
    rating:           row.rating,
    videoUrl:         row.video_url       ?? undefined,
    videoFileName:    row.video_file_name  ?? undefined,
    teacherComment:   row.teacher_comment  ?? undefined,
    teacherCommentAt: row.teacher_comment_at
      ? new Date(row.teacher_comment_at).getTime() : undefined,
    submittedAt: new Date(row.submitted_at).getTime(),
  };
}

/**
 * 先生の担当生徒の提出一覧を Supabase から取得する
 * ① teacher_id の生徒ニックネームを取得 → ② submissions を IN 絞り込み
 */
export async function getSubmissionsForTeacher(teacherId: string): Promise<Submission[]> {
  if (!supabase) return [];

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('teacher_id', teacherId);
  if (pErr || !profiles?.length) return [];

  const nicknames = (profiles as { nickname: string }[]).map((p) => p.nickname);

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .in('student_nickname', nicknames)
    .order('submitted_at', { ascending: false })
    .limit(200);
  if (error) { console.error('[submissions] fetch failed:', error.code, error.message); return []; }
  return (data ?? []).map(rowToSubmission);
}

/**
 * 生徒ニックネームのリストに対して「最新1件」を取得し、
 * Record<nickname, Submission> の形で返す
 */
export async function getLatestSubmissionPerStudent(
  nicknames: string[],
): Promise<Record<string, Submission>> {
  if (!supabase || !nicknames.length) return {};
  // 各生徒の最新数件を取り、client側でグループ化
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .in('student_nickname', nicknames)
    .order('submitted_at', { ascending: false })
    .limit(nicknames.length * 10);
  if (error) { console.error('[submissions] latest fetch failed:', error.message); return {}; }
  const result: Record<string, Submission> = {};
  for (const row of (data ?? [])) {
    if (!result[row.student_nickname]) {
      result[row.student_nickname] = rowToSubmission(row);
    }
  }
  return result;
}

/** 先生コメントを Supabase に保存する */
export async function saveTeacherCommentToSupabase(
  submissionId: string,
  comment: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('submissions')
    .update({ teacher_comment: comment, teacher_comment_at: new Date().toISOString() })
    .eq('id', submissionId);
  if (error) console.error('[submissions] comment update failed:', error.message);
}
