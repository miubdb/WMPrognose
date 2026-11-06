import { TILES, SEED_PACK } from './tiles';
import { SHOW_PACK, SHOW_ROUNDS, SHOW_STEPS, POOL } from './show';
import type { Book } from '../server/engine';
export const BOOK: Book = { tiles: TILES };
/** Showpaket mit festem Ablauf + erweiterter Fragenpool (wird zusammen mit dem klassischen Standardpaket installiert). */
export const SEED_SHOW = { pack: SHOW_PACK, pool: POOL, rounds: SHOW_ROUNDS, steps: SHOW_STEPS };
export { TILES, SEED_PACK };
