# 7-0 — Build the Ultimate World Cup XI

A free, fan-made World Cup draft game with a **live world leaderboard** and **daily streaks**. Spin the wheel, draft legends from **148 iconic World Cup squads (1950–2026, 1,765 players)** — each with its own line of lore, pick your formation and captain, then live out the whole tournament minute by minute — tactics at half-time, extra time, penalty shootouts.

**The perfect run is seven wins inside normal time: 7-0.**

## Play

🎮 **[Play it live](https://sevenzero.app)**

## What's in the game

- 🎡 **The draw reel** — a case-opening-style strip of nation cards (flag · country · year, decade-tinted) from 148 real squads, Uruguay 1950 to the 2026 contenders; it scrolls fast and eases to a stop with your squad framed under the pointer. One re-spin per run — choose wisely.
- 🎯 **Place anyone anywhere** — you choose the slot for every pick, FIFA-style: related roles are interchangeable for free (LM↔LW, CM↔AM↔DM, full-back↔wing-back↔wide-mid). Wrong-side or near roles cost a little; only a real misfit (a striker at the back, anyone in goal) costs big.
- ⚡ **Chemistry** — generous links reward putting players in their **correct position**, sharing a **club** (curated for marquee names: Messi+Suárez = Barça, Ronaldo+Modrić = Real…), the **same World Cup squad**, **nation**, **decade** or **continent**. A normal XI sits around ~16; themed sides (a Barça spine, an all-90s team) climb higher and boost the whole side.
- ⚽ **Live match engine** — minute-by-minute simulation with commentary (including the occasional very famous line — "they think it's all over…"), half-time and extra-time **tactic calls**, group tables, shootouts.
- 📜 **Lore** — every squad lands with a line of its history: the Maracanazo, the Disgrace of Gijón, Córdoba '78, the Battle of Santiago, Italia '90…
- 🧩 **Draft modes** — Classic, **Era Tour** (a new decade each spin), **Dynasty** (one nation, all eras — 25 nations qualify), **Wage Cap** (946 budget). Plus a **player-pool filter**: All-time ×1.0, Post-1990 ×0.9, Post-2006 ×0.8.
- 👕 **Every player has a shirt** — nation-coloured jersey icons with squad numbers, and **specific positions** (RB/LB/CB/DM/CM/AM/RM/LM/RW/LW/ST): wrong role on the right line costs −2/−3, with the full out-of-position ladder beyond.
- 🫡 **Hidden leadership** — every player carries a hidden leadership stat; great captains (Moore, Beckenbauer, Varela…) lift the side harder, rally late comebacks and steady penalty shootouts.
- 💀 **Difficulties** — Classic, Hard (ratings hidden), Legend (brutal draw + hidden ratings). Modes multiply your score.
- 🗓 **One free run a day** — your daily run, played however you like, with its own leaderboard and 🔥 streaks. A fresh challenge resets every midnight UTC.
- ⭐ **Featured challenge of the day** — a rotating named config (Legend Day, Samba Dynasty, Moneyball…) worth **+15%**, verified server-side. One tap to play it.
- 🆚 **Beat-my-run challenge links** — every run is seeded; share a link and your friend faces the **same wheel, same rules** with your score as the bar, then gets a one-tap counter-challenge.
- 🏟 **Historical opponents** — you face real squads, not generic nations: a group with Mexico 2014, a semi against Brazil 1970, each introduced with its lore. Every opponent nation appears at most once per tournament, and you never face a nation your own XI drafted from.
- 📖 **Squad album** — a Panini-style collection: every squad you've drafted from and legend you've fielded, page by decade, lore included. Collect all 148.
- 📸 **Share card** — results share as a rendered image (verdict, points, result grid, your full XI with shirts) via the native share sheet.
- 🧭 **Step-by-step setup** — a guided wizard (formation → draft mode → difficulty → player pool → sign-up → play) instead of a wall of options.
- 🌍 **Live world leaderboard** — every finished run **saves automatically** under your manager profile (name + country collected up front, email optional and encrypted). All-time, daily and **🔥 Regulars** tabs (active daily streaks, days played, cumulative points), top 100 kept, tap any row to see that player's XI.
- 📬 **Email drip campaign** — opt-in lifecycle emails, strictly **one per day max**: welcome, daily nudge, streak-at-risk, milestone celebrations, 3-/7-day win-backs — each personalised with your streak/runs/titles and today's featured challenge. Daily Vercel Cron (`/api/remind`), sends via Resend (`RESEND_API_KEY`), one-click HMAC-signed unsubscribe.
- 🎁 **Invite a friend** — a simple share button + link to spread the game.
- 🏅 **Awards & honours** — a Golden Boot (top scorer, assist tie-break) and a holistic **Player of the Tournament** (goals + assists + clean sheets for defenders/keepers + quality + captaincy, not just the top scorer). Plus server-verified points, 10 badges and a local trophy cabinet.
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

Multipliers: Hard ×1.3 · Legend ×1.7 · Era Tour ×1.15 · Dynasty ×1.2 · Wage Cap ×1.3 · Post-1990 ×0.9 · Post-2006 ×0.8 · Daily ×1.1. The server recomputes every submitted run — client-claimed points are ignored.

## Architecture

```
index.html        ← the whole game, one self-contained file (built from src/)
src/              ← head.html (markup+css), data.js (squads), game-*.js (logic)
build.mjs         ← concatenates src/ → index.html (runs on Vercel deploy)
api/              ← Vercel serverless functions (leaderboard backend)
  token.js        ← run token (proves a plausible playtime)
  score.js        ← validate + recompute + store runs; update boards; upsert email subscriber
  leaderboard.js  ← cached top-50 reads (alltime / daily / streaks)
  remind.js       ← daily drip cron: one lifecycle email per subscriber (Resend; dry-runs without key)
  unsubscribe.js  ← signed one-click unsubscribe
scripts/          ← maintainer tools (run locally with .env.local)
  export-emails.mjs   decrypt + export the opt-in email list as CSV
  rebuild.mjs         rebuild aggregates from raw runs; --remove-name moderation
  extract.mjs         regenerate src/data.js from v1 + src/squads-new.mjs
```

Storage is **Vercel Blob**: one immutable JSON blob per submitted run (source of truth), plus top-100 aggregate blobs per board. No database server.

### Anti-abuse

Run tokens must be 45s–6h old (a plausible playtime), runs are structurally validated (no continuing after a knockout loss, goal caps), points are recomputed server-side, names are sanitized and filtered, and a honeypot field quietly swallows naive bots. It's a fan game — determined cheaters aren't the threat model.

### Email privacy

Emails are **optional and opt-in only** (a consent checkbox in the manager profile, collected before your first run). They're encrypted with AES-256-GCM before storage, never returned by any API, and never shown anywhere. Export them locally with:

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

Squad data lives in [src/squads-new.mjs](src/squads-new.mjs), [src/squads-v3.mjs](src/squads-v3.mjs) and [src/squads-v4.mjs](src/squads-v4.mjs), with per-squad history in [src/lore.mjs](src/lore.mjs), merged with the v1 squads by `scripts/extract.mjs` (which fails the build on any squad/lore mismatch). The v1 game is preserved at [v1/index.html](v1/index.html).

---

*7-0 is an independent, fan-made game inspired by 38-0.app and 82-0.com. Not affiliated with FIFA or any federation. Player ratings are an unofficial, descriptive interpretation. Leaderboard names are public; emails are optional, encrypted and never displayed.*
