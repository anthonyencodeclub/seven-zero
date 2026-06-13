import {
  deriveUid, readPlayer, writePlayer, newPlayer, applyTopup, signRun, ECON, utcDay
} from './_shared.js';

// Reserve a run. Daily is free (once/day, marked at score time so an abandon
// doesn't burn it). A custom run debits the entry fee up front — that debit IS
// the "spend a life" moment; abandoning forfeits it. Returns a typed run token
// the client must submit to /api/score; only this endpoint can mint paid/daily.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ err: 'method' });
  const b = req.body || {};
  const uid = deriveUid(b.auth);
  if (!uid) return res.status(400).json({ err: 'auth' });

  const existing = await readPlayer(uid);
  const p = existing || newPlayer(uid);
  let dirty = !existing;            // a brand-new wallet must be persisted
  if (applyTopup(p) > 0) dirty = true;
  const t = Date.now();

  if (b.daily === true) {
    // daily issuance doesn't mutate the wallet (lastDaily is set at score time)
    if (p.lastDaily === utcDay()) { if (dirty) await writePlayer(p); return res.status(409).json({ err: 'daily-used', cr: p.cr }); }
    if (dirty) await writePlayer(p);
    return res.status(200).json({ ok: 1, cr: p.cr, token: { t, k: 'daily', u: uid, s: signRun('daily', t, uid) } });
  }

  if ((p.cr || 0) < ECON.customCost) { if (dirty) await writePlayer(p); return res.status(402).json({ err: 'insufficient', cr: p.cr, need: ECON.customCost }); }
  p.cr -= ECON.customCost;
  p.spent = (p.spent || 0) + ECON.customCost;
  await writePlayer(p);
  return res.status(200).json({ ok: 1, cr: p.cr, spent: ECON.customCost, token: { t, k: 'paid', u: uid, s: signRun('paid', t, uid) } });
}
