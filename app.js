// Laimbachhof – klickbarer Prototyp.
// Alles hier sind Beispieldaten. Kein Server, keine Zahlung.
// Aufbau: Daten → Preisregel → Ansichten (eine Funktion je Seite) → Klicks.

'use strict';

// ---------- Hilfen ----------
const HEUTE = new Date();
HEUTE.setHours(0, 0, 0, 0);
function inTagen(n) { const d = new Date(HEUTE); d.setDate(d.getDate() + n); return d; }
const euro = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const kg = n => n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' kg';
const datum = d => d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
const rund2 = n => Math.round(n * 100) / 100;

// ---------- Daten: Teilstücke ----------
// Jedes Teilstück gehört zu einer Fläche in der Grafik (gleiche id).
const TEILSTUECKE = [
  { id: 'kopf', name: 'Kopf & Backe', kurz: 'Kopf', basis: 9.5, schritt: 0.5,
    text: 'Die Backe zum Schmoren, der Rest wird Sülze und Presssack.' },
  { id: 'nacken', name: 'Nacken', kurz: 'Nacken', basis: 17.5, schritt: 0.5,
    text: 'Schön durchwachsen. Für Braten, Steaks und den Grill.' },
  { id: 'schulter', name: 'Schulter', kurz: 'Schulter', basis: 15.9, schritt: 0.5,
    text: 'Das Stück fürs Schäufele. Mit Schwarte, ab in den Ofen.' },
  { id: 'ruecken', name: 'Kotelett / Rücken', kurz: 'Rücken', basis: 21.5, schritt: 0.5,
    text: 'Mit Knochen als Kotelett oder ausgelöst als Lachs.' },
  { id: 'filet', name: 'Filet', kurz: 'Filet', basis: 34, schritt: 0.25,
    text: 'Das zarteste Stück. Ein Schwein hat davon nur gut ein Kilo.' },
  { id: 'bauch', name: 'Bauch', kurz: 'Bauch', basis: 13.9, schritt: 0.5,
    text: 'Mit Schwarte als Krustenbraten oder in Scheiben für den Grill.' },
  { id: 'schinken', name: 'Schinken', kurz: 'Schinken', basis: 16.9, schritt: 0.5,
    text: 'Oberschale, Nuss und Unterschale. Für Braten und Schnitzel.' },
  { id: 'haxe-vorne', name: 'Haxe vorne', kurz: 'Haxe', basis: 9.9, schritt: 0.5,
    text: 'Die kleinere Haxe. Zum Kochen oder für den Grill.' },
  { id: 'haxe-hinten', name: 'Haxe hinten', kurz: 'Haxe', basis: 10.9, schritt: 0.5,
    text: 'Die große Haxe, klassisch knusprig aus dem Ofen.' },
  { id: 'wurst', name: 'Wurstfleisch', kurz: 'Wurst', basis: 12.5, schritt: 0.5,
    text: 'Brust und Abschnitte, grob oder fein gewolft. Für Hack und Selbstgemachtes.' },
];
const teil = id => TEILSTUECKE.find(t => t.id === id);

// Menge je Teilstück in einem Schwein (kg) und schon vergebene Menge.
const GESAMT = { kopf: 4, nacken: 5, schulter: 9, ruecken: 9, filet: 1.2, bauch: 10,
  schinken: 14, 'haxe-vorne': 2.5, 'haxe-hinten': 3.5, wurst: 12 };

const SCHWEINE = [
  { nr: 14, termin: inTagen(14), abholung: inTagen(16),
    vergeben: { kopf: 1, nacken: 5, schulter: 7.5, ruecken: 9, filet: 0.95, bauch: 3,
      schinken: 7.5, 'haxe-vorne': 1, 'haxe-hinten': 3, wurst: 5.5 } },
  { nr: 15, termin: inTagen(28), abholung: inTagen(30),
    vergeben: { kopf: 0, nacken: 2, schulter: 1, ruecken: 3, filet: 0.5, bauch: 0,
      schinken: 2, 'haxe-vorne': 0, 'haxe-hinten': 0.5, wurst: 1 } },
];

// ---------- Daten: Dauerware (echte Hofpreise, Stand leimbachhof.de 09.09.2026) ----------
const DAUERWARE = [
  { id: 'd-schinken', name: 'Geräucherter Schinken', preise: { 'am Stück': 34, 'geschnitten': 39 },
    min: 0.1, max: 3, schritt: 0.1, text: 'Vom Schwarzerle, über Buchenholz geräuchert.' },
  { id: 'd-bauch', name: 'Geräucherter Bauch', preise: { 'am Stück': 29, 'geschnitten': 34 },
    min: 0.1, max: 3, schritt: 0.1, text: 'Kräftig, mit schöner Fettschicht. Für Brotzeit und zum Kochen.' },
  { id: 'd-speck', name: 'Geräucherter Rückenspeck', preise: { 'am Stück': 24, 'geschnitten': 29 },
    min: 0.1, max: 3, schritt: 0.1, text: 'Fester weißer Speck – das, wofür die Rasse bekannt ist.' },
  { id: 'd-bratwurst', name: 'Geräucherte Bratwurst', preise: { 'je Paar': 27 },
    min: 0.2, max: 3, schritt: 0.2, text: 'Ein Paar wiegt etwa 0,2 kg.' },
  { id: 'd-salami', name: 'Salami (Angus und Schwarzerle)', preise: { 'am Stück': 33, 'geschnitten': 38 },
    min: 0.1, max: 3, schritt: 0.1, text: 'Enthält Senf. Mit Nitritpökelsalz.' },
];

