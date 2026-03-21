'use client';
import { useRef, useState } from 'react';

interface Props {
  currentUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  isPrincess: boolean;
  size: number;           // px
  shape?: 'circle' | 'rounded';
  defaultContent?: React.ReactNode;
}

export default function AvatarUploader({
  currentUrl, onUpload, isPrincess, size, shape = 'rounded', defaultContent,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const br = shape === 'circle' ? '50%' : Math.round(size * 0.22) + 'px';

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLoading(true);
    try { await onUpload(file); } finally { setLoading(false); }
  };

  const defaultBg = isPrincess
    ? 'linear-gradient(135deg,rgba(255,183,197,0.7),rgba(199,125,255,0.7))'
    : 'linear-gradient(135deg,#FF6B00,#FF3B30)';

  const frameStyle: React.CSSProperties = isPrincess ? {
    border: '2.5px solid rgba(255,215,0,0.65)',
    boxShadow: '0 0 14px rgba(199,125,255,0.45), 0 0 28px rgba(255,215,0,0.2)',
  } : {
    border: '2.5px solid rgba(255,107,0,0.65)',
    boxShadow: '0 0 14px rgba(255,107,0,0.55), 0 0 0 1.5px rgba(123,0,255,0.28)',
  };

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      style={{
        width: size, height: size, borderRadius: br,
        position: 'relative', cursor: 'pointer', overflow: 'hidden',
        flexShrink: 0, background: defaultBg, ...frameStyle,
      }}>

      {/* Photo or default icon */}
      {currentUrl ? (
        <img src={currentUrl} alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {defaultContent}
        </div>
      )}

      {/* Themed loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3,
        }}>
          <span style={{ fontSize: Math.round(size * 0.3), lineHeight: 1 }}>
            {isPrincess ? '🪄' : '🎨'}
          </span>
          <span style={{
            fontSize: Math.max(7, Math.round(size * 0.12)),
            color: 'white', fontWeight: 900, textAlign: 'center', lineHeight: 1.2,
            padding: '0 3px',
          }}>
            {isPrincess ? '魔法中…' : '塗り中…'}
          </span>
        </div>
      )}

      {/* Camera hint gradient at bottom */}
      {!loading && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: Math.round(size * 0.32),
          background: 'linear-gradient(transparent, rgba(0,0,0,0.58))',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: Math.round(size * 0.05),
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: Math.round(size * 0.2), lineHeight: 1 }}>📷</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}
