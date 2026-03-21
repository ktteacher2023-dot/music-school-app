import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase client not initialized' }, { status: 500 });
  }

  // テーブル一覧を取得して疎通確認
  const { data, error } = await supabase
    .from('submissions')
    .select('id')
    .limit(1);

  if (error) {
    // テーブルが存在しない場合は PGRST116 エラーになるが、接続自体は成功
    const connected = error.code !== 'NETWORK_ERROR';
    return NextResponse.json({
      ok: connected,
      connected,
      note: connected
        ? 'Supabase に接続できました！テーブルはまだ作成されていません。'
        : '接続失敗',
      error: error.message,
      code: error.code,
    });
  }

  return NextResponse.json({ ok: true, connected: true, rows: data?.length ?? 0 });
}
