// Laimbachhof – Prototyp v3
// Nichts hier wird bestellt oder bezahlt. Die Daten stehen in daten.js, hier wird nur gerechnet und gezeichnet.
// Aufbau: Hilfen → Uhrzeit in Deutschland → Termine (Wo & wann, Heute) → Schwein → Versandshop
//         → Korb (zwei Wege: Abholen / Per Post) → Kasse → Klicks → Start.

'use strict';

// ---------- Hilfen ----------
const $ = sel => document.querySelector(sel);
const euro = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const kg = n => n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' kg';
const rund2 = n => Math.round(n * 100) / 100;
const TAGNAME = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const TAGKURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const kurzDatum = d => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
const tagDatum = d => `${TAGKURZ[d.getDay()]} ${kurzDatum(d)}`;            // „Fr 16.10.“
const langDatum = d => d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
function plusTage(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const nurTag = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const gleicherTag = (a, b) => nurTag(a).getTime() === nurTag(b).getTime();
const isoDatum = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Text sicher in HTML einsetzen (Eingaben aus der Kasse)
const sicher = s => String(s).replace(/[&<>"]/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[z]));
const HANDY = window.matchMedia('(max-width: 899px)');
const kartenLink = adresse => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adresse);

// ---------- Uhrzeit in Deutschland ----------
// Die Öffnungszeiten gelten in Franken. Wer die Seite aus einer anderen Zeitzone öffnet
// (z. B. um ein Geschenk zu verschicken), soll trotzdem „jetzt geöffnet“ nach deutscher Uhr sehen.
// Ergebnis ist ein Date, dessen Tag und Uhrzeit der Wanduhr in Berlin entsprechen.
function jetztInDeutschland() {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date());
  const w = {};
  teile.forEach(t => { w[t.type] = Number(t.value); });
  return new Date(w.year, w.month - 1, w.day, w.hour, w.minute);
}
let JETZT = jetztInDeutschland();
let HEUTE = nurTag(JETZT);

// Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag ist KW 1) – für „alle 14 Tage, ungerade KW“
function kalenderwoche(d) {
  const x = nurTag(d);
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));          // Donnerstag derselben Woche
  const kw1 = new Date(x.getFullYear(), 0, 4);                  // der 4. Januar liegt immer in KW 1
  return 1 + Math.round(((x - kw1) / 86400000 - 3 + ((kw1.getDay() + 6) % 7)) / 7);
}

// „09:00“ → Date am Tag d um 9:00
function mitUhrzeit(d, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
}
// „09:00“ → „9“, „09:35“ → „9:35“ (so spricht man Uhrzeiten)
const uhr = hhmm => { const [h, m] = hhmm.split(':').map(Number); return m ? `${h}:${String(m).padStart(2, '0')}` : String(h); };
const spanne = t => t.von ? `${uhr(t.von)}–${uhr(t.bis)} Uhr` : 'Uhrzeit offen';

// ---------- Termine aus dem Wochenplan ----------
// Alle Termine an einem Tag (ohne Ausnahmen wie Feiertage)
function termineAmTag(tag) {
  if (AUSNAHMEN.some(a => a.datum === isoDatum(tag))) return [];
  const ungerade = kalenderwoche(tag) % 2 === 1;
  return WOCHENPLAN
    .filter(e => e.tag === tag.getDay())
    .filter(e => !e.nurKW || (e.nurKW === 'ungerade') === ungerade)
    .map(e => ({ ...e, datum: nurTag(tag), start: e.von ? mitUhrzeit(tag, e.von) : null, ende: e.bis ? mitUhrzeit(tag, e.bis) : null }));
}
function termineAb(tag, tage) {
  const liste = [];
  for (let i = 0; i < tage; i++) liste.push(...termineAmTag(plusTage(tag, i)));
  return liste;
}
// „heute“, „morgen“ oder „Fr 16.10.“
function wann(datum) {
  if (gleicherTag(datum, HEUTE)) return 'heute';
  if (gleicherTag(datum, plusTage(HEUTE, 1))) return 'morgen';
  return tagDatum(datum);
}

// Lage eines Bereichs (Hofladen, Wagen Nürnberg, Wagen Scheinfeld) im Moment JETZT
function lage(bereich) {
  const kommend = termineAb(HEUTE, 29).filter(t => t.bereich === bereich);
  const heute = kommend.filter(t => gleicherTag(t.datum, HEUTE));
  return {
    jetzt: heute.find(t => t.start && t.start <= JETZT && JETZT < t.ende) || null,
    heuteNoch: heute.filter(t => !t.ende || t.ende > JETZT),        // ohne Uhrzeit: zählt den ganzen Tag
    naechster: kommend.find(t => t.datum > HEUTE) || null,          // erster Termin ab morgen
  };
}

// Eine Zeile der Heute-Übersicht: Zustand (offen/bald/zu), Hauptsatz, Nebensatz
function zeile(bereich) {
  const l = lage(bereich);
  if (bereich === 'hofladen') {
    if (l.jetzt) return { zustand: 'offen', haupt: 'Jetzt geöffnet', neben: `bis ${uhr(l.jetzt.bis)} Uhr` };
    if (l.heuteNoch.length) return { zustand: 'bald', haupt: `Heute ${spanne(l.heuteNoch[0])}`, neben: `öffnet um ${uhr(l.heuteNoch[0].von)} Uhr` };
    return { zustand: 'zu', haupt: 'Heute geschlossen', neben: l.naechster ? `wieder ${wann(l.naechster.datum)}, ${spanne(l.naechster)}` : '' };
  }
  if (bereich === 'nuernberg') {
    if (l.jetzt) {
      const danach = l.heuteNoch.find(t => t.start > JETZT);
      return { zustand: 'offen', haupt: `Jetzt: ${l.jetzt.platz}, ${l.jetzt.ort}`,
        neben: `bis ${uhr(l.jetzt.bis)} Uhr` + (danach ? ` · danach ${uhr(danach.von)} Uhr ${danach.platz}` : ' · letzter Halt heute') };
    }
    if (l.heuteNoch.length) {
      const t = l.heuteNoch[0];
      return { zustand: 'bald', haupt: `Heute ab ${uhr(t.von)} Uhr: ${t.platz}, ${t.ort}`,
        neben: l.heuteNoch.length > 1 ? `${l.heuteNoch.length} Halte, der letzte bis ${uhr(l.heuteNoch.at(-1).bis)} Uhr` : `bis ${uhr(t.bis)} Uhr` };
    }
    const n = l.naechster;
    return { zustand: 'zu', haupt: n ? `Nächster Halt ${wann(n.datum)}, ${uhr(n.von)} Uhr` : 'Kein Halt geplant', neben: n ? `${n.platz}, ${n.ort}` : '' };
  }
  // Scheinfeld: Termine ohne Uhrzeit – wir sagen ehrlich, dass wir die Zeit nicht kennen
  if (l.heuteNoch.length) return { zustand: 'bald', haupt: 'Heute unterwegs, an die Haustür', neben: 'Uhrzeit fehlt noch (Platzhalter)' };
  return { zustand: 'zu', haupt: l.naechster ? `Wieder ${wann(l.naechster.datum)}` : 'Kein Termin geplant', neben: 'an die Haustür, alle 14 Tage' };
}

