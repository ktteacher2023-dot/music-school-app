import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #FFB3C6 0%, #D4B8FF 55%, #FFE9A0 100%)',
          borderRadius: '115px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ふわふわ背景サークル */}
        <div
          style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            top: '-40px',
            left: '-40px',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            bottom: '-30px',
            right: '-30px',
            display: 'flex',
          }}
        />

        {/* インクのしずく – ピンク */}
        <div
          style={{
            position: 'absolute',
            top: '68px',
            left: '108px',
            width: '36px',
            height: '46px',
            background: '#FF6BA8',
            borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
            transform: 'rotate(-15deg)',
            boxShadow: '0 4px 12px rgba(255,107,168,0.5)',
            display: 'flex',
          }}
        />
        {/* インクのしずく – 紫 */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '100px',
            width: '28px',
            height: '36px',
            background: '#9B72FF',
            borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
            transform: 'rotate(20deg)',
            boxShadow: '0 4px 10px rgba(155,114,255,0.5)',
            display: 'flex',
          }}
        />
        {/* インクのしずく – ミント */}
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            left: '68px',
            width: '22px',
            height: '28px',
            background: '#5DDCB2',
            borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
            transform: 'rotate(-30deg)',
            boxShadow: '0 3px 8px rgba(93,220,178,0.5)',
            display: 'flex',
          }}
        />
        {/* インクのしずく – イエロー */}
        <div
          style={{
            position: 'absolute',
            top: '110px',
            right: '82px',
            width: '20px',
            height: '26px',
            background: '#FFD166',
            borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
            transform: 'rotate(10deg)',
            boxShadow: '0 3px 8px rgba(255,209,102,0.5)',
            display: 'flex',
          }}
        />

        {/* キラキラ ✦ */}
        <div
          style={{
            position: 'absolute',
            top: '52px',
            right: '88px',
            fontSize: '60px',
            color: '#FFD700',
            textShadow: '0 0 16px rgba(255,215,0,0.8)',
            display: 'flex',
          }}
        >
          ✦
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '60px',
            fontSize: '44px',
            color: '#FFFFFF',
            textShadow: '0 0 12px rgba(255,255,255,0.9)',
            display: 'flex',
          }}
        >
          ✦
        </div>
        <div
          style={{
            position: 'absolute',
            top: '180px',
            left: '50px',
            fontSize: '32px',
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255,215,0,0.7)',
            display: 'flex',
          }}
        >
          ✦
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '160px',
            right: '52px',
            fontSize: '28px',
            color: '#FFFFFF',
            textShadow: '0 0 10px rgba(255,255,255,0.9)',
            display: 'flex',
          }}
        >
          ✦
        </div>

        {/* 小さい丸ドット */}
        {[
          { top: '44px', left: '170px', color: '#FFFFFF', size: '14px' },
          { top: '90px', right: '55px', color: '#FF6BA8', size: '10px' },
          { bottom: '50px', right: '165px', color: '#FFFFFF', size: '12px' },
          { bottom: '100px', left: '110px', color: '#FFD166', size: '10px' },
        ].map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: dot.top,
              left: dot.left,
              bottom: dot.bottom,
              right: dot.right,
              width: dot.size,
              height: dot.size,
              borderRadius: '50%',
              background: dot.color,
              opacity: 0.9,
              display: 'flex',
            }}
          />
        ))}

        {/* メインの音符（白くてぷっくり） */}
        <div
          style={{
            fontSize: '240px',
            lineHeight: 1,
            marginTop: '-10px',
            color: '#FFFFFF',
            textShadow:
              '0 0 0 #FFFFFF, 0 6px 24px rgba(155,114,255,0.6), 0 0 60px rgba(255,255,255,0.4)',
            filter: 'drop-shadow(0 8px 20px rgba(180,80,200,0.35))',
            display: 'flex',
          }}
        >
          ♪
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
