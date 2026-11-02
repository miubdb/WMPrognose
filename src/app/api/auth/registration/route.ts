import { route } from '@/lib/http';
import { registrationOpen } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Öffentlich: gibt nur bekannt, ob eine Registrierung möglich ist (für die Login-Seite).
export const GET = route(async () => ({ open: await registrationOpen() }), { auth: false });
