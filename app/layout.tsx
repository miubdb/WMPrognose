import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'WM 2026 Prognosemodell',
  description: 'Wissenschaftliches Prognosemodell für die FIFA Weltmeisterschaft 2026 – Poisson, Dixon-Coles, ELO',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark">
      <body className="bg-gray-950 text-white min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                <span className="text-xl">⚽</span>
                <span className="text-sm sm:text-base">WM 2026 Prognose</span>
              </Link>

              {/* Navigation Links */}
              <div className="flex items-center gap-1 sm:gap-4 text-sm">
                <Link
                  href="/teams"
                  className="px-2 sm:px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Teams
                </Link>
                <Link
                  href="/matches"
                  className="px-2 sm:px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Spiele
                </Link>
                <Link
                  href="/tippspiel"
                  className="px-2 sm:px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <span className="hidden sm:inline">Tippspiel</span>
                  <span className="sm:hidden">Tipps</span>
                </Link>
                <Link
                  href="/tournament"
                  className="px-2 sm:px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Simulator
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        <footer className="mt-12 border-t border-gray-800 py-6 text-center text-gray-500 text-xs">
          <p>WM 2026 Prognosemodell · Poisson · Dixon-Coles · ELO (eloratings.net) · Kontext-Modifier</p>
          <p className="mt-1">Alle Prognosen sind Wahrscheinlichkeitsschätzungen, kein Sportwetten-Service</p>
        </footer>
      </body>
    </html>
  )
}
