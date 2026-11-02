'use client';
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/lib/client';
import { Button, Card, Field, Notice } from '@/components/ui';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiClientError | null>(null);
  const [regOpen, setRegOpen] = useState<boolean | null>(null);

  useEffect(() => { fetch('/api/auth/registration').then((r) => r.json()).then((d) => setRegOpen(!!d.open)).catch(() => setRegOpen(null)); }, []);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await api(`/api/auth/${mode}`, { method: 'POST', body: { email, password } });
      const me = await api<{ onboarded: boolean }>('/api/auth/me');
      location.href = me.onboarded ? '/' : '/onboarding';
    } catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
      <div className="text-center">
        <div className="text-5xl" aria-hidden>🧤</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Road to Matchday</h1>
        <p className="text-sm text-slate-600">Deine Vorbereitung auf die Saison.</p>
      </div>
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-4">
          <h2 className="text-lg font-semibold">{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</h2>
          {err && <Notice kind="error">{err.message}</Notice>}
          <Field def={{ name: 'email', label: 'E-Mail', type: 'text', required: true }} value={email} onChange={setEmail} error={err?.fields?.email} />
          <Field def={{ name: 'password', label: 'Passwort', type: 'password', required: true, help: mode === 'register' ? 'Mindestens 10 Zeichen.' : undefined }} value={password} onChange={setPassword} error={err?.fields?.password} />
          <Button type="submit" busy={busy} className="w-full" data-testid="submit-auth">{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</Button>
        </form>
        {regOpen !== false && (
          <button className="mt-3 w-full min-h-[44px] text-sm font-medium text-pitch-700" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(null); }}>
            {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
          </button>
        )}
        {regOpen === false && mode === 'login' && <p className="mt-3 text-center text-xs text-slate-500">Die Registrierung ist auf dieser Installation geschlossen.</p>}
      </Card>
    </main>
  );
}
