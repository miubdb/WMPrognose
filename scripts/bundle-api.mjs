// Bündelt die Vercel-Function (api-src/handler.ts) zu EINER Datei api/index.js.
// Grund: Vercel führt TypeScript sonst Datei für Datei aus; die extensionslosen Importe des Projekts würden unter ESM scheitern.
// Die erzeugte Datei wird eingecheckt (Vercel erkennt Functions anhand des Repository-Inhalts) – nach Änderungen: npm run bundle:api
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
mkdirSync('api', { recursive: true });
await build({
  entryPoints: ['api-src/handler.ts'], outfile: 'api/index.js', bundle: true, platform: 'node', format: 'esm', target: 'node22',
  external: ['node:*'], sourcemap: false, legalComments: 'none', logLevel: 'info',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