const ZUSTAND_TEXT = { offen: 'geöffnet', bald: 'heute', zu: 'nicht heute' };
function zeichneHeute() {
  const zeilen = BEREICHE.map(b => ({ b, z: zeile(b.id) }));
  $('#heute').innerHTML = `
    <div class="heute-kopf">
      <h2 id="heute-titel">Heute, ${langDatum(HEUTE)}</h2>
      <span class="heute-stand">Stand ${uhr(`${JETZT.getHours()}:${JETZT.getMinutes()}`)} Uhr</span>
    </div>
    <ul class="heute-liste">
      ${zeilen.map(({ b, z }) => `
        <li class="heute-zeile ${z.zustand}" data-bereich="${b.id}">
          <span class="lampe" aria-hidden="true"></span><span class="unsichtbar">${ZUSTAND_TEXT[z.zustand]}: </span>
          <span class="heute-wo"><b>${b.name}</b> ${b.unter}</span>
          <span class="heute-was"><span class="haupt">${z.haupt}</span><span class="neben">${z.neben}</span></span>
        </li>`).join('')}
    </ul>
    <a class="pfeil-link" href="#wo-wann">Alle Zeiten, Stellplätze und Adressen</a>`;
  // Kopfzeile (ab Laptopbreite): ein kurzer Satz
  const offen = zeilen.find(x => x.z.zustand === 'offen');
  const bald = zeilen.find(x => x.z.zustand === 'bald');
  $('#kopf-status').innerHTML = offen
    ? `<i class="lampe-klein offen"></i>Jetzt geöffnet: ${offen.b.name} ${offen.b.unter}`
    : bald ? `<i class="lampe-klein bald"></i>Heute: ${bald.b.name} ${bald.b.unter}`
      : `<i class="lampe-klein zu"></i>Hofladen: ${zeile('hofladen').neben.replace('wieder ', '')}`;
}

// ---------- Wo & wann ----------
function zeichneOrte() {
  const hl = WOCHENPLAN.find(e => e.bereich === 'hofladen');
  const nbg = WOCHENPLAN.filter(e => e.bereich === 'nuernberg');
  // Der Halt, der jetzt läuft, sonst der nächste – bekommt eine Marke
  const lN = lage('nuernberg');
  const markiert = lN.jetzt || lN.heuteNoch[0] || lN.naechster;
  const marke = markiert ? (lN.jetzt ? 'jetzt hier' : `nächster Halt, ${wann(markiert.datum)}`) : '';
  const tage = [...new Set(nbg.map(e => e.tag))];
  const scheinfeldTermine = termineAb(HEUTE, 43).filter(t => t.bereich === 'scheinfeld').slice(0, 3);
  const zHof = zeile('hofladen');

  $('#orte').innerHTML = `
    <article class="ort" id="ort-hofladen">
      <img class="ort-bild" src="../bilder/hofladen.jpg" alt="Der Hofladen von innen: Regale mit Gläsern, vorne Obstkisten" width="1200" height="856" loading="lazy">
      <div class="ort-text">
        <h3>Hofladen Oberlaimbach</h3>
        <p class="ort-zeit">Freitag ${spanne(hl)}</p>
        <p class="ort-lage ${zHof.zustand}"><i class="lampe-klein ${zHof.zustand}"></i>${zHof.haupt}${zHof.neben ? ` · ${zHof.neben}` : ''}</p>
        <p>${hl.platz}, ${hl.plz}</p>
        <a class="knopf knopf-leer knopf-klein" href="${kartenLink(`${hl.platz}, ${hl.plz}`)}" target="_blank" rel="noopener">Route in Karten öffnen</a>
        <p class="ort-mehr">Außer unserem Schwarzerle: ${HOFLADEN_SORTIMENT.join(', ')}.</p>
        <p class="offen" data-offen="sortiment"></p>
      </div>
    </article>

    <article class="ort" id="ort-nuernberg">
      <img class="ort-bild" src="../bilder/wagen.jpg" alt="Johannes Buchner am gelben Verkaufswagen mit offener Heckklappe" width="1200" height="900" loading="lazy">
      <div class="ort-text">
        <h3>Verkaufswagen Nürnberg Süd</h3>
        <p class="ort-zeit">Donnerstag und Freitag, jede Woche</p>
        ${tage.map(tag => `
          <h4 class="halt-tag">${TAGNAME[tag]}</h4>
          <ol class="halte">
            ${nbg.filter(e => e.tag === tag).map(e => {
              const istMarkiert = markiert && markiert.platz === e.platz && markiert.tag === e.tag;
              return `<li class="halt${istMarkiert ? ' markiert' : ''}">
                <span class="halt-zeit">${uhr(e.von)}–${uhr(e.bis)}</span>
                <span class="halt-ort"><b>${e.platz}</b>${e.zusatz ? ` (${e.zusatz})` : ''}<br>${e.ort}${istMarkiert ? ` <em class="marke">${marke}</em>` : ''}</span>
                <a class="karte-knopf" href="${kartenLink(`${e.platz}, ${e.plz}`)}" target="_blank" rel="noopener" aria-label="Karte: ${e.platz}, ${e.ort}">Karte</a>
              </li>`;
            }).join('')}
          </ol>`).join('')}
        <p class="offen" data-offen="wagenTage"></p>
        <p class="offen" data-offen="wagenSortiment"></p>
      </div>
    </article>

    <article class="ort ort-schmal" id="ort-scheinfeld">
      <div class="ort-text">
        <h3>Verkaufswagen Scheinfeld und Umgebung</h3>
        <p class="ort-zeit">Samstag, alle 14 Tage – direkt an die Haustür</p>
        <p>Immer in ungeraden Kalenderwochen. Die nächsten Samstage:
          <b>${scheinfeldTermine.map(t => kurzDatum(t.datum) + (gleicherTag(t.datum, HEUTE) ? ' (heute)' : '')).join(' · ')}</b></p>
        <p class="offen" data-offen="scheinfeldZeit"></p>
      </div>
    </article>

    <article class="ort ort-schmal">
      <div class="ort-text">
        <h3>Außerdem erhältlich</h3>
        <ul class="auch-bei">${AUCH_BEI.map(a => `<li><b>${a.name}</b>, ${a.ort} – ${a.was}</li>`).join('')}</ul>
        <h3 class="abstand-oben">Fragen?</h3>
        <p>Ruf an oder schreib uns:</p>
        <p class="kontakt-knoepfe">
          <a class="knopf knopf-leer knopf-klein" href="tel:${HOF.telefonLink}">${HOF.telefon}</a>
          <a class="knopf knopf-leer knopf-klein" href="mailto:${HOF.mail}">${HOF.mail}</a>
        </p>
        <p class="offen" data-offen="ausnahmen"></p>
      </div>
    </article>`;
}

