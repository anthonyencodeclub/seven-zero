# 7-0 — Build the Ultimate World Cup XI

A free, fan-made World Cup draft game with a **live world leaderboard** and a **credits economy**. Spin the wheel, draft legends from **148 iconic World Cup squads (1950–2026, 1,765 players)** — each with its own line of lore, pick your formation and captain, then live out the whole tournament minute by minute — tactics at half-time, extra time, penalty shootouts.

**The perfect run is seven wins inside normal time: 7-0.**

## Play

🎮 **[Play it live](https://seven-zero-navy.vercel.app)**

## What's in the game

- 🎡 **The draw reel** — a case-opening-style strip of nation cards (flag · country · year, decade-tinted) from 148 real squads, Uruguay 1950 to the 2026 contenders; it scrolls fast and eases to a stop with your squad framed under the pointer. One re-spin per run — choose wisely.
- 🎯 **Place anyone anywhere** — you choose the exact slot for every pick. Out of position costs rating: −4 one line out, −9 two lines, −15 for anything involving the goalkeeper (yes, you can play Pelé in goal at 83).
- ⚡ **Chemistry** — generous links reward putting players in their **correct position**, sharing a **club** (curated for marquee names: Messi+Suárez = Barça, Ronaldo+Modrić = Real…), the **same World Cup squad**, **nation**, **decade** or **continent**. A normal XI sits around ~16; themed sides (a Barça spine, an all-90s team) climb higher and boost the whole side.
- ⚽ **Live match engine** — minute-by-minute simulation with commentary (including the occasional very famous line — "they think it's all over…"), half-time and extra-time **tactic calls**, group tables, shootouts.
- 📜 **Lore** — every squad lands with a line of its history: the Maracanazo, the Disgrace of Gijón, Córdoba '78, the Battle of Santiago, Italia '90…
- 🧩 **Draft modes** — Classic, **Era Tour** (a new decade each spin), **Dynasty** (one nation, all eras — 25 nations qualify), **Wage Cap** (946 budget). Plus a **player-pool filter**: All-time ×1.0, Post-1990 ×0.9, Post-2006 ×0.8.
- 👕 **Every player has a shirt** — nation-coloured jersey icons with squad numbers, and **specific positions** (RB/LB/CB/DM/CM/AM/RM/LM/RW/LW/ST): wrong role on the right line costs −2/−3, with the full out-of-position ladder beyond.
- 🫡 **Hidden leadership** — every player carries a hidden leadership stat; great captains (Moore, Beckenbauer, Varela…) lift the side harder, rally late comebacks and steady penalty shootouts.
- 💀 **Difficulties** — Classic, Hard (ratings hidden), Legend (brutal draw + hidden ratings). Modes multiply your score.
- 🗓 **Daily Challenge** — your one free run a day, played however you like (your own formation/mode/difficulty/pool), with a ×1.1 bonus, its own leaderboard and streaks. Beyond that, play as many credit-funded custom runs as you've earned.
- 🧭 **Step-by-step setup** — choosing Daily or a custom run opens a guided wizard (formation → draft mode → difficulty → player pool → sign-up → play) instead of a wall of options. The Daily is simply your one free run a day, configured however you like (its board ranks today's runs; the ×1.1 daily bonus applies).
- 🌍 **Live world leaderboard** — every finished run **saves automatically** under your manager profile (name + country collected up front, email optional and encrypted). All-time, daily and **🔥 Regulars** tabs (active daily streaks, days played, cumulative points), top 100 kept, tap any row to see that player's XI.
- 📬 **Daily reminder emails** — opted-in players get a morning nudge when the new challenge drops (Vercel Cron → `/api/remind`, sends via Resend when `RESEND_API_KEY` is set), with one-click HMAC-signed unsubscribe. After your run is spent, the game points you at the genre siblings, [38-0.app](https://38-0.app) and [82-0.com](https://82-0.com).
- 🪙 **Credits economy** — the **free Daily** is always one-a-day and ranked; **credits unlock extra custom runs** (100 each). You earn credits by how well you play (a poor run nets ~−70, a champion ~break-even, a Perfect 7-0 a tidy profit), plus a daily login top-up and streak milestones, so a free player is never walled out.
- 🎁 **Invite & earn** — share your link: **+20** when a friend joins, **+250** when they play their first run (they get **+150** to start). Two-tier, capped, gated on a real played run to deter farming.
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

### Credits (smart economics)

Single soft currency, **server-authoritative** (balances live in `players/<uid>.json`, keyed to a device secret kept only in the browser). The golden rule: **the faucet is smaller than the drain for the median player, but skill, habit and friends widen it, and nobody is ever fully walled out.**

| | |
|---|---|
| New player | 200 credits (≈2 custom runs to taste) |
| Custom run | −100 |
| Run payout | `min(90, pts/12)` + 40 champion + 120 perfect |
| Free Daily completion | +20 (+20 if streak alive) |
| Daily login top-up | +40 |
| Streak milestones | 3→+50 · 7→+120 · 14→+250 · 30→+500 |
| Referral | +20 land · +250 accept (friend +150), capped 25 lifetime |

Credits are minted **only** for runs that went through `/api/play` (which debits, or checks the free Daily) and are deduped per run-token, so a run can't be resubmitted for more and free practice can't farm credits. Virtual-only for now — structured so a premium hard currency / paid packs drop in cleanly later.

**Known limitation:** player balances live in Vercel Blob, which is eventually-consistent (~60s) and not transactional. Rapid-fire writes to one wallet (sub-minute) can race; real human play has minute-scale gaps so it's a non-issue in practice, and with no real money + capped referrals the worst case is marginal. Vercel KV / Redis (atomic `INCR`) is the clean upgrade path if it ever monetizes.

## Architecture

```
index.html        ← the whole game, one self-contained file (built from src/)
src/              ← head.html (markup+css), data.js (squads), game-*.js (logic)
build.mjs         ← concatenates src/ → index.html (runs on Vercel deploy)
api/              ← Vercel serverless functions (leaderboard backend)
  token.js        ← legacy/anon free run token
  player.js       ← wallet get-or-create, daily top-up, referral land
  play.js         ← debit a custom run / check Daily, mint typed run token
  score.js        ← validate + recompute + store runs, encrypt opt-in emails
  leaderboard.js  ← cached top-50 reads (alltime / daily / streaks)
  remind.js       ← daily reminder cron (Resend; dry-runs without key)
  unsubscribe.js  ← signed one-click unsubscribe → suppression list
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
