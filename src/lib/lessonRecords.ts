import { supabase } from './supabase';

export interface LessonRecord {
  id: string;
  student_nickname: string;
  student_birthday: string; // YYYY-MM-DD
  teacher_memo: string;
  video_url: string | null;
  recorded_at: string; // ISO timestamp
}

// ─── Supabase SQL (run in SQL Editor) ─────────────────────────────────────────
//
// create table lesson_records (
//   id               uuid primary key default gen_random_uuid(),
//   student_nickname text not null,
//   student_birthday date not null,
//   teacher_memo     text default '',
//   video_url        text,
//   recorded_at      timestamptz default now()
// );
// alter table lesson_records enable row level security;
// create policy "public_all" on lesson_records for all using (true) with check (true);
//
// -- Storage bucket: create via Supabase Dashboard > Storage > New bucket
// --   name: lesson-records, Public: ON
// -- Then add policy: allow all (INSERT / SELECT / DELETE) with no restrictions

// ─── Fetch records for a student ──────────────────────────────────────────────
export async function fetchLessonRecords(
  nickname: string,
  birthday: string,
): Promise<LessonRecord[]> {
  if (!supabase) {
    console.error('[lessonRecords] supabase client is null — env vars missing?');
    return [];
  }
  const { data, error } = await supabase
    .from('lesson_records')
    .select('*')
    .eq('student_nickname', nickname)
    .eq('student_birthday', birthday)
    .order('recorded_at', { ascending: false });
  if (error) {
    console.error('[lessonRecords] fetch error:', error.message, error.details);
    return [];
  }
  return (data ?? []) as LessonRecord[];
}

// ─── Upload video to Storage, return public URL ────────────────────────────────
export async function uploadLessonVideo(
  file: File,
  nickname: string,
): Promise<string | null> {
  if (!supabase) {
    console.error('[lessonRecords] supabase client is null — env vars missing?');
    return null;
  }
  const ext  = file.name.split('.').pop() ?? 'mp4';
  const path = `${nickname}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('lesson-records')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) {
    console.error('[lessonRecords] storage upload error:', upErr.message);
    return null;
  }
  const { data } = supabase.storage
    .from('lesson-records')
    .getPublicUrl(path);
  return data.publicUrl;
}

// ─── Save a new lesson record ──────────────────────────────────────────────────
export async function saveLessonRecord(
  nickname: string,
  birthday: string,
  memo: string,
  videoUrl: string | null,
): Promise<LessonRecord | null> {
  if (!supabase) {
    console.error('[lessonRecords] supabase client is null — env vars missing?');
    return null;
  }
  const { data, error } = await supabase
    .from('lesson_records')
    .insert({
      student_nickname: nickname,
      student_birthday: birthday,
      teacher_memo:     memo,
      video_url:        videoUrl,
    })
    .select()
    .single();
  if (error) {
    console.error('[lessonRecords] insert error:', error.message, error.details, error.hint);
    return null;
  }
  return data as LessonRecord;
}

// ─── Delete a lesson record (and its storage file) ────────────────────────────
export async function deleteLessonRecord(
  id: string,
  videoUrl: string | null,
): Promise<void> {
  if (!supabase) return;
  // Remove DB row
  const { error } = await supabase.from('lesson_records').delete().eq('id', id);
  if (error) {
    console.error('[lessonRecords] delete error:', error.message);
  }
  // Remove storage file if URL is from our bucket
  if (videoUrl) {
    const marker = `/lesson-records/`;
    const idx = videoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = videoUrl.slice(idx + marker.length);
      const { error: storErr } = await supabase.storage
        .from('lesson-records')
        .remove([path]);
      if (storErr) console.warn('[lessonRecords] storage remove error:', storErr.message);
    }
  }
}
