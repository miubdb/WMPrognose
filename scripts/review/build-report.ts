// Erzeugt docs/FRAGEN-PRUEFUNG.md aus scripts/review/verdicts.txt und prüft, dass JEDE Frage des GitHub-Fragenpools genau einmal erfasst ist.
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Store } from '../../server/store'; import { ContentService } from '../../server/content';
import { SCENES } from '../../shared/scenes'; import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS, STANDARD_SHOWS } from '../../content';
const c = new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'rev-')), 'r.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const qs = c.listQuestions();
const shipped = new Set(STANDARD_SHOWS.flatMap(s => s.pool.map(q => q.id)));
const rows = readFileSync('scripts/review/verdicts.txt', 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const [id, st, problem, change, ...ev] = l.split('|'); return { id, st, problem, change, ev: ev.join('|') }; });
const byId = new Map(rows.map(r => [r.id, r])); if (byId.size !== rows.length) throw new Error('Doppelte Einträge in verdicts.txt');
const missing = qs.filter(q => !byId.has(q.id)).map(q => q.id), extra = rows.filter(r => !qs.some(q => q.id === r.id)).map(r => r.id);
if (missing.length || extra.length) throw new Error(`Prüfliste unvollständig. Fehlend: ${missing.join(', ')} · Überzählig: ${extra.join(', ')}`);
const label: Record<string, string> = { k: 'korrekt', c: 'korrigiert', u: 'ungeklärt' };
const short = (t: any) => String(t.prompt ?? t.twisted ?? '').replace(/\s+/g, ' ').slice(0, 70);
const esc = (s: string) => s.replace(/\|/g, '/');
const cnt = (s: string) => rows.filter(r => r.st === s).length;
const dup = rows.filter(r => /Dublette|siehe /.test(r.ev + r.problem));
const out = [
  '# Redaktionelle Prüfung des Fragenpools (Stand: November 2026)', '',
  `Jede der **${qs.length}** im GitHub-Fragenpool vorhandenen Fragen wurde einzeln erfasst (eine Zeile je Frage-ID). Dieser Bericht wird von \`scripts/review/build-report.ts\` aus \`scripts/review/verdicts.txt\` erzeugt und bricht ab, sobald eine Frage fehlt.`, '',
  '## Abschlussbericht', '',
  `| | Anzahl |`, `|---|---|`, `| Geprüfte Fragen (GitHub-Pool) | **${qs.length}** |`, `| unverändert korrekt | ${cnt('k')} |`, `| korrigiert | ${cnt('c')} |`, `| ungeklärt / teilweise nicht prüfbar | ${cnt('u')} |`,
  `| davon im Auslieferungsstand (zwei Standardpakete) | ${qs.filter(q => shipped.has(q.id)).length} |`, '',
  '### Bestände (wichtig)', '',
  `- **GitHub-Fragenpool:** ${qs.length} Fragen (alle hier geprüft).`,
  '- **Online-Bibliothek des Admins:** zeigte 202 Fragen. Die Differenz von 35 Fragen liegt nicht im Repository (vermutlich selbst angelegte oder über Import/Admin ergänzte Fragen der Online-Datenbank). **Diese 35 Fragen konnten nicht geprüft werden** – kein Zugriff auf die Online-Datenbank. Bitte im Admin → Sicherung „Inhalte sichern“ exportieren und prüfen lassen.',
  '- **Lokale Datenbank:** nicht zugänglich; für sie gilt dasselbe.',
  '- Korrekturen betreffen den Auslieferungsstand und künftige Installationen. Bestehende Datenbanken werden **nicht** überschrieben (INSERT OR IGNORE); veröffentlichte Paketversionen bleiben unverändert. Zum Übernehmen in eine bestehende Datenbank die Frage im Admin bearbeiten und das Paket neu veröffentlichen.', '',
  '### Dubletten und problematische Fragen', '',
  '- Dubletten (gleicher Inhalt in mehreren Paketversionen, keine gelöscht): Käserennen (b42-geo-c04/b43-geo-c04), Moukoko-Debütanten (b42/b43/b44-rank-t05), Tierrekorde (b44-match-tier/s4-match-tierrekorde), Kaiserslautern (b42/b44-link-t11), Champions-League-Klubs (b42/b44-unique-p20), WM-Gastgeber (b42-unique-t13/v2-einzigartig-2), BVB-Ablösen (b42/b45-rank-c09), Oktopus-Herzen (ng-bluff-3/nm-duel-2), Proben s4/s5 (7 Paare).',
  '- Korrigiert: Sancho-/Kagawa-Ablösen (falsche Reihenfolge), Mourinho-Hinweis (Lösung im Hinweis), Wiesn-Erklärtext, Verdrehter Filmtitel, WM-Rekordtext, zwei Texte.',
  '- Offen: VW-Teilenummer in `b42-link-c22`; Tageswert Güther (3 vs. 4 Tage); die drei Tondateien (nicht abhörbar geprüft); Doppel-Profi-Liste `b42-unique-c27`.', '',
  '### Prüfmethodik und Grenzen', '',
  '- [W] = Websuche November 2026 mit Quelle, [N] = nachgerechnet, [A] = Abgleich mit gesichertem Fach-/Allgemeinwissen, [T] = Spiellogik/Technik (Szenen, Reihenfolgen, Mischungen, Medien) geprüft.',
  '- Websuchen wurden für die zeitabhängigen und unsicheren Fakten durchgeführt (Stadionkoordinaten, CL-Finalorte 2026/2028, Bundesliga-Debütanten, Ablösen, Wiesn, Cheese Rolling, Guinness u. a.). Viele Standardfakten (Jahreszahlen, Hauptstädte, Rekorde) sind **[A]** – dort wurde nicht jede Zahl erneut in einer Primärquelle aufgerufen. Das ist keine „zwei unabhängige Quellen“-Prüfung.', '',
  '## Prüfliste (eine Zeile je Frage)', '',
  '| Fragen-ID | Modus | Kurzbezeichnung | Ergebnis | Festgestelltes Problem | Änderung | Prüfnachweis | im Paket |', '|---|---|---|---|---|---|---|---|',
  ...qs.map(q => { const r = byId.get(q.id)!; return `| ${q.id} | ${q.mode} | ${esc(short(q.task))} | ${label[r.st]} | ${esc(r.problem || '–')} | ${esc(r.change || '–')} | ${esc(r.ev)} | ${shipped.has(q.id) ? 'ja' : 'nein'} |`; }), '',
].join('\n');
writeFileSync('docs/FRAGEN-PRUEFUNG.md', out); console.log(`OK: ${qs.length} Fragen · korrekt ${cnt('k')} · korrigiert ${cnt('c')} · ungeklärt ${cnt('u')} · ausgeliefert ${qs.filter(q => shipped.has(q.id)).length}`); void dup;
