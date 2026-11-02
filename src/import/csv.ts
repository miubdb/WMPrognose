// Allgemeiner CSV-Import für Gewichtsdaten (z. B. Waagen-Exporte). Spaltenzuordnung erfolgt durch den Nutzer in der Vorschau.
export interface ParsedCsv { delimiter: string; headers: string[]; rows: string[][] }

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('Die CSV-Datei enthält keine Datenzeilen.');
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  for (const d of Object.keys(counts)) counts[d] = (lines[0].match(new RegExp(d === '\t' ? '\t' : `\\${d}`, 'g')) ?? []).length;
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === delimiter) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]);
  if (headers.length < 2) throw new Error('Die CSV-Datei hat weniger als zwei Spalten.');
  return { delimiter, headers, rows: lines.slice(1).map(split) };
}

/** Erkennt ISO (auch mit Uhrzeit) und deutsches Format TT.MM.JJJJ. Mehrdeutige US-Formate werden bewusst abgelehnt. */
export function parseCsvDate(s: string): string | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(t);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s.*)?$/.exec(t);
  if (m) return valid(+m[3], +m[2], +m[1]);
  return null;
}
function valid(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(/[a-zA-Z%]+$/, '');
  if (t === '') return null;
  const norm = t.includes(',') && !t.includes('.') ? t.replace(',', '.') : t.replace(/,/g, '');
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

export interface WeightImportRow { date: string; weight_kg: number; body_fat_pct: number | null }
export function extractWeights(csv: ParsedCsv, dateCol: number, weightCol: number, fatCol: number | null = null): { rows: WeightImportRow[]; skipped: number } {
  const rows: WeightImportRow[] = [];
  let skipped = 0;
  for (const r of csv.rows) {
    const date = parseCsvDate(r[dateCol] ?? '');
    const w = parseDecimal(r[weightCol] ?? '');
    if (!date || w == null || w < 30 || w > 300) { skipped++; continue; }
    const fat = fatCol != null ? parseDecimal(r[fatCol] ?? '') : null;
    rows.push({ date, weight_kg: Math.round(w * 100) / 100, body_fat_pct: fat != null && fat >= 3 && fat <= 60 ? Math.round(fat * 10) / 10 : null });
  }
  // je Tag der letzte Eintrag
  const byDay = new Map(rows.map((r) => [r.date, r]));
  return { rows: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)), skipped };
}
