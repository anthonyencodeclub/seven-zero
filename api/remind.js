import { list } from '@vercel/blob';
import { decryptEmail, writeSub, signUnsub, utcDay, featuredFor } from './_shared.js';

const SITE = 'https://sevenzero.app';

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

const cta = (label) => `<a href="${SITE}" style="display:inline-block;background:#e3b34c;color:#241a06;font-weight:800;padding:13px 26px;border-radius:8px;text-decoration:none;font-size:15px">${label}</a>`;
const statline = (sub) => {
  const bits = [];
  if (sub.streak >= 2) bits.push(`🔥 ${sub.streak}-day streak`);
  if (sub.runs) bits.push(`${sub.runs} run${sub.runs === 1 ? '' : 's'} played`);
  if (sub.champs) bits.push(`🏆 ${sub.champs} world title${sub.champs === 1 ? '' : 's'}`);
  return bits.length ? `<p style="font-size:13px;color:#e3b34c;font-weight:700;margin-top:14px">${bits.join(' · ')}</p>` : '';
};
const featline = (today) => {
  const f = featuredFor(today);
  return `<p style="font-size:13px;color:#bdb49c;margin-top:14px">⭐ Today's featured challenge: <b style="color:#e3b34c">${f.n}</b> — play it for a <b>+15%</b> score bonus.</p>`;
};
function wrap(inner, unsub, preheader) {
  return `<span style="display:none;max-height:0;overflow:hidden">${preheader || ''}</span>
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:26px;background:#06231b;color:#f3ecd9;border-radius:14px">
    <div style="font-size:32px;font-weight:900;letter-spacing:-1px">7<span style="color:#e3b34c">-</span>0</div>
    ${inner}
    <p style="font-size:11px;color:#8a8472;margin-top:22px">You opted in when saving a score in 7-0. <a href="${unsub}" style="color:#bdb49c">Unsubscribe</a> anytime.</p>
  </div>`;
}

function template(kind, sub, today) {
  const name = (sub.n || 'manager').replace(/[<>]/g, ''), st = sub.streak || 0;
  switch (kind) {
    case 'welcome': return {
      subject: `Welcome to the dugout, ${name} ⚽`,
      pre: 'One free run a day. Seven wins for perfection.',
      inner: `<p style="font-size:15px;line-height:1.6">Hi ${name} — you're in, and you're on the world leaderboard. Every day you get <b>one free run</b>: draft a World Cup XI from 75 years of legends, name your captain, and live out the whole tournament. Win all seven in normal time for the perfect <b>7-0</b>.</p>
        <p style="font-size:15px;line-height:1.6">Play daily to build a 🔥 streak — the Regulars board is where the real ones live.</p>
        ${cta("Play today's run →")}${featline(today)}` };
    case 'ms': return {
      subject: `🔥 ${st} days straight, ${name} — that's a streak`,
      pre: 'You are officially a 7-0 regular.',
      inner: `<p style="font-size:15px;line-height:1.6">${st} days in a row, ${name}. That puts you among the 7-0 regulars — the streak board is watching. Don't stop now.</p>
        ${cta('Keep it alive →')}${statline(sub)}` };
    case 'risk': return {
      subject: `⏳ Your ${st}-day streak dies at midnight, ${name}`,
      pre: 'Two minutes saves it.',
      inner: `<p style="font-size:15px;line-height:1.6">${name} — your <b>🔥 ${st}-day streak</b> is still alive, but only until midnight UTC. Today's run takes two minutes. Legends don't skip leg day.</p>
        ${cta('Save the streak →')}${featline(today)}` };
    case 'daily': return {
      subject: `⚽ A fresh run is waiting, ${name}`,
      pre: 'New day, new draw, new shot at 7-0.',
      inner: `<p style="font-size:15px;line-height:1.6">Morning ${name} — yesterday's run is history and today's wheel is loaded. One XI, seven games, one shot at the perfect seven.</p>
        ${cta("Play today's run →")}${featline(today)}${statline(sub)}` };
    case 'wb3': return {
      subject: `${name}, your XI is asking questions 👀`,
      pre: 'Three days without a draft. The dressing room talks.',
      inner: `<p style="font-size:15px;line-height:1.6">It's been a few days, ${name}. Somewhere out there, a wheel is landing on Brazil 1970 without you. Your next World Cup XI is one tap away — and the board won't climb itself.</p>
        ${cta('Back to the dugout →')}${statline(sub)}` };
    case 'wb7': return {
      subject: `New legends landed since you left, ${name}`,
      pre: 'The 2026 contenders are in the pool.',
      inner: `<p style="font-size:15px;line-height:1.6">${name} — while you were away we added the <b>2026 contenders</b>: Mbappé, Yamal, Bellingham, Vinícius and friends. There's also a ⭐ featured challenge every day and a squad album to fill. Your comeback story writes itself.</p>
        ${cta('Play 7-0 →')}${featline(today)}` };
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
      const t = template(kind, sub, today);
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: process.env.REMIND_FROM || '7-0 <onboarding@resend.dev>', to: email, subject: t.subject, html: wrap(t.inner, unsub, t.pre) })
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
