// Erzeugt die LOKALEN Kartendaten (offline nutzbar) aus Natural Earth (gemeinfrei) und GeoNames (CC BY 4.0, Orte ≥ 30.000 Einw.).
// Nur zum Neu-Erzeugen nötig; die Ergebnisse (web/src/mapdata/*.json) sind im Repository.
// Aufruf: NE_DIR=/tmp/ne node scripts/build-mapdata.mjs   (NE_DIR enthält die ne_10m_*.geojson und node_modules/all-the-cities, topojson-*)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const NE = process.env.NE_DIR ?? '/tmp/ne';
const require = createRequire(NE + '/');
const { topology } = require('topojson-server');
const { presimplify, simplify } = require('topojson-simplify');
const cities = require('all-the-cities');
const J = f => JSON.parse(readFileSync(`${NE}/${f}.geojson`, 'utf8'));
const r = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

// ---------- Geometrie ----------
const inBox = (lon, lat, b) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
const BOX_DE = [4.5, 46.5, 16.5, 55.8], BOX_EU = [-12, 34, 45, 72];
const centroidOf = poly => { const ring = poly[0]; let x = 0, y = 0; for (const p of ring) { x += p[0]; y += p[1]; } return [x / ring.length, y / ring.length]; };
const keepParts = (geom, box) => {
  if (geom.type === 'Polygon') return inBox(...centroidOf(geom.coordinates), box) ? geom : null;
  if (geom.type === 'MultiPolygon') { const parts = geom.coordinates.filter(p => inBox(...centroidOf(p), box)); return parts.length ? { type: 'MultiPolygon', coordinates: parts } : null; }
  return geom;
};
const states = J('ne_10m_admin_1_states_provinces').features.filter(f => f.properties.admin === 'Germany')
  .map(f => ({ type: 'Feature', properties: { n: f.properties.name_de ?? f.properties.name }, geometry: f.geometry }));
const NEIGH = new Set(['AUT', 'CHE', 'FRA', 'BEL', 'NLD', 'LUX', 'DNK', 'POL', 'CZE', 'ITA', 'LIE', 'SWE', 'SVN', 'HUN', 'SVK', 'GBR', 'NOR', 'ESP', 'HRV', 'BIH', 'LTU', 'LVA', 'EST', 'RUS', 'BLR', 'UKR', 'IRL', 'FIN']);
const countries0 = J('ne_10m_admin_0_countries').features;
const neighbors = countries0.filter(f => NEIGH.has(f.properties.ADM0_A3) || f.properties.ADM0_A3 === 'DEU')
  .map(f => ({ type: 'Feature', properties: { n: f.properties.NAME_DE ?? f.properties.NAME, a: f.properties.ADM0_A3 }, geometry: keepParts(f.geometry, [-12, 34, 32, 66]) })).filter(f => f.geometry);
const lakeFeats = [...J('ne_10m_lakes_europe').features, ...J('ne_10m_lakes').features].filter(f => f.geometry && (f.properties.scalerank ?? 9) <= 8);
const seen = new Set();
const lakes = lakeFeats.filter(f => { const c = f.geometry.type === 'Polygon' ? centroidOf(f.geometry.coordinates) : centroidOf(f.geometry.coordinates[0]); const k = (f.properties.name ?? '') + r(c[0], 1) + r(c[1], 1); if (seen.has(k)) return false; seen.add(k); return inBox(c[0], c[1], BOX_EU) && (f.properties.name_de || f.properties.name); })
  .map(f => ({ type: 'Feature', properties: { n: f.properties.name_de ?? f.properties.name, s: f.properties.scalerank ?? 5 }, geometry: f.geometry }));
const riverFeats = [...J('ne_10m_rivers_europe').features, ...J('ne_10m_rivers_lake_centerlines').features].filter(f => f.geometry);
const lineIn = (g, box) => { const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates; return lines.some(l => l.some(p => inBox(p[0], p[1], box))); };
const rivers = riverFeats.filter(f => lineIn(f.geometry, BOX_EU)).map(f => ({ type: 'Feature', properties: { n: f.properties.name_de ?? f.properties.name ?? '', s: f.properties.scalerank ?? 8 }, geometry: f.geometry }));
const riversWorld = J('ne_10m_rivers_lake_centerlines').features.filter(f => (f.properties.scalerank ?? 9) <= 3 && f.geometry).map(f => ({ type: 'Feature', properties: { n: f.properties.name_de ?? f.properties.name ?? '', s: f.properties.scalerank }, geometry: f.geometry }));

