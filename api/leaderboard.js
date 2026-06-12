import { readAgg, utcDay } from './_shared.js';

export default async function handler(req, res) {
  const board = req.query.board === 'daily' ? 'daily' : 'alltime';
  let key = 'alltime';
  if (board === 'daily') {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : utcDay();
    key = 'daily-' + d;
  }
  const agg = await readAgg(key);
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=45');
  res.status(200).json({
    board, key, now: Date.now(),
    count: agg.count || 0, updated: agg.updated || 0,
    top: (agg.top || []).slice(0, 50)
  });
}
