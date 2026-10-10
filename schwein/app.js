// Laimbachhof – Demo „Schwein Nr. 15“: Teilstücke direkt am Tier wählen.
// Alles hier sind Beispieldaten. Kein Server, keine Zahlung, nichts wird verschickt.
// Aufbau: Hilfen → Daten → Paket → Kopf → Bühne (Schwein) → Liste → Blatt (Detail/Paket) → Start.

'use strict';

// ---------- Hilfen ----------
const $ = sel => document.querySelector(sel);
const euro = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const zahl = n => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const kg = n => zahl(n) + ' kg';
const rund2 = n => Math.round(n * 100) / 100;
// Laptop-Ansicht ab 1000 px Breite (gleiche Grenze wie in stil.css)
const LAPTOP = window.matchMedia('(min-width: 1000px)');
const ruhig = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const HEUTE = new Date();
HEUTE.setHours(0, 0, 0, 0);
function plusTage(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
// Schlachttag beim Metzger: der nächste Dienstag, der mindestens 16 Tage entfernt ist (Beispiel).
// Die Termine laufen mit dem Datum mit, damit die Demo nie „abgelaufen“ aussieht.
function naechsterDienstag(ab) {
  const d = plusTage(HEUTE, ab);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d;
}
// „Di 27.10.“ – ohne Punkt nach dem Wochentag, spart am Handy Platz
const tag = d => d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }).replace(',', '').replace('.', '');
const SCHLACHTUNG = naechsterDienstag(16);
const ABHOLUNG = plusTage(SCHLACHTUNG, 3);     // der Freitag danach
const ABHOLORT = 'Hofladen Oberlaimbach';
const ABHOLZEIT = '9–18 Uhr';
const PREISDATUM = HEUTE.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });   // „10.10.“

