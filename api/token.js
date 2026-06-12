import { signToken } from './_shared.js';

// Issued when a run starts; score submission requires a token old enough to
// represent a real playthrough (45s+) but younger than 6h.
export default function handler(req, res) {
  const t = Date.now();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ t, s: signToken(t) });
}
