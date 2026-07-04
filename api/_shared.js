import crypto from 'node:crypto';
import { put, list } from '@vercel/blob';

/* ---- scoring (mirrored in the client — keep in sync) ---- */
export const DIFF_MULT = { classic: 1, hard: 1.3, legend: 1.7 };
export const DRAFT_MULT = { classic: 1, era: 1.15, dynasty: 1.2, cap: 1.3 };
export const POOL_MULT = { all: 1, p90: 0.9, p06: 0.8 };

/* featured challenge of the day — mirrored in src/game-core.js FEATURED */
export const FEATURED = [
  { n: "Legend Day", draft: "classic", diff: "legend", pool: "all", form: "4-3-3" },
  { n: "Modern Masters", draft: "classic", diff: "hard", pool: "p90", form: "4-2-3-1" },
  { n: "Samba Dynasty", draft: "dynasty", dyn: "Brazil", diff: "classic", pool: "all", form: "4-2-3-1" },
  { n: "Time Traveller", draft: "era", diff: "classic", pool: "all", form: "4-4-2" },
  { n: "Moneyball", draft: "cap", diff: "classic", pool: "all", form: "4-4-2" },
  { n: "New School", draft: "classic", diff: "classic", pool: "p06", form: "4-3-3" },
  { n: "Catenaccio Night", draft: "classic", diff: "hard", pool: "all", form: "4-5-1" },
  { n: "Three Lions… er, Dynasty", draft: "dynasty", dyn: "England", diff: "classic", pool: "all", form: "4-4-2" },
  { n: "Era Tour: Hard Mode", draft: "era", diff: "hard", pool: "all", form: "4-3-3" },
  { n: "Wing-back Wednesday-ish", draft: "classic", diff: "classic", pool: "all", form: "3-5-2" }
];
export function featuredFor(day) {
  let h = 0; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return FEATURED[h % FEATURED.length];
}
export const FEAT_MULT = 1.15;
export function matchesFeatured(flags, day) {
  const f = featuredFor(day || utcDay());
  return !!flags.daily && flags.draft === f.draft && flags.diff === f.diff && flags.pool === f.pool
    && flags.form === f.form && (f.dyn ? flags.dyn === f.dyn : true);
}

export function validateRun(matches) {
  if (!Array.isArray(matches) || matches.length < 3 || matches.length > 7) return 'matches';
  for (let i = 0; i < matches.length; i++) {
    const x = matches[i];
    if (!x || typeof x !== 'object') return 'match';
    if (!Number.isInteger(x.gf) || !Number.isInteger(x.ga) || x.gf < 0 || x.ga < 0 || x.gf > 12 || x.ga > 12) return 'goals';
    const knock = i >= 3;
    if (!knock) {
      if (x.et || x.pw != null) return 'group';
    } else {
      if (x.gf === x.ga) {
        if (x.et !== true || typeof x.pw !== 'boolean') return 'pens';
      } else {
        if (x.pw != null || typeof x.et !== 'boolean') return 'knock';
      }
      const lost = x.gf < x.ga || (x.gf === x.ga && x.pw === false);
      if (lost && i !== matches.length - 1) return 'continued-after-loss';
    }
  }
  // a run that ends before the final must end in elimination
  if (matches.length > 3 && matches.length < 7) {
    const last = matches[matches.length - 1];
    const lost = last.gf < last.ga || (last.gf === last.ga && last.pw === false);
    if (!lost) return 'unfinished';
  }
  return null;
}

export function scoreRun(matches, flags) {
  let pts = 0, reg = 0;
  matches.forEach((x, i) => {
    const knock = i >= 3;
    if (x.gf > x.ga) { pts += x.et ? 85 : 100; if (!x.et) reg++; }
    else if (x.gf === x.ga) { pts += knock ? (x.pw ? 70 : 25) : 40; }
    pts += x.gf * 4 - x.ga * 2;
  });
  const last = matches[matches.length - 1];
  const lastWon = last && (last.gf > last.ga || (last.gf === last.ga && last.pw === true));
  const champion = matches.length === 7 && lastWon;
  if (champion) pts += 200;
  const perfect = champion && reg === 7 && matches.every(x => x.gf > x.ga && !x.et);
  if (perfect) pts += 300;
  pts = Math.max(0, pts);
  const feat = matchesFeatured(flags, flags.day);
  const mult = (DIFF_MULT[flags.diff] || 1) * (DRAFT_MULT[flags.draft] || 1) * (POOL_MULT[flags.pool] ?? 1)
    * (flags.daily ? 1.1 : 1) * (feat ? FEAT_MULT : 1);
  return { pts: Math.round(pts * mult), champion, perfect, feat };
}

/* ---- run token (proves a plausible playtime; not credit-related) ---- */
export function signToken(t) {
  return crypto.createHmac('sha256', process.env.TOKEN_KEY || '').update('run:' + t).digest('hex');
}
export function signRun(kind, t, uid) {
  return crypto.createHmac('sha256', process.env.TOKEN_KEY || '')
    .update(kind + ':' + t + ':' + (uid || '')).digest('hex');
}
export function verifyRun(tok) {
  if (!tok || !tok.t || !tok.s) return null;
  if (['paid', 'daily', 'free'].includes(tok.k)) {
    return tok.s === signRun(tok.k, tok.t, tok.u || '') ? { t: tok.t, kind: tok.k, uid: tok.u || '' } : null;
  }
  return tok.s === signToken(tok.t) ? { t: tok.t, kind: 'free', uid: '' } : null;
}

