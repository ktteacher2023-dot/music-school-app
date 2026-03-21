export interface PracticeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  songName: string;
  duration: number; // minutes
  rating: number; // 1-5
  createdAt: number; // timestamp
}

export interface Submission {
  id: string;
  date: string; // YYYY-MM-DD
  songName: string;
  duration: number;
  rating: number;
  // video: blob URL (session-only) or Supabase Storage URL (future)
  videoUrl?: string;
  videoFileName?: string;
  videoStoragePath?: string; // Supabase Storage path (future)
  teacherComment?: string;
  teacherCommentAt?: number;
  submittedAt: number;
}
