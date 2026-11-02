import { route } from '@/lib/http';
import { badRequest } from '@/lib/errors';
import { isDateStr } from '@/domain/dates';
import { requireProfile, today } from '@/server/api-util';
import { dayView } from '@/server/nutrition';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user, url }) => {
  const date = url.searchParams.get('date') ?? today();
  if (!isDateStr(date)) throw badRequest('Ungültiges Datum.');
  return dayView(user.id, await requireProfile(user.id), date);
});