// ---------- Daten: Schwein Nr. 15 ----------
// Mengen: verkaufsfertig (teils mit Knochen) für ein Mastschwein mit rund 88 kg Schlachtgewicht.
// Summe 69,7 kg – AGRIDEA (2021) nennt für 113,5 kg lebend / 89,7 kg Schlachtgewicht 69,6 kg
// Verkaufsgewicht; Teilstücke nach Weydringer (Diss. Halle 2016, Tab. A5). Belege im Bericht.
// Preise: Tagespreise aus Prototyp v2 (je kg, inkl. MwSt.).
// schritt = kleinste sinnvolle Menge; stueck = wird nur am Stück abgegeben (Filet, Haxe).
// portion = wie viel eine Portion/Scheibe wiegt, für den Hinweis unter der Menge.
const TEILE = [
  { id: 'kopf', name: 'Kopf & Backe', beiname: 'Kopf bis hinters Ohr',
    wo: 'Der Kopf bis hinter das Ohr. Die Backe sitzt unter dem Auge – das zarteste Schmorstück am ganzen Schwein.',
    fuer: ['Schmoren', 'Sülze', 'Presssack'],
    tipp: 'Backen drei Stunden in dunklem Bier mit Wurzelgemüse schmoren – sie zerfallen auf der Gabel.',
    preis: 9.5, gesamt: 4.5, vergeben: 2.5, schritt: 0.5 },
  { id: 'nacken', name: 'Nacken', beiname: 'Kamm · oben am Hals',
    wo: 'Oben am Hals, zwischen Kopf und Kotelett. Kräftig marmoriert, darum bleibt er auch auf dem Grill saftig.',
    fuer: ['Grill', 'Braten', 'Steaks'],
    tipp: 'In 3 cm dicke Scheiben schneiden und scharf grillen – das feine Fett macht den Rest.',
    preis: 19.1, gesamt: 5, vergeben: 3, schritt: 0.5, portion: [0.25, 'Steak', 'Steaks'] },
  { id: 'schulter', name: 'Schulter', beiname: 'Bug · fürs Schäufele',
    wo: 'Das vordere Viertel über dem Vorderbein. Mit Schwarte und Knochen – das Stück fürs fränkische Schäufele.',
    fuer: ['Schäufele', 'Ofen', 'Pulled Pork'],
    tipp: 'Schwarte rautenförmig einschneiden, 2½ Stunden bei 160 °C, zum Schluss kurz den Grill an.',
    preis: 16.7, gesamt: 10, vergeben: 7, schritt: 0.5, portion: [0.35, 'Portion', 'Portionen'] },
  { id: 'haxe-vorne', name: 'Haxe vorne', beiname: 'Eisbein · Vorderbein',
    wo: 'Der Unterschenkel des Vorderbeins. Die kleinere der beiden Haxen, je Schwein gibt es zwei.',
    fuer: ['Kochen', 'Eisbein', 'Ofen'],
    tipp: 'Erst eine Stunde leise sieden, dann im Ofen knusprig ausbacken.',
    preis: 10.2, gesamt: 1.8, vergeben: 1.8, schritt: 0.9, stueck: 'Haxe' },
  { id: 'ruecken', name: 'Kotelett', beiname: 'Rücken · Karree',
    wo: 'Der lange Rücken zwischen Nacken und Schinken. Mit Knochen als Kotelett, ausgelöst als Lachs.',
    fuer: ['Pfanne', 'Grill', 'Braten'],
    tipp: '30 Minuten vor dem Braten aus dem Kühlschrank nehmen, dann kurz und heiß – innen darf es rosa bleiben.',
    preis: 24, gesamt: 9.6, vergeben: 8.4, schritt: 0.4, portion: [0.2, 'Kotelett', 'Koteletts'] },
  { id: 'filet', name: 'Filet', beiname: 'Lende · innen am Rücken',
    wo: 'Liegt innen unter dem hinteren Rücken. Zwei Stränge je Schwein, jeder rund ein halbes Kilo – meist als Erstes weg.',
    fuer: ['Kurzbraten', 'Medaillons'],
    tipp: 'Im Ganzen rundum anbraten, dann bei 80 °C im Ofen auf 60 °C Kerntemperatur ziehen lassen.',
    preis: 39.1, gesamt: 1, vergeben: 1, schritt: 0.5, stueck: 'Filet' },
  { id: 'bauch', name: 'Bauch', beiname: 'zwischen Schulter und Schinken',
    wo: 'Die Unterseite zwischen Schulter und Schinken. Fleisch und Fett in Schichten, mit Schwarte.',
    fuer: ['Krustenbraten', 'Grill', 'Schmoren'],
    tipp: 'Die Schwarte über Nacht trocken salzen – dann wird die Kruste im Ofen blasig und knusprig.',
    preis: 14.1, gesamt: 10, vergeben: 6.5, schritt: 0.5, portion: [0.25, 'Portion', 'Portionen'] },
  { id: 'schinken', name: 'Schinken', beiname: 'Keule · Hinterteil',
    wo: 'Die Keule am Hinterteil: Oberschale, Nuss, Unterschale und Hüfte. Mager und vielseitig.',
    fuer: ['Schnitzel', 'Braten', 'Geschnetzeltes'],
    tipp: 'Die Nuss im Ganzen rosa braten, 20 Minuten ruhen lassen, dann dünn aufschneiden.',
    preis: 18, gesamt: 17, vergeben: 11, schritt: 0.5, portion: [0.2, 'Schnitzel', 'Schnitzel'] },
  { id: 'haxe-hinten', name: 'Haxe hinten', beiname: 'Schweinshaxe · Hinterbein',
    wo: 'Der Unterschenkel des Hinterbeins – die große, klassische Schweinshaxe. Je Schwein gibt es zwei.',
    fuer: ['Ofen', 'Grill'],
    tipp: 'Bei 180 °C gut 2½ Stunden, alle 20 Minuten mit dunklem Bier bestreichen.',
    preis: 11.6, gesamt: 2.8, vergeben: 1.4, schritt: 1.4, stueck: 'Haxe' },
  { id: 'hack', name: 'Hack & Bratwurst', beiname: 'vom ganzen Tier', ganz: true,
    wo: 'Kein einzelnes Stück: Abschnitte vom ganzen Tier, beim Metzger grob oder fein gewolft – so bleibt nichts übrig.',
    fuer: ['Hack', 'Bratwurst', 'Frikadellen'],
    tipp: 'Grob gewolft für Frikadellen, als frische Bratwurst direkt auf den Grill.',
    preis: 12.8, gesamt: 8, vergeben: 5, schritt: 0.5, portion: [0.25, 'Portion', 'Portionen'] },
];
const teil = id => TEILE.find(t => t.id === id);

