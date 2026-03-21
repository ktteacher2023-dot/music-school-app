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
    : 'linear-gradient(135deg,rgba(10,4,24,0.97),rgba(18,8,44,0.97))';

  const frameStyle: React.CSSProperties = isPrincess ? {
    border: '2.5px solid rgba(255,215,0,0.65)',
    boxShadow: '0 0 14px rgba(199,125,255,0.45), 0 0 28px rgba(255,215,0,0.2)',
  } : {
    border: '2.5px solid rgba(255,107,0,0.85)',
    boxShadow: '0 0 20px rgba(255,107,0,0.75), 0 0 40px rgba(255,107,0,0.35), 0 0 0 1.5px rgba(123,0,255,0.5)',
  };

  return (
    /* Knight: outer ink-splat wrapper; princess: simple wrapper */
    <div style={{ position: 'relative', flexShrink: 0, display: 'inline-block' }}>

      {/* Knight: ink splatter SVG rendered outside the clipped frame */}
      {!isPrincess && (
        <svg style={{ position:'absolute', overflow:'visible', pointerEvents:'none', zIndex:0, top:0, left:0 }}
          width={size} height={size} aria-hidden>
          {/* large blobs at corners */}
          <ellipse cx={-4}      cy={-3}      rx={size*0.20} ry={size*0.11} fill="#FF6B00" opacity="0.80" transform={`rotate(-20,${-4},${-3})`}/>
          <ellipse cx={size+3}  cy={-2}      rx={size*0.16} ry={size*0.09} fill="#7B00FF" opacity="0.70" transform={`rotate(16,${size+3},${-2})`}/>
          <ellipse cx={-3}      cy={size+2}  rx={size*0.14} ry={size*0.09} fill="#FF9F0A" opacity="0.68" transform={`rotate(10,${-3},${size+2})`}/>
          <ellipse cx={size+2}  cy={size+1}  rx={size*0.12} ry={size*0.08} fill="#FF3B30" opacity="0.62" transform={`rotate(-8,${size+2},${size+1})`}/>
          {/* small splatter dots */}
          <circle cx={size*0.85} cy={-6}        r={3.5} fill="#FFD700" opacity="0.80"/>
          <circle cx={-7}         cy={size*0.35} r={3}   fill="#FF6B00" opacity="0.72"/>
          <circle cx={size+6}     cy={size*0.65} r={2.5} fill="#7B00FF" opacity="0.65"/>
          <circle cx={size*0.22}  cy={size+6}   r={3}   fill="#FF3B30" opacity="0.68"/>
          <circle cx={size*0.6}   cy={-8}        r={2}   fill="#FF9F0A" opacity="0.60"/>
          <circle cx={size+5}     cy={size*0.2}  r={2}   fill="#FF6B00" opacity="0.55"/>
        </svg>
      )}

      <div
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: br,
          position: 'relative', cursor: 'pointer', overflow: 'hidden',
          zIndex: 1, background: defaultBg, ...frameStyle,
        }}>

        {/* Knight: diagonal concrete texture */}
        {!isPrincess && !currentUrl && (
          <div style={{
            position:'absolute', inset:0, opacity:0.055, pointerEvents:'none',
            backgroundImage:'repeating-linear-gradient(45deg,#FF6B00 0px,#FF6B00 1px,transparent 1px,transparent 10px)',
          }}/>
        )}

        {/* Photo or default icon */}
        {currentUrl ? (
          <img src={currentUrl} alt="avatar"
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {defaultContent}
          </div>
        )}

        {/* Knight: neon corner bracket accents */}
        {!isPrincess && (
          <>
            <div style={{ position:'absolute', top:0, left:0, width:9, height:9, borderTop:'2px solid #FF6B00', borderLeft:'2px solid #FF6B00', boxShadow:'0 0 8px rgba(255,107,0,0.9)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', top:0, right:0, width:9, height:9, borderTop:'2px solid #7B00FF', borderRight:'2px solid #7B00FF', boxShadow:'0 0 8px rgba(123,0,255,0.9)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, width:9, height:9, borderBottom:'2px solid #FF9F0A', borderLeft:'2px solid #FF9F0A', boxShadow:'0 0 8px rgba(255,159,10,0.9)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderBottom:'2px solid #FF3B30', borderRight:'2px solid #FF3B30', boxShadow:'0 0 8px rgba(255,59,48,0.9)', pointerEvents:'none' }}/>
          </>
        )}

        {/* Themed loading overlay */}
        {loading && (
          <div style={{
            position:'absolute', inset:0, background:'rgba(0,0,0,0.78)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
          }}>
            <span style={{ fontSize:Math.round(size*0.3), lineHeight:1 }}>
              {isPrincess ? '🪄' : '🎨'}
            </span>
            <span style={{
              fontSize:Math.max(7,Math.round(size*0.12)),
              color: isPrincess ? 'white' : '#FF9F0A',
              fontWeight:900, textAlign:'center', lineHeight:1.2, padding:'0 3px',
              textShadow: isPrincess ? undefined : '0 0 10px rgba(255,107,0,0.95)',
            }}>
              {isPrincess ? '魔法中…' : '塗り中…'}
            </span>
          </div>
        )}

        {/* Camera hint gradient at bottom */}
        {!loading && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            height:Math.round(size*0.32),
            background: isPrincess
              ? 'linear-gradient(transparent,rgba(60,0,80,0.55))'
              : 'linear-gradient(transparent,rgba(0,0,0,0.78))',
            display:'flex', alignItems:'flex-end', justifyContent:'center',
            paddingBottom:Math.round(size*0.05), pointerEvents:'none',
          }}>
            <span style={{ fontSize:Math.round(size*0.2), lineHeight:1 }}>📷</span>
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" onChange={handleChange}
          style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0 }}/>
      </div>
    </div>
  );
}
