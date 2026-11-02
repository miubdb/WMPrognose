import { route } from '@/lib/http';
import { registrationOpen } from '@/lib/auth';
import { getProfile, today } from '@/server/api-util';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user }) => {
  const profile = await getProfile(user.id);
  return { user, onboarded: !!profile, registrationOpen: await registrationOpen(), today: today() };
});