// ---------- Preisregel (Dynamic Pricing) ----------
// Faktor aus zwei Dingen: wie viel vom Teilstück schon vergeben ist,
// und wie nah der Schlachttermin ist. Fest gedeckelt auf ±15 %.
// Gilt einen Tag lang für alle gleich, beim Bestellen wird er fest.
const DECKEL = 0.15;
function tageBis(d) { return Math.max(0, Math.round((d - HEUTE) / 86400000)); }

function tagesfaktor(schwein, id) {
  const quote = schwein.vergeben[id] / GESAMT[id];
  let f = (quote - 0.5) * 0.3;
  const tage = tageBis(schwein.termin);
  if (quote < 0.5 && tage < 14) f -= (14 - tage) / 14 * 0.05;
  f = Math.max(-DECKEL, Math.min(DECKEL, f));
  return Math.round(f * 100) / 100;
}
function preisHeute(schwein, id) {
  return Math.round(teil(id).basis * (1 + tagesfaktor(schwein, id)) * 10) / 10;
}
function preisHinweis(schwein, id) {
  const f = tagesfaktor(schwein, id);
  const p = Math.round(Math.abs(f) * 100);
  if (p < 2) return 'heute Grundpreis';
  if (f < 0) return `heute ${p} % günstiger – noch viel da`;
  return `heute ${p} % teurer – ${f >= 0.08 ? 'fast vergeben' : 'gefragt'}`;
}

// ---------- Korb ----------
// In der sessionStorage, damit ein Neuladen den Korb nicht leert.
let korb = [];
try { korb = JSON.parse(sessionStorage.getItem('korb') || '[]'); } catch (e) { korb = []; }
function korbSpeichern() {
  sessionStorage.setItem('korb', JSON.stringify(korb));
  document.getElementById('korb-zahl').textContent = korb.length;
}
function imKorb(nr, id) {
  return korb.filter(p => p.art === 'frisch' && p.schwein === nr && p.id === id)
    .reduce((s, p) => s + p.kg, 0);
}
function korbHinzu(posten) {
  const gleich = korb.find(p => p.art === posten.art && p.id === posten.id &&
    p.schwein === posten.schwein && p.variante === posten.variante);
  if (gleich) gleich.kg = rund2(gleich.kg + posten.kg);
  else korb.push(posten);
  korbSpeichern();
}
function summen() {
  const frisch = korb.filter(p => p.art === 'frisch').reduce((s, p) => s + p.kg * p.preisKg, 0);
  const dauer = korb.filter(p => p.art === 'dauer').reduce((s, p) => s + p.kg * p.preisKg, 0);
  // Versandregel: nur Dauerware wird verschickt, frei ab 50 €, sonst 10 €
  const versand = dauer === 0 ? 0 : (dauer >= 50 ? 0 : 10);
  return { frisch: rund2(frisch), dauer: rund2(dauer), versand, gesamt: rund2(frisch + dauer + versand) };
}

// ---------- Zustand ----------
let schweinIndex = 0;
let gewaehlt = null;     // id des gewählten Teilstücks
let menge = 0;           // kg im Panel
let bestaetigung = '';   // kurzer Text nach „In den Korb"

function rest(schwein, id) { return rund2(GESAMT[id] - schwein.vergeben[id] - imKorb(schwein.nr, id)); }
function status(schwein, id) {
  const r = rest(schwein, id);
  if (r < teil(id).schritt) return 'weg';
  if (r / GESAMT[id] <= 0.25) return 'knapp';
  return 'frei';
}
const STATUSTEXT = { frei: 'verfügbar', knapp: 'knapp', weg: 'vergeben' };
function prozentVergeben(schwein) {
  const g = Object.values(GESAMT).reduce((a, b) => a + b, 0);
  const v = Object.values(schwein.vergeben).reduce((a, b) => a + b, 0);
  return Math.round(v / g * 100);
}

// ---------- Die Grafik ----------
// Umriss des Schweins (ohne Beine). Die Rumpf-Flächen werden darauf zugeschnitten.
const UMRISS = 'M62 228 C85 218 110 200 130 178 C150 155 185 140 225 138 C300 112 430 104 560 108 ' +
  'C640 112 702 142 712 200 C722 255 708 312 665 336 C600 362 420 364 300 352 ' +
  'C255 348 225 330 205 312 C180 300 150 300 120 292 C95 285 70 278 62 266 C56 256 56 238 62 228 Z';