// ---------- Paket ----------
// Liegt in sessionStorage, damit ein Neuladen das Paket nicht leert. Ein Eintrag = { id, kg }.
let paket = [];
try { paket = JSON.parse(sessionStorage.getItem('schwein15-paket') || '[]').filter(p => teil(p.id)); } catch (e) { paket = []; }
const imPaket = id => (paket.find(p => p.id === id) || { kg: 0 }).kg;
const rest = t => Math.max(0, rund2(t.gesamt - t.vergeben - imPaket(t.id)));
function status(t) {
  const r = rest(t);
  if (r < t.schritt - 1e-9) return 'weg';
  if (r <= 1.5 || r / t.gesamt < 0.25) return 'knapp';
  return 'frei';
}
// Für die Anzeige: ein Stück, dessen Rest komplett im eigenen Paket liegt, ist nicht „vergeben“, sondern „meins“
const anzeige = t => status(t) === 'weg' && imPaket(t.id) > 0 ? 'meins' : status(t);
const paketKg = () => rund2(paket.reduce((s, p) => s + p.kg, 0));
const paketSumme = () => rund2(paket.reduce((s, p) => s + p.kg * teil(p.id).preis, 0));
function speichern() { try { sessionStorage.setItem('schwein15-paket', JSON.stringify(paket)); } catch (e) { /* privat-Modus: egal */ } }

// Menge lesbar machen: „1 Haxe · ≈ 1,5 kg“, „0,8 kg · ≈ 4 Koteletts“
function mengeText(t, m) {
  if (t.stueck) {
    const n = Math.round(m / t.schritt);
    return { gross: `${n} ${n === 1 ? t.stueck : t.stueck === 'Haxe' ? 'Haxen' : t.stueck + 's'}`, klein: `≈ ${kg(m)}` };
  }
  if (t.portion) {
    const n = Math.max(1, Math.round(m / t.portion[0]));
    return { gross: kg(m), klein: `≈ ${n} ${n === 1 ? t.portion[1] : t.portion[2]}` };
  }
  return { gross: kg(m), klein: '' };
}
const vorratText = t => status(t) === 'weg' ? 'vergeben' : `noch ${kg(rest(t))}`;

// ---------- Kopf: Fortschritt und Termine ----------
function zeichneKopf() {
  const gesamt = TEILE.reduce((s, t) => s + t.gesamt, 0);
  const vergeben = TEILE.reduce((s, t) => s + t.vergeben, 0);
  const p = Math.round(vergeben / gesamt * 100);
  const mitDir = Math.round((vergeben + paketKg()) / gesamt * 100);
  $('.balken-vergeben').style.width = p + '%';
  $('.balken-dein').style.left = p + '%';
  $('.balken-dein').style.width = (mitDir - p) + '%';
  $('#balken').setAttribute('aria-valuenow', String(mitDir));
  $('#fortschritt-text').innerHTML = mitDir > p
    ? `zu ${p} % vergeben <span class="dein">· mit dir ${mitDir} %</span>`
    : `zu ${p} % vergeben`;
  // Jedes Stück für sich unteilbar, damit der Umbruch am Handy nur an den Punkten passiert
  $('#termine').innerHTML = `<span>Schlachtung <b>${tag(SCHLACHTUNG)}</b> ·</span> <span>Abholung <b>${tag(ABHOLUNG)}, ${ABHOLZEIT}</b>, ${ABHOLORT}</span>`;
  $('#tagespreis-datum').textContent = `Tagespreis ${PREISDATUM}`;
}

// ---------- Bühne: Bild + Klickzonen ----------
// Bild und Zonen kommen aus bilder/schwein-bild.js (erzeugt von werkzeug/schwein-zonen.mjs).
// Bild tauschen = Werkzeug neu laufen lassen; hier muss nichts geändert werden.
const BILD = window.SCHWEIN_BILD;
let gewaehlt = null;     // id des gewählten Stücks
let schwebt = null;      // id des Stücks unter der Maus (nur Laptop)

