'use client';
import { useEffect, useState } from 'react';
import { api, ApiClientError } from '@/lib/client';
import { ONBOARDING_DEFAULTS } from '@/domain/defaults';
import { Button, Card, FormFields, Notice, toPayload } from '@/components/ui';
import { PROFILE_FIELDS } from '@/components/fields';
import { AvailabilityEditor } from '@/components/AvailabilityEditor';

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<Record<string, any>>({ ...ONBOARDING_DEFAULTS, activity_level: 'moderate', sex: '', birth_year: '', height_cm: '', display_name: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiClientError | null>(null);
  const [result, setResult] = useState<{ created: number; unplaced: { title: string }[] } | null>(null);

  useEffect(() => {
    api<{ onboarded: boolean }>('/api/auth/me').then((me) => { if (me.onboarded) setStep(2); }).catch(() => undefined);
  }, []);

  async function saveProfile() {
    setBusy(true); setErr(null);
    try {
      await api('/api/profile', { method: 'PUT', body: toPayload(PROFILE_FIELDS, values, 'create') });
      setStep(2);
    } catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  async function generate() {
    setBusy(true); setErr(null);
    try { setResult(await api('/api/plan/generate', { method: 'POST', body: {} })); setStep(3); }
    catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header>
        <p className="text-sm font-medium text-pitch-700">Schritt {step} von 3</p>
        <h1 className="text-2xl font-bold">Willkommen bei Road to Matchday</h1>
      </header>
      {step === 1 && (
        <Card title="Ziele und Ausgangswerte">
          <form onSubmit={(e) => { e.preventDefault(); void saveProfile(); }} className="space-y-4">
            <Notice kind="info">Die Felder sind mit den vereinbarten Zielen vorbelegt (02.11.2026 Start, 06.02.2027 erstes Freundschaftsspiel, 07.03.2027 Hauptziel, 91,45 kg → 86 kg, FTP 236 W). Bitte prüfen und ergänzen – gespeichert wird erst mit „Weiter“.</Notice>
            {err && <Notice kind="error">{err.message}</Notice>}
            <FormFields defs={PROFILE_FIELDS} values={values} setValues={setValues} errors={err?.fields} />
            <p className="text-xs text-slate-500">Geschlecht, Geburtsjahr und Größe werden nur für die Kalorienberechnung benötigt. Ohne sie zeigt die App kein Kalorienziel an.</p>
            <Button type="submit" busy={busy} className="w-full" data-testid="profile-next">Weiter</Button>
          </form>
        </Card>
      )}
      {step === 2 && (
        <Card title="Verfügbarkeit">
          <AvailabilityEditor submitLabel="Speichern" onSaved={() => undefined} />
          {err && <div className="mt-3"><Notice kind="error">{err.message}</Notice></div>}
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-sm text-slate-600">Danach erzeugt die App aus Zielen, Verfügbarkeit und Spielterminen deinen Trainingsplan bis zum Hauptziel.</p>
            <Button onClick={generate} busy={busy} className="w-full" data-testid="generate-plan">Trainingsplan erzeugen</Button>
          </div>
        </Card>
      )}
      {step === 3 && result && (
        <Card title="Plan erstellt">
          <p className="mb-3 text-sm">{result.created} Einheiten wurden geplant.</p>
          {result.unplaced.length > 0 && <Notice kind="warn">{result.unplaced.length} Einheiten passten nicht in deine Verfügbarkeit und wurden nicht eingeplant. Mehr Zeit unter „Mehr → Einstellungen“ ermöglicht einen volleren Plan.</Notice>}
          <Button className="mt-4 w-full" onClick={() => { location.href = '/'; }} data-testid="finish-onboarding">Los geht’s</Button>
        </Card>
      )}
    </main>
  );
}