// ---------- Das Schwein ----------
// Termine relativ zu heute: nächster Dienstag in frühestens n Tagen = Schlachtung, Freitag danach = Abholung
function naechsterWochentag(ab, tag) { const d = nurTag(ab); while (d.getDay() !== tag) d.setDate(d.getDate() + 1); return d; }
const SCHLACHTUNG = naechsterWochentag(plusTage(HEUTE, SCHWEIN.schlachtInTagen), 2);
const ABHOLUNG = plusTage(SCHLACHTUNG, SCHWEIN.abholungNachTagen);
const RESERVIEREN_BIS = plusTage(SCHLACHTUNG, -1);
const NAECHSTES_AB = plusTage(SCHLACHTUNG, -7);

// Wo man das Frischfleisch abholen kann: alle Termine am Abholtag und am Tag danach – aus demselben Wochenplan
const ABHOLTERMINE = [...termineAmTag(ABHOLUNG), ...termineAmTag(plusTage(ABHOLUNG, 1))];

// Tagespreis. Rechtsprüfung 07.10.: nur „Tagespreis“ mit Datum zeigen – kein Vergleich,
// kein „% günstiger“, kein Normalpreis daneben (§ 11 PAngV). Rahmen ±15 %, einmal am Tag, für alle gleich.
function tagesfaktor(t) {
  const f = (t.vergeben / t.gesamt - 0.5) * 0.3;
  return Math.max(-0.15, Math.min(0.15, f));
}
const preisKg = t => Math.round(t.basis * (1 + tagesfaktor(t)) * 10) / 10;
const TAGESPREIS = `Tagespreis vom ${kurzDatum(HEUTE)}`;
const teil = id => TEILE.find(t => t.id === id);

function zeichneAblauf() {
  $('#ablauf').innerHTML = `
    <li><span class="schritt">1</span><div><b>Reservieren</b><span>bis ${tagDatum(RESERVIEREN_BIS)} – solange etwas frei ist</span></div></li>
    <li><span class="schritt">2</span><div><b>Schlachtung</b><span>${tagDatum(SCHLACHTUNG)} in der hofnahen Metzgerei</span></div></li>
    <li><span class="schritt">3</span><div><b>Abholen und bezahlen</b><span>${tagDatum(ABHOLUNG)} im Hofladen oder am Verkaufswagen – bezahlt wird dort, nach genauem Gewicht</span></div></li>
    <li class="ablauf-offen"><p class="offen" data-offen="schlachtung"></p><p class="offen" data-offen="zahlungAbholung"></p></li>`;
}

function zeichneTier() {
  const gesamt = TEILE.reduce((s, t) => s + t.gesamt, 0);
  const vergeben = TEILE.reduce((s, t) => s + t.vergeben, 0) + korb.filter(p => p.art === 'frisch').reduce((s, p) => s + p.kg, 0);
  const prozent = Math.round(vergeben / gesamt * 100);
  $('#tier').innerHTML = `
    <img class="tier-bild" src="../bilder/gras.jpg" alt="Schwarzes Cornwallschwein liegt im hohen Gras" width="800" height="600" loading="lazy">
    <div class="tier-text">
      <h3>Schwein Nr. ${SCHWEIN.nr}</h3>
      <p class="tier-meta">${SCHWEIN.rasse} · geboren ${SCHWEIN.geboren} · ${SCHWEIN.weide}</p>
      <div class="balken-kopf"><span><b>${prozent} %</b> reserviert</span><span>noch ${kg(rund2(gesamt - vergeben))} frei</span></div>
      <div class="balken" role="progressbar" aria-valuenow="${prozent}" aria-valuemin="0" aria-valuemax="100" aria-label="Anteil reserviert"><i style="width:${prozent}%"></i></div>
      <p class="tier-fuss">Nr. ${SCHWEIN.nr - 1} ist vergeben. Nr. ${SCHWEIN.nr + 1} kann man ab ${tagDatum(NAECHSTES_AB)} reservieren.</p>
      <p class="beispiel">Beispieldaten – Tier, Mengen und Termine setzt der Hof.</p>
    </div>`;
  $('#leinwand-nr').textContent = `Schwein Nr. ${SCHWEIN.nr}`;
}

// Korb-Zustand je Teilstück
const imKorbKg = id => korb.filter(p => p.art === 'frisch' && p.id === id).reduce((s, p) => s + p.kg, 0);
const restKg = t => Math.max(0, rund2(t.gesamt - t.vergeben - imKorbKg(t.id)));
function status(t) {
  const r = restKg(t);
  if (r < t.schritt) return 'weg';
  if (r / t.gesamt < 0.25) return 'knapp';
  return 'frei';
}
const STATUS_TEXT = { frei: 'frei', knapp: 'wird knapp', weg: 'vergeben' };

// Schweinebild mit Klickzonen. Bild + Zonen kommen aus bilder/schwein-bild.js (window.SCHWEIN_BILD),
// erzeugt von werkzeug/schwein-zonen.py – neues Foto = Skript neu laufen lassen, hier ändert sich nichts.
const BILD = window.SCHWEIN_BILD;
let gewaehlt = null;
let menge = 1;

function zeichneLeinwand() {
  const { breite: w, hoehe: h, zonen, pins = {} } = BILD;
  // Die Flächen sind nur fürs Tippen mit dem Finger/der Maus; für Tastatur und Vorleser gibt es die Liste darunter.
  const flaechen = TEILE.map(t => `<polygon class="zone ${status(t)}${t.id === gewaehlt ? ' gewaehlt' : ''}" data-teil="${t.id}" points="${zonen[t.id]}"/>`).join('');
  const schilder = TEILE.map(t => {
    const [x, y] = pins[t.id];
    return `<span class="schild ${status(t)}${t.id === gewaehlt ? ' gewaehlt' : ''}" style="left:${x / w * 100}%;top:${y / h * 100}%">${t.name}</span>`;
  }).join('');
  $('#leinwand-bild').innerHTML = `
    <img src="${BILD.datei}" alt="" width="${w}" height="${h}">
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${flaechen}</svg>
    <div class="schilder" aria-hidden="true">${schilder}</div>`;
  $('#leinwand').classList.toggle('hat-wahl', !!gewaehlt);
}

function zeichneListe() {
  $('#teile-liste').innerHTML = TEILE.map(t => {
    const st = status(t);
    const drin = imKorbKg(t.id);
    return `<li><button type="button" class="teil ${st}${t.id === gewaehlt ? ' gewaehlt' : ''}" data-teil="${t.id}" aria-pressed="${t.id === gewaehlt}">
      <span class="teil-name">${t.name}</span>
      <span class="teil-preis">${st === 'weg' ? '' : `${euro(preisKg(t))}/kg`}</span>
      <span class="teil-rest"><i class="punkt ${st}"></i>${st === 'weg' ? 'vergeben' : `noch ${kg(restKg(t))}`}${drin ? ` · <b>${kg(drin)} im Korb</b>` : ''}</span>
    </button></li>`;
  }).join('');
}

