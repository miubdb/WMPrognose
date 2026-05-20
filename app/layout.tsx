import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'WM 2026 Prognosemodell',
  description: 'Wissenschaftliches Prognosemodell für die FIFA Weltmeisterschaft 2026',
}

const NAV_LINKS = [
  { href: '/teams', label: 'Teams', sub: '48 Nationen' },
  { href: '/matches', label: 'Spiele', sub: 'Prognosen' },
  { href: '/tippspiel', label: 'Tippspiel', sub: 'Optimizer' },
  { href: '/tournament', label: 'Simulator', sub: 'Monte Carlo' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="bg-gray-950 text-white min-h-screen">
        <nav className="bg-gray-900/95 backdrop-blur border-b border-gray-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="flex items-center gap-2.5 group">
                <span className="text-2xl">⚽</span>
                <div className="hidden sm:block">
                  <div className="font-bold text-white leading-tight text-sm">WM 2026</div>
                  <div className="text-xs text-emerald-400 leading-tight">Prognosemodell</div>
                </div>
                <div className="sm:hidden font-bold text-emerald-400 text-sm">WM 2026</div>
              </Link>

              <div className="flex items-center gap-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors group text-center"
                  >
                    <div className="text-xs font-medium text-gray-200 group-hover:text-white">{link.label}</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 hidden sm:block">{link.sub}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="mt-16 border-t border-gray-800/60 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚽</span>
                <span className="text-sm font-medium text-gray-400">WM 2026 Prognosemodell</span>
              </div>
              <div className="text-xs text-gray-600 text-center">
                Poisson · Dixon-Coles · ELO · Kontext-Modifier · Alle Prognosen sind Wahrscheinlichkeitsschätzungen
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
