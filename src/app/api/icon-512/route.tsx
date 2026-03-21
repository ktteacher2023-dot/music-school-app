import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #7C3AED, #4F46E5)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '114px',
        }}
      >
        {/* Piano keys illustration */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-start' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: '56px',
                height: '210px',
                background: 'white',
                borderRadius: '0 0 16px 16px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                position: 'relative',
                display: 'flex',
              }}
            />
          ))}
        </div>
        {/* Black keys */}
        <div
          style={{
            position: 'absolute',
            top: '140px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'center',
            gap: '0px',
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '36px',
                height: '130px',
                background: '#1a1a2e',
                borderRadius: '0 0 10px 10px',
                marginLeft: i === 0 ? '47px' : '32px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
          ))}
        </div>
        {/* Music note */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '70px',
            fontSize: '100px',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          ♪
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
