import crypto from 'node:crypto';
import { put, list } from '@vercel/blob';

/* ---- scoring (mirrored in the client — keep in sync) ---- */
export const DIFF_MULT = { classic: 1, hard: 1.3, legend: 1.7 };
export const DRAFT_MULT = { classic: 1, era: 1.15, dynasty: 1.2, cap: 1.3 };
export const POOL_MULT = { all: 1, p90: 0.9, p06: 0.8 };

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
  const mult = (DIFF_MULT[flags.diff] || 1) * (DRAFT_MULT[flags.draft] || 1) * (POOL_MULT[flags.pool] ?? 1) * (flags.daily ? 1.1 : 1);
  return { pts: Math.round(pts * mult), champion, perfect };
}

/* ---- run token ---- */
export function signToken(t) {
  return crypto.createHmac('sha256', process.env.TOKEN_KEY || '').update('run:' + t).digest('hex');
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
