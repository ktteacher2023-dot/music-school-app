'use client';
import { useEffect, useState } from 'react';

type Mode = 'android' | 'ios' | null;

export default function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showIOSDetail, setShowIOSDetail] = useState(false);

  useEffect(() => {
    // スタンドアロン（インストール済み）なら表示しない
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as unknown as { standalone?: boolean }).standalone === true) return;
    // 一度「後で」を選んだらその日は表示しない
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 1000 * 60 * 60 * 24) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS は1秒後に表示（ページ読み込み直後を避ける）
      const t = setTimeout(() => setMode('ios'), 1200);
      return () => clearTimeout(t);
    }

    // Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode('android');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (deferredPrompt as any).userChoice;
    setMode(null);
    setDeferredPrompt(null);
    localStorage.setItem('pwa_prompt_dismissed', String(Date.now()));
  };

  const handleDismiss = () => {
    setMode(null);
    localStorage.setItem('pwa_prompt_dismissed', String(Date.now()));
  };

  if (!mode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        left: '12px',
        right: '12px',
        zIndex: 9999,
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
        boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
        padding: '16px 18px',
        color: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* アイコン */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/icon-512"
          alt="アプリアイコン"
          width={52}
          height={52}
          style={{ borderRadius: '14px', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
        />

        {/* テキスト */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', lineHeight: 1.3 }}>
            アプリをインストール
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.85, lineHeight: 1.4 }}>
            {mode === 'android'
              ? 'ホーム画面に追加すると、すぐに開けるよ！'
              : 'ホーム画面に追加して、アプリとして使おう！'}
          </p>

          {/* iOS 手順の展開 */}
          {mode === 'ios' && showIOSDetail && (
            <div
              style={{
                marginTop: '10px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: 0 }}>① 下の <strong>共有ボタン</strong>（□↑）をタップ</p>
              <p style={{ margin: '2px 0 0' }}>② 「<strong>ホーム画面に追加</strong>」を選ぶ</p>
              <p style={{ margin: '2px 0 0' }}>③ 右上の「<strong>追加</strong>」をタップ</p>
            </div>
          )}

          {/* ボタン類 */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {mode === 'android' ? (
              <button
                onClick={handleInstall}
                style={{
                  flex: 1,
                  background: 'white',
                  color: '#7C3AED',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 0',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                インストール
              </button>
            ) : (
              <button
                onClick={() => setShowIOSDetail((v) => !v)}
                style={{
                  flex: 1,
                  background: 'white',
                  color: '#7C3AED',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 0',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {showIOSDetail ? '閉じる' : '追加方法を見る'}
              </button>
            )}
            <button
              onClick={handleDismiss}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 14px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