function baueBuehne() {
  const { breite: w, hoehe: h, zonen, pins } = BILD;
  const mitZone = TEILE.filter(t => zonen[t.id]);
  $('#leinwand').innerHTML = `
    <svg class="tier-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <defs>
        <pattern id="schraffur" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="rgba(12,11,10,.38)"/><rect width="1.6" height="12" fill="rgba(255,244,230,.16)"/>
        </pattern>
        <pattern id="schraffur-dunkel" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="13" height="13" fill="rgba(10,9,8,.6)"/><rect width="1.6" height="13" fill="rgba(255,244,230,.07)"/>
        </pattern>
        <radialGradient id="glut-verlauf" cx="50%" cy="35%" r="75%">
          <stop offset="0" stop-color="#ffd3a1"/><stop offset=".6" stop-color="#e59a5c"/><stop offset="1" stop-color="#a65a2a"/>
        </radialGradient>
        <filter id="weich" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
        <filter id="weich-innen" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>
        <!-- Schnittlinien nur im Inneren: Maske = Umriss des Tiers, ein paar Punkte nach innen geschrumpft -->
        <filter id="schrumpf"><feMorphology operator="erode" radius="7"/></filter>
        <mask id="innen" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
          <g filter="url(#schrumpf)" fill="#fff" stroke="#fff" stroke-width="3">${mitZone.map(t => `<polygon points="${zonen[t.id]}"/>`).join('')}</g>
        </mask>
        <filter id="schatten" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000" flood-opacity=".7"/>
        </filter>
        <clipPath id="ausschnitt"><polygon id="ausschnitt-form" points=""/></clipPath>
        <!-- Licht auf dem gewählten Stück: Bild heller und eine Spur wärmer, Fellstruktur bleibt sichtbar -->
        <filter id="hell" color-interpolation-filters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.7" intercept=".045"/>
            <feFuncG type="linear" slope="1.56" intercept=".032"/>
            <feFuncB type="linear" slope="1.36" intercept=".022"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <image class="tier" href="${BILD.datei}" width="${w}" height="${h}"/>
      <g class="zonen">${mitZone.map(t =>
        `<polygon class="zone" data-teil="${t.id}" points="${zonen[t.id]}"/>`).join('')}</g>
      <g class="schnitte" mask="url(#innen)">${mitZone.map(t => `<polygon points="${zonen[t.id]}"/>`).join('')}</g>
      <!-- Das gewählte Stück hebt sich aus dem Tier heraus: Bildausschnitt + warmes Licht + Kante, mit Schatten -->
      <g class="heraus" id="heraus" filter="url(#schatten)">
        <g class="heraus-innen">
          <polygon class="glut-schein" id="glut-schein" points=""/>
          <image href="${BILD.datei}" width="${w}" height="${h}" clip-path="url(#ausschnitt)" filter="url(#hell)"/>
          <polygon class="glut" id="glut" points=""/>
          <polygon class="glut-rand" id="glut-rand" points=""/>
        </g>
      </g>
    </svg>
    <div class="pins">${mitZone.map(t => {
      const [x, y] = pins[t.id];
      return `<button type="button" class="pin" data-teil="${t.id}" style="left:${x / w * 100}%;top:${y / h * 100}%"></button>`;
    }).join('')}</div>
    <div class="marken" aria-hidden="true">${mitZone.map(t => {
      const [x, y] = pins[t.id];
      return `<span class="marke" data-marke="${t.id}" style="left:${x / w * 100}%;top:${y / h * 100}%"></span>`;
    }).join('')}</div>
    <div class="etikett" id="etikett" aria-hidden="true"></div>`;
  // Hinweis passend zum Gerät
  $('#hinweis').textContent = window.matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Klick auf ein Stück' : 'Tippe auf ein Stück';
}

