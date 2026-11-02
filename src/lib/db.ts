import fs from 'node:fs';
import path from 'node:path';
import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

// date -> 'YYYY-MM-DD' String (keine Zeitzonen-Verschiebung), numeric/int8 -> number
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

type G = typeof globalThis & { __rtmPool?: Pool; __rtmMigrated?: Promise<void> };
const g = globalThis as G;

export function getPool(): Pool {
  if (g.__rtmPool) return g.__rtmPool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL ist nicht gesetzt. Die App benötigt eine PostgreSQL-Datenbank (siehe README).');
  }
  const ssl = process.env.DATABASE_SSL === 'disable' || /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false };
  g.__rtmPool = new Pool({ connectionString: url, ssl, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
  return g.__rtmPool;
}

export async function closePool(): Promise<void> {
  if (g.__rtmPool) {
    await g.__rtmPool.end();
    g.__rtmPool = undefined;
    g.__rtmMigrated = undefined;
  }
}

export async function migrate(pool: Pool = getPool()): Promise<string[]> {
  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        applied.push(f);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f} fehlgeschlagen: ${(e as Error).message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => undefined);
    client.release();
  }
  return applied;
}

/** Führt ausstehende Migrationen einmal pro Prozess aus. */
export function ensureMigrated(): Promise<void> {
  if (!g.__rtmMigrated) {
    g.__rtmMigrated = migrate().then(() => undefined).catch((e) => {
      g.__rtmMigrated = undefined;
      throw e;
    });
  }
  return g.__rtmMigrated;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureMigrated();
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await ensureMigrated();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