// Schnittlinien als grobe Vielecke; der Umriss schneidet sie zu.
const FLAECHEN = {
  kopf: 'M0 0 L226 0 L214 208 L207 300 L200 460 L0 460 Z',
  nacken: 'M226 0 L335 0 L330 200 L214 208 Z',
  schulter: 'M214 208 L330 200 L325 292 L207 300 Z',
  wurst: 'M207 300 L325 292 L320 460 L200 460 Z',
  ruecken: 'M335 0 L575 0 L565 195 L330 200 Z',
  filet: 'M440 198 L565 195 L562 238 L438 240 Z',
  bauch: 'M330 200 L440 198 L438 240 L562 238 L560 460 L320 460 L325 292 Z',
  schinken: 'M575 0 L800 0 L800 460 L560 460 L562 238 L565 195 Z',
  // Haxen liegen außerhalb des Rumpfs, der Rumpf deckt ihren oberen Rand ab
  'haxe-vorne': 'M236 300 L302 300 C300 340 297 372 295 398 L257 398 C251 370 243 340 236 300 Z',
  'haxe-hinten': 'M598 300 L670 300 C666 345 656 375 651 398 L615 398 C610 372 604 345 598 300 Z',
};
const BESCHRIFTUNG = {
  kopf: [150, 278], nacken: [274, 168], schulter: [268, 252], wurst: [264, 320],
  ruecken: [450, 160], filet: [500, 224], bauch: [445, 300], schinken: [636, 236],
  'haxe-vorne': [276, 376], 'haxe-hinten': [633, 376],
};
const RUMPF = ['kopf', 'nacken', 'schulter', 'wurst', 'ruecken', 'filet', 'bauch', 'schinken'];

function flaecheSvg(schwein, id) {
  const st = status(schwein, id);
  const t = teil(id);
  const sel = gewaehlt === id ? ' gewaehlt' : '';
  return `<path class="flaeche ${st}${sel}" d="${FLAECHEN[id]}" data-teil="${id}"
    role="button" tabindex="0" aria-label="${t.name}: ${STATUSTEXT[st]}"></path>`;
}
function beschriftungSvg(schwein, id) {
  const st = status(schwein, id);
  const [x, y] = BESCHRIFTUNG[id];
  const klein = id === 'filet' || id.startsWith('haxe') ? ' klein-text' : '';
  const zweite = st === 'frei' || id === 'filet' || id.startsWith('haxe') ? '' :
    `<tspan class="klein" x="${x}" dy="15">${STATUSTEXT[st]}</tspan>`;
  return `<text class="${st === 'weg' ? 'auf-schwarz' : ''}${klein}" x="${x}" y="${y}">${teil(id).kurz}${zweite}</text>`;
}

function schweinSvg(schwein) {
  return `
<svg class="tafel" viewBox="40 90 720 350" role="group" aria-label="Schwein Nr. ${schwein.nr} mit Teilstücken">
  <defs>
    <clipPath id="rumpf"><path d="${UMRISS}"/></clipPath>
    <pattern id="muster-knapp" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="9" fill="#f4efe4"/><rect width="3.2" height="9" fill="#9c3b22"/>
    </pattern>
    <pattern id="muster-knapp-hover" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="9" fill="#e6dcc6"/><rect width="3.2" height="9" fill="#9c3b22"/>
    </pattern>
  </defs>
  <!-- ferne Beine, nur Zeichnung -->
  <path class="schwarz" d="M310 330 L345 330 L340 425 L316 425 Z"/>
  <path class="schwarz" d="M560 330 L598 330 L590 425 L566 425 Z"/>
  <!-- Haxen und Klauen -->
  ${flaecheSvg(schwein, 'haxe-vorne')}
  ${flaecheSvg(schwein, 'haxe-hinten')}
  <path class="schwarz" d="M257 398 L295 398 L293 428 L259 428 Z"/>
  <path class="schwarz" d="M615 398 L651 398 L649 428 L617 428 Z"/>
  <path class="strich" style="stroke:#f4efe4;stroke-width:1.5" d="M276 410 L276 428 M633 410 L633 428"/>
  <!-- Rumpf mit Teilstücken -->
  <g clip-path="url(#rumpf)">
    ${RUMPF.map(id => flaecheSvg(schwein, id)).join('')}
  </g>
  <path class="umriss" d="${UMRISS}"/>
  <!-- Rüssel, Auge, Schlappohr, Ringelschwanz -->
  <ellipse class="schwarz" cx="62" cy="247" rx="7" ry="19"/>
  <path class="strich" d="M118 214 C124 210 130 210 136 214"/>
  <path class="umriss" style="fill:#1b1a17" d="M168 146 C150 158 124 188 108 230 C130 228 156 216 176 200 C192 184 194 158 168 146 Z"/>
  <path class="strich" d="M712 192 C738 176 752 196 738 206 C724 216 730 232 748 226"/>
  ${RUMPF.concat(['haxe-vorne', 'haxe-hinten']).map(id => beschriftungSvg(schwein, id)).join('')}
</svg>`;
}

