import { route } from '@/lib/http';
import { badRequest } from '@/lib/errors';
import { query } from '@/lib/db';
import { requireProfile } from '@/server/api-util';
import { ftpStats, pmcStats, readinessHistory, weightStats } from '@/server/dashboard';
import { matchTotals } from '@/domain/gk';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user, url }) => {
  const kind = url.searchParams.get('kind');
  const profile = await requireProfile(user.id);
  switch (kind) {
    case 'pmc': return pmcStats(user.id, url.searchParams.get('from') ?? undefined, url.searchParams.get('to') ?? undefined);
    case 'weight': return weightStats(user.id, profile);
    case 'ftp': return ftpStats(user.id, profile);
    case 'readiness': return { days: await readinessHistory(user.id, Number(url.searchParams.get('days') ?? 30)) };
    case 'gk': {
      const rows = await query<never>('SELECT * FROM match_analyses WHERE user_id = $1 ORDER BY date ASC', [user.id]);
      return { totals: matchTotals(rows), rows };
    }
    default: throw badRequest('Unbekannte Statistik. Erlaubt: pmc, weight, ftp, readiness, gk.');
  }
});