// Kleines Schwein mit dem gewählten Teilstück hervorgehoben (zeigt: wo am Tier sitzt das?)
function miniSchwein(t) {
  const { breite: w, hoehe: h, zonen } = BILD;
  return `<svg class="mini" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <image href="${BILD.datei}" width="${w}" height="${h}" opacity=".35"/>
    <polygon points="${zonen[t.id]}" class="mini-zone"/></svg>`;
}

function zeichneDetail() {
  const box = $('#detail');
  if (!gewaehlt) {
    box.innerHTML = `<div class="detail-leer"><h3>Welches Stück?</h3>
      <p>Tippe auf das Schwein oder wähle aus der Liste. Hier siehst du dann Preis, Menge und was noch frei ist.</p>
      <p class="klein">Frischfleisch: Abholung ${tagDatum(ABHOLUNG)}, kein Versand.</p></div>`;
    return;
  }
  const t = teil(gewaehlt);
  const st = status(t);
  const kopf = `<div class="griff" aria-hidden="true"></div>
    <div class="detail-kopf"><h3>${t.name}</h3><button class="zu-knopf" type="button" data-detail-zu aria-label="Schließen">×</button></div>
    ${miniSchwein(t)}
    <p>${t.text}</p>
    <p class="chips">${t.eignung.map(e => `<span>${e}</span>`).join('')}</p>`;
  if (st === 'weg') {
    box.innerHTML = `${kopf}
      <p class="status"><i class="punkt weg"></i>Bei Nr. ${SCHWEIN.nr} schon vergeben.</p>
      <button class="knopf knopf-leer breit" type="button" data-vormerken>Bei Nr. ${SCHWEIN.nr + 1} vormerken</button>
      <p class="klein">Nr. ${SCHWEIN.nr + 1} kann man ab ${tagDatum(NAECHSTES_AB)} reservieren. Im echten Shop kommt dann eine Mail.</p>`;
    return;
  }
  const r = restKg(t);
  const p = preisKg(t);
  menge = Math.min(Math.max(menge, t.schritt), r);
  box.innerHTML = `${kopf}
    <p class="preis"><b>${euro(p)}/kg</b> <span>${TAGESPREIS}</span></p>
    <p class="status"><i class="punkt ${st}"></i>${st === 'knapp' ? 'Wird knapp: ' : ''}noch ${kg(r)} von Nr. ${SCHWEIN.nr}</p>
    <div class="menge" role="group" aria-label="Menge">
      <button type="button" data-menge="-1" aria-label="weniger" ${menge <= t.schritt ? 'disabled' : ''}>−</button>
      <output aria-live="polite">ca. ${kg(menge)}</output>
      <button type="button" data-menge="1" aria-label="mehr" ${menge + t.schritt > r + 1e-9 ? 'disabled' : ''}>+</button>
    </div>
    <p class="summe"><span>ca. ${kg(menge)} × ${euro(p)}/kg</span><b>ca. ${euro(rund2(menge * p))}</b></p>
    <button class="knopf knopf-voll breit" type="button" data-reservieren>Reservieren</button>
    <p class="klein">Inkl. MwSt. Abholung ${tagDatum(ABHOLUNG)} im Hofladen oder am Verkaufswagen, bezahlt wird dort nach genauem Gewicht.
      Kein Versand. Frischfleisch ist schnell verderblich, darum gibt es kein Widerrufsrecht.</p>`;
}

function waehle(id) {
  gewaehlt = id;
  const t = teil(id);
  menge = Math.min(t.schritt >= 0.5 ? 1 : 0.5, Math.max(t.schritt, restKg(t)));
  zeichneSchwein();
  if (HANDY.matches) blatt('detail', true);
}
function zeichneSchwein() { zeichneLeinwand(); zeichneListe(); zeichneDetail(); zeichneTier(); }

function zeichneAnteile() {
  $('#anteile').innerHTML = ANTEILE.map(a => {
    const frei = a.frei - korb.filter(p => p.art === 'anteil' && p.id === a.id).length;
    return `<article class="anteil">
      <h3>${a.name} vom Schwein</h3>
      <p class="anteil-preis"><b>ca. ${euro(rund2(a.ca * a.preisKg))}</b><span>ca. ${a.ca} kg · ${euro(a.preisKg)}/kg</span></p>
      <p>${a.inhalt}.</p>
      <p class="status"><i class="punkt ${frei > 0 ? 'frei' : 'weg'}"></i>${frei > 0 ? `noch ${frei} von Nr. ${SCHWEIN.nr} frei` : 'vergeben'}</p>
      <button class="knopf knopf-voll breit" type="button" data-anteil="${a.id}" ${frei > 0 ? '' : 'disabled'}>${a.name} reservieren</button>
      <p class="klein">Inkl. MwSt., abgerechnet nach genauem Gewicht. Nur Abholung, ${tagDatum(ABHOLUNG)}.</p>
    </article>`;
  }).join('');
}

function modus(welcher) {
  const anteil = welcher === 'anteil';
  $('#tab-teile').setAttribute('aria-selected', String(!anteil));
  $('#tab-anteil').setAttribute('aria-selected', String(anteil));
  $('#modus-teile').hidden = anteil;
  $('#modus-anteil').hidden = !anteil;
  if (anteil) blatt('detail', false);
}

// ---------- Versandshop ----------
// Nächster Versandtag: der nächste Montag nach heute (Bestellschluss unbekannt, siehe OFFEN)
const VERSANDTAG = naechsterWochentag(plusTage(HEUTE, 1), VERSAND.tag);

function zeichneVersandregel() {
  $('#versandregel').innerHTML = `
    <div><b>Versand jeden Montag</b><span>nächster Versandtag: ${tagDatum(VERSANDTAG)}</span></div>
    <div><b>Versandkosten</b><span>ab ${euro(VERSAND.freiAb)} Dauerware frei, sonst ${euro(VERSAND.kosten)} je Paket. Geschenkpakete: Versand inklusive.</span></div>
    <div><b>Bezahlung</b><span>auf Rechnung nach Erhalt der Ware</span></div>
    <p class="offen" data-offen="bestellschluss"></p>`;
}

function zeichnePakete() {
  $('#pakete').innerHTML = PAKETE.map(a => `
    <article class="paket">
      <img src="../bilder/${a.bild}" alt="${a.name}: Holzkiste mit Wurst und Produkten aus der Region" width="675" height="900" loading="lazy">
      <div class="paket-text">
        <h4>${a.name}</h4>
        <p class="paket-preis"><b>${euro(a.preis)}</b><span>inkl. MwSt., Versand und Geschenkverpackung</span></p>
        <p class="klein">${a.inhalt}</p>
        <button class="knopf knopf-voll breit" type="button" data-paket="${a.id}">In den Korb</button>
      </div>
    </article>`).join('');
}

