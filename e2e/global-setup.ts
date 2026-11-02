import { Client } from 'pg';

// Setzt die E2E-Datenbank vor jedem Lauf auf einen leeren Zustand zurück (die App migriert beim Start selbst).
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? 'postgres://rtm:rtm@localhost:5432/rtm_e2e';
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await c.end();
}
