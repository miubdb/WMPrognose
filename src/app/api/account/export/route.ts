import { route, json } from '@/lib/http';
import { exportAll } from '@/server/account';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user }) => json(await exportAll(user.id, user.email), 200, { 'content-disposition': 'attachment; filename="road-to-matchday-export.json"' }));
