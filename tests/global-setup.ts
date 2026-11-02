// Vitest-Globalsetup: setzt die Test-DB-URL (eigene Datenbank rtm_test, wird pro Testlauf neu aufgebaut).
import { Client } from 'pg';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://rtm:rtm@localhost:5432/rtm_test';
  process.env.DATABASE_URL = url;
  process.env.DATABASE_SSL = 'disable';
  process.env.APP_ENV_TEST = '1';
  process.env.APP_TODAY = '2026-11-05';
  process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-12';
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await c.end();
}
