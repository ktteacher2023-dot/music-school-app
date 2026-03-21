import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[supabase] 環境変数が未設定です。.env.local を確認してください。');
}

export const supabase = url && key ? createClient(url, key) : null;
