// Pulls SQUADS + OPP out of the v1 game, merges the v2/v3 additions and the
// lore map, and emits src/data.js (sorted by year then name) for the build.
import { readFileSync, writeFileSync } from 'node:fs';
import { NEW_SQUADS, NEW_OPP } from '../src/squads-new.mjs';
import { NEW_SQUADS_V3 } from '../src/squads-v3.mjs';
import { NEW_SQUADS_V4 } from '../src/squads-v4.mjs';
import { NEW_SQUADS_V5 } from '../src/squads-v5.mjs';
import { LORE } from '../src/lore.mjs';

const src = readFileSync(new URL('../v1/index.html', import.meta.url), 'utf8');
const grab = name => {
  const m = src.match(new RegExp(`const ${name}=\\[([\\s\\S]*?)\\n\\];`));
  if (!m) throw new Error(name + ' not found');
  return (0, eval)(`[${m[1]}]`);
};
const squads = grab('SQUADS');
const opp = grab('OPP');

const all = [...squads, ...NEW_SQUADS, ...NEW_SQUADS_V3, ...NEW_SQUADS_V4, ...NEW_SQUADS_V5].sort((a, b) => a.y - b.y || a.t.localeCompare(b.t));
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
  "Lothar Matthäus":"CM","Luka Modrić":"CM","Andrés Iniesta":"CM","Xavi":"CM","Toni Kroos":"CM",
  // --- 2026 contenders ---
  "Nahuel Molina":"RB","Nicolás Tagliafico":"LB","Lautaro Martínez":"ST","Julián Álvarez":"ST","Nico Paz":"AM",
  "Jules Koundé":"RB","Theo Hernández":"LB","Aurélien Tchouaméni":"DM","Michael Olise":"RW","Marcus Thuram":"ST",
  "Danilo":"RB","Wendell":"LB","Bruno Guimarães":"CM","Rodrygo":"RW","Raphinha":"RW","Endrick":"ST",
  "Kieran Trippier":"LB","Declan Rice":"DM","Jude Bellingham":"AM","Phil Foden":"AM","Cole Palmer":"AM",
  "Bukayo Saka":"RW","Marcus Rashford":"LW","Anthony Gordon":"LW",
  "Dani Carvajal":"RB","Marc Cucurella":"LB","Rodri":"DM","Dani Olmo":"AM","Lamine Yamal":"RW","Nico Williams":"LW","Álvaro Morata":"ST",
  "Nuno Mendes":"LB","Vitinha":"CM","Bruno Fernandes":"AM","Bernardo Silva":"AM","João Neves":"CM","Rafael Leão":"LW","Pedro Neto":"RW","João Félix":"AM",
  "Joshua Kimmich":"RB","Maximilian Mittelstädt":"LB","Robert Andrich":"DM","Jamal Musiala":"AM","Florian Wirtz":"AM","Kai Havertz":"ST","Leroy Sané":"RW","Serge Gnabry":"LW",
  "Denzel Dumfries":"RB","Nathan Aké":"LB","Jurriën Timber":"RB","Frenkie de Jong":"CM","Xavi Simons":"AM","Cody Gakpo":"LW","Donyell Malen":"RW","Memphis Depay":"ST",
  "Timothy Castagne":"RB","Maxim De Cuyper":"LB","Amadou Onana":"DM","Kevin De Bruyne":"AM","Jérémy Doku":"RW","Leandro Trossard":"LW","Loïs Openda":"ST","Romelu Lukaku":"ST",
  "Josip Stanišić":"RB","Borna Sosa":"LB","Mateo Kovačić":"CM","Luka Sučić":"AM","Andrej Kramarić":"AM","Ivan Perišić":"LW","Ante Budimir":"ST",
  "Nahitan Nández":"RB","Mathías Olivera":"LB","Federico Valverde":"CM","Manuel Ugarte":"DM","Giorgian De Arrascaeta":"AM","Darwin Núñez":"ST","Facundo Pellistri":"RW","Maximiliano Araújo":"LW",
  "Noussair Mazraoui":"LB","Sofyan Amrabat":"DM","Brahim Díaz":"AM","Amine Adli":"LW","Youssef En-Nesyri":"ST","Eliesse Ben Seghir":"AM",
  // 2026 centre-backs (so the heuristic never mislabels them as a full-back)
  "Cristian Romero":"CB","Nicolás Otamendi":"CB","Lisandro Martínez":"CB","William Saliba":"CB","Dayot Upamecano":"CB","Ibrahima Konaté":"CB",
  "Marquinhos":"CB","Éder Militão":"CB","Gabriel Magalhães":"CB","John Stones":"CB","Marc Guéhi":"CB","Pau Cubarsí":"CB","Aymeric Laporte":"CB","Robin Le Normand":"CB",
  "Rúben Dias":"CB","Gonçalo Inácio":"CB","Antonio Rüdiger":"CB","Jonathan Tah":"CB","Nico Schlotterbeck":"CB","Virgil van Dijk":"CB","Matthijs de Ligt":"CB",
  "Wout Faes":"CB","Zeno Debast":"CB","Arthur Theate":"CB","Joško Gvardiol":"CB","Josip Šutalo":"CB","Ronald Araújo":"CB","José María Giménez":"CB","Sebastián Cáceres":"CB",
  "Nayef Aguerd":"CB","Romain Saïss":"CB",
  // --- full position audit 2026-07-12 (fix pattern-slot mislabels, e.g. Kane RW) ---
  // 1950s–70s
  "Óscar Míguez":"ST","Rubén Morán":"LW","Gerhard Hanappi":"RB","Ernst Ocwirk":"DM","Alfred Körner":"LW",
  "Nándor Hidegkuti":"ST","Ferenc Puskás":"ST","József Zakariás":"DM",
  "Max Morlock":"AM","Helmut Rahn":"RW","Ottmar Walter":"ST","Hans Schäfer":"LW","Jupp Posipal":"RB","Werner Kohlmeyer":"LB",
  "Orlando":"CB","Zito":"DM","Zagallo":"LW","Vavá":"ST","Pelé":"ST","Clodoaldo":"DM",
  "Vladimir Kesarev":"RB","Boris Kuznetsov":"LB","Viktor Tsarev":"DM","Valentin Ivanov":"AM","Alexander Ivanov":"RW",
  "Orvar Bergmark":"RB","Sven Axbom":"LB",
  "Leonel Sánchez":"LW","Honorino Landa":"ST","Sergio Navarro":"LB","Carlos Contreras":"CB",
  "Flórián Albert":"ST","Károly Sándor":"RW","Máté Fenyvesi":"LW","Ferenc Bene":"RW","János Farkas":"ST","Ferenc Sipos":"CB",
  "Ray Wilson":"LB","Bobby Moore":"CB","Nobby Stiles":"DM","Alan Ball":"RM",
  "José Torres":"ST","António Simões":"LW",
  "Igor Chislenko":"RW","Galimzyan Khusainov":"LW","Anatoly Banishevsky":"ST","Valery Porkujan":"LW","Vasili Danilov":"LB",
  "Pierluigi Cera":"CB","Mario Bertini":"DM","Sandro Mazzola":"AM","Gianni Rivera":"AM","Angelo Domenghini":"RW",
  "Alberto Gallardo":"LW","Anatoliy Byshovets":"ST","Vitaly Khmelnitsky":"LW",
  "Pedro Rocha":"AM","Julio Montero Castillo":"DM",
  "Wim Jansen":"DM","Johnny Rep":"RW","Rob Rensenbrink":"LW",
  "Kazimierz Deyna":"AM","Zygmunt Maszczyk":"DM","Włodzimierz Lubański":"ST",
  "Martin Buchan":"CB","Willie Morgan":"RW","Denis Law":"ST","Joe Jordan":"ST","Kenny Dalglish":"ST",
  "Willie Donachie":"LB","Kenny Burns":"CB","Bruce Rioch":"CM","Graeme Souness":"CM",
  "Wolfgang Overath":"AM",
  "Mario Kempes":"ST","Daniel Bertoni":"RW","René Houseman":"RW","Américo Gallego":"DM",
  // 1980s
  "Lakhdar Belloumi":"AM","Mustapha Dahleb":"AM","Ali Fergani":"DM","Salah Assad":"LW","Tedj Bensaoula":"ST","Djamel Zidane":"AM",
  "Toninho Cerezo":"DM","Éder":"LW",
  "Théophile Abega":"AM","Ibrahim Aoudou":"DM",
  "Jean Tigana":"CM","Didier Six":"LW",
  "Tibor Nyilasi":"AM","László Fazekas":"RW","András Törőcsik":"ST",
  "Gabriele Oriali":"DM","Giancarlo Antognoni":"AM","Bruno Conti":"RW",
  "Norman Whiteside":"ST","Gerry Armstrong":"ST","Mal Donaghy":"LB","John McClelland":"CB",
  "Władysław Żmuda":"CB","Waldemar Matysik":"DM","Grzegorz Lato":"RW","Włodzimierz Smolarek":"LW","Zbigniew Boniek":"AM",
  "Gordon Strachan":"RM","Steve Archibald":"ST",
  "Jorge Burruchaga":"AM",
  "Georges Grün":"CB","Patrick Vervoort":"LB","Franky Vercauteren":"LM","Jan Ceulemans":"ST",
  "Søren Lerby":"CM","Frank Arnesen":"AM","Jens Jørn Bertelsen":"DM",
  "Terry Fenwick":"CB","Glenn Hoddle":"AM","Peter Reid":"DM","Trevor Steven":"RM","Peter Beardsley":"ST",
  "Luis Fernández":"DM","Dominique Rocheteau":"ST","Jean-Pierre Papin":"ST",
  "Tomás Boy":"AM","Hugo Sánchez":"ST","Carlos Hermosillo":"ST",
  "Aziz Bouderbala":"RW","Abdelmajid Dolmy":"DM",
  "Anatoliy Demyanenko":"LB","Vladimir Bessonov":"RB","Vasyl Rats":"LM","Ivan Yaremchuk":"RM",
  "Serhiy Aleinikov":"DM","Oleksandr Zavarov":"AM","Oleg Blokhin":"LW",
  "José Antonio Camacho":"LB","Ricardo Gallego":"DM","Míchel":"RM","Emilio Butragueño":"ST","Eloy":"RW",
  // 1990s
  "Oscar Ruggeri":"CB",
  "Roger Milla":"ST","François Omam-Biyik":"ST","Rigobert Song":"CB","Stephen Tataw":"RB","Marc-Vivien Foé":"DM",
  "Andrés Escobar":"CB","Luis Fernando Herrera":"RB","Leonel Álvarez":"DM","Freddy Rincón":"CM","Bernardo Redín":"AM",
  "David Platt":"CM","Paul Gascoigne":"AM","Chris Waddle":"RW",
  "John Aldridge":"ST","Tony Cascarino":"ST","Ray Houghton":"RM","Kevin Sheedy":"LM",
  "Roberto Donadoni":"RM","Giuseppe Giannini":"AM","Fernando De Napoli":"CM","Roberto Baggio":"AM","Salvatore Schillaci":"ST",
  "Roy Aitken":"DM","Stuart McCall":"CM","Mo Johnston":"ST","Gordon Durie":"ST",
  "Guido Buchwald":"CB","Thomas Häßler":"AM",
  "Philippe Albert":"CB","Franky Van der Elst":"DM","Marc Degryse":"AM",
  "Zinho":"LM","Raí":"AM",
  "Trifon Ivanov":"CB","Tsanko Tsvetanov":"LB","Ilian Kiriakov":"RB","Yordan Letchkov":"AM",
  "Hristo Stoichkov":"LW","Emil Kostadinov":"RW","Nasko Sirakov":"ST",
  "Faustino Asprilla":"ST",
  "Franco Baresi":"CB","Roberto Mussi":"RB","Antonio Benarrivo":"LB","Demetrio Albertini":"DM","Nicola Berti":"CM","Daniele Massaro":"ST",
  "Augustine Eguavoen":"RB","Jay-Jay Okocha":"AM","Finidi George":"RW","Emmanuel Amunike":"LW","Rashidi Yekini":"ST","Daniel Amokachi":"ST",
  "Gheorghe Popescu":"DM","Dorinel Munteanu":"LM",
  "Majed Abdullah":"ST",
  "Rafael Alkorta":"CB","Sergi Barjuán":"LB","Pep Guardiola":"DM","Julen Guerrero":"AM","Jon Andoni Goikoetxea":"RW",
  "Tomas Brolin":"AM","Kennet Andersson":"ST","Klas Ingesson":"CM",
  "Alexi Lalas":"CB","Paul Caligiuri":"LB","Fernando Clavijo":"RB","Thomas Dooley":"DM","Tab Ramos":"AM",
  "John Harkes":"CM","Cobi Jones":"RM","Eric Wynalda":"ST","Roy Wegerle":"ST",
  "César Sampaio":"DM","Leonardo":"AM","Rivaldo":"AM","Ronaldo":"ST",
  "Igor Štimac":"CB","Zvonimir Soldo":"DM","Aljoša Asanović":"AM","Robert Prosinečki":"AM","Zvonimir Boban":"AM","Goran Vlaović":"ST",
  "Michael Laudrup":"AM","Peter Møller":"ST",
  "Paul Ince":"DM","Paul Scholes":"AM","Darren Anderton":"RM","David Batty":"DM","Alan Shearer":"ST","Teddy Sheringham":"ST",
  "Youri Djorkaeff":"AM","David Trezeguet":"ST",
  "Salvador Carmona":"RB","Ramón Ramírez":"LM","Jesús Arellano":"RW","Luis Hernández":"ST","Cuauhtémoc Blanco":"AM","Ricardo Peláez":"ST",
  "Noureddine Naybet":"CB","Abdelilah Saber":"RB","Mustapha Hadji":"AM","Youssef Chippo":"CM","Salaheddine Bassir":"ST",
  "Patrick Kluivert":"ST",
  "Taribo West":"CB","Celestine Babayaro":"LB","Nwankwo Kanu":"ST","Tijani Babangida":"RW",
  // 2000s
  "Gilberto Silva":"DM","Juninho Paulista":"AM","Denílson":"LW",
  "Pierre Wome":"LB","Bill Tchato":"RB","Salomon Olembé":"LM","Eric Djemba-Djemba":"DM",
  "Kazuyuki Toda":"DM","Hidetoshi Nakata":"AM","Junichi Inamoto":"CM","Atsushi Yanagisawa":"ST","Naohiro Takahara":"ST",
  "Papa Bouba Diop":"DM","Khalilou Fadiga":"AM","Salif Diao":"CM",
  "Hong Myung-bo":"CB","Kim Nam-il":"DM","Seol Ki-hyeon":"LW","Ahn Jung-hwan":"ST",
  "Juan Carlos Valerón":"AM","Gaizka Mendieta":"RM","Fernando Morientes":"ST",
  "Olof Mellberg":"CB","Tobias Linderoth":"DM","Fredrik Ljungberg":"RM","Henrik Larsson":"ST",
  "Alpay Özalan":"CB","Fatih Akyel":"RB","Tugay Kerimoğlu":"DM","Yıldıray Baştürk":"AM","Hasan Şaş":"LW","Ümit Davala":"RM",
  "Pablo Mastroeni":"DM","Claudio Reyna":"CM","DaMarcus Beasley":"LM","Clint Mathis":"ST",
  "Roberto Ayala":"CB","Juan Pablo Sorín":"LB","Nicolás Burdisso":"CB","Lionel Scaloni":"RB","Maxi Rodríguez":"RM","Javier Saviola":"ST",
  "Scott Chipperfield":"LB","Vince Grella":"DM","Jason Culina":"CM","Harry Kewell":"LW","John Aloisi":"ST",
  "Emerson":"DM","Ronaldinho":"AM","Adriano":"ST",
  "Wayne Rooney":"ST","Peter Crouch":"ST",
  "Torsten Frings":"DM","Michael Ballack":"AM","Bernd Schneider":"RM",
  "Michael Essien":"DM","Sulley Muntari":"LM",
  "Mauro Camoranesi":"RM","Simone Perrotta":"CM","Francesco Totti":"AM","Luca Toni":"ST",
  "Rafael Márquez":"CB","Carlos Salcido":"LB","Ricardo Osorio":"RB","Gerardo Torrado":"DM","Zinha":"AM","Omar Bravo":"ST","Jared Borgetti":"ST",
  "Costinha":"DM","Pauleta":"ST","Simão":"LW",
  // 2010s
  "Lukas Podolski":"LW","Miroslav Klose":"ST",
  "Anthony Annan":"DM","Kevin-Prince Boateng":"CM",
  "Yuki Abe":"DM","Daisuke Matsui":"RM","Keisuke Honda":"AM",
  "Mark van Bommel":"DM","Nigel de Jong":"DM",
  "Kim Jung-woo":"DM","Park Ji-sung":"LM","Lee Chung-yong":"RM","Yeom Ki-hun":"LW",
  "David Silva":"AM","David Villa":"ST","Pedro":"RW",
  "Benny Feilhaber":"AM","Herculez Gomez":"ST",
  "Diego Pérez":"DM","Egidio Arévalo Ríos":"DM","Álvaro Pereira":"LM","Diego Forlán":"ST","Edinson Cavani":"ST",
  "Sergio Agüero":"ST","Ezequiel Lavezzi":"LW",
  "Axel Witsel":"DM","Divock Origi":"ST",
  "Carlos Sánchez":"DM","Juan Guillermo Cuadrado":"RW","Wílmar Barrios":"DM",
  "Júnior Díaz":"LB","Bryan Ruiz":"AM","Marco Ureña":"ST",
  "Mario Mandžukić":"ST","Ante Rebić":"RW",
  "Bastian Schweinsteiger":"CM","Mario Götze":"AM",
  "Paul Aguilar":"RB","Miguel Layún":"LB","José Juan Vázquez":"DM","Andrés Guardado":"LM","Giovani dos Santos":"AM","Javier Hernández":"ST",
  "Ron Vlaar":"CB","Daryl Janmaat":"RB","Robin van Persie":"ST","Klaas-Jan Huntelaar":"ST",
  "John Obi Mikel":"DM","Victor Moses":"RW","Emmanuel Emenike":"ST","Ahmed Musa":"LW",
  "Thomas Meunier":"RB",
  "Filipe Luís":"LB","Philippe Coutinho":"AM","Gabriel Jesus":"ST",
  "Ashley Young":"LB","Jordan Henderson":"DM","Jesse Lingard":"AM","Harry Kane":"ST",
  "Blaise Matuidi":"LM","Antoine Griezmann":"AM","Olivier Giroud":"ST",
  "Manuel Da Costa":"CB","Nabil Dirar":"RM","Karim El Ahmadi":"DM","Nordin Amrabat":"RW",
  "Bryan Idowu":"LB","Wilfred Ndidi":"DM","Oghenekaro Etebo":"CM","Kelechi Iheanacho":"ST",
  "William Carvalho":"DM","Adrien Silva":"CM","Ricardo Quaresma":"RW",
  "Kalidou Koulibaly":"CB","Moussa Wagué":"RB","Youssouf Sabaly":"LB","Idrissa Gueye":"DM","Badou Ndiaye":"CM","M'Baye Niang":"ST","Ismaïla Sarr":"RW",
  "Jung Woo-young":"DM","Lee Jae-sung":"AM","Hwang Hee-chan":"ST","Son Heung-min":"LW","Kim Shin-wook":"ST",
  "Ola Toivonen":"ST","John Guidetti":"ST",
  "Luis Suárez":"ST","Cristhian Stuani":"ST",
  // 2022–26
  "Rodrigo De Paul":"CM","Leandro Paredes":"DM",
  "Tariq Lamptey":"RB","Iñaki Williams":"ST",
  "Ritsu Doan":"RW","Takefusa Kubo":"RW","Daizen Maeda":"ST",
  "Grzegorz Krychowiak":"DM","Piotr Zieliński":"AM","Robert Lewandowski":"ST","Karol Świderski":"ST",
  "Ismail Jakobs":"LB","Boulaye Dia":"ST",
  "Cho Gue-sung":"ST",
  "Christian Pulisic":"LW","Tim Weah":"RW","Josh Sargent":"ST",
  "Josip Juranović":"RB"
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
