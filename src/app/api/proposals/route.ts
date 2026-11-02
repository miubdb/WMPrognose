import { route } from '@/lib/http';
import { listProposals } from '@/server/proposals';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user, url }) => ({ proposals: await listProposals(user.id, url.searchParams.get('status')) }));
