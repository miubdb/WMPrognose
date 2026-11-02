import { route } from '@/lib/http';
import { requireProfile } from '@/server/api-util';
import { dashboard } from '@/server/dashboard';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user }) => dashboard(user.id, await requireProfile(user.id)));
