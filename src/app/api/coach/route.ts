import { route, readJson } from '@/lib/http';
import { clearCoachMessages, coachChat, coachMessages } from '@/ai/coach';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export const GET = route(async ({ user }) => ({ messages: await coachMessages(user.id) }));
export const POST = route(async ({ req, user }) => coachChat(user.id, await readJson(req)));
export const DELETE = route(async ({ user }) => clearCoachMessages(user.id));
