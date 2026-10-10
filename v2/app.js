// Laimbachhof – Prototyp v2
// Alles hier sind Beispieldaten. Kein Server, keine Zahlung, nichts wird verschickt.
// Aufbau: Hilfen → Daten → Preisregel → Korb → Bauteile (Tierkarte, Silhouette, Karten,
// Auswahl, Anteile, Dauerware, Schublade) → Start.

'use strict';

// ---------- Hilfen ----------
const $ = sel => document.querySelector(sel);
const euro = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const kg = n => n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' kg';
const rund2 = n => Math.round(n * 100) / 100;
const tagMonat = d => d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
const kurzDatum = d => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const HANDY = window.matchMedia('(max-width: 999px)');

const HEUTE = new Date();
HEUTE.setHours(0, 0, 0, 0);
function plusTage(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
// Nächster Dienstag, der mindestens n Tage entfernt ist (Schlachttag beim Metzger, Beispiel)
function naechsterDienstag(ab) {
  const d = plusTage(HEUTE, ab);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d;
}

// ---------- Daten: das Schwein ----------
const SCHLACHTTERMIN = naechsterDienstag(16);
const ABHOLUNG = plusTage(SCHLACHTTERMIN, 3);              // der Freitag danach: Hofladen
const GEBOREN = new Date(SCHLACHTTERMIN.getFullYear(), SCHLACHTTERMIN.getMonth() - 11, 1);
const SCHWEIN = { nr: 15, rasse: 'Cornwallschwein', weide: 'Hangweide Oberlaimbach' };

// Teilstücke. „zone“ = Fläche in der Silhouette (Koordinaten im 600×340-Raster),
// die Umrisslinie des Schweins schneidet die Flächen zu. „etikett“ = Beschriftung in der Grafik.
const TEILE = [
  { id: 'kopf', name: 'Kopf & Backe', basis: 9.5, schritt: 0.5, gesamt: 4, vergeben: 2,
    zone: '0,0 172,0 146,340 0,340', etikett: [112, 178],
    eignung: ['Schmoren', 'Sülze', 'Presssack'], tipp: 'Backe 3 Stunden in Bier und Wurzelgemüse schmoren – zerfällt auf der Gabel.',
    text: 'Die Backe zum Schmoren, der Rest wird Sülze und Presssack.' },
  { id: 'nacken', name: 'Nacken', basis: 17.5, schritt: 0.5, gesamt: 5, vergeben: 4,
    zone: '172,0 262,0 262,150 155,150', etikett: [214, 124],
    eignung: ['Grill', 'Braten', 'Steaks'], tipp: 'In 3 cm dicken Scheiben grillen; das Fett hält ihn saftig.',
    text: 'Schön durchwachsen. Für Braten, Steaks und den Grill.' },
  { id: 'schulter', name: 'Schulter', basis: 15.9, schritt: 0.5, gesamt: 9, vergeben: 6,
    zone: '155,150 262,150 262,340 140,340', etikett: [212, 212],
    eignung: ['Schäufele', 'Ofen', 'Pulled Pork'], tipp: 'Schwarte rautenförmig einschneiden, 2½ Stunden bei 160 °C, zum Schluss Grill an.',
    text: 'Das Stück fürs Schäufele. Mit Schwarte, ab in den Ofen.' },
  { id: 'ruecken', name: 'Kotelett', basis: 21.5, schritt: 0.5, gesamt: 9, vergeben: 8,
    zone: '262,0 432,0 432,150 262,150', etikett: [350, 120],
    eignung: ['Pfanne', 'Grill', 'Braten'], tipp: 'Kotelett vor dem Braten 30 Minuten Zimmertemperatur – dann kurz und heiß.',
    text: 'Mit Knochen als Kotelett oder ausgelöst als Lachs. Gibt es je Schwein nur wenig.' },
  { id: 'bauch', name: 'Bauch', basis: 13.9, schritt: 0.5, gesamt: 10, vergeben: 5.5,
    zone: '262,150 340,150 340,180 432,180 432,236 262,236', etikett: [318, 214],
    eignung: ['Krustenbraten', 'Grill', 'Schmoren'], tipp: 'Über Nacht trocken salzen, dann wird die Kruste blasig und knusprig.',
    text: 'Mit Schwarte als Krustenbraten oder in Scheiben für den Grill.' },
  { id: 'wurst', name: 'Hack & Wurst', basis: 12.5, schritt: 0.5, gesamt: 12, vergeben: 7,
    zone: '262,236 432,236 432,340 262,340', etikett: [356, 258],
    eignung: ['Hack', 'Bratwurst', 'Frikadellen'], tipp: 'Grob gewolft für Frikadellen, fein für Bratwurst aus eigener Hand.',
    text: 'Brust und Abschnitte, grob oder fein gewolft. Für Hack, Bratwurst und Selbstgemachtes.' },
  { id: 'schinken', name: 'Schinken', basis: 16.9, schritt: 0.5, gesamt: 14, vergeben: 10,
    zone: '432,0 620,0 620,340 432,340', etikett: [502, 176],
    eignung: ['Schnitzel', 'Braten', 'Geschnetzeltes'], tipp: 'Die Nuss im Ganzen rosa braten, nach 20 Minuten Ruhe aufschneiden.',
    text: 'Oberschale, Nuss und Unterschale. Für Braten und Schnitzel.' },
  { id: 'filet', name: 'Filet', basis: 34, schritt: 0.25, gesamt: 1.2, vergeben: 1.2,
    zone: '340,150 432,150 432,180 340,180', etikett: [386, 170],
    eignung: ['Kurzbraten', 'Medaillons'], tipp: 'Im Ganzen anbraten, bei 80 °C im Ofen auf 60 °C Kerntemperatur ziehen lassen.',
    text: 'Das zarteste Stück. Ein Schwein hat davon nur gut ein Kilo.' },
  { id: 'haxe-vorne', name: 'Haxe vorne', basis: 9.9, schritt: 0.5, gesamt: 2.5, vergeben: 1.5,
    zone: '176,252 244,252 244,340 176,340', etikett: null,
    eignung: ['Kochen', 'Eisbein', 'Grill'], tipp: 'Erst eine Stunde sieden, dann im Ofen knusprig ausbacken.',
    text: 'Die kleinere Haxe. Zum Kochen oder für den Grill.' },
  { id: 'haxe-hinten', name: 'Haxe hinten', basis: 10.9, schritt: 0.5, gesamt: 3.5, vergeben: 2.5,
    zone: '490,250 548,250 548,340 490,340', etikett: null,
    eignung: ['Ofen', 'Grill'], tipp: 'Bei 180 °C gut 2½ Stunden, alle 20 Minuten mit Bier bestreichen.',
    text: 'Die große Haxe, klassisch knusprig aus dem Ofen.' },
];
// Reihenfolge in der Kartenreihe: von vorne nach hinten wie am Tier
const REIHENFOLGE = ['kopf', 'nacken', 'schulter', 'haxe-vorne', 'ruecken', 'filet', 'bauch', 'wurst', 'schinken', 'haxe-hinten'];
const teil = id => TEILE.find(t => t.id === id);

// Umriss des Schweins (Blick von der Seite, Kopf links). Schnauze → Rücken → Hinterteil → Beine → Bauch.
const UMRISS = 'M38 168 C36 156 44 148 58 146 C80 130 104 108 140 96 C190 80 280 70 380 72 C460 74 530 86 556 118 '
  + 'C578 146 580 196 566 228 C558 244 548 252 540 256 L538 304 Q538 310 532 310 L506 310 Q500 310 500 304 L498 266 '
  + 'C440 276 310 278 244 268 L240 304 Q240 310 234 310 L206 310 Q200 310 200 304 L196 258 '
  + 'C160 250 128 232 108 214 C92 200 72 190 54 186 C44 184 39 178 38 168 Z';
const OHR = 'M134 98 C116 110 98 132 92 160 C108 156 126 144 142 124';           // Schlappohr, typisch Cornwall
const SCHWANZ = 'M564 126 c12 -4 20 -14 16 -24 c-4 -9 -16 -6 -14 3 c2 7 12 6 16 0';

// Fertige Anteile: fester Kilopreis, gemischt aus allen Teilstücken (Beispiel)
const ANTEILE = [
  { id: 'achtel', name: 'Achtel', ca: 9, preisKg: 15.9, frei: 3, inhalt: [
    ['Schnitzel & Braten (Schinken)', 1.5], ['Schäufele (Schulter)', 1.5], ['Bauch', 1.5], ['Kotelett', 1],
    ['Nacken', 1], ['Hackfleisch', 1], ['Frische Bratwurst', 1], ['Haxe', 0.5]] },
  { id: 'viertel', name: 'Viertel', ca: 18, preisKg: 15.5, frei: 1, marke: 'mit Filet', inhalt: [
    ['Schnitzel & Braten (Schinken)', 3], ['Schäufele (Schulter)', 3], ['Bauch', 3], ['Kotelett', 2],
    ['Nacken', 2], ['Hackfleisch', 2], ['Frische Bratwurst', 2], ['Haxe', 0.7], ['Filet', 0.3]] },
];

// Dauerware: echte Hofpreise und Zutaten (leimbachhof.de, Stand 07.10.2026)
const VOM_SCHWARZERLE = 'Vom Steigerwälder Schwarzerle.';
const GEWICHTE = [0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3];
const PAARE = [0.2, 0.4, 0.6, 1, 1.4, 2, 3];
const DAUERWARE = [
  { id: 'd-schinken', name: 'Geräucherter Schinken', bild: 'schinken.jpg', preise: { 'am Stück': 34, 'geschnitten': 39 },
    gewichte: GEWICHTE, start: 0.5, zutaten: VOM_SCHWARZERLE + ' Schweinekeule, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-bauch', name: 'Geräucherter Bauch', bild: 'bauch.jpg', preise: { 'am Stück': 29, 'geschnitten': 34 },
    gewichte: GEWICHTE, start: 0.5, zutaten: VOM_SCHWARZERLE + ' Schweinebauch, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-speck', name: 'Geräucherter Rückenspeck', bild: 'speck.jpg', preise: { 'am Stück': 24, 'geschnitten': 29 },
    gewichte: GEWICHTE, start: 0.3, zutaten: VOM_SCHWARZERLE + ' Schweinespeck, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-bratwurst', name: 'Geräucherte Bratwurst', bild: 'bratwurst.jpg', preise: { 'je kg': 27 },
    gewichte: PAARE, start: 0.4, paare: true, zutaten: VOM_SCHWARZERLE + ' Ein Paar wiegt ca. 0,2 kg. Schweinefleisch, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-salami', name: 'Salami', bild: 'salami.jpg', preise: { 'am Stück': 33, 'geschnitten': 38 },
    gewichte: GEWICHTE, start: 0.3, zutaten: 'Angus-Weiderind und Schwarzerle. Nitritpökelsalz, Zucker, Gewürze, Buchenrauch. Allergen: Senf.' },
];

// Abholorte (echte Orte, leimbachhof.de)
const ABHOLORTE = [
  ['Hofladen Oberlaimbach', 'freitags 9–18 Uhr'],
  ['Verkaufswagen Nürnberg Süd', 'donnerstags und freitags, feste Stellplätze'],
  ['Verkaufswagen Scheinfeld', 'alle 14 Tage samstags'],
];

// ---------- Preisregel: Tagespreis ----------
// Rechtsprüfung 07.10.: nur „Tagespreis“ mit Datum zeigen – kein Vergleich, kein „% günstiger“,
// kein Normalpreis daneben (§ 11 PAngV). Rahmen ±15 %, einmal am Tag, für alle gleich.
function tagesfaktor(t) {
  const quote = t.vergeben / t.gesamt;
  const f = (quote - 0.5) * 0.3;
  return Math.max(-0.15, Math.min(0.15, f));
}
const preisKg = t => Math.round(t.basis * (1 + tagesfaktor(t)) * 10) / 10;
const TAGESPREIS = `Tagespreis ${kurzDatum(HEUTE)}`;

// ---------- Korb ----------
// In sessionStorage, damit ein Neuladen den Korb nicht leert.
let korb = [];
try { korb = JSON.parse(sessionStorage.getItem('korb-v2') || '[]'); } catch (e) { korb = []; }
const imKorbKg = id => korb.filter(p => p.art === 'frisch' && p.id === id).reduce((s, p) => s + p.kg, 0);
const restKg = t => Math.max(0, rund2(t.gesamt - t.vergeben - imKorbKg(t.id)));
function status(t) {
  const r = restKg(t);
  if (r < t.schritt) return 'weg';
  if (r / t.gesamt < 0.25) return 'knapp';
  return 'frei';
}
function summen() {
  const abholung = korb.filter(p => p.art !== 'dauer').reduce((s, p) => s + p.kg * p.preisKg, 0);
  const dauer = korb.filter(p => p.art === 'dauer').reduce((s, p) => s + p.kg * p.preisKg, 0);
  const versand = dauer > 0 && dauer < 50 ? 10 : 0;
  return { abholung: rund2(abholung), dauer: rund2(dauer), versand, gesamt: rund2(abholung + dauer + versand) };
}
function korbHinzu(posten) {
  const gleich = korb.find(p => p.art === posten.art && p.id === posten.id && p.variante === posten.variante);
  if (gleich) gleich.kg = rund2(gleich.kg + posten.kg);
  else korb.push(posten);
  korbGeaendert(true);
}
function korbGeaendert(neu) {
  sessionStorage.setItem('korb-v2', JSON.stringify(korb));
  const zahl = $('#korb-zahl');
  zahl.textContent = korb.length;
  zahl.classList.toggle('da', korb.length > 0);
  if (neu) { const k = $('#korb-knopf'); k.classList.remove('huepf'); void k.offsetWidth; k.classList.add('huepf'); }
  paketLeiste();
  zeichneSilhouette();
  zeichneKarten();
  if ($('#schublade').classList.contains('offen')) zeigeKorb();
}

// ---------- Kurze Meldung ----------
let meldungUhr;
function melde(text) {
  const m = $('#meldung');
  m.textContent = text;
  m.classList.add('an');
  clearTimeout(meldungUhr);
  meldungUhr = setTimeout(() => m.classList.remove('an'), 2200);
}

// ---------- Hero + Tierkarte ----------
function zeichneHero() {
  const ab = Math.min(...TEILE.filter(t => status(t) !== 'weg').map(preisKg));
  $('#hero-preis').textContent = `ab ${euro(ab)}/kg`;
  $('#hero-abholung').textContent = tagMonat(ABHOLUNG);
}
function zeichneTierkarte() {
  const gesamt = TEILE.reduce((s, t) => s + t.gesamt, 0);
  const vergeben = TEILE.reduce((s, t) => s + t.vergeben, 0);
  const prozent = Math.round(vergeben / gesamt * 100);
  const monat = GEBOREN.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  $('#tierkarte').innerHTML = `
    <div class="tier-bild">
      <img src="../bilder/gras.jpg" alt="Schwarzes Cornwallschwein liegt im hohen Gras" loading="lazy" width="800" height="600">
      <span class="tier-nr">Nr. ${SCHWEIN.nr}</span>
    </div>
    <div class="tier-inhalt">
      <h3>Schwein Nr. ${SCHWEIN.nr}</h3>
      <dl class="tier-daten">
        <div><dt>Rasse</dt><dd>${SCHWEIN.rasse}</dd></div>
        <div><dt>Geboren</dt><dd>${monat}</dd></div>
        <div><dt>Weide</dt><dd>${SCHWEIN.weide}</dd></div>
        <div><dt>Schlachttermin</dt><dd>${tagMonat(SCHLACHTTERMIN)}</dd></div>
        <div><dt>Abholung ab</dt><dd>${tagMonat(ABHOLUNG)}</dd></div>
        <div><dt>Fleisch gesamt</dt><dd>ca. ${Math.round(gesamt)} kg</dd></div>
      </dl>
      <div class="fortschritt-kopf"><span>Zu <b>${prozent} %</b> vergeben</span><span>noch ${kg(rund2(gesamt - vergeben))} frei</span></div>
      <div class="balken" role="progressbar" aria-valuenow="${prozent}" aria-valuemin="0" aria-valuemax="100" aria-label="vergeben"><i data-breite="${prozent}"></i></div>
      <div class="tier-reihe">
        <span>Nr. 14 · <b>vollständig vergeben</b></span>
        <span>Nr. 16 · reservierbar ab ${kurzDatum(plusTage(SCHLACHTTERMIN, -7))}</span>
      </div>
      <p class="tier-fuss">Beispieldaten – Tier, Termine und Mengen setzt der Hof.</p>
    </div>`;
}

// ---------- Silhouette ----------
let gewaehlt = null;   // id des gewählten Teilstücks
let menge = 1;         // kg in der Auswahl

// Unsichtbares SVG mit dem Umriss als Schnittmaske – von Grafik und Mini-Icons gemeinsam benutzt
function legeMaskeAn() {
  const svg = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs><clipPath id="koerper"><path d="${UMRISS}"/></clipPath></defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}
// Foto-Variante: freigestelltes Schweinefoto + Zonen in Bildpixeln. Kommt aus bilder/schwein-bild.js
// (erzeugt von werkzeug/schwein-zonen.py – Bild tauschen = Skript neu laufen lassen). Fehlt es, zeichnen wir die Silhouette.
const BILD = window.SCHWEIN_BILD || null;

function zeichneSilhouette() {
  const leinwand = $('#leinwand');
  leinwand.classList.toggle('hat-wahl', !!gewaehlt);
  if (BILD) { zeichneFoto(leinwand); return; }
  const zonen = TEILE.map(t => {
    const st = status(t);
    return `<polygon class="zone ${st}${t.id === gewaehlt ? ' gewaehlt' : ''}" data-teil="${t.id}" points="${t.zone}"
      role="button" aria-label="${t.name}${st === 'weg' ? ', vergeben' : ''}"><title>${t.name}</title></polygon>`;
  }).join('');
  const texte = TEILE.filter(t => t.etikett).map(t =>
    `<text class="zone-text ${status(t) === 'weg' ? 'weg' : ''}" x="${t.etikett[0]}" y="${t.etikett[1]}"${t.id === 'filet' ? ' font-size="12"' : ''}>${t.name}</text>`).join('');
  leinwand.innerHTML = `
    <svg viewBox="20 60 580 260" role="group">
      <g clip-path="url(#koerper)">${zonen}</g>
      <path class="umriss" d="${UMRISS}"/>
      <path class="deko-linie" d="${OHR}" style="stroke: var(--papier); stroke-width: 2.5"/>
      <path class="deko-linie" d="${SCHWANZ}"/>
      ${texte}
    </svg>`;
}
// Mittelpunkt eines Polygons (für die Beschriftungs-Pins)
function mitte(punkte) {
  const p = punkte.trim().split(/\s+/).map(xy => xy.split(',').map(Number));
  return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
}
function zeichneFoto(leinwand) {
  const { breite: w, hoehe: h, zonen, pins = {} } = BILD;
  const flaechen = TEILE.map(t => `<polygon class="bzone ${status(t)}${t.id === gewaehlt ? ' gewaehlt' : ''}" data-teil="${t.id}"
      points="${zonen[t.id]}" role="button" aria-label="${t.name}"><title>${t.name}</title></polygon>`).join('');
  const knoepfe = TEILE.map(t => {
    const [x, y] = pins[t.id] || mitte(zonen[t.id]);
    return `<button type="button" class="pin ${status(t)}${t.id === gewaehlt ? ' gewaehlt' : ''}" data-teil="${t.id}"
      style="left:${x / w * 100}%;top:${y / h * 100}%" aria-label="${t.name}"><span>${t.name}</span></button>`;
  }).join('');
  leinwand.innerHTML = `
    <img src="${BILD.datei}" alt="Cornwallschwein von der Seite" width="${w}" height="${h}">
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="group">
      <defs><filter id="leuchten" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b"/><feFlood flood-color="#f0b48a" flood-opacity=".9"/>
        <feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      ${flaechen}
    </svg>
    <div class="pins">${knoepfe}</div>`;
}
// Bild des Teilstücks für die Detailansicht: Ausschnitt aus dem Foto oder die Silhouette
function teilBild(t) {
  if (!BILD) return miniSchwein(t.id);
  const p = BILD.zonen[t.id].trim().split(/\s+/).map(xy => xy.split(',').map(Number));
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const rand = 0.35 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const x0 = Math.max(0, Math.min(...xs) - rand), y0 = Math.max(0, Math.min(...ys) - rand);
  const x1 = Math.min(BILD.breite, Math.max(...xs) + rand), y1 = Math.min(BILD.hoehe, Math.max(...ys) + rand);
  return `<svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" aria-hidden="true" style="width:100%;height:100%">
    <image href="${BILD.datei}" width="${BILD.breite}" height="${BILD.hoehe}"/>
    <rect x="0" y="0" width="${BILD.breite}" height="${BILD.hoehe}" fill="rgba(246,243,238,.55)" mask="url(#loch-${t.id})"/>
    <mask id="loch-${t.id}"><rect width="${BILD.breite}" height="${BILD.hoehe}" fill="#fff"/><polygon points="${BILD.zonen[t.id]}" fill="#000"/></mask>
    <polygon points="${BILD.zonen[t.id]}" fill="rgba(214, 132, 72, .42)" stroke="#a84b24" stroke-width="${(x1 - x0) / 150}" stroke-linejoin="round"/>
  </svg>`;
}
// Mini-Icon für die Karten: dieselbe Form, nur ein Teilstück hervorgehoben
function miniSchwein(id) {
  const zonen = TEILE.map(t => `<polygon class="mini-zone${t.id === id ? ' an' : ''}" points="${t.zone}"/>`).join('');
  return `<svg viewBox="20 60 580 260" aria-hidden="true"><g clip-path="url(#koerper)" stroke="#fff" stroke-width="6">${zonen}</g></svg>`;
}

// ---------- Karten-Reihe ----------
function zeichneKarten() {
  $('#teile-reihe').innerHTML = REIHENFOLGE.map(teil).map(t => {
    const st = status(t);
    const drin = imKorbKg(t.id);
    const rest = st === 'weg' ? 'vergeben' : `noch ${kg(restKg(t))}`;
    return `<button type="button" role="listitem" class="teil-karte ${st}${t.id === gewaehlt ? ' gewaehlt' : ''}" data-teil="${t.id}"
        aria-label="${t.name}, ${st === 'weg' ? 'vergeben' : euro(preisKg(t)) + ' pro kg, ' + rest}">
      ${miniSchwein(t.id)}
      <span class="teil-name">${t.name}</span>
      <span class="teil-preis">${st === 'weg' ? '&nbsp;' : euro(preisKg(t)) + '/kg'}</span>
      <span class="teil-rest"><i class="punkt ${st}"></i>${rest}</span>
      ${drin ? `<span class="teil-im-paket">${kg(drin)} im Paket</span>` : ''}
    </button>`;
  }).join('');
}

// ---------- Auswahl (Panel am Laptop, Bottom-Sheet am Handy) ----------
function zeichneAuswahl() {
  const box = $('#auswahl');
  if (!gewaehlt) {
    box.innerHTML = `<div class="auswahl-leer"><h3>Wähl ein Teilstück</h3>
      <p>Tippe auf das Schwein oder auf eine Karte. Preis, Menge und Restbestand siehst du hier.</p></div>`;
    return;
  }
  const t = teil(gewaehlt);
  const r = restKg(t);
  const p = preisKg(t);
  const st = status(t);
  if (st === 'weg') {
    box.innerHTML = `<div class="griff"></div>
      <div class="auswahl-kopf"><h3>${t.name}</h3><button class="schliessen" type="button" data-schliessen aria-label="Schließen">×</button></div>
      <p class="auswahl-text">${t.text}</p>
      <p class="status"><i class="punkt weg"></i>Von Nr. ${SCHWEIN.nr} schon vergeben.</p>
      <button class="knopf knopf-leer" type="button" data-merken>Für Nr. 16 vormerken</button>`;
    return;
  }
  menge = Math.min(Math.max(menge, t.schritt), r);
  box.innerHTML = `<div class="griff"></div>
    <div class="auswahl-kopf"><h3>${t.name}</h3><button class="schliessen" type="button" data-schliessen aria-label="Schließen">×</button></div>
    <div class="auswahl-bild">${teilBild(t)}</div>
    <p class="auswahl-text">${t.text}</p>
    <div class="chips">${t.eignung.map(e => `<span class="chip">${e}</span>`).join('')}</div>
    <p class="tipp"><b>Tipp</b><span>${t.tipp}</span></p>
    <p class="auswahl-preis"><b>${euro(p)}/kg</b><span class="etikett">${TAGESPREIS}</span></p>
    <p class="status"><i class="punkt ${st}"></i>${st === 'knapp' ? 'Knapp – ' : ''}noch ${kg(r)} von Nr. ${SCHWEIN.nr}</p>
    <div class="menge">
      <button type="button" data-menge="-1" aria-label="weniger" ${menge <= t.schritt ? 'disabled' : ''}>−</button>
      <output aria-live="polite">${kg(menge)}</output>
      <button type="button" data-menge="1" aria-label="mehr" ${menge + t.schritt > r + 1e-9 ? 'disabled' : ''}>+</button>
    </div>
    <div class="summe-zeile"><span>ca. ${kg(menge)} × ${euro(p)}</span><b data-summe>${euro(rund2(menge * p))}</b></div>
    <button class="knopf knopf-akzent" type="button" data-ins-paket>In mein Paket</button>
    <p class="klein">Inkl. MwSt. Abgerechnet wird das genaue Gewicht. Nur Abholung ab ${tagMonat(ABHOLUNG)}, kein Versand.
      Frischfleisch ist vom Widerruf ausgeschlossen (schnell verderblich).</p>`;
}
function waehle(id, oeffnen = true) {
  gewaehlt = id;
  const t = teil(id);
  menge = t.schritt >= 0.5 ? Math.min(1, restKg(t)) : 0.5;
  zeichneSilhouette();
  zeichneKarten();
  zeichneAuswahl();
  // Karte in der Reihe sichtbar machen (Silhouette und Liste bleiben synchron)
  const karte = document.querySelector(`.teil-karte[data-teil="${id}"]`);
  if (karte && HANDY.matches) karte.scrollIntoView({ behavior: bewegung(), inline: 'center', block: 'nearest' });
  if (oeffnen && HANDY.matches) sheet(true);
}
function sheet(auf) {
  $('#auswahl').classList.toggle('offen', auf);
  schleier(auf);
  paketLeiste();
}
const bewegung = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

// ---------- Fertige Anteile ----------
function zeichneAnteile() {
  $('#anteile').innerHTML = ANTEILE.map(a => `
    <article class="anteil${a.marke ? ' empfohlen' : ''}">
      <div class="anteil-kopf"><h3>${a.name}-Schwein</h3>${a.marke ? `<span class="anteil-marke">${a.marke}</span>` : ''}</div>
      <p class="anteil-gewicht">ca. ${a.ca} kg · noch ${a.frei} ${a.frei === 1 ? 'Anteil' : 'Anteile'} von Nr. ${SCHWEIN.nr} frei</p>
      <p class="anteil-preis"><b>ca. ${euro(a.ca * a.preisKg)}</b><span class="etikett">${euro(a.preisKg)}/kg · ${TAGESPREIS}</span></p>
      <ul>${a.inhalt.map(([n, m]) => `<li><span>${n}</span><span>${kg(m)}</span></li>`).join('')}</ul>
      <p class="klein">Vakuumiert und beschriftet, fertig fürs Gefrierfach. Inkl. MwSt., abgerechnet nach genauem Gewicht. Nur Abholung.</p>
      <button class="knopf knopf-voll" type="button" data-anteil="${a.id}">${a.name} reservieren</button>
    </article>`).join('');
}
const ERKLAERUNG = {
  teile: 'Frei wählbar, solange der Vorrat reicht. Filet und Kotelett gibt es je Schwein nur wenig – die sind meist zuerst weg.',
  anteil: 'Ein fester Querschnitt durchs ganze Schwein zu einem Kilopreis – fürs Gefrierfach. Kein Aussuchen, dafür alles dabei.',
};
function modus(welcher) {
  const anteil = welcher === 'anteil';
  $('#tab-teile').setAttribute('aria-selected', String(!anteil));
  $('#tab-anteil').setAttribute('aria-selected', String(anteil));
  $('.umschalter').classList.toggle('rechts', anteil);
  $('#modus-teile').hidden = anteil;
  $('#modus-anteil').hidden = !anteil;
  $('#modus-erklaerung').textContent = ERKLAERUNG[welcher];
  if (anteil) sheet(false);
}

// ---------- Dauerware ----------
const dauerWahl = {};   // id → { variante, index der Menge }
function zeichneDauerware() {
  $('#produkte').innerHTML = DAUERWARE.map(a => {
    const varianten = Object.keys(a.preise);
    dauerWahl[a.id] = { variante: varianten[0], i: a.gewichte.indexOf(a.start) };
    return `<article class="produkt aufblenden" data-artikel="${a.id}">
      <div class="produkt-bild"><img src="../bilder/${a.bild}" alt="${a.name}" loading="lazy"></div>
      <div class="produkt-inhalt">
        <h3>${a.name}</h3>
        <p class="produkt-zutaten">${a.zutaten}</p>
        <div class="produkt-fuss">
          ${varianten.length > 1 ? `<div class="varianten">${varianten.map((v, i) =>
            `<button type="button" data-variante="${v}" aria-pressed="${i === 0}">${v} · ${euro(a.preise[v])}/kg</button>`).join('')}</div>`
            : `<p class="auswahl-preis"><b>${euro(a.preise[varianten[0]])}/kg</b></p>`}
          <div class="menge">
            <button type="button" data-dmenge="-1" aria-label="weniger">−</button>
            <output data-dkg></output>
            <button type="button" data-dmenge="1" aria-label="mehr">+</button>
          </div>
          <div class="summe-zeile"><span>inkl. MwSt., zzgl. Versand</span><b data-dsumme></b></div>
          <button class="knopf knopf-voll" type="button" data-dauer-korb>In den Korb</button>
        </div>
      </div>
    </article>`;
  }).join('');
  DAUERWARE.forEach(a => dauerAktualisieren(a.id));
}
function dauerAktualisieren(id) {
  const a = DAUERWARE.find(x => x.id === id);
  const w = dauerWahl[id];
  const box = document.querySelector(`[data-artikel="${id}"]`);
  const m = a.gewichte[w.i];
  box.querySelector('[data-dkg]').textContent = kg(m) + (a.paare ? ` · ${Math.round(m / 0.2)} Paar` : '');
  box.querySelector('[data-dsumme]').textContent = euro(rund2(m * a.preise[w.variante]));
  box.querySelector('[data-dmenge="-1"]').disabled = w.i === 0;
  box.querySelector('[data-dmenge="1"]').disabled = w.i === a.gewichte.length - 1;
  box.querySelectorAll('[data-variante]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variante === w.variante)));
}

// ---------- Paket-Leiste ----------
function paketLeiste() {
  const leiste = $('#paket-leiste');
  const verdeckt = $('#auswahl').classList.contains('offen') || $('#schublade').classList.contains('offen');
  leiste.hidden = korb.length === 0 || verdeckt;
  if (!korb.length) return;
  const frischKg = rund2(korb.filter(p => p.art !== 'dauer').reduce((s, p) => s + p.kg, 0));
  const s = summen();
  const teile = korb.length === 1 ? '1 Teil' : `${korb.length} Teile`;
  $('#paket-zahlen').textContent = `${teile}${frischKg ? ' · ' + kg(frischKg) : ''} · ${euro(s.gesamt)}`;
  // Füllstand: wie voll eine 10-kg-Kühltasche wäre (nur Frischfleisch)
  $('#paket-fuellung').style.width = Math.min(100, frischKg * 10) + '%';
}

// ---------- Schublade: Korb → Kasse → Fertig ----------
function schleier(an) {
  const s = $('#schleier');
  if (an) { s.hidden = false; requestAnimationFrame(() => s.classList.add('an')); }
  else if (!$('#auswahl').classList.contains('offen') && !$('#schublade').classList.contains('offen')) {
    s.classList.remove('an'); s.hidden = true;
  }
}
function schublade(auf) {
  const s = $('#schublade');
  if (auf) { sheet(false); zeigeKorb(); }
  s.classList.toggle('offen', auf);
  s.setAttribute('aria-hidden', String(!auf));
  schleier(auf);
  paketLeiste();
  if (auf) s.focus({ preventScroll: true });
}
function postenZeile(p, i) {
  let name, detail;
  if (p.art === 'frisch') { name = teil(p.id).name; detail = `Nr. ${SCHWEIN.nr} · ca. ${kg(p.kg)} × ${euro(p.preisKg)}/kg`; }
  else if (p.art === 'anteil') { const a = ANTEILE.find(x => x.id === p.id); name = `${a.name}-Schwein`; detail = `Nr. ${SCHWEIN.nr} · ca. ${kg(p.kg)} × ${euro(p.preisKg)}/kg`; }
  else { const a = DAUERWARE.find(x => x.id === p.id); name = a.name; detail = `${p.variante} · ${kg(p.kg)} × ${euro(p.preisKg)}/kg`; }
  return `<div class="posten"><span><span class="posten-name">${name}</span><span class="posten-detail">${detail}</span></span>
    <b>${p.art === 'dauer' ? '' : 'ca. '}${euro(rund2(p.kg * p.preisKg))}</b>
    <button class="entfernen" type="button" data-entfernen="${i}" aria-label="${name} entfernen">×</button></div>`;
}
function zeigeKorb() {
  const s = summen();
  const abholung = korb.map((p, i) => [p, i]).filter(([p]) => p.art !== 'dauer');
  const versand = korb.map((p, i) => [p, i]).filter(([p]) => p.art === 'dauer');
  const fehlt = rund2(50 - s.dauer);
  $('#schublade').innerHTML = `
    <div class="griff"></div>
    <div class="schublade-kopf"><h2>Dein Paket</h2><button class="schliessen" type="button" data-zu aria-label="Korb schließen">×</button></div>
    ${!korb.length ? `<p class="leer-hinweis">Noch leer. Such dir ein Teilstück von Nr. ${SCHWEIN.nr} aus.</p>
      <a class="knopf knopf-voll" href="#schwein" data-zu>Zum Schwein</a>` : `
    ${abholung.length ? `<div class="gruppe"><p class="gruppe-titel">Frischfleisch · Abholung ab ${tagMonat(ABHOLUNG)}</p>
      ${abholung.map(([p, i]) => postenZeile(p, i)).join('')}</div>` : ''}
    ${versand.length ? `<div class="gruppe"><p class="gruppe-titel">Dauerware · Versand am Montag</p>
      ${versand.map(([p, i]) => postenZeile(p, i)).join('')}</div>
      <div class="versandfrei">${fehlt > 0 ? `Noch ${euro(fehlt)} Dauerware bis zum kostenlosen Versand.` : 'Der Versand ist kostenlos.'}
        <div class="balken"><i style="width:${Math.min(100, s.dauer / 50 * 100)}%"></i></div></div>` : ''}
    <div class="summen">
      ${s.abholung ? `<div><span>Frischfleisch (bei Abholung)</span><span>ca. ${euro(s.abholung)}</span></div>` : ''}
      ${s.dauer ? `<div><span>Dauerware</span><span>${euro(s.dauer)}</span></div><div><span>Versand</span><span>${s.versand ? euro(s.versand) : 'kostenlos'}</span></div>` : ''}
      <div class="gesamt"><span>Gesamt</span><span>${s.abholung ? 'ca. ' : ''}${euro(s.gesamt)}</span></div>
    </div>
    <p class="klein">Alle Preise inkl. MwSt. Frischfleisch wird nach genauem Gewicht abgerechnet.</p>
    <button class="knopf knopf-voll" type="button" data-zur-kasse>Zur Kasse</button>`}`;
}
function zeigeKasse(fehler = '') {
  const abholung = korb.some(p => p.art !== 'dauer');
  const versand = korb.some(p => p.art === 'dauer');
  const s = summen();
  $('#schublade').innerHTML = `
    <div class="griff"></div>
    <button class="zurueck" type="button" data-zum-korb>← Zurück zum Paket</button>
    <div class="schublade-kopf"><h2>Kasse</h2><button class="schliessen" type="button" data-zu aria-label="Schließen">×</button></div>
    <form id="kasse" novalidate>
      <label class="feld">Name<input name="name" autocomplete="name" required></label>
      <label class="feld">E-Mail<input name="mail" type="email" autocomplete="email" required></label>
      ${abholung ? `<p class="kasse-titel">Wo holst du ab?</p><div class="wahlen">${ABHOLORTE.map(([o, z], i) =>
        `<label class="wahl"><input type="radio" name="ort" value="${o}" ${i === 0 ? 'checked' : ''}><span>${o}<small>${z}</small></span></label>`).join('')}</div>` : ''}
      ${versand ? `<label class="feld">Lieferadresse für die Dauerware<textarea name="adresse" rows="2" autocomplete="street-address" required></textarea></label>` : ''}
      <p class="kasse-titel">Bezahlen</p>
      <div class="wahlen">
        <label class="wahl"><input type="radio" name="zahlung" value="rechnung" checked><span>Auf Rechnung<small>wie bisher – Überweisung nach Erhalt</small></span></label>
        <label class="wahl"><input type="radio" name="zahlung" value="karte"><span>Karte, Apple Pay, Google Pay<small>im echten Shop über Stripe</small></span></label>
      </div>
      ${fehler ? `<p class="fehler-text">${fehler}</p>` : ''}
      <div class="summen"><div class="gesamt"><span>Gesamt</span><span>${s.abholung ? 'ca. ' : ''}${euro(s.gesamt)}</span></div></div>
      <button class="knopf knopf-akzent" type="submit">Zahlungspflichtig bestellen</button>
      <p class="klein">Mit dem Klick gelten AGB und Widerrufsbelehrung. Frischfleisch: kein Widerrufsrecht (schnell verderblich).</p>
    </form>`;
}
function zeigeFertig() {
  $('#schublade').innerHTML = `
    <div class="griff"></div>
    <div class="fertig">
      <div class="haken"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17 19 7"/></svg></div>
      <h2>Prototyp – keine echte Bestellung</h2>
      <p>So sähe die Bestätigung aus. Es wurde nichts gesendet und nichts bezahlt.</p>
      <button class="knopf knopf-voll" type="button" data-neu>Von vorn</button>
    </div>`;
}

// ---------- Klicks (ein Zuhörer für alles) ----------
document.addEventListener('click', e => {
  const z = e.target.closest('[data-teil]');
  if (z) { waehle(z.dataset.teil); return; }
  const m = e.target.closest('[data-menge]');
  if (m) {
    const t = teil(gewaehlt);
    menge = rund2(Math.min(restKg(t), Math.max(t.schritt, menge + Number(m.dataset.menge) * t.schritt)));
    zeichneAuswahl();
    return;
  }
  if (e.target.closest('[data-ins-paket]')) {
    const t = teil(gewaehlt);
    korbHinzu({ art: 'frisch', id: t.id, kg: menge, preisKg: preisKg(t) });
    melde(`${kg(menge)} ${t.name} liegt im Paket`);
    if (HANDY.matches) sheet(false);
    zeichneAuswahl();
    return;
  }
  if (e.target.closest('[data-merken]')) { melde('Vorgemerkt – im echten Shop per Mail'); return; }
  if (e.target.closest('[data-schliessen]')) { sheet(false); return; }
  if (e.target.closest('#schleier')) { sheet(false); schublade(false); return; }
  if (e.target.closest('#tab-teile')) { modus('teile'); return; }
  if (e.target.closest('#tab-anteil')) { modus('anteil'); return; }
  const an = e.target.closest('[data-anteil]');
  if (an) {
    const a = ANTEILE.find(x => x.id === an.dataset.anteil);
    korbHinzu({ art: 'anteil', id: a.id, kg: a.ca, preisKg: a.preisKg });
    melde(`${a.name}-Schwein reserviert`);
    return;
  }
  // Dauerware
  const box = e.target.closest('[data-artikel]');
  if (box) {
    const id = box.dataset.artikel;
    const a = DAUERWARE.find(x => x.id === id);
    const w = dauerWahl[id];
    const v = e.target.closest('[data-variante]');
    if (v) { w.variante = v.dataset.variante; dauerAktualisieren(id); return; }
    const dm = e.target.closest('[data-dmenge]');
    if (dm) { w.i = Math.max(0, Math.min(a.gewichte.length - 1, w.i + Number(dm.dataset.dmenge))); dauerAktualisieren(id); return; }
    if (e.target.closest('[data-dauer-korb]')) {
      korbHinzu({ art: 'dauer', id, variante: w.variante, kg: a.gewichte[w.i], preisKg: a.preise[w.variante] });
      melde(`${a.name} liegt im Korb`);
      return;
    }
  }
  // Korb und Kasse
  if (e.target.closest('#korb-knopf') || e.target.closest('#paket-oeffnen')) { schublade(true); return; }
  if (e.target.closest('[data-zu]')) { schublade(false); return; }
  const weg = e.target.closest('[data-entfernen]');
  if (weg) { korb.splice(Number(weg.dataset.entfernen), 1); korbGeaendert(false); return; }
  if (e.target.closest('[data-zur-kasse]')) { zeigeKasse(); $('#schublade').scrollTop = 0; return; }
  if (e.target.closest('[data-zum-korb]')) { zeigeKorb(); return; }
  if (e.target.closest('[data-neu]')) { korb = []; korbGeaendert(false); schublade(false); return; }
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'kasse') return;
  e.preventDefault();
  const f = e.target;
  const leer = [...f.querySelectorAll('[required]')].filter(el => !el.value.trim());
  f.querySelectorAll('.feld').forEach(el => el.classList.remove('fehlt'));
  leer.forEach(el => el.closest('.feld').classList.add('fehlt'));
  if (leer.length) {
    const p = f.querySelector('.fehler-text') || Object.assign(document.createElement('p'), { className: 'fehler-text' });
    p.textContent = 'Bitte Name, E-Mail' + (f.adresse ? ' und Lieferadresse' : '') + ' ausfüllen.';
    f.querySelector('.summen').before(p);
    return;
  }
  zeigeFertig();
});

// Escape schließt Sheet und Schublade
document.addEventListener('keydown', e => { if (e.key === 'Escape') { sheet(false); schublade(false); } });

// Wechsel Handy ↔ Laptop: Sheet-Zustand zurücksetzen
HANDY.addEventListener('change', () => sheet(false));

// ---------- Einblenden beim Scrollen + Zähler ----------
function beobachte() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = new IntersectionObserver(eintraege => {
    for (const e of eintraege) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('sichtbar');
      e.target.querySelectorAll('[data-breite]').forEach(b => { b.style.width = b.dataset.breite + '%'; });
      e.target.querySelectorAll('[data-zaehle]').forEach(b => zaehle(b, still));
      io.unobserve(e.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.aufblenden').forEach(el => io.observe(el));
}
function zaehle(el, still) {
  const ziel = Number(el.dataset.zaehle);
  if (still) { el.textContent = ziel; return; }
  const start = ziel > 1000 ? ziel - 60 : 0;
  const t0 = performance.now();
  const schritt = jetzt => {
    const x = Math.min(1, (jetzt - t0) / 1200);
    el.textContent = Math.round(start + (ziel - start) * (1 - Math.pow(1 - x, 3)));
    if (x < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}
// Kopfzeile bekommt beim Scrollen eine feine Linie
addEventListener('scroll', () => $('#kopf').classList.toggle('gescrollt', scrollY > 8), { passive: true });

// ---------- Start ----------
legeMaskeAn();
zeichneHero();
zeichneTierkarte();
zeichneSilhouette();
zeichneKarten();
zeichneAuswahl();
zeichneAnteile();
zeichneDauerware();
modus('teile');
korbGeaendert(false);
beobachte();
