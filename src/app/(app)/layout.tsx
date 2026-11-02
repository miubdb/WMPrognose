'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { AppCtx, type AppState } from '@/components/AppContext';
import { Spinner, Notice } from '@/components/ui';

const NAV = [
  { href: '/', label: 'Heute', icon: '🏠' },
  { href: '/plan', label: 'Plan', icon: '📅' },
  { href: '/training', label: 'Training', icon: '🚴' },
  { href: '/ernaehrung', label: 'Essen', icon: '🍽️' },
  { href: '/mehr', label: 'Mehr', icon: '☰' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const path = usePathname();
  useEffect(() => {
    api<{ user: AppState['user']; onboarded: boolean; today: string }>('/api/auth/me')
      .then((me) => {
        if (!me.onboarded) { location.href = '/onboarding'; return; }
        setState({ user: me.user, today: me.today });
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <main className="mx-auto max-w-lg p-4"><Notice kind="error">{error}</Notice></main>;
  if (!state) return <Spinner />;
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <AppCtx.Provider value={state}>
      <div className="mx-auto min-h-dvh max-w-lg pb-24">
        <main className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>
      </div>
      <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur pb-safe">
        <ul className="mx-auto flex max-w-lg">
          {NAV.map((n) => (
            <li key={n.href} className="flex-1">
              <Link href={n.href} aria-current={active(n.href) ? 'page' : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${active(n.href) ? 'text-pitch-700' : 'text-slate-500'}`}>
                <span className="text-xl leading-none" aria-hidden>{n.icon}</span>{n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </AppCtx.Provider>
  );
}
