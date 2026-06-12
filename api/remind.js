import { list } from '@vercel/blob';
import { decryptEmail, emailHash, signUnsub, utcDay } from './_shared.js';

const SITE = 'https://seven-zero-navy.vercel.app';

// Daily reminder, fired by Vercel Cron (vercel.json). Collects opted-in
// emails (decrypted in memory only), drops unsubscribed ones, and sends via
// Resend when RESEND_API_KEY is configured — otherwise reports a dry run.
export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ err: 'auth' });
  }

  const suppressed = new Set();
  for (const b of (await list({ prefix: 'suppress/' })).blobs) {
    const m = b.pathname.match(/suppress\/([a-f0-9]{32})/);
    if (m) suppressed.add(m[1]);
  }

  const recipients = new Map(); // hash → {email, name}
  let cursor;
  do {
    const r = await list({ prefix: 'emails/', cursor });
    cursor = r.cursor;
    for (const b of r.blobs) {
      try {
        const rec = await (await fetch(b.url)).json();
        const email = decryptEmail(rec);
        const h = emailHash(email);
        if (!suppressed.has(h) && !recipients.has(h)) recipients.set(h, { email, name: rec.n || 'manager' });
      } catch { /* skip undecryptable blobs */ }
    }
  } while (cursor);

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ ok: 1, sent: 0, eligible: recipients.size, dryRun: true, note: 'set RESEND_API_KEY to enable sending' });
  }

  const day = utcDay();
  let sent = 0, errors = 0;
  for (const [h, { email, name }] of recipients) {
    const unsub = `${SITE}/api/unsubscribe?h=${h}&s=${signUnsub(h)}`;
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#06231b;color:#f3ecd9;border-radius:12px">
        <div style="font-size:30px;font-weight:900;letter-spacing:-1px">7<span style="color:#e3b34c">-</span>0</div>
        <p style="font-size:15px;line-height:1.5">Hi ${name} — today's Daily Challenge (<b>${day}</b>) is live. Same wheel for everyone on Earth, one run, your streak on the line. 🔥</p>
        <a href="${SITE}" style="display:inline-block;background:#e3b34c;color:#241a06;font-weight:800;padding:12px 22px;border-radius:8px;text-decoration:none">Play today's run →</a>
        <p style="font-size:12px;color:#bdb49c;margin-top:22px">Seven wins in normal time. You know what to do.</p>
        <p style="font-size:11px;color:#8a8472;margin-top:18px">You opted in when saving your score. <a href="${unsub}" style="color:#bdb49c">Unsubscribe</a> anytime.</p>
      </div>`;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.REMIND_FROM || '7-0 <onboarding@resend.dev>',
          to: email,
          subject: `⚽ Today's 7-0 challenge is live — one run, make it count`,
          html
        })
      });
      r.ok ? sent++ : errors++;
    } catch { errors++; }
  }
  return res.status(200).json({ ok: 1, sent, errors, eligible: recipients.size });
}
