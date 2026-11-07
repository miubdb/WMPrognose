import { TILES, SEED_PACK } from './tiles';
import { SHOW_PACK, SHOW_ROUNDS, SHOW_STEPS, POOL } from './show';
import type { Book } from '../server/engine';
export const BOOK: Book = { tiles: TILES };
/** Showpaket mit festem Ablauf + erweiterter Fragenpool (wird zusammen mit dem klassischen Standardpaket installiert). */
export const SEED_SHOW = { pack: SHOW_PACK, pool: POOL, rounds: SHOW_ROUNDS, steps: SHOW_STEPS };
import { SEED_SHOW2 } from './show2';
import { SEED_SHOW3, SEED_SHOW4 } from './show3';
import { SEED_SHOW_B42, SEED_SHOW_B42K } from './bestof';
import { SEED_SHOW_B43, SEED_SHOW_B43K } from './bestof2';
import { SEED_SHOW_B44, SEED_SHOW_B44K } from './bestof3';
export const EXTRA_SHOWS = [SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, SEED_SHOW_B42, SEED_SHOW_B42K, SEED_SHOW_B44, SEED_SHOW_B44K];   // show-5 / show-4z: Stand Praxistest 4 (enthält den Inhalt der Praxistest-3-Fassung B43 als Basis)
export { TILES, SEED_PACK, SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, SEED_SHOW_B42, SEED_SHOW_B42K, SEED_SHOW_B43, SEED_SHOW_B43K, SEED_SHOW_B44, SEED_SHOW_B44K };