function musterKlein(st) {
  if (st === 'frei') return '<svg viewBox="0 0 28 18" aria-hidden="true"><rect width="28" height="18" fill="#e6dcc6"/></svg>';
  if (st === 'weg') return '<svg viewBox="0 0 28 18" aria-hidden="true"><rect width="28" height="18" fill="#1b1a17"/></svg>';
  return '<svg viewBox="0 0 28 18" aria-hidden="true"><defs><pattern id="lk" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#f4efe4"/><rect width="3.2" height="9" fill="#9c3b22"/></pattern></defs><rect width="28" height="18" fill="url(#lk)"/></svg>';
}

// ---------- Ansichten ----------
const ANSICHTEN = {};

ANSICHTEN.start = () => {
  const s = SCHWEINE[0];
  return `
<section class="start-oben">
  <div>
    <h1>Schwarze Schweine aus dem Steigerwald</h1>
    <p>Wir halten Cornwallschweine im Freiland. Jedes Schwein verkaufen wir ganz –
    Sie suchen sich vorher Ihr Stück aus.</p>
    <a class="knopf" href="#/schwein">Zum nächsten Schwein</a>
  </div>
  <div class="foto">unsere Schweine im Auslauf</div>
</section>
<section class="drei">
  <div>
    <h3>Schwein Nr. ${s.nr}</h3>
    <p>Schlachttermin ${datum(s.termin)}, davon sind ${prozentVergeben(s)} % schon vergeben.
    Abholung im Hofladen oder am Verkaufswagen.</p>
    <a class="mehr" href="#/schwein">Teilstücke ansehen</a>
  </div>
  <div>
    <h3>Dauerware im Versand</h3>
    <p>Schinken, Bauch, Speck, Bratwurst und Salami. Wir verschicken montags,
    ab 50 € versandkostenfrei.</p>
    <a class="mehr" href="#/dauerware">Zur Dauerware</a>
  </div>
  <div>
    <h3>Hofladen</h3>
    <p>Freitags von 9 bis 18 Uhr. Dazu Rind, Lamm, Hähnchen und Fisch von
    Nachbarn aus der Region.</p>
    <a class="mehr" href="#/wo">Wo Sie uns finden</a>
  </div>
</section>`;
};

function teillisteHtml(s) {
  return TEILSTUECKE.map(t => {
    const st = status(s, t.id);
    const preis = st === 'weg' ? '' : `${euro(preisHeute(s, t.id))}/kg`;
    const hinweis = st === 'weg' ? '' : preisHinweis(s, t.id);
    const restText = st === 'weg' ? 'alles vergeben' : `noch ${kg(rest(s, t.id))}`;
    return `<li><button type="button" data-teil="${t.id}" ${st === 'weg' ? 'aria-disabled="true"' : ''}>
      <span class="tl-name">${t.name}</span><span class="tl-preis">${preis}</span>
      <span class="tl-status"><span class="marke-status ${st}">${STATUSTEXT[st]}</span>${restText}</span>
      <span class="tl-hinweis">${hinweis}</span></button></li>`;
  }).join('');
}

function panelHtml(s) {
  if (!gewaehlt) {
    return `<div class="panel-leer"><h2>Ihr Stück</h2>
      <p>Tippen Sie auf ein Teilstück im Schwein oder in der Liste.</p>
      <p>Frischfleisch holen Sie nach dem Schlachttermin ab – im Hofladen oder am Verkaufswagen.</p></div>`;
  }
  const t = teil(gewaehlt);
  const st = status(s, gewaehlt);
  const r = rest(s, gewaehlt);
  const p = preisHeute(s, gewaehlt);
  const knopfZu = `<button type="button" class="textknopf panel-zu" data-aktion="panel-zu" aria-label="Schließen">Schließen</button>`;
  if (st === 'weg') {
    return `${knopfZu}<div class="foto">${t.name}</div><h2>${t.name}</h2>
      <p><span class="marke-status weg">vergeben</span> Bei diesem Schwein ist alles weg.</p>
      <button type="button" class="knopf hell" data-aktion="naechstes">Beim nächsten Schwein schauen</button>
      ${bestaetigung ? `<p class="bestaetigt" role="status">${bestaetigung}</p>` : ''}`;
  }
  return `${knopfZu}<div class="foto">${t.name}</div>
    <h2>${t.name}</h2>
    <p>${t.text}</p>
    <div class="preiszeile"><span>Preis heute</span><span class="gross">${euro(p)}/kg</span></div>
    <p class="basis">Grundpreis ohne Tagesfaktor: ${euro(t.basis)}/kg</p>
    <p class="hinweis">${preisHinweis(s, gewaehlt)}</p>
    <div class="menge" aria-label="Menge">
      <button type="button" data-aktion="weniger" aria-label="weniger" ${menge <= t.schritt ? 'disabled' : ''}>−</button>
      <output aria-live="polite">${kg(menge)}</output>
      <button type="button" data-aktion="mehr" aria-label="mehr" ${menge + t.schritt > r + 1e-9 ? 'disabled' : ''}>+</button>
    </div>
    <div class="preiszeile"><span>Zusammen</span><span class="gross">${euro(rund2(menge * p))}</span></div>
    <button type="button" class="knopf" data-aktion="in-korb">In den Korb</button>
    <p class="panel-rest"><span class="marke-status ${st}">${STATUSTEXT[st]}</span>noch ${kg(r)} von diesem Schwein · Abholung ab ${datum(s.abholung)}</p>
    ${bestaetigung ? `<p class="bestaetigt" role="status">${bestaetigung} <a href="#/korb">Zum Korb</a></p>` : ''}`;
}