// Zustand der Bühne neu setzen (Klassen, Leuchten, Etikett) – das Gerüst bleibt stehen
function zeichneBuehne() {
  const lw = $('#leinwand');
  const t = gewaehlt && teil(gewaehlt);
  lw.classList.toggle('hat-wahl', !!t);
  lw.classList.toggle('ganz', !!(t && t.ganz));
  lw.querySelectorAll('.zone').forEach(z => {
    const st = status(teil(z.dataset.teil));
    z.classList.toggle('weg', st === 'weg' && !imPaket(z.dataset.teil));
    z.classList.toggle('meins', imPaket(z.dataset.teil) > 0);
    z.classList.toggle('aktiv', z.dataset.teil === gewaehlt);
  });
  lw.querySelectorAll('.pin').forEach(p => {
    const tt = teil(p.dataset.teil);
    const st = status(tt);
    p.className = `pin ${anzeige(tt)}${tt.id === gewaehlt ? ' aktiv' : ''}`;
    p.setAttribute('aria-label', `${tt.name}, ${st === 'weg' ? 'vergeben' : `${euro(tt.preis)} je kg, ${vorratText(tt)}`}`);
    p.setAttribute('aria-pressed', String(tt.id === gewaehlt));
  });
  // Kleine Marken am Tier: nur für knappe und vergebene Stücke, damit es ruhig bleibt
  lw.querySelectorAll('.marke').forEach(m => {
    const tt = teil(m.dataset.marke);
    const st = status(tt);
    const an = imPaket(tt.id) > 0 ? 'meins' : st;
    m.className = `marke ${an}`;
    m.textContent = an === 'meins' ? 'im Paket' : st === 'weg' ? 'vergeben'
      : st === 'knapp' ? (tt.stueck ? `noch ${mengeText(tt, rest(tt)).gross}` : vorratText(tt)) : '';
  });
  // Herausheben: dieselbe Form wie die Zone – Bildausschnitt, Licht und Kante
  const form = t && BILD.zonen[t.id] ? BILD.zonen[t.id] : '';
  ['#glut', '#glut-schein', '#glut-rand', '#ausschnitt-form'].forEach(s => $(s).setAttribute('points', form));
  zeigeEtikett(schwebt || gewaehlt);
}

function zeigeEtikett(id) {
  const e = $('#etikett');
  const t = id && teil(id);
  if (!t || !BILD.pins[t.id]) { e.classList.remove('an'); return; }
  const [x, y] = BILD.pins[t.id];
  const links = x / BILD.breite;
  e.style.left = links * 100 + '%';
  e.style.top = y / BILD.hoehe * 100 + '%';
  e.classList.toggle('links', links < 0.16);
  e.classList.toggle('rechts', links > 0.84);
  const st = status(t);
  e.innerHTML = `<i class="punkt ${st}"></i>${t.name}<small>${vorratText(t)}</small>`;
  e.classList.add('an');
}

// Kurzes Aufleuchten bei jeder neuen Wahl
function leuchteAuf() {
  const lw = $('#leinwand');
  lw.classList.remove('aufleuchten');
  void lw.offsetWidth;          // Animation neu starten
  lw.classList.add('aufleuchten');
}

// ---------- Liste: alle Stücke, Zweitweg zum Tippen aufs Tier ----------
function zeichneListe() {
  $('#liste').innerHTML = TEILE.map(t => {
    const st = anzeige(t);
    const drin = imPaket(t.id);
    // „meins“: der ganze Rest liegt im eigenen Paket – dann steht das statt „vergeben“ da
    const zeile = st === 'meins' ? `${kg(drin)} in deinem Paket` : vorratText(t);
    return `<li><button type="button" class="posten ${st}${t.id === gewaehlt ? ' aktiv' : ''}" data-teil="${t.id}"
        aria-label="${t.name}, ${st === 'weg' ? 'vergeben' : st === 'meins' ? zeile : `${euro(t.preis)} je kg, ${vorratText(t)}`}">
      <span class="posten-name">${t.name}</span>
      ${st === 'weg' ? '' : `<span class="posten-preis">${euro(t.preis)}<small> /kg</small></span>`}
      <span class="posten-zeile"><i class="punkt ${st}"></i><span class="posten-rest">${zeile}</span></span>
      ${drin && st !== 'meins' ? `<span class="posten-paket">${kg(drin)} im Paket</span>` : ''}
    </button></li>`;
  }).join('');
}

// ---------- Blatt: Detail eines Stücks ----------
let menge = 0;           // gewählte Menge im Detail (kg)
let ansicht = null;      // 'teil' | 'paket' | 'fertig' | null

const ICON_ZU = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>';
const ICON_ZURUECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const kopfZeile = (vorzeile, titel) => `
  <button type="button" class="zurueck" data-zurueck>${ICON_ZURUECK}Alle Stücke</button>
  <div class="blatt-kopf">
    <div><p class="blatt-vorzeile">${vorzeile}</p><h2 id="blatt-titel">${titel}</h2></div>
    <button type="button" class="zu" data-zu aria-label="Schließen">${ICON_ZU}</button>
  </div>`;

