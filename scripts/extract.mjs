// Pulls SQUADS + OPP out of the v1 game, merges the v2/v3 additions and the
// lore map, and emits src/data.js (sorted by year then name) for the build.
import { readFileSync, writeFileSync } from 'node:fs';
import { NEW_SQUADS, NEW_OPP } from '../src/squads-new.mjs';
import { NEW_SQUADS_V3 } from '../src/squads-v3.mjs';
import { NEW_SQUADS_V4 } from '../src/squads-v4.mjs';
import { LORE } from '../src/lore.mjs';

const src = readFileSync(new URL('../v1/index.html', import.meta.url), 'utf8');
const grab = name => {
  const m = src.match(new RegExp(`const ${name}=\\[([\\s\\S]*?)\\n\\];`));
  if (!m) throw new Error(name + ' not found');
  return (0, eval)(`[${m[1]}]`);
};
const squads = grab('SQUADS');
const opp = grab('OPP');

const all = [...squads, ...NEW_SQUADS, ...NEW_SQUADS_V3, ...NEW_SQUADS_V4].sort((a, b) => a.y - b.y || a.t.localeCompare(b.t));
const dupes = new Set();
for (const s of all) {
  const k = s.t + '|' + s.y;
  if (dupes.has(k)) throw new Error('duplicate squad ' + k);
  dupes.add(k);
  if (!LORE[k]) throw new Error('missing lore for ' + k);
  s.l = LORE[k];
  for (const p of s.p) {
    if (!['GK', 'DEF', 'MID', 'FWD'].includes(p[1])) throw new Error('bad pos ' + k + ' ' + p[0]);
    if (typeof p[2] !== 'number' || p[2] < 70 || p[2] > 99) throw new Error('bad rating ' + k + ' ' + p[0]);
  }
  const gk = s.p.filter(p => p[1] === 'GK').length;
  if (gk < 1) throw new Error('no GK in ' + k);
}
for (const k of Object.keys(LORE)) if (!dupes.has(k)) throw new Error('lore for unknown squad ' + k);
const allOpp = [...opp, ...NEW_OPP];

/* ---- rating standardisation ----
   Lift-only: squads authored on a stingier scale get a uniform bump so every
   squad mean lands near 81 (cap +4, individual cap 92 so stars stay stars,
   floor 75). Legends are never deflated. */
let lifted = 0;
for (const s of all) {
  const mean = s.p.reduce((a, p) => a + p[2], 0) / s.p.length;
  const lift = Math.min(4, Math.max(0, Math.round(81 - mean)));
  if (lift > 0) {
    lifted++;
    s.p.forEach(p => { p[2] = Math.max(75, Math.min(p[2] >= 90 ? p[2] : 92, p[2] + lift)); });
  } else {
    s.p.forEach(p => { p[2] = Math.max(75, p[2]); });
  }
}

/* ---- specific positions (sp) ----
   Heuristic from listing order within each line + explicit overrides for the
   famous cases. Tokens: GK RB LB CB DM CM AM RM LM RW LW ST */