ANSICHTEN.schwein = () => {
  const s = SCHWEINE[schweinIndex];
  const andere = schweinIndex === 0 ? 'Nächstes Schwein' : 'Zurück zu Nr. 14';
  return `
<div class="schwein-kopf">
  <div>
    <h1>Das Schwein</h1>
    <p class="schwein-zeile"><b>Schwein Nr. ${s.nr}</b> · Schlachttermin ${datum(s.termin)} · ${prozentVergeben(s)} % vergeben</p>
  </div>
  <div class="schalter"><button type="button" class="knopf hell" data-aktion="schwein-wechseln">${andere}</button></div>
</div>
<div class="schwein-raster">
  <div>
    ${schweinSvg(s)}
    <ul class="legende">
      <li>${musterKlein('frei')} verfügbar</li>
      <li>${musterKlein('knapp')} knapp – weniger als ein Viertel übrig</li>
      <li>${musterKlein('weg')} vergeben</li>
    </ul>
    <details class="info">
      <summary>Warum sich die Preise bewegen</summary>
      <p>Wir wollen jedes Schwein ganz verkaufen. Was gefragt ist, kostet darum etwas mehr,
      was kurz vor dem Schlachttermin noch reichlich da ist, etwas weniger – höchstens 15 %
      in jede Richtung.</p>
      <p>Der Preis gilt einen Tag lang für alle gleich und steht fest, sobald Sie bestellen.
      Den Grundpreis zeigen wir immer daneben.</p>
    </details>
    <ul class="teilliste" aria-label="Alle Teilstücke">${teillisteHtml(s)}</ul>
  </div>
  <aside class="panel${gewaehlt ? ' offen' : ''}" id="panel" aria-label="Gewähltes Teilstück">${panelHtml(s)}</aside>
</div>
<div class="schleier${gewaehlt ? ' offen' : ''}" data-aktion="panel-zu"></div>`;
};

ANSICHTEN.dauerware = () => `
<h1>Dauerware</h1>
<p>Geräuchert und luftgetrocknet, alles vom Schwarzerle. Das verschicken wir –
Frischfleisch gibt es nur zum Abholen.</p>
<div class="versandregel"><p><b>Versand immer montags.</b> Ab 50 € Warenwert versandkostenfrei, sonst 10 € je Paket.</p></div>
<ul class="artikel-liste">
${DAUERWARE.map(a => {
  const varianten = Object.keys(a.preise);
  const optionen = [];
  for (let m = a.min; m <= a.max + 1e-9; m = rund2(m + a.schritt)) {
    const paar = a.id === 'd-bratwurst' ? ` (${Math.round(m / 0.2)} Paar)` : '';
    optionen.push(`<option value="${m}">${kg(m)}${paar}</option>`);
  }
  return `<li class="artikel" data-artikel="${a.id}">
    <div class="foto">${a.name}</div>
    <div><h3>${a.name}</h3><p>${a.text}</p>
      <p class="leise">${varianten.map(v => `${v}: ${euro(a.preise[v])}/kg`).join(' · ')}</p></div>
    <div>
      ${varianten.length > 1 ? `<div class="wahl" role="radiogroup" aria-label="Variante">
        ${varianten.map((v, i) => `<label><input type="radio" name="v-${a.id}" value="${v}" ${i === 0 ? 'checked' : ''}><span>${v}</span></label>`).join('')}
      </div>` : ''}
      <label class="feld"><span>Menge</span>
        <select name="m-${a.id}">${optionen.join('')}</select></label>
      <div class="preiszeile"><span>Zusammen</span><span class="gross" data-summe>${euro(a.preise[varianten[0]] * a.min)}</span></div>
      <button type="button" class="knopf" data-aktion="dauer-in-korb" data-id="${a.id}" style="width:100%">In den Korb</button>
      <p class="bestaetigt" role="status" data-meldung></p>
    </div>
  </li>`;
}).join('')}
</ul>`;