/* ---- email / drip plumbing ---- */
export function encryptEmail(email) {
  const key = Buffer.from(process.env.EMAIL_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(email, 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), ct: ct.toString('base64'), tag: c.getAuthTag().toString('base64') };
}
export function decryptEmail(rec) {
  const key = Buffer.from(process.env.EMAIL_KEY, 'hex');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(rec.iv, 'base64'));
  d.setAuthTag(Buffer.from(rec.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(rec.ct, 'base64')), d.final()]).toString('utf8');
}
export const emailHash = e => crypto.createHash('sha256').update(e.trim().toLowerCase()).digest('hex').slice(0, 32);
export const signUnsub = h => crypto.createHmac('sha256', process.env.TOKEN_KEY || '').update('unsub:' + h).digest('hex').slice(0, 32);

/* one drip subscriber per email (hash-keyed): encrypted address + lifecycle state */
export async function readSub(h) {
  try {
    const { blobs } = await list({ prefix: `subs/${h}.json`, limit: 1 });
    if (!blobs.length) return null;
    const r = await fetch(blobs[0].url + '?v=' + Date.now());
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
export async function writeSub(s) {
  await put(`subs/${s.h}.json`, JSON.stringify(s), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
}
// upsert on a played-and-emailed run — tracks activity for the drip campaign
export async function upsertSub({ email, name, country, streak, champion }) {
  const h = emailHash(email), today = utcDay(), enc = encryptEmail(email);
  let s = await readSub(h);
  if (!s) s = { v: 1, h, created: today, runs: 0, champs: 0, sent: {}, unsub: false };
  Object.assign(s, enc);                 // refresh ciphertext
  s.n = name; if (country) s.c = country;
  s.lastPlayed = today;
  s.streak = streak || s.streak || 0;
  s.best = Math.max(s.best || 0, s.streak);
  s.runs = (s.runs || 0) + 1;
  if (champion) s.champs = (s.champs || 0) + 1;
  s.unsub = false;                       // opting in again re-subscribes
  await writeSub(s);
  return s;
}

/* ---- input hygiene ---- */
const BAD = /(fuck|shit|cunt|nigg|fag|wank|twat|bitch|cock|dick|piss)/i;
export function cleanName(raw) {
  const n = String(raw || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (n.length < 2) return null;
  if (/https?:|www\.|@/i.test(n)) return null;
  if (BAD.test(n)) return null;
  return n;
}
export function cleanCountry(raw) {
  const c = String(raw || '').toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : '';
}
export function cleanXI(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 11).map(p => {
    if (!Array.isArray(p)) return null;
    const name = String(p[0] || '').replace(/[<>&"'`\\]/g, '').slice(0, 32);
    const year = Number.isInteger(p[1]) && p[1] >= 1930 && p[1] <= 2030 ? p[1] : 0;
    const flag = String(p[2] || '').slice(0, 8);
    return name ? [name, year, flag] : null;
  }).filter(Boolean);
}

/* ---- aggregate leaderboards in Blob ---- */
export async function readAgg(key) {
  try {
    const { blobs } = await list({ prefix: `agg/${key}.json`, limit: 1 });
    if (!blobs.length) return { count: 0, top: [] };
    const r = await fetch(blobs[0].url + '?v=' + Date.now());
    if (!r.ok) return { count: 0, top: [] };
    const j = await r.json();
    return { count: j.count || 0, top: Array.isArray(j.top) ? j.top : [], updated: j.updated || 0 };
  } catch {
    return { count: 0, top: [] };
  }
}
export async function writeAgg(key, agg) {
  await put(`agg/${key}.json`, JSON.stringify(agg), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60
  });
}
const aggKey = e => e.n.toLowerCase() + '|' + (e.c || '');
// inserts entry, dedupes by name+country keeping the best, returns 1-based rank or null
export function mergeTop(agg, entry) {
  agg.count = (agg.count || 0) + 1;
  const top = agg.top || [];
  const same = top.find(e => aggKey(e) === aggKey(entry));
  if (same) { if (entry.p > same.p) Object.assign(same, entry); }
  else top.push(entry);
  top.sort((a, b) => b.p - a.p || a.ts - b.ts);
  agg.top = top.slice(0, 100);
  agg.updated = Date.now();
  const i = agg.top.findIndex(e => aggKey(e) === aggKey(entry));
  return i >= 0 ? i + 1 : null;
}

export const utcDay = () => new Date().toISOString().slice(0, 10);
export const utcYesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

/* ---- daily-regulars streak board ---- */
export function bumpStreak(agg, entry, pts) {
  const key = e => e.n.toLowerCase() + '|' + (e.c || '');
  let e = (agg.top = agg.top || []).find(x => key(x) === key(entry));
  if (!e) { e = { n: entry.n, c: entry.c, streak: 0, best: 0, days: 0, tp: 0, last: '' }; agg.top.push(e); }
  const today = utcDay();
  if (e.last !== today) {
    e.streak = e.last === utcYesterday() ? e.streak + 1 : 1;
    e.best = Math.max(e.best, e.streak);
    e.days++; e.tp += pts; e.last = today;
    e.n = entry.n; e.c = entry.c;
  }
  agg.top.sort((a, b) => b.streak - a.streak || b.days - a.days || b.tp - a.tp);
  agg.top = agg.top.slice(0, 200);
  agg.count = agg.top.length;
  agg.updated = Date.now();
  return e.streak;
}
