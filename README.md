# 7-0 — Build the Ultimate World Cup XI

A free, fan-made World Cup draft game with a **live world leaderboard**. Spin the wheel, draft legends from **86 iconic World Cup squads (1950–2022, 1,006 players)** — each with its own line of lore, pick your formation and captain, then live out the whole tournament minute by minute — tactics at half-time, extra time, penalty shootouts.

**The perfect run is seven wins inside normal time: 7-0.**

## Play

🎮 **[Play it live](https://seven-zero-navy.vercel.app)**

## What's in the game

- 🎡 **The wheel** — 86 real squads from Uruguay 1950 to Argentina 2022, physics-style spin with pointer ticks, sounds and a landing flash. 2 re-spins per run.
- 🎯 **Place anyone anywhere** — you choose the exact slot for every pick. Out of position costs rating: −4 one line out, −9 two lines, −15 for anything involving the goalkeeper (yes, you can play Pelé in goal at 83).
- ⚡ **Chemistry** — each player earns 0–3⚡ for playing their natural position and lining up with same-squad teammates; total chemistry boosts the whole XI.
- ⚽ **Live match engine** — minute-by-minute simulation with commentary, half-time and extra-time **tactic calls** (push forward / keep shape / park the bus), group tables, shootouts.
- 📜 **Lore** — every squad lands with a line of its history: the Maracanazo, the Disgrace of Gijón, Córdoba '78, the Battle of Santiago, Italia '90…
- 🧩 **Draft modes** — Classic, **Era Tour** (a new decade each spin), **Dynasty** (one nation, all eras — Brazil has 9 squads), **Wage Cap** (946 budget, spend wisely).
- 💀 **Difficulties** — Classic, Hard (ratings hidden), Legend (brutal draw + hidden ratings). Modes multiply your score.
- ⚡ **Daily Challenge** — one seeded run per day, the same wheel for everyone on Earth, with its own leaderboard and streaks.
- 🌍 **Live world leaderboard** — all-time and daily tabs, top 100 kept, your best run highlighted, tap any row to see that player's XI.
- 🏅 **Points, badges, trophy cabinet** — server-verified scoring with multipliers, 10 unlockable badges, career stats saved locally.
- 📋 **Share** — emoji result grid via the native share sheet or clipboard.

## Scoring

| Result | Points |
|---|---|
| Win in 90 | 100 |
| Win in extra time | 85 |
| Win on penalties | 70 |
| Group draw | 40 |
| Goals | +4 scored / −2 conceded |
| Champion | +200 |
| Perfect 7-0 | +300 |

Multipliers: Hard ×1.3 · Legend ×1.7 · Era Tour ×1.15 · Dynasty ×1.2 · Wage Cap ×1.3 · Daily ×1.1. The server recomputes every submitted run — client-claimed points are ignored.

## Architecture

```
index.html        ← the whole game, one self-contained file (built from src/)
src/              ← head.html (markup+css), data.js (squads), game-*.js (logic)
build.mjs         ← concatenates src/ → index.html (runs on Vercel deploy)
api/              ← Vercel serverless functions (leaderboard backend)
  token.js        ← HMAC run tokens (anti-instant-replay)
  score.js        ← validate + recompute + store runs, encrypt opt-in emails
  leaderboard.js  ← cached top-50 reads
scripts/          ← maintainer tools (run locally with .env.local)
  export-emails.mjs   decrypt + export the opt-in email list as CSV
  rebuild.mjs         rebuild aggregates from raw runs; --remove-name moderation
  extract.mjs         regenerate src/data.js from v1 + src/squads-new.mjs
```

Storage is **Vercel Blob**: one immutable JSON blob per submitted run (source of truth), plus top-100 aggregate blobs per board. No database server.

### Anti-abuse

Run tokens must be 45s–6h old (a plausible playtime), runs are structurally validated (no continuing after a knockout loss, goal caps), points are recomputed server-side, names are sanitized and filtered, and a honeypot field quietly swallows naive bots. It's a fan game — determined cheaters aren't the threat model.

### Email privacy

Emails are **optional and opt-in only** (a consent checkbox when saving a score). They're encrypted with AES-256-GCM before storage, never returned by any API, and never shown anywhere. Export them locally with:

```bash
vercel env pull .env.local   # once
npm run export-emails        # prints CSV
```

Removal requests: delete the matching `emails/` blob (or ask the maintainer).

## Develop

```bash
npm install
node build.mjs        # rebuild index.html from src/
vercel dev            # local game + API
node scripts/rebuild.mjs --remove-name "SomeName"   # moderation
```

Squad data lives in [src/squads-new.mjs](src/squads-new.mjs) and [src/squads-v3.mjs](src/squads-v3.mjs), with per-squad history in [src/lore.mjs](src/lore.mjs), merged with the v1 squads by `scripts/extract.mjs` (which fails the build on any squad/lore mismatch). The v1 game is preserved at [v1/index.html](v1/index.html).

---

*7-0 is an independent, fan-made game inspired by 38-0.app and 82-0.com. Not affiliated with FIFA or any federation. Player ratings are an unofficial, descriptive interpretation. Leaderboard names are public; emails are optional, encrypted and never displayed.*