ANSICHTEN.hof = () => `
<div class="zwei">
  <div>
    <h1>Der Hof und die Rasse</h1>
    <p>Der Laimbachhof liegt im südlichen Steigerwald, im Schwarzenberger Land.
    Unsere Schweine leben draußen, auf Wiese und im Wald, das ganze Jahr.</p>
    <p>Wir halten Cornwallschweine, auf Englisch Large Black. Die Rasse ist selten
    geworden und gilt als bedroht. Sie wächst langsam, dafür ist das Fleisch kräftig
    und schön marmoriert. Wir nennen sie: Steigerwälder Schwarzerle.</p>
    <ul class="fakten">
      <li><b>Rasse</b> Cornwallschwein / Large Black</li>
      <li><b>Erkennt man an</b> ganz schwarz, große Schlappohren über den Augen</li>
      <li><b>Haltung</b> Freiland, ganzjährig draußen</li>
      <li><b>Verkauf</b> je Schwein, Teilstück für Teilstück</li>
    </ul>
  </div>
  <div>
    <div class="foto">Schwarzerle mit Schlappohren</div>
    <p class="leise" style="margin-top:.75rem">Platzhalter. Im echten Shop stehen hier Fotos vom Hof, keine Bilder aus dem Netz.</p>
  </div>
</div>
<section style="margin-top:3rem">
  <h2>Live aus dem Auslauf</h2>
  <div class="foto breit">hier läuft später der Livestream</div>
</section>`;

ANSICHTEN.wo = () => `
<h1>Wo Sie uns finden</h1>
<p>Frischfleisch vom Schwein holen Sie bei uns ab. Dauerware schicken wir auch.</p>
<div class="zwei" style="margin-top:2rem">
  <div>
    <div class="ort">
      <h2>Hofladen</h2>
      <p class="zeit">Freitag, 9 bis 18 Uhr</p>
      <p>Neben unserem Schweinefleisch: Angus-Weiderind, Lamm, Bio-Hähnchen und Fisch
      von Erzeugern aus der Region.</p>
      <p class="leise">Adresse und Anfahrt folgen.</p>
    </div>
    <div class="ort">
      <h2>Verkaufswagen</h2>
      <p class="zeit">Nürnberg Süd – Donnerstag und Freitag</p>
      <p class="zeit">Scheinfeld – alle 14 Tage am Samstag</p>
      <p class="leise">Genaue Stellplätze und Uhrzeiten folgen.</p>
    </div>
  </div>
  <div class="foto">der Verkaufswagen</div>
</div>`;

function korbPostenHtml(p, i) {
  const titel = p.art === 'frisch' ? `${teil(p.id).name}` : DAUERWARE.find(a => a.id === p.id).name;
  const detail = p.art === 'frisch'
    ? `Schwein Nr. ${p.schwein} · ${kg(p.kg)} × ${euro(p.preisKg)}/kg`
    : `${p.variante} · ${kg(p.kg)} × ${euro(p.preisKg)}/kg`;
  return `<li><div><div class="k-name">${titel}</div><div class="k-detail">${detail}</div></div>
    <div class="k-preis">${euro(rund2(p.kg * p.preisKg))}</div>
    <button type="button" class="textknopf" data-aktion="entfernen" data-index="${i}">Entfernen</button></li>`;
}

function summenHtml(su) {
  return `<div class="summen">
    ${su.frisch ? `<div><span>Frischfleisch (Abholung)</span><span>${euro(su.frisch)}</span></div>` : ''}
    ${su.dauer ? `<div><span>Dauerware</span><span>${euro(su.dauer)}</span></div>
    <div><span>Versand${su.versand ? ' (frei ab 50 € Dauerware)' : ''}</span><span>${su.versand ? euro(su.versand) : 'frei'}</span></div>` : ''}
    <div class="gesamt"><span>Gesamt</span><span>${euro(su.gesamt)}</span></div>
    <p class="leise" style="margin-top:.5rem">Alle Preise inkl. MwSt. (Beispiel, rechtlich nicht geprüft)</p>
  </div>`;
}

ANSICHTEN.korb = () => {
  if (!korb.length) {
    return `<h1>Ihr Korb</h1><p>Noch leer.</p>
      <div class="summen-knopf" style="justify-content:flex-start">
      <a class="knopf" href="#/schwein">Zum Schwein</a> <a class="knopf hell" href="#/dauerware">Zur Dauerware</a></div>`;
  }
  const mitIndex = korb.map((p, i) => ({ p, i }));
  const frisch = mitIndex.filter(x => x.p.art === 'frisch');
  const dauer = mitIndex.filter(x => x.p.art === 'dauer');
  const su = summen();
  const fehltBisFrei = su.dauer > 0 && su.dauer < 50 ? rund2(50 - su.dauer) : 0;
  return `<h1>Ihr Korb</h1>
  ${frisch.length ? `<p class="gruppe-titel">Frischfleisch – zum Abholen</p>
    <ul class="korb-liste">${frisch.map(x => korbPostenHtml(x.p, x.i)).join('')}</ul>` : ''}
  ${dauer.length ? `<p class="gruppe-titel">Dauerware – Versand am Montag</p>
    <ul class="korb-liste">${dauer.map(x => korbPostenHtml(x.p, x.i)).join('')}</ul>
    ${fehltBisFrei ? `<p class="leise">Noch ${euro(fehltBisFrei)} Dauerware, dann ist der Versand frei.</p>` : ''}` : ''}
  ${summenHtml(su)}
  <div class="summen-knopf"><a class="knopf hell" href="#/schwein">Weiter einkaufen</a>
  <a class="knopf" href="#/kasse">Zur Kasse</a></div>`;
};

