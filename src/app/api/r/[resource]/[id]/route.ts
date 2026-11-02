import { route, readJson } from '@/lib/http';
import { deleteRow, getRow, updateRow } from '@/server/crud';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user, params }) => ({ row: await getRow(user.id, params.resource, params.id) }));
export const PATCH = route(async ({ req, user, params }) => ({ row: await updateRow(user.id, params.resource, params.id, await readJson(req)) }));
export const DELETE = route(async ({ user, params }) => {
  await deleteRow(user.id, params.resource, params.id);
  return { deleted: true };
});
