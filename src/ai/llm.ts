import Anthropic from '@anthropic-ai/sdk';
import { ApiError, unavailable } from '@/lib/errors';

/** Schmale Schnittstelle zum Modell – ermöglicht gezielte Tests mit einem Ersatzclient. */
export interface LlmClient {
  create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
}

let override: LlmClient | null = null;
/** Nur für Tests. */
export function setLlmForTests(c: LlmClient | null) { override = c; }

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const aiModel = () => process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
export const aiConfigured = () => !!override || !!process.env.ANTHROPIC_API_KEY;

let real: Anthropic | null = null;

export function getLlm(): LlmClient {
  if (override) return override;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw unavailable('Die KI-Funktionen sind nicht eingerichtet: Es ist kein ANTHROPIC_API_KEY konfiguriert. Alle anderen Funktionen der App sind davon nicht betroffen.');
  }
  real ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  const client = real;
  return {
    async create(params) {
      try {
        return await client.messages.create(params);
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) throw new ApiError(429, 'rate_limited', 'Die KI ist gerade überlastet (Rate-Limit). Bitte in einer Minute erneut versuchen.');
        if (e instanceof Anthropic.AuthenticationError) throw unavailable('Der konfigurierte ANTHROPIC_API_KEY wurde abgelehnt. Bitte den Schlüssel prüfen.');
        if (e instanceof Anthropic.BadRequestError) throw new ApiError(502, 'ai_error', `Die KI-Anfrage wurde abgelehnt: ${e.message}`);
        if (e instanceof Anthropic.APIConnectionError) throw unavailable('Die KI ist nicht erreichbar. Bitte später erneut versuchen.');
        if (e instanceof Anthropic.APIError) throw new ApiError(502, 'ai_error', `Fehler bei der KI-Anfrage (Status ${e.status}). Bitte später erneut versuchen.`);
        throw e;
      }
    },
  };
}