ANSICHTEN.kasse = () => {
  if (!korb.length) return ANSICHTEN.korb();
  const hatFrisch = korb.some(p => p.art === 'frisch');
  const hatDauer = korb.some(p => p.art === 'dauer');
  const su = summen();
  return `<h1>Kasse</h1>
  <p class="leise">Prototyp: Sie können hier alles ausfüllen, es wird nichts gesendet.
  <button type="button" class="textknopf" data-aktion="beispiel">Beispieldaten einsetzen</button></p>
  <form class="kasse" id="kasse-form" novalidate>
    <div>
      <fieldset><legend>Ihre Angaben</legend>
        <label class="feld"><span>Vor- und Nachname</span><input type="text" name="name" required autocomplete="name"></label>
        <label class="feld"><span>E-Mail</span><input type="email" name="mail" required autocomplete="email"></label>
        <label class="feld"><span>Telefon (für Rückfragen)</span><input type="tel" name="tel" autocomplete="tel"></label>
      </fieldset>
      ${hatDauer ? `<fieldset><legend>Lieferadresse für die Dauerware</legend>
        <label class="feld"><span>Straße und Hausnummer</span><input type="text" name="strasse" required autocomplete="street-address"></label>
        <div class="reihe">
          <label class="feld"><span>PLZ</span><input type="text" name="plz" required inputmode="numeric" autocomplete="postal-code"></label>
          <label class="feld"><span>Ort</span><input type="text" name="ort" required autocomplete="address-level2"></label>
        </div>
        <p class="leise">Versand am nächsten Montag.</p>
      </fieldset>` : ''}
      ${hatFrisch ? `<fieldset><legend>Abholung des Frischfleischs</legend>
        <label class="auswahl"><input type="radio" name="abholung" value="hofladen" checked><span>Hofladen<small>Freitag 9–18 Uhr, ab ${datum(SCHWEINE[0].abholung)}</small></span></label>
        <label class="auswahl"><input type="radio" name="abholung" value="nuernberg"><span>Verkaufswagen Nürnberg Süd<small>Donnerstag oder Freitag</small></span></label>
        <label class="auswahl"><input type="radio" name="abholung" value="scheinfeld"><span>Verkaufswagen Scheinfeld<small>Samstag, alle 14 Tage</small></span></label>
      </fieldset>` : ''}
      <fieldset><legend>Bezahlen</legend>
        <label class="auswahl"><input type="radio" name="zahlung" value="rechnung" checked><span>Rechnung<small>Überweisung nach Erhalt, wie bisher</small></span></label>
        <label class="auswahl"><input type="radio" name="zahlung" value="karte"><span>Karte oder Lastschrift<small>im echten Shop über einen Zahlungsdienst – hier nur zum Anschauen</small></span></label>
      </fieldset>
    </div>
    <div class="uebersicht">
      <h2>Übersicht</h2>
      <ul class="korb-liste">${korb.map((p, i) => `<li><div><div class="k-name">${p.art === 'frisch' ? teil(p.id).name : DAUERWARE.find(a => a.id === p.id).name}</div>
        <div class="k-detail">${kg(p.kg)}</div></div><div class="k-preis">${euro(rund2(p.kg * p.preisKg))}</div><span></span></li>`).join('')}</ul>
      ${summenHtml(su)}
      <label class="auswahl"><input type="checkbox" name="agb" required><span>Ich habe AGB, Widerruf und Datenschutz gelesen. <small>Texte folgen im echten Shop.</small></span></label>
      <p class="hinweis" id="kasse-fehler" role="alert"></p>
      <button type="submit" class="knopf">zahlungspflichtig bestellen</button>
    </div>
  </form>`;
};

ANSICHTEN.fertig = () => `
<div class="fertig">
  <h1>Prototyp – keine echte Bestellung</h1>
  <p>Hier würde im echten Shop die Bestätigung stehen, und Sie bekämen eine Mail.
  In diesem Prototyp ist nichts bestellt, nichts bezahlt und nichts gespeichert.</p>
  <p>Danke fürs Durchklicken. Was hat gefehlt, was war umständlich?</p>
  <a class="knopf" href="#/">Zur Startseite</a>
</div>`;