function zeigeTeil(id) {
  const t = teil(id);
  const st = status(t);
  ansicht = 'teil';
  if (st === 'weg' && imPaket(t.id) > 0) {
    blatt(`${kopfZeile(t.beiname, t.name)}
      <p class="wo">${t.wo}</p>
      <ul class="eignung">${t.fuer.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="preisblock"><p class="vorrat meins"><i class="punkt meins"></i>${kg(imPaket(t.id))} in deinem Paket</p></div>
      <button type="button" class="knopf-haupt" data-paket-zeigen>Paket ansehen</button>
      <p class="klein">Mehr gibt es davon von Schwein Nr. 15 nicht.</p>`);
    return;
  }
  if (st === 'weg') {
    blatt(`${kopfZeile(t.beiname, t.name)}
      <p class="wo">${t.wo}</p>
      <ul class="eignung">${t.fuer.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="preisblock"><p class="vorrat weg"><i class="punkt weg"></i>Von Nr. 15 schon vergeben</p></div>
      <button type="button" class="knopf-zweit" data-vormerken>Bei Schwein Nr. 16 vormerken</button>
      <p class="klein">${t.id === 'filet' ? 'Filet gibt es je Schwein nur zwei Stränge.' : 'Je Schwein gibt es davon nur wenig.'}</p>`);
    return;
  }
  const r = rest(t);
  // Startmenge: knapp 1 kg (ganze Schritte) bzw. ein Stück, aber nie mehr als noch da ist
  const start = t.stueck ? t.schritt : Math.max(t.schritt, Math.floor(1 / t.schritt + 1e-9) * t.schritt);
  menge = rund2(Math.min(start, Math.floor(r / t.schritt + 1e-9) * t.schritt));
  blatt(`${kopfZeile(t.beiname, t.name)}
    <p class="wo">${t.wo}</p>
    <ul class="eignung" aria-label="Wofür">${t.fuer.map(f => `<li>${f}</li>`).join('')}</ul>
    <p class="tipp"><b>Tipp vom Hof</b>${t.tipp}</p>
    <div class="preisblock">
      <p><span class="preis">${euro(t.preis)}<small> / kg</small></span><span class="preis-hinweis">Tagespreis ${PREISDATUM}</span></p>
      <p class="vorrat ${st}"><i class="punkt ${st}"></i>${vorratText(t)}</p>
    </div>
    <div class="menge" role="group" aria-label="Menge">
      <button type="button" data-menge="-1" aria-label="weniger"><svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>
      <output id="menge-anzeige" aria-live="polite"></output>
      <button type="button" data-menge="1" aria-label="mehr"><svg viewBox="0 0 24 24"><path d="M6 12h12M12 6v12"/></svg></button>
    </div>
    <button type="button" class="knopf-haupt" data-ins-paket>In mein Paket <span id="menge-preis"></span></button>
    <p class="klein">Inkl. MwSt. · abgerechnet wird das genaue Gewicht · nur Abholung</p>`);
  zeichneMenge(false);
}

function zeichneMenge(tick = true) {
  const t = teil(gewaehlt);
  if (!t || ansicht !== 'teil' || status(t) === 'weg') return;
  const r = rest(t);
  const m = mengeText(t, menge);
  const out = $('#menge-anzeige');
  out.innerHTML = `<b>${m.gross}</b>${m.klein ? `<small>${m.klein}</small>` : ''}`;
  if (tick) { out.classList.remove('tick'); void out.offsetWidth; out.classList.add('tick'); }
  $('[data-menge="-1"]').disabled = menge <= t.schritt + 1e-9;
  $('[data-menge="1"]').disabled = menge + t.schritt > r + 1e-9;
  $('#menge-preis').textContent = `· ${euro(rund2(menge * t.preis))}`;
}

