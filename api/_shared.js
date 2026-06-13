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

/* ---- email reminder plumbing ---- */
export function decryptEmail(rec) {
  const key = Buffer.from(process.env.EMAIL_KEY, 'hex');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(rec.iv, 'base64'));
  d.setAuthTag(Buffer.from(rec.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(rec.ct, 'base64')), d.final()]).toString('utf8');
}
export const emailHash = e => crypto.createHash('sha256').update(e.trim().toLowerCase()).digest('hex').slice(0, 32);
export const signUnsub = h => crypto.createHmac('sha256', process.env.TOKEN_KEY || '').update('unsub:' + h).digest('hex').slice(0, 32);

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

/* ====================================================================
   CREDIT ECONOMY — server-authoritative, single soft currency.
   Daily run is FREE (1/day); custom runs cost credits. Faucet < drain
   for the median player; free Daily + login top-up is the floor so no
   one is ever fully walled out. All balances live in players/<uid>.json.
   (numbers mirrored in src/game-core.js ECON — keep in sync)
==================================================================== */
export const ECON = {
  start: 200,             // new-player balance ≈ 2 custom runs to taste
  customCost: 100,        // a non-daily run
  payDiv: 12, payCap: 90, // payout = min(payCap, round(pts/payDiv)) — keeps faucet < cost
  champBonus: 40, perfectBonus: 120,
  dailyReward: 20, dailyStreakBonus: 20,   // free Daily completion
  loginTopup: 40,                          // once per UTC day
  milestones: { 3: 50, 7: 120, 14: 250, 30: 500 },
  refLand: 20, refLandDayCap: 3,           // inviter, when a new friend lands via their link
  refAcceptInviter: 250, refAcceptFriend: 150,  // when that friend plays a real run
  refLifetimeCap: 25,                      // accepted referrals that still pay
  balanceCap: 100000
};
export function runPayout(pts, champion, perfect) {
  let c = Math.min(ECON.payCap, Math.round(pts / ECON.payDiv));
  if (champion) c += ECON.champBonus;
  if (perfect) c += ECON.perfectBonus;
  return Math.max(0, c);
}

/* ---- device identity: uid is derived from a client secret, so you can't
   claim another uid without its secret, and the secret never leaves the client ---- */
export function deriveUid(auth) {
  if (!/^[a-f0-9]{16,64}$/.test(String(auth || ''))) return null;
  return crypto.createHash('sha256').update('uid:' + auth).digest('hex').slice(0, 16);
}
export function newPlayer(uid) {
  return {
    uid, created: Date.now(), seen: Date.now(),
    cr: ECON.start, topup: utcDay(), lastDaily: '', streak: 0, best: 0,
    by: '', acc: 0, refDay: '', refLandToday: 0, refAcc: 0, refEarn: 0,
    runs: 0, earned: 0, spent: 0, grants: [], n: '', c: ''
  };
}
export async function readPlayer(uid) {
  if (!uid) return null;
  try {
    const { blobs } = await list({ prefix: `players/${uid}.json`, limit: 1 });
    if (!blobs.length) return null;
    const r = await fetch(blobs[0].url + '?v=' + Date.now());
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
export async function writePlayer(p) {
  p.seen = Date.now();
  if (p.cr > ECON.balanceCap) p.cr = ECON.balanceCap;
  await put(`players/${p.uid}.json`, JSON.stringify(p), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
}
export function applyTopup(p) {
  const d = utcDay();
  if (p.topup !== d) { p.cr = (p.cr || 0) + ECON.loginTopup; p.topup = d; return ECON.loginTopup; }
  return 0;
}

/* ---- typed run tokens: only the server can mint paid/daily (needs TOKEN_KEY),
   and it only does so after debiting / checking the daily. uid is bound in. ---- */
export function signRun(kind, t, uid) {
  return crypto.createHmac('sha256', process.env.TOKEN_KEY || '')
    .update(kind + ':' + t + ':' + (uid || '')).digest('hex');
}
export function verifyRun(tok) {
  if (!tok || !tok.t || !tok.s) return null;
  if (['paid', 'daily', 'free'].includes(tok.k)) {
    return tok.s === signRun(tok.k, tok.t, tok.u || '') ? { t: tok.t, kind: tok.k, uid: tok.u || '' } : null;
  }
  // legacy {t,s} free token
  return tok.s === signToken(tok.t) ? { t: tok.t, kind: 'free', uid: '' } : null;
}

/* ---- referral grants (capped) ---- */
export async function creditReferralLand(inviterUid) {
  const inv = await readPlayer(inviterUid);
  if (!inv) return 0;
  const d = utcDay();
  if (inv.refDay !== d) { inv.refDay = d; inv.refLandToday = 0; }
  if ((inv.refLandToday || 0) >= ECON.refLandDayCap) return 0;
  if ((inv.refAcc || 0) >= ECON.refLifetimeCap) return 0;
  inv.refLandToday++; inv.cr += ECON.refLand; inv.refEarn = (inv.refEarn || 0) + ECON.refLand;
  await writePlayer(inv);
  return ECON.refLand;
}
export async function creditReferralAccept(inviterUid) {
  const inv = await readPlayer(inviterUid);
  if (!inv || (inv.refAcc || 0) >= ECON.refLifetimeCap) return 0;
  inv.refAcc = (inv.refAcc || 0) + 1;
  inv.cr += ECON.refAcceptInviter; inv.refEarn = (inv.refEarn || 0) + ECON.refAcceptInviter;
  await writePlayer(inv);
  return ECON.refAcceptInviter;
}

/* ---- the one place credits are minted from a played run (deduped per token) ---- */
export async function grantRun({ uid, t, kind, pts, champion, perfect, name, country }) {
  const p = (await readPlayer(uid)) || newPlayer(uid);
  if (name) p.n = name;
  if (country) p.c = country;
  p.grants = p.grants || [];
  if (p.grants.includes(t)) return { cr: p.cr, dup: true };
  p.grants.push(t); if (p.grants.length > 40) p.grants = p.grants.slice(-40);

  const breakdown = {};
  let earned = runPayout(pts, champion, perfect);
  breakdown.run = earned;

  if (kind === 'daily') {
    const today = utcDay();
    if (p.lastDaily !== today) {
      const alive = p.lastDaily === utcYesterday();
      p.streak = alive ? (p.streak || 0) + 1 : 1;
      p.best = Math.max(p.best || 0, p.streak);
      p.lastDaily = today;
      const dr = ECON.dailyReward + (alive ? ECON.dailyStreakBonus : 0);
      breakdown.daily = dr; earned += dr;
      if (ECON.milestones[p.streak]) { breakdown.milestone = ECON.milestones[p.streak]; earned += breakdown.milestone; }
    }
  }

  // first valid run by a referred player pays both sides
  if (p.by && !p.acc && /^[a-f0-9]{16}$/.test(p.by) && p.by !== uid) {
    p.acc = 1;
    breakdown.welcome = ECON.refAcceptFriend; earned += ECON.refAcceptFriend;
    await creditReferralAccept(p.by);
  }

  p.cr = (p.cr || 0) + earned;
  p.earned = (p.earned || 0) + earned;
  p.runs = (p.runs || 0) + 1;
  await writePlayer(p);
  return { cr: p.cr, earned, breakdown, streak: p.streak };
}

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
}
