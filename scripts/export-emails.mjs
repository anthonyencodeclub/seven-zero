// Decrypt and export the opt-in email list as CSV (stdout).
// Usage: npm run export-emails   (needs .env.local — `vercel env pull .env.local`)
import crypto from 'node:crypto';
import { loadEnv } from './_env.mjs';
loadEnv();
const { list } = await import('@vercel/blob');

function decrypt(rec) {
  const key = Buffer.from(process.env.EMAIL_KEY, 'hex');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(rec.iv, 'base64'));
  d.setAuthTag(Buffer.from(rec.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(rec.ct, 'base64')), d.final()]).toString('utf8');
}

const rows = [];
// new model: one subscriber record per email (subs/) with lifecycle state; emails/ is legacy
for (const prefix of ['subs/', 'emails/']) {
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) {
      try {
        const rec = await (await fetch(b.url)).json();
        rows.push({
          name: rec.n || '', email: decrypt(rec),
          subscribed: rec.unsub ? 'no' : 'yes',
          last_played: rec.lastPlayed || '', streak: rec.streak ?? '', runs: rec.runs ?? '',
          date: new Date(rec.created ? Date.parse(rec.created) : (rec.ts || Date.now())).toISOString()
        });
      } catch (e) { console.error('skip', b.pathname, e.message); }
    }
    cursor = page.cursor;
  } while (cursor);
}

// dedupe by email, prefer the richer subs/ record (one with activity)
const seen = new Map();
for (const r of rows.sort((a, b) => a.date.localeCompare(b.date))) {
  const k = r.email.toLowerCase();
  if (!seen.has(k) || (r.last_played && !seen.get(k).last_played)) seen.set(k, r);
}
const esc = s => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
console.log('name,email,subscribed,last_played,streak,runs,signup_date');
for (const r of seen.values()) console.log([r.name, r.email, r.subscribed, r.last_played, r.streak, r.runs, r.date].map(esc).join(','));
console.error(`\n${seen.size} unique emails (${rows.length} records)`);