// ---------- Blatt: Paket und Abschluss ----------
function zeigePaket() {
  ansicht = 'paket';
  if (!paket.length) {
    blatt(`${kopfZeile('Schwein Nr. 15', 'Dein Paket')}<p class="leer">Noch leer. Tippe aufs Schwein und such dir ein Stück aus.</p>`);
    return;
  }
  blatt(`${kopfZeile(`Schwein Nr. 15 · ${paket.length} ${paket.length === 1 ? 'Stück' : 'Stücke'}`, 'Dein Paket')}
    <ul class="paket-liste">${paket.map(p => {
      const t = teil(p.id);
      const m = mengeText(t, p.kg);
      return `<li>
        <span class="p-name">${t.name}<small>${euro(t.preis)} / kg</small></span>
        <span class="p-kg">${t.stueck ? m.gross : kg(p.kg)}</span>
        <span class="p-preis">${euro(rund2(p.kg * t.preis))}</span>
        <button type="button" class="weg-knopf" data-entfernen="${t.id}" aria-label="${t.name} entfernen">${ICON_ZU}</button>
      </li>`;
    }).join('')}</ul>
    <div class="paket-summe-zeile"><span>${kg(paketKg())} · Summe ca.</span><b>${euro(paketSumme())}</b></div>
    <p class="abholung"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
      <span>Abholung <b>${tag(ABHOLUNG)}, ${ABHOLZEIT}</b><br>${ABHOLORT} · bezahlt wird vor Ort nach genauem Gewicht</span></p>
    <button type="button" class="knopf-haupt" data-reservieren>Reservieren</button>
    <p class="klein">Inkl. MwSt. Frischfleisch ist vom Widerruf ausgeschlossen (schnell verderblich).</p>`);
}

function zeigeFertig() {
  ansicht = 'fertig';
  blatt(`<div class="fertig">
      <div class="haken"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 16.5l5.5 5.5L24 10.5"/></svg></div>
      <h2 id="blatt-titel">Reserviert – fast.</h2>
      <p class="demo-hinweis">Demo – keine echte Bestellung</p>
      <p>Im echten Shop wäre jetzt dein Paket von Schwein Nr. 15 für dich zurückgelegt, und du bekämst eine Bestätigung per E-Mail. Hier wurde nichts gespeichert oder verschickt.</p>
      <button type="button" class="knopf-haupt" data-neu>Noch einmal von vorn</button>
    </div>`);
}

// Blatt füllen und öffnen. Handy: Bottom-Sheet. Laptop: liegt über der Liste.
// Absichtlich ohne abdunkelnden Schleier: das leuchtende Stück am Schwein soll sichtbar bleiben,
// und ein Tipp auf ein anderes Stück wechselt direkt.
function blatt(html) {
  const b = $('#blatt');
  $('#blatt-inhalt').innerHTML = html;
  b.scrollTop = 0;
  if (b.hidden) {
    b.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('offen')));
  }
  document.body.classList.add('blatt-offen');
  b.focus({ preventScroll: true });
  document.body.classList.toggle('paket-offen', ansicht === 'paket' || ansicht === 'fertig');
}
function blattZu() {
  const b = $('#blatt');
  ansicht = null;
  gewaehlt = null;
  b.classList.remove('offen');
  document.body.classList.remove('blatt-offen', 'paket-offen');
  setTimeout(() => {
    if (!b.classList.contains('offen')) b.hidden = true;
  }, ruhig() ? 0 : 420);
  alles();
}

// ---------- Handlungen ----------
function waehle(id) {
  gewaehlt = id;
  zeigeTeil(id);
  alles();
  leuchteAuf();
  // Handy: Schwein nach oben holen, damit das leuchtende Stück über dem Blatt sichtbar bleibt
  if (!LAPTOP.matches) {
    const oben = $('.buehne').getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: oben, behavior: ruhig() ? 'auto' : 'smooth' });
  }
}
function insPaket() {
  const t = teil(gewaehlt);
  const p = paket.find(x => x.id === t.id);
  if (p) p.kg = rund2(p.kg + menge); else paket.push({ id: t.id, kg: menge });
  speichern();
  const z = $('#paket-zahl');
  melde(`${t.stueck ? mengeText(t, menge).gross : kg(menge) + ' ' + t.name} im Paket`);
  blattZu();
  z.classList.remove('huepf'); void z.offsetWidth; z.classList.add('huepf');
}

let meldungUhr;
function melde(text) {
  const m = $('#meldung');
  m.textContent = text;
  m.classList.add('an');
  clearTimeout(meldungUhr);
  meldungUhr = setTimeout(() => m.classList.remove('an'), 2200);
}

