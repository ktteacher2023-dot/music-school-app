import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #FFB3C6 0%, #D4B8FF 55%, #FFE9A0 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* インクしずく */}
        <div
          style={{
            position: 'absolute',
            top: '22px',
            left: '36px',
            width: '14px',
            height: '18px',
            background: '#FF6BA8',
            borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
            transform: 'rotate(-15deg)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            right: '34px',
            width: '12px',
            height: '16px',
            background: '#9B72FF',
            borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
            transform: 'rotate(20deg)',
            display: 'flex',
          }}
        />
        {/* キラキラ */}
        <div
          style={{
            position: 'absolute',
            top: '18px',
            right: '28px',
            fontSize: '22px',
            color: '#FFD700',
            display: 'flex',
          }}
        >
          ✦
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '22px',
            fontSize: '16px',
            color: '#FFFFFF',
            display: 'flex',
          }}
        >
          ✦
        </div>
        {/* 音符 */}
        <div
          style={{
            fontSize: '86px',
            lineHeight: 1,
            color: '#FFFFFF',
            filter: 'drop-shadow(0 4px 10px rgba(155,114,255,0.5))',
            display: 'flex',
          }}
        >
          ♪
        </div>
      </div>
    ),
    { ...size }
  );
}
