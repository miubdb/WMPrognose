import { migrate, closePool } from '../src/lib/db';

migrate()
  .then((applied) => {
    console.log(applied.length ? `Angewendet: ${applied.join(', ')}` : 'Schema ist aktuell.');
    return closePool();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