const dauerWahl = {};   // id → { variante, i (Index im Gewichte-Feld) }
function zeichneProdukte() {
  $('#produkte').innerHTML = DAUERWARE.map(a => {
    const varianten = Object.keys(a.preise);
    dauerWahl[a.id] = dauerWahl[a.id] || { variante: varianten[0], i: a.gewichte.indexOf(a.start) };
    return `<article class="produkt" data-artikel="${a.id}">
      <img src="../bilder/${a.bild}" alt="${a.name} vom Laimbachhof" loading="lazy">
      <div class="produkt-text">
        <h4>${a.name}</h4>
        <p class="klein">${a.zutaten}</p>
        ${varianten.length > 1 ? `<div class="varianten" role="group" aria-label="Variante">${varianten.map(v =>
          `<button type="button" data-variante="${v}">${v}<small>${euro(a.preise[v])}/kg</small></button>`).join('')}</div>`
          : `<p class="einzelpreis">${euro(a.preise[varianten[0]])}/kg</p>`}
        <div class="menge" role="group" aria-label="Menge">
          <button type="button" data-dmenge="-1" aria-label="weniger">−</button>
          <output data-dkg aria-live="polite"></output>
          <button type="button" data-dmenge="1" aria-label="mehr">+</button>
        </div>
        <p class="summe"><span data-dgrund></span><b data-dsumme></b></p>
        <button class="knopf knopf-voll breit" type="button" data-dauer>In den Korb</button>
      </div>
    </article>`;
  }).join('');
  DAUERWARE.forEach(a => produktAktualisieren(a.id));
}
function produktAktualisieren(id) {
  const a = DAUERWARE.find(x => x.id === id);
  const w = dauerWahl[id];
  const box = document.querySelector(`[data-artikel="${id}"]`);
  const m = a.gewichte[w.i];
  const pk = a.preise[w.variante];
  box.querySelector('[data-dkg]').textContent = kg(m) + (a.paare ? ` · ${Math.round(m / 0.2)} Paar` : '');
  box.querySelector('[data-dsumme]').textContent = euro(rund2(m * pk));
  box.querySelector('[data-dgrund]').textContent = `${euro(pk)}/kg · inkl. MwSt., zzgl. Versand`;
  box.querySelector('[data-dmenge="-1"]').disabled = w.i === 0;
  box.querySelector('[data-dmenge="1"]').disabled = w.i === a.gewichte.length - 1;
  box.querySelectorAll('[data-variante]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variante === w.variante)));
}

// ---------- Korb ----------
// Jeder Posten gehört zu genau einem Weg:
//   Abholen  = Frischfleisch und fertige Pakete vom Schwein (immer), bezahlt bei Abholung nach Gewicht
//   Per Post = Geschenkpakete (immer) und Dauerware – außer man holt ohnehin Frischfleisch ab und
//              entscheidet sich, die Dauerware mitzunehmen (dann fällt kein Versand an).
let korb = [];
let dauerMitnehmen = false;
try {
  const g = JSON.parse(sessionStorage.getItem('korb-v3') || '{}');
  korb = g.korb || [];
  dauerMitnehmen = !!g.dauerMitnehmen;
} catch (e) { korb = []; }

const hatAbholung = () => korb.some(p => p.art === 'frisch' || p.art === 'anteil');
function wegVon(p) {
  if (p.art === 'frisch' || p.art === 'anteil') return 'abholen';
  if (p.art === 'dauer' && dauerMitnehmen && hatAbholung()) return 'abholen';
  return 'post';
}
const betrag = p => p.art === 'paket' ? rund2(p.preis * (p.anzahl || 1)) : rund2(p.kg * p.preisKg);
function summen() {
  const abholen = korb.filter(p => wegVon(p) === 'abholen');
  const post = korb.filter(p => wegVon(p) === 'post');
  const dauerPost = post.filter(p => p.art === 'dauer').reduce((s, p) => s + betrag(p), 0);
  const versand = dauerPost > 0 && dauerPost < VERSAND.freiAb ? VERSAND.kosten : 0;
  const abholSumme = rund2(abholen.reduce((s, p) => s + betrag(p), 0));
  const postSumme = rund2(post.reduce((s, p) => s + betrag(p), 0));
  return { abholen, post, dauerPost: rund2(dauerPost), versand, abholSumme, postSumme, gesamt: rund2(abholSumme + postSumme + versand),
    ca: abholen.some(p => p.art === 'frisch' || p.art === 'anteil') };
}
function speichern() { sessionStorage.setItem('korb-v3', JSON.stringify({ korb, dauerMitnehmen })); }

function legeInKorb(posten, text) {
  const gleich = korb.find(p => p.art === posten.art && p.id === posten.id && p.variante === posten.variante && p.art !== 'anteil');
  if (gleich && posten.kg) gleich.kg = rund2(gleich.kg + posten.kg);
  else if (gleich && posten.art === 'paket') gleich.anzahl = (gleich.anzahl || 1) + 1;
  else korb.push(posten);
  korbGeaendert();
  melde(text);
}
function korbGeaendert() {
  speichern();
  const n = korb.length;
  $('#korb-zahl').hidden = n === 0;
  $('#korb-zahl').textContent = n;
  $('#korb-knopf').setAttribute('aria-label', n ? `Korb öffnen, ${n} ${n === 1 ? 'Posten' : 'Posten'}` : 'Korb öffnen, leer');
  zeichneSchwein();
  zeichneAnteile();
  korbLeiste();
  if (!$('#korb').hidden && ansicht === 'korb') zeigeKorb();
}
function korbLeiste() {
  const leiste = $('#korb-leiste');
  const verdeckt = !$('#korb').hidden || $('#detail').classList.contains('offen');
  leiste.hidden = korb.length === 0 || verdeckt;
  document.body.classList.toggle('mit-leiste', !leiste.hidden);
  if (!korb.length) return;
  const s = summen();
  const teile = [];
  if (s.abholen.length) teile.push(`${s.abholen.length} zum Abholen`);
  if (s.post.length) teile.push(`${s.post.length} per Post`);
  $('#korb-leiste-text').innerHTML = `<b>${s.ca ? 'ca. ' : ''}${euro(s.gesamt)}</b><span>${teile.join(' · ')}</span>`;
}

// Anzeige eines Postens
function postenName(p) {
  if (p.art === 'frisch') return teil(p.id).name;
  if (p.art === 'anteil') return `${ANTEILE.find(a => a.id === p.id).name} vom Schwein`;
  if (p.art === 'paket') return PAKETE.find(a => a.id === p.id).name;
  return DAUERWARE.find(a => a.id === p.id).name;
}
function postenDetail(p) {
  if (p.art === 'frisch') return `Nr. ${SCHWEIN.nr} · ca. ${kg(p.kg)} × ${euro(p.preisKg)}/kg`;
  if (p.art === 'anteil') return `Nr. ${SCHWEIN.nr} · ca. ${kg(p.kg)} × ${euro(p.preisKg)}/kg`;
  if (p.art === 'paket') return `${p.anzahl || 1} × ${euro(PAKETE.find(a => a.id === p.id).preis)} · Versand inklusive`;
  return `${p.variante} · ${kg(p.kg)} × ${euro(p.preisKg)}/kg`;
}
function postenZeile(p) {
  const i = korb.indexOf(p);
  const ca = p.art === 'frisch' || p.art === 'anteil' ? 'ca. ' : '';
  const wert = betrag(p);
  return `<li class="posten"><span><b>${postenName(p)}</b><small>${postenDetail(p)}</small></span>
    <span class="posten-preis">${ca}${euro(rund2(wert))}</span>
    <button class="zu-knopf" type="button" data-entfernen="${i}" aria-label="${postenName(p)} entfernen">×</button></li>`;
}

// ---------- Blätter: Teilstück (Handy), Korb, Kasse ----------
let ansicht = 'korb';
let zuletztFokus = null;
function blatt(welches, auf) {
  if (welches === 'detail') {
    $('#detail').classList.toggle('offen', auf && HANDY.matches);
    if (!auf && HANDY.matches) { gewaehlt = null; zeichneSchwein(); }
  } else {
    const k = $('#korb');
    if (auf) { zuletztFokus = document.activeElement; k.hidden = false; requestAnimationFrame(() => k.classList.add('offen')); k.focus({ preventScroll: true }); }
    else { k.classList.remove('offen'); k.hidden = true; if (zuletztFokus) zuletztFokus.focus({ preventScroll: true }); }
  }
  const irgendwas = $('#detail').classList.contains('offen') || !$('#korb').hidden;
  $('#schleier').hidden = !irgendwas;
  document.body.classList.toggle('blatt-offen', irgendwas);
  korbLeiste();
}

function zeigeKorb() {
  ansicht = 'korb';
  const s = summen();
  const fehlt = rund2(VERSAND.freiAb - s.dauerPost);
  const dauerDa = korb.some(p => p.art === 'dauer');
  $('#korb').innerHTML = `
    <div class="griff" aria-hidden="true"></div>
    <div class="blatt-kopf"><h2>Dein Korb</h2><button class="zu-knopf" type="button" data-korb-zu aria-label="Korb schließen">×</button></div>
    ${!korb.length ? `<p class="leer">Noch leer.</p>
      <p class="leer-wege"><a class="knopf knopf-voll" href="#schwein" data-korb-zu>Schwein reservieren</a>
      <a class="knopf knopf-leer" href="#versand" data-korb-zu>Zum Versandshop</a></p>` : `
    ${s.abholen.length ? `<section class="weg weg-abholen">
      <h3>Zum Abholen <span>${tagDatum(ABHOLUNG)}</span></h3>
      <p class="weg-satz">Im Hofladen oder am Verkaufswagen – den Termin wählst du an der Kasse. Bezahlt wird bei Abholung nach genauem Gewicht.</p>
      <ul>${s.abholen.map(postenZeile).join('')}</ul></section>` : ''}
    ${hatAbholung() && dauerDa ? `<div class="mitnehmen">
      <p>Du holst am ${tagDatum(ABHOLUNG)} sowieso ab. Dauerware mitnehmen statt verschicken?</p>
      <div class="umschalter klein" role="group" aria-label="Dauerware">
        <button type="button" data-mitnehmen="ja" aria-pressed="${dauerMitnehmen}">Mitnehmen</button>
        <button type="button" data-mitnehmen="nein" aria-pressed="${!dauerMitnehmen}">Per Post</button>
      </div></div>` : ''}
    ${s.post.length ? `<section class="weg weg-post">
      <h3>Per Post <span>Versand ${tagDatum(VERSANDTAG)}</span></h3>
      <ul>${s.post.map(postenZeile).join('')}</ul>
      ${s.dauerPost > 0 ? `<p class="weg-satz">Versand: ${s.versand ? `${euro(s.versand)} – ab ${euro(VERSAND.freiAb)} Dauerware frei (es fehlen ${euro(fehlt)})` : 'frei'}</p>` : ''}
      </section>` : ''}
    <dl class="summen">
      ${s.abholen.length ? `<div><dt>Bei Abholung zu zahlen</dt><dd>${s.ca ? 'ca. ' : ''}${euro(s.abholSumme)}</dd></div>` : ''}
      ${s.post.length ? `<div><dt>Per Rechnung${s.versand ? ` (inkl. ${euro(s.versand)} Versand)` : ''}</dt><dd>${euro(rund2(s.postSumme + s.versand))}</dd></div>` : ''}
      <div class="gesamt"><dt>Zusammen</dt><dd>${s.ca ? 'ca. ' : ''}${euro(s.gesamt)}</dd></div>
    </dl>
    <p class="klein">Alle Preise inkl. MwSt.</p>
    <button class="knopf knopf-voll breit" type="button" data-zur-kasse>Weiter zur Kasse</button>`}`;
}

function zeigeKasse(fehler = '') {
  ansicht = 'kasse';
  const s = summen();
  const abholen = s.abholen.length > 0;
  const post = s.post.length > 0;
  const tagA = ABHOLTERMINE.filter(t => t.bereich === 'hofladen');
  const tagN = ABHOLTERMINE.filter(t => t.bereich === 'nuernberg');
  const tagS = ABHOLTERMINE.filter(t => t.bereich === 'scheinfeld');
  $('#korb').innerHTML = `
    <div class="griff" aria-hidden="true"></div>
    <button class="zurueck" type="button" data-zum-korb>← Zurück zum Korb</button>
    <div class="blatt-kopf"><h2>Kasse</h2><button class="zu-knopf" type="button" data-korb-zu aria-label="Schließen">×</button></div>
    <form id="kasse" novalidate>
      <fieldset><legend>Deine Daten</legend>
        <label class="feld">Name<input name="name" autocomplete="name" required></label>
        <label class="feld">E-Mail<input name="mail" type="email" autocomplete="email" required></label>
        <label class="feld">Telefon <small>(freiwillig, für Rückfragen)</small><input name="tel" type="tel" autocomplete="tel"></label>
      </fieldset>
      ${abholen ? `<fieldset><legend>Abholung</legend>
        <div class="wahlen">
          ${tagA.map(t => `<label class="wahl"><input type="radio" name="abholung" value="hofladen" checked>
            <span><b>Hofladen Oberlaimbach</b><small>${tagDatum(t.datum)}, ${spanne(t)}</small></span></label>`).join('')}
          ${tagN.length ? `<label class="wahl"><input type="radio" name="abholung" value="nuernberg">
            <span><b>Verkaufswagen Nürnberg Süd</b><small>${tagDatum(tagN[0].datum)}, an einem Stellplatz</small></span></label>
            <label class="feld" data-nur="nuernberg" hidden>Stellplatz<select name="stellplatz">
              ${tagN.map((t, i) => `<option value="${i}">${uhr(t.von)} Uhr · ${t.platz}, ${t.ort}</option>`).join('')}</select></label>` : ''}
          ${tagS.map(t => `<label class="wahl"><input type="radio" name="abholung" value="scheinfeld">
            <span><b>Verkaufswagen Scheinfeld</b><small>${tagDatum(t.datum)}, an die Haustür – Uhrzeit fehlt noch</small></span></label>
            <label class="feld" data-nur="scheinfeld" hidden>Deine Adresse in Scheinfeld und Umgebung<input name="haustuer" autocomplete="street-address"></label>`).join('')}
        </div>
        <p class="klein">Bezahlt wird bei Abholung nach genauem Gewicht.</p>
      </fieldset>` : ''}
      ${post ? `<fieldset><legend>Versand am ${tagDatum(VERSANDTAG)}</legend>
        <label class="haken"><input type="checkbox" name="geschenk"><span>Als Geschenk an eine andere Person schicken</span></label>
        <label class="feld" data-nur="geschenk" hidden>Name der beschenkten Person<input name="empfaenger" autocomplete="off"></label>
        <p class="klein" data-nur="geschenk" hidden>Die Rechnung schicken wir dir per E-Mail, ins Paket kommen keine Preise.</p>
        <p class="offen" data-nur="geschenk" data-offen="geschenkRechnung" hidden></p>
        <label class="feld">Straße und Hausnummer<input name="strasse" autocomplete="street-address" required></label>
        <div class="feld-reihe">
          <label class="feld">PLZ<input name="plz" inputmode="numeric" autocomplete="postal-code" required></label>
          <label class="feld">Ort<input name="ort" autocomplete="address-level2" required></label>
        </div>
      </fieldset>
      <fieldset><legend>Bezahlen ${abholen ? '(nur der Teil per Post)' : ''}</legend>
        <div class="wahlen">
          <label class="wahl"><input type="radio" name="zahlung" value="rechnung" checked><span><b>Auf Rechnung</b><small>Überweisung nach Erhalt, wie bisher</small></span></label>
          <label class="wahl"><input type="radio" name="zahlung" value="karte"><span><b>Karte, Apple Pay, Google Pay</b><small>im echten Shop über einen Zahlungsdienst</small></span></label>
        </div>
      </fieldset>` : ''}
      <dl class="summen">
        ${abholen ? `<div><dt>Bei Abholung</dt><dd>${s.ca ? 'ca. ' : ''}${euro(s.abholSumme)}</dd></div>` : ''}
        ${post ? `<div><dt>Per Rechnung${s.versand ? ' inkl. Versand' : ''}</dt><dd>${euro(rund2(s.postSumme + s.versand))}</dd></div>` : ''}
        <div class="gesamt"><dt>Zusammen</dt><dd>${s.ca ? 'ca. ' : ''}${euro(s.gesamt)}</dd></div>
      </dl>
      <p class="fehler" role="alert">${fehler}</p>
      <button class="knopf knopf-akzent breit" type="submit">Zahlungspflichtig bestellen</button>
      <p class="klein">Mit dem Klick gelten unsere AGB und die Widerrufsbelehrung (Platzhalter).
        ${abholen ? 'Frischfleisch ist schnell verderblich, dafür gibt es kein Widerrufsrecht. ' : ''}${post ? 'Dauerware und Geschenkpakete kannst du 14 Tage lang widerrufen.' : ''}</p>
    </form>`;
  zeichneOffen($('#korb'));
}

function zeigeFertig(f) {
  ansicht = 'fertig';
  const s = summen();
  let abhol = '';
  if (s.abholen.length) {
    const wahl = f.abholung.value;
    if (wahl === 'hofladen') { const t = ABHOLTERMINE.find(x => x.bereich === 'hofladen'); abhol = `${tagDatum(t.datum)}, ${spanne(t)} im Hofladen Oberlaimbach`; }
    if (wahl === 'nuernberg') { const t = ABHOLTERMINE.filter(x => x.bereich === 'nuernberg')[Number(f.stellplatz.value)]; abhol = `${tagDatum(t.datum)}, ${uhr(t.von)}–${uhr(t.bis)} Uhr am Verkaufswagen, ${t.platz} (${t.ort})`; }
    if (wahl === 'scheinfeld') { const t = ABHOLTERMINE.find(x => x.bereich === 'scheinfeld'); abhol = `${tagDatum(t.datum)} an deiner Haustür, ${sicher(f.haustuer.value)}`; }
  }
  const an = s.post.length ? (f.geschenk.checked ? sicher(f.empfaenger.value) : sicher(f.name.value)) : '';
  $('#korb').innerHTML = `
    <div class="griff" aria-hidden="true"></div>
    <div class="fertig">
      <div class="fertig-haken" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17 19 7"/></svg></div>
      <h2>So sähe deine Bestätigung aus</h2>
      <p class="klein">Prototyp – es wurde nichts gesendet und nichts bezahlt.</p>
      ${abhol ? `<div class="fertig-weg"><b>Abholung</b><p>${abhol}. Bezahlt wird dort, ca. ${euro(s.abholSumme)}.</p></div>` : ''}
      ${s.post.length ? `<div class="fertig-weg"><b>Per Post</b><p>Versand am ${tagDatum(VERSANDTAG)} an ${an}, ${sicher(f.strasse.value)}, ${sicher(f.plz.value)} ${sicher(f.ort.value)}. Rechnung über ${euro(rund2(s.postSumme + s.versand))}.</p></div>` : ''}
      <button class="knopf knopf-voll breit" type="button" data-neu>Fertig</button>
    </div>`;
}

// Kasse prüfen: Pflichtfelder, die gerade sichtbar sind
function kassePruefen(f) {
  const fehlend = [...f.querySelectorAll('input')]
    .filter(el => el.closest('[hidden]') === null)
    .filter(el => el.required && !el.value.trim());
  f.querySelectorAll('.feld').forEach(el => el.classList.remove('fehlt'));
  fehlend.forEach(el => el.closest('.feld').classList.add('fehlt'));
  if (f.mail.value.trim() && !/^\S+@\S+\.\S+$/.test(f.mail.value.trim())) {
    f.mail.closest('.feld').classList.add('fehlt');
    return 'Bitte prüfe die E-Mail-Adresse.';
  }
  if (fehlend.length) return `Bitte ausfüllen: ${fehlend.map(el => el.closest('.feld').firstChild.textContent.trim()).join(', ')}.`;
  return '';
}
// Felder, die nur bei einer bestimmten Wahl gebraucht werden (Stellplatz, Haustür, Geschenk)
function kasseUmschalten(f) {
  const wahl = f.abholung ? f.abholung.value : '';
  const geschenk = f.geschenk ? f.geschenk.checked : false;
  f.querySelectorAll('[data-nur]').forEach(el => {
    const an = el.dataset.nur === 'geschenk' ? geschenk : el.dataset.nur === wahl;
    el.hidden = !an;
    el.querySelectorAll('input').forEach(i => { i.required = an; });
  });
}

// ---------- Platzhalter für offene Fragen ----------
function zeichneOffen(wurzel = document) {
  wurzel.querySelectorAll('[data-offen]').forEach(el => {
    el.innerHTML = `<b>Platzhalter</b> ${OFFEN[el.dataset.offen]}`;
  });
}

// ---------- Kurze Meldung ----------
let meldungUhr;
function melde(text) {
  const m = $('#meldung');
  m.textContent = text;
  m.classList.add('an');
  clearTimeout(meldungUhr);
  meldungUhr = setTimeout(() => m.classList.remove('an'), 2600);
}

// ---------- Klicks: ein Zuhörer für alles ----------
document.addEventListener('click', e => {
  const z = e.target.closest('[data-teil]');
  if (z) { waehle(z.dataset.teil); return; }
  const m = e.target.closest('[data-menge]');
  if (m) {
    const t = teil(gewaehlt);
    menge = rund2(Math.min(restKg(t), Math.max(t.schritt, menge + Number(m.dataset.menge) * t.schritt)));
    zeichneDetail();
    return;
  }
  if (e.target.closest('[data-reservieren]')) {
    const t = teil(gewaehlt);
    legeInKorb({ art: 'frisch', id: t.id, kg: menge, preisKg: preisKg(t) }, `${t.name}, ca. ${kg(menge)} reserviert – Abholung ${tagDatum(ABHOLUNG)}`);
    if (HANDY.matches) blatt('detail', false);
    return;
  }
  if (e.target.closest('[data-vormerken]')) { melde(`Vorgemerkt für Nr. ${SCHWEIN.nr + 1} – im echten Shop per Mail`); return; }
  if (e.target.closest('[data-detail-zu]')) { if (HANDY.matches) blatt('detail', false); else { gewaehlt = null; zeichneSchwein(); } return; }
  if (e.target.closest('#schleier')) { blatt('detail', false); blatt('korb', false); return; }
  if (e.target.closest('#tab-teile')) { modus('teile'); return; }
  if (e.target.closest('#tab-anteil')) { modus('anteil'); return; }
  const an = e.target.closest('[data-anteil]');
  if (an) {
    const a = ANTEILE.find(x => x.id === an.dataset.anteil);
    legeInKorb({ art: 'anteil', id: a.id, kg: a.ca, preisKg: a.preisKg }, `${a.name} reserviert – Abholung ${tagDatum(ABHOLUNG)}`);
    return;
  }
  const pk = e.target.closest('[data-paket]');
  if (pk) {
    const a = PAKETE.find(x => x.id === pk.dataset.paket);
    legeInKorb({ art: 'paket', id: a.id, preis: a.preis }, `${a.name} im Korb – Versand ${tagDatum(VERSANDTAG)}`);
    return;
  }
  const box = e.target.closest('[data-artikel]');
  if (box) {
    const id = box.dataset.artikel;
    const a = DAUERWARE.find(x => x.id === id);
    const w = dauerWahl[id];
    const v = e.target.closest('[data-variante]');
    if (v) { w.variante = v.dataset.variante; produktAktualisieren(id); return; }
    const dm = e.target.closest('[data-dmenge]');
    if (dm) { w.i = Math.max(0, Math.min(a.gewichte.length - 1, w.i + Number(dm.dataset.dmenge))); produktAktualisieren(id); return; }
    if (e.target.closest('[data-dauer]')) {
      const weg = hatAbholung() && dauerMitnehmen ? `wird mit abgeholt, ${tagDatum(ABHOLUNG)}` : `Versand ${tagDatum(VERSANDTAG)}`;
      legeInKorb({ art: 'dauer', id, variante: w.variante, kg: a.gewichte[w.i], preisKg: a.preise[w.variante] }, `${a.name} im Korb – ${weg}`);
      return;
    }
  }
  if (e.target.closest('#korb-knopf') || e.target.closest('[data-korb-auf]')) { blatt('detail', false); zeigeKorb(); blatt('korb', true); return; }
  if (e.target.closest('[data-korb-zu]')) { blatt('korb', false); return; }
  const weg = e.target.closest('[data-entfernen]');
  if (weg) { korb.splice(Number(weg.dataset.entfernen), 1); korbGeaendert(); zeigeKorb(); return; }
  const mit = e.target.closest('[data-mitnehmen]');
  if (mit) { dauerMitnehmen = mit.dataset.mitnehmen === 'ja'; speichern(); zeigeKorb(); korbLeiste(); return; }
  if (e.target.closest('[data-zur-kasse]')) { zeigeKasse(); kasseUmschalten($('#kasse')); $('#korb').scrollTop = 0; return; }
  if (e.target.closest('[data-zum-korb]')) { zeigeKorb(); return; }
  if (e.target.closest('[data-neu]')) { korb = []; dauerMitnehmen = false; korbGeaendert(); blatt('korb', false); return; }
});
document.addEventListener('change', e => { const f = e.target.closest('#kasse'); if (f) kasseUmschalten(f); });
document.addEventListener('submit', e => {
  if (e.target.id !== 'kasse') return;
  e.preventDefault();
  const fehler = kassePruefen(e.target);
  if (fehler) { e.target.querySelector('.fehler').textContent = fehler; return; }
  zeigeFertig(e.target);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { blatt('detail', false); blatt('korb', false); } });
HANDY.addEventListener('change', () => blatt('detail', false));

// Menüpunkt des Abschnitts markieren, in dem man gerade ist
function beobachteAbschnitte() {
  const links = [...document.querySelectorAll('[data-nav]')];
  const io = new IntersectionObserver(eintraege => {
    eintraege.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['schwein', 'versand', 'wo-wann', 'hof'].forEach(id => io.observe(document.getElementById(id)));
}

// ---------- Start ----------
function zeichneRest() {
  $('#fuss-adresse').innerHTML = `${HOF.inhaber} · ${HOF.strasse}, ${HOF.ort}<br>
    <a href="tel:${HOF.telefonLink}">${HOF.telefon}</a> · <a href="mailto:${HOF.mail}">${HOF.mail}</a> ·
    <a href="${HOF.facebook}" rel="noopener">Neuigkeiten auf Facebook</a>`;
  $('#restaurants').innerHTML = `<h3>Hier kocht man mit unserem Fleisch</h3><p>${RESTAURANTS.join(' · ')}</p><p class="offen" data-offen="restaurants"></p>`;
}
function zeichneZeiten() { zeichneHeute(); zeichneOrte(); zeichneOffen($('#orte')); }

zeichneZeiten();
zeichneAblauf();
zeichneSchwein();
zeichneAnteile();
zeichneVersandregel();
zeichnePakete();
zeichneProdukte();
zeichneRest();
zeichneOffen();
modus('teile');
korbGeaendert();
beobachteAbschnitte();
// Die Heute-Anzeige jede Minute neu rechnen – wer die Seite offen lässt, soll nicht „geöffnet“ lesen, wenn längst zu ist
setInterval(() => { JETZT = jetztInDeutschland(); HEUTE = nurTag(JETZT); zeichneZeiten(); }, 60000);
