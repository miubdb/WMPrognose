import { route } from '@/lib/http';
import { ruleCheck } from '@/server/proposals';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ user }) => ruleCheck(user.id));