// ---------- Router ----------
function zeige() {
  const name = (location.hash.replace(/^#\/?/, '') || 'start').split('?')[0];
  const ansicht = ANSICHTEN[name] ? name : 'start';
  const main = document.getElementById('inhalt');
  main.innerHTML = ANSICHTEN[ansicht]();
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('aktiv', a.dataset.nav === ansicht));
  korbSpeichern();
  return ansicht;
}
window.addEventListener('hashchange', () => {
  gewaehlt = null; bestaetigung = '';
  zeige();
  window.scrollTo(0, 0);
  document.getElementById('inhalt').focus({ preventScroll: true });
});

// Nur die Schwein-Seite neu zeichnen, Scrollstand behalten
function schweinNeu() { const y = window.scrollY; zeige(); window.scrollTo(0, y); }

function waehle(id) {
  const s = SCHWEINE[schweinIndex];
  gewaehlt = id;
  bestaetigung = '';
  const t = teil(id);
  menge = Math.min(Math.max(t.schritt, id === 'filet' ? 0.5 : 1), rest(s, id));
  menge = Math.max(menge, t.schritt);
  schweinNeu();
}

// ---------- Klicks ----------
document.addEventListener('click', e => {
  const flaeche = e.target.closest('[data-teil]');
  if (flaeche) { waehle(flaeche.dataset.teil); return; }
  const el = e.target.closest('[data-aktion]');
  if (!el) return;
  const s = SCHWEINE[schweinIndex];
  const aktion = el.dataset.aktion;
  if (aktion === 'panel-zu') { gewaehlt = null; bestaetigung = ''; schweinNeu(); }
  if (aktion === 'schwein-wechseln' || aktion === 'naechstes') {
    schweinIndex = aktion === 'naechstes' ? 1 : 1 - schweinIndex;
    gewaehlt = null; bestaetigung = ''; schweinNeu();
  }
  if (aktion === 'mehr' || aktion === 'weniger') {
    const t = teil(gewaehlt);
    menge = rund2(menge + (aktion === 'mehr' ? t.schritt : -t.schritt));
    menge = Math.max(t.schritt, Math.min(menge, rest(s, gewaehlt)));
    schweinNeu();
  }
  if (aktion === 'in-korb') {
    const t = teil(gewaehlt);
    korbHinzu({ art: 'frisch', id: gewaehlt, schwein: s.nr, kg: menge, preisKg: preisHeute(s, gewaehlt) });
    bestaetigung = `${kg(menge)} ${t.name} liegt im Korb.`;
    menge = Math.min(menge, Math.max(t.schritt, rest(s, gewaehlt)));
    schweinNeu();
  }
  if (aktion === 'dauer-in-korb') {
    const box = el.closest('[data-artikel]');
    const a = DAUERWARE.find(x => x.id === el.dataset.id);
    const v = box.querySelector('input[type=radio]:checked');
    const variante = v ? v.value : Object.keys(a.preise)[0];
    const m = parseFloat(box.querySelector('select').value);
    korbHinzu({ art: 'dauer', id: a.id, variante, kg: m, preisKg: a.preise[variante] });
    box.querySelector('[data-meldung]').innerHTML = `${kg(m)} im Korb. <a href="#/korb">Zum Korb</a>`;
  }
  if (aktion === 'entfernen') {
    korb.splice(parseInt(el.dataset.index, 10), 1);
    korbSpeichern(); zeige();
  }
  if (aktion === 'beispiel') {
    const f = document.getElementById('kasse-form');
    const werte = { name: 'Erika Musterfrau', mail: 'erika@example.org', tel: '0911 000000',
      strasse: 'Musterweg 1', plz: '91443', ort: 'Scheinfeld' };
    Object.entries(werte).forEach(([k, w]) => { if (f.elements[k]) f.elements[k].value = w; });
    f.elements.agb.checked = true;
    document.getElementById('kasse-fehler').textContent = '';
  }
});

// Tastatur: Enter/Leertaste auf einer Fläche der Grafik
document.addEventListener('keydown', e => {
  const flaeche = e.target.closest && e.target.closest('path[data-teil]');
  if (flaeche && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); waehle(flaeche.dataset.teil); }
  if (e.key === 'Escape' && gewaehlt) { gewaehlt = null; schweinNeu(); }
});

// Dauerware: Gesamtpreis mitrechnen
document.addEventListener('change', e => {
  const box = e.target.closest('[data-artikel]');
  if (!box) return;
  const a = DAUERWARE.find(x => x.id === box.dataset.artikel);
  const v = box.querySelector('input[type=radio]:checked');
  const preis = a.preise[v ? v.value : Object.keys(a.preise)[0]];
  box.querySelector('[data-summe]').textContent = euro(rund2(preis * parseFloat(box.querySelector('select').value)));
});

// Kasse absenden → Hinweisseite
document.addEventListener('submit', e => {
  if (e.target.id !== 'kasse-form') return;
  e.preventDefault();
  const f = e.target;
  const fehlt = [...f.querySelectorAll('[required]')].filter(x => x.type === 'checkbox' ? !x.checked : !x.value.trim());
  if (fehlt.length) {
    document.getElementById('kasse-fehler').textContent = 'Bitte alle Pflichtfelder ausfüllen und das Häkchen setzen.';
    fehlt[0].focus();
    return;
  }
  korb = []; korbSpeichern();
  location.hash = '#/fertig';
});

zeige();
