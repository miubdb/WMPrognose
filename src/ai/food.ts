import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ApiError, badRequest, unprocessable } from '@/lib/errors';
import { macroConsistency } from '@/domain/nutrition';
import { aiModel, getLlm } from './llm';
import { enforceDailyLimit } from './coach';

const MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_BYTES = 3_500_000; // Base64-Anfrage bleibt unter dem 4,5-MB-Limit der Serverless-Plattform

export const FOOD_SYSTEM = `Du schätzt Nährwerte von Mahlzeiten auf Fotos für eine Ernährungs-Tracking-App.
- Erkenne jedes sichtbare Lebensmittel getrennt (z. B. Reis, Hähnchenbrust, Soße).
- Schätze für jedes Lebensmittel die Portion in Gramm (zubereiteter Zustand) und die Nährwerte dieser Portion (kcal, Eiweiß, Kohlenhydrate, Fett in g).
- Das sind SCHÄTZUNGEN. Gib bei unklaren Portionsgrößen, verdeckten Zutaten (Öl, Soßen) oder schlechter Bildqualität eine niedrigere Sicherheit an (confidence: low/medium/high) und erwähne das in "notes".
- Wenn auf dem Bild kein Essen zu sehen ist, gib eine leere Liste zurück und erkläre es in "notes".
- Nutze Zusatzinformationen der Nutzerin bzw. des Nutzers (z. B. Gewicht der Portion), falls vorhanden, und bevorzuge sie vor deiner Schätzung.
- Antworte auf Deutsch.`;

export const FOOD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'notes'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
        properties: {
          name: { type: 'string' }, grams: { type: 'number' }, kcal: { type: 'number' },
          protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
    notes: { type: 'string' },
  },
} as const;

const resultSchema = z.object({
  items: z.array(z.object({ name: z.string(), grams: z.number(), kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number(), confidence: z.enum(['low', 'medium', 'high']) })),
  notes: z.string(),
});

const bodySchema = z.strictObject({
  image_base64: z.string().min(100, 'Das Bild fehlt.'),
  media_type: z.enum(MEDIA),
  hint: z.string().trim().max(300).optional(),
});

export async function analyzeFoodPhoto(userId: string, body: unknown) {
  const b = bodySchema.parse(body);
  if (!/^[A-Za-z0-9+/=]+$/.test(b.image_base64)) throw badRequest('Das Bild ist nicht korrekt kodiert.');
  if (Math.floor((b.image_base64.length * 3) / 4) > MAX_IMAGE_BYTES) throw new ApiError(413, 'too_large', 'Das Bild ist zu groß. Bitte ein kleineres Foto verwenden.');
  const llm = getLlm();
  await enforceDailyLimit(userId, 'food');

  const res = await llm.create({
    model: aiModel(),
    max_tokens: 4000,
    system: [{ type: 'text', text: FOOD_SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: FOOD_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: b.media_type, data: b.image_base64 } },
        { type: 'text', text: b.hint ? `Hinweis der Nutzerin bzw. des Nutzers: ${b.hint}\n\nBitte analysiere die Mahlzeit.` : 'Bitte analysiere die Mahlzeit.' },
      ],
    }],
  });
  if (res.stop_reason === 'refusal') throw unprocessable('Das Modell hat die Analyse dieses Bildes abgelehnt. Bitte ein anderes Foto verwenden oder die Mahlzeit manuell eintragen.');
  if (res.stop_reason === 'max_tokens') throw new ApiError(502, 'ai_error', 'Die Analyse wurde abgeschnitten. Bitte erneut versuchen.');
  const text = res.content.filter((c): c is Anthropic.TextBlock => c.type === 'text').map((c) => c.text).join('');
  let parsed: z.infer<typeof resultSchema>;
  try {
    parsed = resultSchema.parse(JSON.parse(text));
  } catch {
    throw new ApiError(502, 'ai_error', 'Die Antwort der KI konnte nicht gelesen werden. Bitte erneut versuchen oder manuell eintragen.');
  }
  const items = parsed.items
    .filter((i) => i.grams > 0 && i.grams <= 3000 && i.kcal >= 0 && i.kcal <= 3500 && i.protein_g >= 0 && i.carbs_g >= 0 && i.fat_g >= 0)
    .map((i) => ({
      ...i,
      name: i.name.slice(0, 160),
      kcal: Math.round(i.kcal), protein_g: Math.round(i.protein_g * 10) / 10, carbs_g: Math.round(i.carbs_g * 10) / 10, fat_g: Math.round(i.fat_g * 10) / 10,
      is_estimate: true as const,
      plausible: macroConsistency({ kcal: i.kcal, protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g }).ok,
    }));
  return {
    items,
    dropped: parsed.items.length - items.length,
    notes: parsed.notes,
    disclaimer: 'KI-Schätzung: Nährwerte und Portionsgrößen sind ungenau. Bitte vor dem Speichern prüfen und bei Bedarf korrigieren.',
  };
}
