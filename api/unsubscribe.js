import { put } from '@vercel/blob';
import { signUnsub } from './_shared.js';

export default async function handler(req, res) {
  const { h, s } = req.query;
  if (!/^[a-f0-9]{32}$/.test(h || '') || signUnsub(h) !== s) {
    return res.status(400).send('Invalid unsubscribe link.');
  }
  await put(`suppress/${h}.json`, JSON.stringify({ h, ts: Date.now() }), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
  });
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.status(200).send('<body style="font-family:sans-serif;background:#06231b;color:#f3ecd9;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><div style="font-size:40px;font-weight:900">7<span style="color:#e3b34c">-</span>0</div><p>You\'re unsubscribed — no more daily reminders.<br>Your scores and streaks are untouched. ⚽</p></div></body>');
}
