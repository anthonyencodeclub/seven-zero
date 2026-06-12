import { readAgg, utcDay, utcYesterday } from './_shared.js';

export default async function handler(req, res) {
  const q = req.query.board;
  const board = q === 'daily' ? 'daily' : q === 'streaks' ? 'streaks' : 'alltime';
  let key = 'alltime';
  if (board === 'streaks') key = 'streaks';
  if (board === 'daily') {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : utcDay();
    key = 'daily-' + d;
  }
  const agg = await readAgg(key);
  let top = (agg.top || []).slice(0, 50);
  if (board === 'streaks') {
    // a streak only counts while it's alive (played today or yesterday)
    const today = utcDay(), yest = utcYesterday();
    top = (agg.top || [])
      .map(e => ({ ...e, streak: (e.last === today || e.last === yest) ? e.streak : 0 }))
      .sort((a, b) => b.streak - a.streak || b.days - a.days || b.tp - a.tp)
      .slice(0, 50);
  }
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=45');
  res.status(200).json({
    board, key, now: Date.now(),
    count: agg.count || 0, updated: agg.updated || 0,
    top
  });
}
