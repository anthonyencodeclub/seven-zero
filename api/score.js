import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import {
  validateRun, scoreRun, verifyRun, cleanName, cleanCountry, cleanXI,
  readAgg, writeAgg, mergeTop, bumpStreak, upsertSub, utcDay
} from './_shared.js';

const MIN_AGE_MS = 45_000;        // shortest believable full run
const MAX_AGE_MS = 6 * 3600_000;  // token shelf life

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ err: 'method' });
  const b = req.body;
  if (!b || typeof b !== 'object') return res.status(400).json({ err: 'body' });
  try { if (JSON.stringify(b).length > 8000) return res.status(413).json({ err: 'size' }); }
  catch { return res.status(400).json({ err: 'body' }); }

  // honeypot: real client always sends web:"" — bots that fill it get a quiet yes
  if (b.web) return res.status(200).json({ ok: 1, rank: null });

  // run token: proves a plausible playtime + carries run kind/uid (QA header bypasses age only)
  const qa = req.headers['x-qa-key'] && req.headers['x-qa-key'] === process.env.TOKEN_KEY;
  const v = verifyRun(b.token);
  if (!v) return res.status(401).json({ err: 'token' });
  const age = Date.now() - v.t;
  if (!qa && (age < MIN_AGE_MS || age > MAX_AGE_MS)) return res.status(401).json({ err: 'token-age' });

  const name = cleanName(b.name);
  if (!name) return res.status(422).json({ err: 'name' });
  const country = cleanCountry(b.country);

  const verr = validateRun(b.matches);
  if (verr) return res.status(422).json({ err: 'run:' + verr });

  const draft = ['classic', 'era', 'dynasty', 'cap'].includes(b.draft) ? b.draft : 'classic';
  const diff = ['classic', 'hard', 'legend'].includes(b.diff) ? b.diff : 'classic';
  const pool = ['all', 'p90', 'p06'].includes(b.pool) ? b.pool : 'all';
  const daily = b.daily === true;
  const form = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-1-2-1-2', '4-5-1'].includes(b.form) ? b.form : '';
  const dynFlag = String(b.dyn || '').slice(0, 14);
  const { pts, champion, perfect, feat } = scoreRun(b.matches, { draft, diff, daily, pool, form, dyn: dynFlag });

  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  b.matches.forEach((x, i) => {
    gf += x.gf; ga += x.ga;
    if (x.gf > x.ga) w++;
    else if (x.gf < x.ga) l++;
    else if (i < 3) d++;
    else (x.pw ? w++ : l++);
  });

  const dyn = draft === 'dynasty' ? String(b.dyn || '').replace(/[^A-Za-z ]/g, '').slice(0, 14) : '';
  const grid = String(b.grid || '').slice(0, 28);
  const entry = {
    n: name, c: country, p: pts,
    g: grid, w, d, l, gf, ga,
    m: (feat ? '⭐' : '') + draft + (dyn ? '(' + dyn + ')' : '') + '·' + diff + (pool !== 'all' ? '·' + (pool === 'p90' ? 'post-90' : 'post-06') : '') + (daily ? '·daily' : ''),
    f: String(b.form || '').slice(0, 10),
    xi: cleanXI(b.xi),
    ch: champion ? 1 : 0, pf: perfect ? 1 : 0,
    dl: daily ? 1 : 0, dt: utcDay(),
    ts: Date.now(), id: crypto.randomBytes(6).toString('hex')
  };

  if (b.dry) return res.status(200).json({ ok: 1, dry: 1, pts, champion, perfect, entry });

  // source of truth: one immutable blob per submitted run
  await put(`scores/${entry.ts}-${entry.id}.json`, JSON.stringify(entry), {
    access: 'public', addRandomSuffix: true, contentType: 'application/json'
  });

  const all = await readAgg('alltime');
  const rank = mergeTop(all, entry);
  await writeAgg('alltime', all);

  let rankDaily = null, countDaily = 0, streak = 0;
  if (daily) {
    const key = 'daily-' + entry.dt;
    const day = await readAgg(key);
    rankDaily = mergeTop(day, entry);
    countDaily = day.count;
    await writeAgg(key, day);
    const streaks = await readAgg('streaks');
    streak = bumpStreak(streaks, entry, pts);
    await writeAgg('streaks', streaks);
  }

  // consented contact → upsert a drip subscriber record (encrypted at rest,
  // never returned by any endpoint), tracking activity for the email campaign
  if (b.optin === true && typeof b.email === 'string') {
    const email = b.email.trim().slice(0, 120);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      try { await upsertSub({ email, name, country, streak, champion }); } catch {}
    }
  }

  return res.status(200).json({ ok: 1, pts, champion, perfect, rank, count: all.count, rankDaily, countDaily });
}
