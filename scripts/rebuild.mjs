// Rebuild leaderboard aggregates from the per-run score blobs (source of truth).
// Also the moderation tool: --remove-name "SomeName" deletes that player's runs first.
// Usage: node scripts/rebuild.mjs [--remove-name NAME]
import { loadEnv } from './_env.mjs';
loadEnv();
const { list, del, put } = await import('@vercel/blob');

const ri = process.argv.indexOf('--remove-name');
const removeName = ri > -1 ? (process.argv[ri + 1] || '').toLowerCase() : null;

const entries = [];
let cursor;
do {
  const page = await list({ prefix: 'scores/', cursor, limit: 1000 });
  for (const b of page.blobs) {
    try {
      const e = await (await fetch(b.url)).json();
      if (removeName && (e.n || '').toLowerCase() === removeName) {
        await del(b.url);
        console.error('deleted run by', e.n, b.pathname);
        continue;
      }
      entries.push(e);
    } catch (err) { console.error('skip', b.pathname, err.message); }
  }
  cursor = page.cursor;
} while (cursor);

const key = e => e.n.toLowerCase() + '|' + (e.c || '');
function buildAgg(list_) {
  const best = new Map();
  for (const e of list_) {
    const k = key(e);
    if (!best.has(k) || e.p > best.get(k).p) best.set(k, e);
  }
  const top = [...best.values()].sort((a, b) => b.p - a.p || a.ts - b.ts).slice(0, 100);
  return { count: list_.length, top, updated: Date.now() };
}
async function write(k, agg) {
  await put(`agg/${k}.json`, JSON.stringify(agg), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60
  });
  console.error(`agg/${k}.json ← ${agg.count} runs, top ${agg.top.length}`);
}

await write('alltime', buildAgg(entries));
const dailies = new Map();
// rewrite every daily aggregate that already exists, even if it ends up empty
const existing = await list({ prefix: 'agg/daily-' });
for (const b of existing.blobs) {
  const dt = b.pathname.match(/daily-(\d{4}-\d{2}-\d{2})/)?.[1];
  if (dt) dailies.set(dt, []);
}
for (const e of entries.filter(e => e.dl)) {
  if (!dailies.has(e.dt)) dailies.set(e.dt, []);
  dailies.get(e.dt).push(e);
}
for (const [dt, list_] of dailies) await write('daily-' + dt, buildAgg(list_));
console.error('done');
