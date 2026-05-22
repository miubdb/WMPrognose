import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'WM 2026 Prognose',
  description: 'Wissenschaftliches Prognosemodell für die FIFA WM 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 sticky top-0 z-50 bg-gray-950/95 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-white tracking-tight">
              WM 2026 <span className="text-emerald-400">Prognose</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">Spiele</Link>
              <Link href="/gruppen" className="hover:text-white transition-colors">Gruppen</Link>
              <Link href="/turnierbaum" className="hover:text-white transition-colors">Turnierbaum</Link>
              <Link href="/teams" className="hover:text-white transition-colors">Teams</Link>
              <Link href="/admin" className="hover:text-white transition-colors text-amber-500/80">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
