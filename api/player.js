import {
  deriveUid, readPlayer, writePlayer, newPlayer, applyTopup,
  creditReferralLand, cleanName, cleanCountry, ECON
} from './_shared.js';

// Get-or-create the player's wallet by device secret. Applies the once-a-day
// login top-up and, on first creation, the referral "land" credit to the inviter.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ err: 'method' });
  const b = req.body || {};
  const uid = deriveUid(b.auth);
  if (!uid) return res.status(400).json({ err: 'auth' });

  let p = await readPlayer(uid);
  const created = !p;
  if (created) p = newPlayer(uid);

  // only persist when something actually changed — a pure read must NOT write,
  // or it can clobber a concurrent grant (e.g. a referral credit) under Blob's
  // eventual consistency
  let dirty = created, refLanded = 0;
  if (created && typeof b.ref === 'string' && /^[a-f0-9]{16}$/.test(b.ref) && b.ref !== uid) {
    p.by = b.ref;
    refLanded = await creditReferralLand(b.ref);
  }
  if (b.name) { const n = cleanName(b.name); if (n && n !== p.n) { p.n = n; dirty = true; } }
  if (typeof b.country === 'string') { const c = cleanCountry(b.country); if (c !== p.c) { p.c = c; dirty = true; } }
  const topup = applyTopup(p);
  if (topup) dirty = true;
  if (dirty) await writePlayer(p);

  return res.status(200).json({
    ok: 1, uid, cr: p.cr, topup, created,
    refCode: uid, refAcc: p.refAcc || 0, refEarn: p.refEarn || 0,
    referred: !!p.by, accepted: !!p.acc,
    lastDaily: p.lastDaily || '', streak: p.streak || 0,
    econ: { customCost: ECON.customCost }
  });
}
