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
  studentNickname?: string;  // 提出した生徒（Supabase連携・先生画面での表示用）
  videoUrl?: string;         // Supabase Storage の公開URL（永続）
  videoFileName?: string;
  teacherComment?: string;
  teacherCommentAt?: number;
  submittedAt: number;
}
