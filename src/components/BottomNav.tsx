'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    href: '/student',
    label: '練習',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" fill={active ? 'currentColor' : 'none'}/>
        <circle cx="18" cy="16" r="3" fill={active ? 'currentColor' : 'none'}/>
      </svg>
    ),
  },
  {
    href: '/bestiary',
    label: '図鑑',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        {active && <path d="M9 7h6M9 11h4" strokeLinecap="round"/>}
      </svg>
    ),
  },
  {
    href: '/ranking',
    label: 'ランキング',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={active ? 'currentColor' : 'none'} strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/submissions',
    label: '提出',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round"/>
        {active && <path d="M8 10h8M8 14h5" strokeLinecap="round"/>}
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'カレンダー',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
        {active && (
          <>
            <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
          </>
        )}
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/' || pathname.startsWith('/teacher')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-[#C6C6C8]/60"
      style={{ paddingBottom:'env(safe-area-inset-bottom)' }}>
      <div className="flex h-[49px]">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60
                ${active ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`}>
              {tab.icon(active)}
              <span className="text-[9px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
