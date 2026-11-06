import { TILES, SEED_PACK } from './tiles';
import { SHOW_PACK, SHOW_ROUNDS, SHOW_STEPS, POOL } from './show';
import type { Book } from '../server/engine';
export const BOOK: Book = { tiles: TILES };
/** Showpaket mit festem Ablauf + erweiterter Fragenpool (wird zusammen mit dem klassischen Standardpaket installiert). */
export const SEED_SHOW = { pack: SHOW_PACK, pool: POOL, rounds: SHOW_ROUNDS, steps: SHOW_STEPS };
import { SEED_SHOW2 } from './show2';
import { SEED_SHOW3, SEED_SHOW4 } from './show3';
import { SEED_SHOW_B42, SEED_SHOW_B42K } from './bestof';
export const EXTRA_SHOWS = [SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, SEED_SHOW_B42, SEED_SHOW_B42K];
export { TILES, SEED_PACK, SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, SEED_SHOW_B42, SEED_SHOW_B42K };
