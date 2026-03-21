import { supabase } from './supabase';

export interface LessonRecord {
  id: string;
  student_nickname: string;
  student_birthday: string;
  teacher_memo: string;
  video_url: string | null;
  recorded_at: string;
}

// ─── Upload video to Storage ───────────────────────────────────────────────────
// Bucket name: lesson-records  (hyphen, NOT underscore)
export async function uploadLessonVideo(
  file: File,
  nickname: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'Supabase未接続（環境変数を確認）' };

  const ext  = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'mp4';
  const ts   = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `lessons/${ts}_${rand}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('lesson-records')            // ← bucket name: lesson-records
    .upload(path, file, { upsert: false, contentType: file.type });

  if (upErr) {
    console.error('[lessonRecords] storage upload:', upErr.message);
    return { url: null, error: `Storage upload失敗: ${upErr.message}` };
  }

  const { data } = supabase.storage
    .from('lesson-records')
    .getPublicUrl(path);

  return { url: data.publicUrl, error: null };
}

// ─── Save record to lesson_records table ──────────────────────────────────────
export async function saveLessonRecord(
  nickname: string,
  birthday: string,
  memo: string,
  videoUrl: string | null,
): Promise<{ record: LessonRecord | null; error: string | null }> {
  if (!supabase) return { record: null, error: 'Supabase未接続（環境変数を確認）' };

  const { data, error } = await supabase
    .from('lesson_records')            // ← table name: lesson_records
    .insert({
      student_nickname: nickname,
      student_birthday: birthday || null,
      teacher_memo:     memo,
      video_url:        videoUrl,
    })
    .select()
    .single();

  if (error) {
    console.error('[lessonRecords] insert:', error.message, error.details, error.hint);
    return { record: null, error: `DB保存失敗: ${error.message}` };
  }

  return { record: data as LessonRecord, error: null };
}

// ─── Fetch all records for a student ──────────────────────────────────────────
export async function fetchLessonRecords(
  nickname: string,
  birthday: string,
): Promise<LessonRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('lesson_records')
    .select('*')
    .eq('student_nickname', nickname)
    .eq('student_birthday', birthday)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('[lessonRecords] fetch:', error.message);
    return [];
  }
  return (data ?? []) as LessonRecord[];
}

// ─── Delete a record + its storage file ───────────────────────────────────────
export async function deleteLessonRecord(
  id: string,
  videoUrl: string | null,
): Promise<void> {
  if (!supabase) return;

  await supabase.from('lesson_records').delete().eq('id', id);

  if (videoUrl) {
    const marker = `/lesson-records/`;
    const idx = videoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = videoUrl.slice(idx + marker.length);
      await supabase.storage.from('lesson-records').remove([path]);
    }
  }
}
