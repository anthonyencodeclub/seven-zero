import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// load .env.local (vercel env pull format) into process.env
export function loadEnv() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const txt = readFileSync(join(root, '.env.local'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="(.*)"\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
