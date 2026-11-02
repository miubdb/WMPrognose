import { z } from 'zod';
import { isDateStr } from '@/domain/dates';

z.config(z.locales.de());

export const dateStr = z.string().refine(isDateStr, 'Ungültiges Datum (JJJJ-MM-TT)');
export const uuid = z.string().uuid('Ungültige ID');
export const text = (max: number, min = 0) => z.string().trim().min(min).max(max);
export const optText = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v === '' ? null : v));
export const int = (min: number, max: number) => z.number().int().min(min).max(max);
export const num = (min: number, max: number) => z.number().min(min).max(max);
export const optInt = (min: number, max: number) => int(min, max).nullish();
export const optNum = (min: number, max: number) => num(min, max).nullish();

export const PLAN_TYPES = ['rad', 'kraft', 'lauf', 'fussball', 'torwart', 'mannschaft', 'mobilitaet', 'test', 'spiel', 'ruhe'] as const;
export const WORKOUT_TYPES = ['rad', 'kraft', 'lauf', 'fussball', 'torwart', 'mannschaft', 'mobilitaet', 'test', 'spiel', 'sonstiges'] as const;
export const GK_CATEGORIES = ['fangen', 'fussarbeit', 'stellungsspiel', 'reaktion', 'eins_gegen_eins', 'spieleroeffnung', 'flanken', 'athletik', 'sonstiges'] as const;
export const MEALS = ['fruehstueck', 'mittag', 'abend', 'snack'] as const;