function zeichnePaketleiste() {
  const leiste = $('#paketleiste');
  const voll = paket.length > 0;
  leiste.hidden = !voll;
  document.body.classList.toggle('hat-paket', voll);
  if (!voll) return;
  $('#paket-zahl').textContent = paket.length;
  $('#paket-zeile').textContent = `${paket.length} ${paket.length === 1 ? 'Stück' : 'Stücke'} · ${kg(paketKg())}`;
  $('#paket-summe').textContent = euro(paketSumme());
}

function alles() {
  zeichneKopf();
  zeichneBuehne();
  zeichneListe();
  zeichnePaketleiste();
}

// ---------- Ereignisse (ein Hörer je Bereich) ----------
document.addEventListener('click', e => {
  const ziel = e.target.closest('[data-teil], [data-zu], [data-zurueck], [data-menge], [data-ins-paket], [data-entfernen], [data-reservieren], [data-neu], [data-vormerken], [data-paket-zeigen], #paketleiste');
  if (!ziel) {
    // Handy: Tipp neben das offene Blatt schließt es (wie ein Schleier, nur unsichtbar)
    if (ansicht && !LAPTOP.matches && !e.target.closest('#blatt')) blattZu();
    return;
  }
  if (ziel.dataset.teil) { waehle(ziel.dataset.teil); return; }
  if (ziel.matches('[data-zu]')) { blattZu(); return; }
  if (ziel.matches('[data-zurueck]')) { blattZu(); return; }
  if (ziel.dataset.menge) {
    const t = teil(gewaehlt);
    menge = rund2(Math.min(rest(t), Math.max(t.schritt, menge + Number(ziel.dataset.menge) * t.schritt)));
    zeichneMenge();
    return;
  }
  if (ziel.matches('[data-ins-paket]')) { insPaket(); return; }
  if (ziel.dataset.entfernen) {
    paket = paket.filter(p => p.id !== ziel.dataset.entfernen);
    speichern();
    alles();
    if (paket.length) zeigePaket(); else blattZu();
    return;
  }
  if (ziel.matches('#paketleiste, [data-paket-zeigen]')) { gewaehlt = null; zeigePaket(); alles(); return; }
  if (ziel.matches('[data-reservieren]')) { zeigeFertig(); return; }
  if (ziel.matches('[data-neu]')) { paket = []; speichern(); blattZu(); return; }
  if (ziel.matches('[data-vormerken]')) { melde('Demo – vorgemerkt wird hier nichts.'); }
});

// Laptop: Maus über dem Tier zeigt den Namen des Stücks
const leinwand = $('#leinwand');
leinwand.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const z = e.target.closest('[data-teil]');
  schwebt = z ? z.dataset.teil : null;
  zeigeEtikett(schwebt || gewaehlt);
});
leinwand.addEventListener('pointerleave', () => { schwebt = null; zeigeEtikett(gewaehlt); });

document.addEventListener('keydown', e => { if (e.key === 'Escape' && ansicht) blattZu(); });

// Handy: Blatt nach unten wischen schließt es
let wischStart = null;
$('#blatt').addEventListener('touchstart', e => {
  wischStart = $('#blatt').scrollTop <= 0 ? e.touches[0].clientY : null;
}, { passive: true });
$('#blatt').addEventListener('touchend', e => {
  if (wischStart !== null && e.changedTouches[0].clientY - wischStart > 80 && !LAPTOP.matches) blattZu();
  wischStart = null;
}, { passive: true });

// Wechsel Handy ↔ Laptop (Fenster ziehen, Drehen): Blatt sauber zurücksetzen
LAPTOP.addEventListener('change', () => { if (ansicht) blattZu(); });

// Höhe des Kopfs für die Eine-Seite-Ansicht am Laptop
function kopfHoehe() { document.documentElement.style.setProperty('--kopf-h', $('.kopf').offsetHeight + 'px'); }
window.addEventListener('resize', kopfHoehe);

// ---------- Start ----------
baueBuehne();
alles();
kopfHoehe();
// Einmal kurz die Punkte „atmen“ lassen, damit klar ist: hier kann man tippen
setTimeout(() => document.querySelectorAll('.pin').forEach(p => p.classList.add('anstupsen')), 600);
