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
let cursor;
do {
  const page = await list({ prefix: 'emails/', cursor, limit: 1000 });
  for (const b of page.blobs) {
    try {
      const rec = await (await fetch(b.url)).json();
      rows.push({ name: rec.n || '', email: decrypt(rec), date: new Date(rec.ts).toISOString() });
    } catch (e) {
      console.error('skip', b.pathname, e.message);
    }
  }
  cursor = page.cursor;
} while (cursor);

// dedupe by email, keep earliest signup
const seen = new Map();
for (const r of rows.sort((a, b) => a.date.localeCompare(b.date))) {
  if (!seen.has(r.email.toLowerCase())) seen.set(r.email.toLowerCase(), r);
}
const esc = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
console.log('name,email,signup_date');
for (const r of seen.values()) console.log([r.name, r.email, r.date].map(esc).join(','));
console.error(`\n${seen.size} unique emails (${rows.length} records)`);
