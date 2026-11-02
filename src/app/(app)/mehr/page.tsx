'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';

const ITEMS = [
  { href: '/koerper', icon: '⚖️', title: 'Körper & Leistung', text: 'Gewicht, Trend, FTP und Leistungszonen' },
  { href: '/erholung', icon: '😴', title: 'Erholung', text: 'Tägliche Tagesform, Schlaf, Ruhepuls' },
  { href: '/torwart', icon: '🧤', title: 'Torwart', text: 'Übungen, Torwarttrainings, Spielanalysen' },
  { href: '/coach', icon: '🤖', title: 'KI-Coach', text: 'Fragen stellen, Planvorschläge prüfen' },
  { href: '/import', icon: '📥', title: 'Import', text: 'FIT, TCX, GPX, Apple Health, Gewichts-CSV' },
  { href: '/einstellungen', icon: '⚙️', title: 'Einstellungen', text: 'Profil, Verfügbarkeit, Termine, Konto & Datenschutz' },
];
export default function MehrPage() {
  return (
    <div>
      <PageHeader title="Mehr" />
      <ul className="space-y-2">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 active:bg-slate-50">
              <span className="text-2xl" aria-hidden>{i.icon}</span>
              <span><span className="block font-semibold">{i.title}</span><span className="block text-sm text-slate-600">{i.text}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
