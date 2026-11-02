import { route, readJson } from '@/lib/http';
import { decideProposal } from '@/server/proposals';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req, user, params }) => decideProposal(user.id, params.id, await readJson(req)));
