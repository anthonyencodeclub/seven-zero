import { signRun } from './_shared.js';

// Legacy / anonymous free token (earns no credits). Authenticated runs get
// (the score endpoint records runs; tokens just prove a plausible playtime).
export default function handler(req, res) {
  const t = Date.now();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ t, k: 'free', u: '', s: signRun('free', t, '') });
}
