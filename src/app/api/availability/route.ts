import { route, readJson } from '@/lib/http';
import { query } from '@/lib/db';
import { saveAvailability } from '@/server/profile';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const load = (id: string) => query('SELECT weekday, available_minutes, team_training, team_training_minutes, notes FROM availability WHERE user_id = $1 ORDER BY weekday', [id]);
export const GET = route(async ({ user }) => ({ days: await load(user.id) }));
export const PUT = route(async ({ req, user }) => {
  await saveAvailability(user.id, await readJson(req));
  return { days: await load(user.id) };
});