const SP_OVERRIDE = {
  "Carlos Alberto":"RB","Djalma Santos":"RB","Nilton Santos":"LB","Cafu":"RB","Roberto Carlos":"LB",
  "Paolo Maldini":"LB","Giacinto Facchetti":"LB","Andreas Brehme":"LB","Berti Vogts":"RB","Philipp Lahm":"RB",
  "Lilian Thuram":"RB","Bixente Lizarazu":"LB","Ashley Cole":"LB","Gary Neville":"RB","Kyle Walker":"RB",
  "Achraf Hakimi":"RB","Theo Hernandez":"LB","Marcelo":"LB","Ruud Krol":"LB","Branco":"LB","Jorginho":"RB",
  "Kenny Sansom":"LB","Danny McGrain":"RB","Eric Gerets":"RB","Manuel Amoros":"RB","Stuart Pearce":"LB",
  "João Cancelo":"RB","Raphaël Guerreiro":"LB","Daley Blind":"LB","Yuto Nagatomo":"LB","Lee Young-pyo":"LB",
  "David Beckham":"RM","Luís Figo":"RW","Garrincha":"RW","Jairzinho":"RW","Marc Overmars":"LW",
  "Arjen Robben":"RW","Franck Ribéry":"LW","Kylian Mbappé":"LW","Neymar":"LW","Cristiano Ronaldo":"LW",
  "Lionel Messi":"RW","Ousmane Dembélé":"RW","Angel Di María":"RW","Ángel Di María":"RW","Hakim Ziyech":"RW",
  "Raheem Sterling":"LW","John Barnes":"LW","Zoltán Czibor":"LW","Kurt Hamrin":"RW","Sadio Mané":"LW",
  "Kaoru Mitoma":"LW","Junya Ito":"RW","Vinícius Júnior":"LW","Eden Hazard":"LW","Dries Mertens":"RW",
  "Zico":"AM","Sócrates":"AM","Michel Platini":"AM","Diego Maradona":"AM","Zinedine Zidane":"AM",
  "Juan Román Riquelme":"AM","Kaká":"AM","Didi":"AM","Bobby Charlton":"AM","Wesley Sneijder":"AM",
  "Mesut Özil":"AM","Diego":"AM","Gheorghe Hagi":"AM","Enzo Scifo":"AM","Carlos Valderrama":"AM",
  "Mohamed Timoumi":"AM","Daichi Kamada":"AM","James Rodríguez":"AM","Juan Fernando Quintero":"AM",
  "Andrea Pirlo":"DM","Sergio Busquets":"DM","Claude Makélélé":"DM","Javier Mascherano":"DM",
  "Casemiro":"DM","N'Golo Kanté":"DM","Gennaro Gattuso":"DM","Dunga":"DM","Sergio Batista":"DM",
  "Didier Deschamps":"DM","Edgar Davids":"DM","Mauro Silva":"DM","Wataru Endo":"DM","Thomas Partey":"DM",
  "Sunday Oliseh":"DM","Marcelo Brozović":"DM","Tyler Adams":"DM","Lucas Torreira":"DM","Obdulio Varela":"DM",
  "Lothar Matthäus":"CM","Luka Modrić":"CM","Andrés Iniesta":"CM","Xavi":"CM","Toni Kroos":"CM"
};
const SP_PAT = {
  DEF: n => n <= 3 ? Array(n).fill('CB') : ['RB','CB','CB','LB','CB','RB','LB','CB'].slice(0, n),
  MID: n => n === 1 ? ['CM'] : n === 2 ? ['CM','CM'] : n === 3 ? ['CM','CM','AM']
        : n === 4 ? ['RM','CM','CM','LM'] : ['RM','CM','DM','AM','LM','CM','CM','AM'].slice(0, n),
  FWD: n => n === 1 ? ['ST'] : n === 2 ? ['ST','ST'] : n === 3 ? ['RW','ST','LW']
        : ['RW','ST','LW','ST','RW','LW','ST'].slice(0, n)
};
for (const s of all) {
  const byLine = { GK: [], DEF: [], MID: [], FWD: [] };
  s.p.forEach(p => byLine[p[1]].push(p));
  for (const lineName of ['DEF', 'MID', 'FWD']) {
    const ps = byLine[lineName];
    const pat = SP_PAT[lineName](ps.length);
    ps.forEach((p, i) => { p[3] = SP_OVERRIDE[p[0]] || pat[i] || (lineName === 'DEF' ? 'CB' : lineName === 'MID' ? 'CM' : 'ST'); });
  }
  byLine.GK.forEach(p => { p[3] = 'GK'; });
}

const line = s => `{t:${JSON.stringify(s.t)},y:${s.y},f:${JSON.stringify(s.f)},l:${JSON.stringify(s.l)},p:[${s.p.map(p => `[${JSON.stringify(p[0])},${JSON.stringify(p[1])},${p[2]},${JSON.stringify(p[3])}]`).join(',')}]}`;
const out = `/* =========================================================
   DATA — ${all.length} iconic World Cup squads, ${all[0].y}–${all[all.length - 1].y}
   pos: GK / DEF / MID / FWD   rating: unofficial, standardised (squad mean ≥~81)
   4th field: specific position (RB/LB/CB/DM/CM/AM/RM/LM/RW/LW/ST)
   l: one line of lore, shown when the wheel lands
   (generated by scripts/extract.mjs — edit src/squads-*.mjs + src/lore.mjs and re-run)
========================================================= */
const SQUADS=[
${all.map(line).join(',\n')}
];

const OPP=[
${allOpp.map(o => `[${JSON.stringify(o[0])},${JSON.stringify(o[1])},${o[2]}]`).join(',\n')}
];
`;
writeFileSync(new URL('../src/data.js', import.meta.url), out);
const players = all.reduce((a, s) => a + s.p.length, 0);
const allR = all.flatMap(s => s.p.map(p => p[2]));
const mean = (allR.reduce((a, b) => a + b, 0) / allR.length).toFixed(1);
const post90 = all.filter(s => s.y >= 1990).length, post06 = all.filter(s => s.y >= 2006).length;
console.log(`src/data.js: ${all.length} squads (${post90} post-1990, ${post06} post-2006), ${players} players (mean ${mean}, ${lifted} squads lifted), ${allOpp.length} opponents`);
