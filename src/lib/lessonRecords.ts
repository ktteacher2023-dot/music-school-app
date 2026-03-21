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
// -- Storage bucket (run in SQL or create via Dashboard):
// insert into storage.buckets (id, name, public)
//   values ('lesson-records', 'lesson-records', true)
//   on conflict do nothing;
// create policy "public_all" on storage.objects for all using (bucket_id = 'lesson-records') with check (bucket_id = 'lesson-records');

// ─── Fetch records for a student ──────────────────────────────────────────────
export async function fetchLessonRecords(
  nickname: string,
  birthday: string,
): Promise<LessonRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('lesson_records')
      .select('*')
      .eq('student_nickname', nickname)
      .eq('student_birthday', birthday)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as LessonRecord[];
  } catch (e) {
    console.warn('[lessonRecords] fetch failed:', e);
    return [];
  }
}

// ─── Upload video to Storage, return public URL ────────────────────────────────
export async function uploadLessonVideo(
  file: File,
  nickname: string,
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const ext  = file.name.split('.').pop() ?? 'mp4';
    const path = `${nickname}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('lesson-records')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;

    const { data } = supabase.storage
      .from('lesson-records')
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('[lessonRecords] upload failed:', e);
    return null;
  }
}

// ─── Save a new lesson record ──────────────────────────────────────────────────
export async function saveLessonRecord(
  nickname: string,
  birthday: string,
  memo: string,
  videoUrl: string | null,
): Promise<LessonRecord | null> {
  if (!supabase) return null;
  try {
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
    if (error) throw error;
    return data as LessonRecord;
  } catch (e) {
    console.warn('[lessonRecords] save failed:', e);
    return null;
  }
}

// ─── Delete a lesson record (and its storage file) ────────────────────────────
export async function deleteLessonRecord(
  id: string,
  videoUrl: string | null,
  nickname: string,
): Promise<void> {
  if (!supabase) return;
  try {
    // Remove DB row
    await supabase.from('lesson_records').delete().eq('id', id);
    // Remove storage file if URL is from our bucket
    if (videoUrl) {
      const marker = `/lesson-records/`;
      const idx = videoUrl.indexOf(marker);
      if (idx !== -1) {
        const path = videoUrl.slice(idx + marker.length);
        await supabase.storage.from('lesson-records').remove([path]);
      }
    }
  } catch (e) {
    console.warn('[lessonRecords] delete failed:', e);
  }
  void nickname; // used for path context above
}
