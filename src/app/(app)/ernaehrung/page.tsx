'use client';
import { useState } from 'react';
import { MEAL_LABEL, num, useFetch } from '@/lib/client';
import { addDays, formatDe } from '@/domain/dates';
import { Badge, Button, Card, Empty, Notice, PageHeader, ProgressBar, Spinner, Tabs } from '@/components/ui';
import { EditModal, ResourceCrud } from '@/components/ResourceCrud';
import { AddFoodModal, ENTRY_FIELDS, FOOD_FIELDS } from '@/components/FoodAdd';
import { useApp } from '@/components/AppContext';

export default function NutritionPage() {
  const { today } = useApp();
  const [tab, setTab] = useState('day');
  const [date, setDate] = useState(today);
  const day = useFetch<any>(`/api/nutrition/day?date=${date}`);
  const [add, setAdd] = useState<string | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const d = day.data;

  return (
    <div>
      <PageHeader title="Ernährung" />
      <Tabs tabs={[{ id: 'day', label: 'Tag' }, { id: 'foods', label: 'Lebensmittel' }]} value={tab} onChange={setTab} />
      {tab === 'foods' ? (
        <ResourceCrud<any> resource="foods" title="Lebensmittel" addLabel="Lebensmittel anlegen" emptyText="Noch keine eigenen Lebensmittel." fields={FOOD_FIELDS}
          renderRow={(f) => <div className="flex justify-between"><span className="font-semibold">{f.name}</span><span className="text-sm text-slate-500">{num(f.kcal_100g, 0)} kcal/100 g</span></div>} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" aria-label="Vorheriger Tag" onClick={() => setDate(addDays(date, -1))}>‹</Button>
            <div className="text-center font-semibold">{formatDe(date, true)}{date === today && <span className="ml-2 text-xs text-pitch-700">heute</span>}</div>
            <Button variant="secondary" aria-label="Nächster Tag" onClick={() => setDate(addDays(date, 1))}>›</Button>
          </div>
          {!d ? <Spinner /> : (
            <>
              <Card title="Tagesbilanz">
                {d.target ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between"><span className="text-2xl font-bold" data-testid="kcal-total">{num(d.totals.kcal, 0)} kcal</span><span className="text-sm text-slate-600">Ziel {d.target.kcal} kcal</span></div>
                      <ProgressBar percent={(d.totals.kcal / d.target.kcal) * 100} label="Kalorien" />
                    </div>
                    {([['Eiweiß', d.totals.protein_g, d.target.proteinG], ['Kohlenhydrate', d.totals.carbs_g, d.target.carbsG], ['Fett', d.totals.fat_g, d.target.fatG]] as const).map(([l, v, t]) => (
                      <div key={l}><div className="flex justify-between text-sm"><span>{l}</span><span>{num(v, 0)} / {t} g</span></div><ProgressBar percent={(v / t) * 100} label={l} /></div>
                    ))}
                    <p className="text-xs text-slate-500">Grundumsatz {d.target.bmr} kcal · Verbrauch inkl. Training ca. {d.target.maintenanceKcal} kcal ({d.basis}, Training ≈ {d.trainingKcal} kcal) · Defizit {d.target.deficitKcal} kcal Richtung Zielgewicht. Richtwerte nach Mifflin-St-Jeor, keine medizinische Beratung.</p>
                    {d.target.warnings.map((w: string) => <Notice key={w} kind="warn">{w}</Notice>)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{num(d.totals.kcal, 0)} kcal</div>
                    <Notice kind="info">Ein Kalorienziel kann erst berechnet werden, wenn im Profil {d.missing.join(', ')} angegeben ist.</Notice>
                  </div>
                )}
                {d.totals.estimateCount > 0 && <p className="mt-2 text-sm text-amber-800">≈ {d.totals.estimateCount} von {d.totals.count} Einträgen sind KI-Schätzungen – die Summe ist entsprechend ungenau.</p>}
              </Card>
              {Object.entries(MEAL_LABEL).map(([meal, label]) => {
                const items = d.entries.filter((e: any) => e.meal === meal);
                return (
                  <Card key={meal} title={`${label} · ${num(items.reduce((a: number, e: any) => a + Number(e.kcal), 0), 0)} kcal`} action={<Button variant="ghost" onClick={() => setAdd(meal)} data-testid={`add-${meal}`}>＋ Hinzufügen</Button>}>
                    {items.length === 0 ? <p className="text-sm text-slate-400">Noch nichts eingetragen.</p> : (
                      <ul className="divide-y">
                        {items.map((e: any) => (
                          <li key={e.id}>
                            <button className="flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left" onClick={() => setEdit(e)} data-testid="food-entry">
                              <span>{e.is_estimate && <Badge tone="amber">≈ Schätzung</Badge>} {e.name}{e.amount_g != null && <span className="text-sm text-slate-500"> · {num(e.amount_g, 0)} g</span>}</span>
                              <span className="shrink-0 text-sm">{e.is_estimate ? '≈ ' : ''}{num(e.kcal, 0)} kcal</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
      <AddFoodModal open={add !== null} onClose={() => setAdd(null)} date={date} meal={add ?? 'snack'} onSaved={() => { setAdd(null); void day.reload(); }} />
      <EditModal open={!!edit} resource="food-entries" title="Eintrag bearbeiten" fields={ENTRY_FIELDS} row={edit}
        onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void day.reload(); }} />
    </div>
  );
}
