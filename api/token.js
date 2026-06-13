import { signRun } from './_shared.js';

// Legacy / anonymous free token (earns no credits). Authenticated runs get
// their token from /api/play instead, which is the only minter of paid/daily.
export default function handler(req, res) {
  const t = Date.now();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ t, k: 'free', u: '', s: signRun('free', t, '') });
}