const col = fs => ({ type: 'FeatureCollection', features: fs });
const topo = topology({ states: col(states), neighbors: col(neighbors), lakes: col(lakes), rivers: col(rivers), riversWorld: col(riversWorld) }, 6e4);
const pre = presimplify(topo);
const simp = simplify(pre, Number(process.env.MINW ?? 300));           // Visvalingam; Wert aus Größen-/Qualitätsabwägung
// Gewichte entfernen (Größe)
for (const a of simp.arcs) for (const p of a) p.length = 2;
writeFileSync('web/src/mapdata/detail.json', JSON.stringify(simp));

// ---------- Orte ----------
const STATE_CAPS = new Set(['Stuttgart', 'München', 'Berlin', 'Potsdam', 'Bremen', 'Hamburg', 'Wiesbaden', 'Schwerin', 'Hannover', 'Düsseldorf', 'Mainz', 'Saarbrücken', 'Dresden', 'Magdeburg', 'Kiel', 'Erfurt']);
const de = cities.filter(c => c.country === 'DE' && (c.population >= 30000 || STATE_CAPS.has(c.name)) && /^PPL/.test(c.featureCode))
  .map(c => ({ n: c.name, x: r(c.loc.coordinates[0], 3), y: r(c.loc.coordinates[1], 3), p: c.population, cap: STATE_CAPS.has(c.name) }));
// Duplikate (Ortsteile) entfernen: gleicher Name
const dedupe = list => { const m = new Map(); for (const c of list.sort((a, b) => b.p - a.p)) if (!m.has(c.n)) m.set(c.n, c); return [...m.values()]; };
const deList = dedupe(de);
const ne = J('ne_10m_populated_places_simple').features.map(f => ({ n: f.properties.name, x: r(f.properties.longitude, 3), y: r(f.properties.latitude, 3), p: f.properties.pop_max, cap: f.properties.adm0cap === 1, c: f.properties.adm0name }));
const europe = ne.filter(c => inBox(c.x, c.y, BOX_EU) && (c.cap || c.p >= 400000) && c.c !== 'Germany').concat(deList.filter(c => c.p >= 250000 || c.cap));
const world = ne.filter(c => c.cap || c.p >= 2500000).filter(c => c.c !== 'Germany' || ['Berlin'].includes(c.n));
const pack = l => l.map(c => [c.n, c.x, c.y, c.p, c.cap ? 1 : 0]);
writeFileSync('web/src/mapdata/places.json', JSON.stringify({ germany: pack(deList), europe: pack(dedupe(europe)), world: pack(dedupe(world)) }));

// ---------- Länder-/Meeresnamen ----------
const countryLabels = countries0.filter(f => f.properties.POP_EST > 1e6 || NEIGH.has(f.properties.ADM0_A3)).map(f => { const lab = [f.properties.LABEL_X, f.properties.LABEL_Y]; return [f.properties.NAME_DE ?? f.properties.NAME, r(lab[0], 2), r(lab[1], 2), f.properties.ADM0_A3, f.properties.POP_EST, f.properties.LABELRANK ?? 5]; });
const stateLabels = J('ne_10m_admin_1_states_provinces').features.filter(f => f.properties.admin === 'Germany').map(f => [f.properties.name_de ?? f.properties.name, r(f.properties.longitude ?? centroidOf(f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0])[0], 2), r(f.properties.latitude ?? centroidOf(f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0])[1], 2)]);
const seas = [['Nordsee', 3.2, 55.5], ['Ostsee', 17.5, 55.6], ['Mittelmeer', 18, 35.2], ['Atlantik', -20, 45], ['Schwarzes Meer', 34, 43.5], ['Adria', 15.5, 43], ['Nordmeer', 2, 68], ['Biskaya', -5, 45.2], ['Atlantischer Ozean', -35, 10], ['Pazifischer Ozean', -150, 8], ['Indischer Ozean', 80, -15], ['Arktischer Ozean', 0, 82], ['Südpolarmeer', 20, -65]];
writeFileSync('web/src/mapdata/labels.json', JSON.stringify({ countries: countryLabels, states: stateLabels, seas }));
console.log('Orte: DE', deList.length, 'EU', dedupe(europe).length, 'Welt', dedupe(world).length);
