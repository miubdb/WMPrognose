import { route, readJson, json } from '@/lib/http';
import { createRow, listRows } from '@/server/crud';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user, params, url }) => {
  const limit = url.searchParams.get('limit');
  return { rows: await listRows(user.id, params.resource, { from: url.searchParams.get('from'), to: url.searchParams.get('to'), limit: limit ? Number(limit) : undefined }) };
});
export const POST = route(async ({ req, user, params }) => json({ row: await createRow(user.id, params.resource, await readJson(req)) }, 201));
