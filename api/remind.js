import { list } from '@vercel/blob';
import { decryptEmail, writeSub, signUnsub, utcDay } from './_shared.js';

const SITE = 'https://seven-zero-navy.vercel.app';

/* ---------- lifecycle drip ----------
   A daily cron walks every opted-in subscriber and sends at most one email,
   chosen by where they are in their lifecycle (welcome → streak nudges →
   win-back). State (what's been sent) lives on the subscriber record. */

const daysSince = (last, today) =>
  last ? Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(last + 'T00:00:00Z')) / 864e5) : 999;

function decide(sub, today) {
  const d = daysSince(sub.lastPlayed, today), sent = sub.sent || {}, st = sub.streak || 0;
  if (!sent.welcome) return 'welcome';
  if ([3, 7, 14, 30].includes(st) && d <= 1 && !sent['ms' + st]) return 'ms';
  if (st >= 2 && d === 1 && sent.risk !== today) return 'risk';        // streak alive, not yet played today
  if (st < 2 && d === 1 && sent.daily !== today) return 'daily';       // played yesterday, gentle nudge
  if (d === 3 && !sent.wb3) return 'wb3';
  if (d >= 7 && d < 30 && !sent.wb7) return 'wb7';
  return null;
}

const cta = (label) => `<a href="${SITE}" style="display:inline-block;background:#e3b34c;color:#241a06;font-weight:800;padding:13px 24px;border-radius:8px;text-decoration:none;font-size:15px">${label}</a>`;
function wrap(inner, unsub) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:26px;background:#06231b;color:#f3ecd9;border-radius:14px">
    <div style="font-size:32px;font-weight:900;letter-spacing:-1px">7<span style="color:#e3b34c">-</span>0</div>
    ${inner}
    <p style="font-size:11px;color:#8a8472;margin-top:22px">You opted in when saving a score in 7-0. <a href="${unsub}" style="color:#bdb49c">Unsubscribe</a> anytime.</p>
  </div>`;
}

function template(kind, sub) {
  const name = (sub.n || 'manager').replace(/[<>]/g, ''), st = sub.streak || 0;
  switch (kind) {
    case 'welcome': return { subject: 'Welcome to 7-0 ⚽', inner:
      `<p style="font-size:15px;line-height:1.55">Hi ${name} — you're in. Draft a World Cup XI from 75 years of legends, name your captain, and live out the whole tournament. Win all seven in normal time for the perfect <b>7-0</b>.</p>
       <p style="font-size:15px;line-height:1.55">You get <b>one free run a day</b> — build a streak and climb the world board.</p>${cta('Play today&rsquo;s run →')}` };
    case 'ms': return { subject: `🔥 ${st}-day streak!`, inner:
      `<p style="font-size:15px;line-height:1.55">Hi ${name} — that's <b>${st} days in a row</b>. You're officially one of the 7-0 regulars. Keep it rolling.</p>${cta('Play today →')}` };
    case 'risk': return { subject: `🔥 Your ${st}-day streak ends tonight`, inner:
      `<p style="font-size:15px;line-height:1.55">Hi ${name}, your <b>${st}-day streak</b> is still alive — but it breaks at midnight UTC. Two minutes is all it takes.</p>${cta('Keep the streak →')}` };
    case 'daily': return { subject: '⚽ Today&rsquo;s 7-0 run is live', inner:
      `<p style="font-size:15px;line-height:1.55">Hi ${name} — a fresh run is waiting. One XI, seven games, your shot at the perfect seven.</p>${cta('Play today&rsquo;s run →')}` };
    case 'wb3': return { subject: 'Your XI misses you 👀', inner:
      `<p style="font-size:15px;line-height:1.55">Hi ${name} — it's been a few days. Your next World Cup XI is one tap away, and the board won't climb itself.</p>${cta('Come back →')}` };
    case 'wb7': return { subject: 'New legends just landed in 7-0', inner:
      `<p style="font-size:15px;line-height:1.55">Hi ${name} — we've added the <b>2026 contenders</b>: Mbappé, Yamal, Bellingham, Vinícius and more. Come draft them into your all-time XI.</p>${cta('Play 7-0 →')}` };
  }
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ err: 'auth' });
  const today = utcDay();
  const live = !!process.env.RESEND_API_KEY;

  // suppression list (older unsubscribes that predate the unsub flag)
  const suppressed = new Set();
  for (const b of (await list({ prefix: 'suppress/' })).blobs) {
    const m = b.pathname.match(/suppress\/([a-f0-9]{32})/); if (m) suppressed.add(m[1]);
  }

  const tally = {}; let sent = 0, eligible = 0, cursor;
  do {
    const page = await list({ prefix: 'subs/', cursor });
    cursor = page.cursor;
    for (const b of page.blobs) {
      let sub; try { sub = await (await fetch(b.url + '?v=' + Date.now())).json(); } catch { continue; }
      if (!sub || sub.unsub || suppressed.has(sub.h)) continue;
      const kind = decide(sub, today);
      if (!kind) continue;
      eligible++;
      tally[kind] = (tally[kind] || 0) + 1;
      if (!live) continue;
      let email; try { email = decryptEmail(sub); } catch { continue; }
      const unsub = `${SITE}/api/unsubscribe?h=${sub.h}&s=${signUnsub(sub.h)}`;
      const t = template(kind, sub);
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: process.env.REMIND_FROM || '7-0 <onboarding@resend.dev>', to: email, subject: t.subject, html: wrap(t.inner, unsub) })
        });
        if (r.ok) {
          sub.sent = sub.sent || {};
          sub.sent[kind === 'ms' ? 'ms' + (sub.streak || 0) : kind] = today;
          await writeSub(sub);
          sent++;
        }
      } catch { /* skip on send error */ }
    }
  } while (cursor);

  return res.status(200).json({ ok: 1, day: today, sent, eligible, byKind: tally, dryRun: !live });
}
