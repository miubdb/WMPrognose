import { route } from '@/lib/http';
import { aiConfigured, aiModel } from '@/ai/llm';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export const GET = route(async () => ({ configured: aiConfigured(), model: aiConfigured() ? aiModel() : null }));
