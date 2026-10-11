#!/usr/bin/env node
// Schweinebild austauschen – ohne die Seite umzubauen.
//
// Aufruf (aus dem Ordner schwein/):
//     node werkzeug/schwein-zonen.mjs NEUES-BILD.png [--kopf-rechts]
//
// Braucht Node und das Paket „sharp“ (z. B. in einem Ordner mit `npm i sharp`,
// dann mit NODE_PATH=<ordner>/node_modules aufrufen).
//
// NEUES-BILD.png muss freigestellt sein (durchsichtiger Hintergrund), Schwein in
// strenger Seitenansicht. Die Seite erwartet den Kopf LINKS – zeigt er nach rechts,
// --kopf-rechts anhängen, dann wird gespiegelt.
//
// Das Skript schreibt nach bilder/:
//     schwein.webp              das Bild (1400 px breit, auf das Tier zugeschnitten)
//     schwein-bild.js           Bildgröße + Klickzonen je Teilstück als  window.SCHWEIN_BILD = {...}
//     schwein-zonen-kontrolle.jpg   alle Zonen farbig über dem Tier (nur zum Ansehen, nicht ausliefern)
//
// Wie die Zonen entstehen: Jeder Bildpunkt des Tiers wird nach festen Regeln einem
// Teilstück zugeordnet (Funktion zone() unten). Die Regeln sind für ein Referenzschwein
// geschrieben (Rahmen REF) und werden auf den Rahmen des neuen Tiers umgerechnet –
// ein anderes Foto in gleicher Haltung passt also ohne Handarbeit. Sitzt eine Grenze
// schief, die Zahlen in zone() anpassen und das Skript noch einmal laufen lassen.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// require statt import, damit NODE_PATH wirkt (sharp muss nicht neben dem Skript liegen)
const sharp = createRequire(import.meta.url)('sharp');

const REF = [0, 28, 1385, 763];   // Rahmen (x0, y0, x1, y1) des Referenzschweins
const BREITE = 1400;
const TEILE = ['kopf', 'nacken', 'schulter', 'ruecken', 'filet', 'bauch', 'schinken', 'haxe-vorne', 'haxe-hinten'];

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!args.length) { console.log('Aufruf: node werkzeug/schwein-zonen.mjs NEUES-BILD.png [--kopf-rechts]'); process.exit(1); }
const ziel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bilder');

// ---------- Bild vorbereiten: spiegeln, auf das Tier zuschneiden, Breite 1400 ----------
let bild = sharp(args[0]).ensureAlpha();
if (process.argv.includes('--kopf-rechts')) bild = bild.flop();
const roh = await bild.raw().toBuffer({ resolveWithObject: true });
const rahmen = rahmenVon(roh.data, roh.info.width, roh.info.height);
if (!rahmen) { console.error('Kein freigestelltes Tier gefunden (Alphakanal leer).'); process.exit(1); }
const rand = 20;
const aus = {
  left: Math.max(0, rahmen[0] - rand), top: Math.max(0, rahmen[1] - rand),
};
aus.width = Math.min(roh.info.width, rahmen[2] + rand) - aus.left;
aus.height = Math.min(roh.info.height, rahmen[3] + rand) - aus.top;
const fertig = await sharp(roh.data, { raw: roh.info }).extract(aus).resize({ width: BREITE }).png().toBuffer();
const px = await sharp(fertig).raw().toBuffer({ resolveWithObject: true });
const W = px.info.width, H = px.info.height;
const alpha = (x, y) => px.data[(y * W + x) * 4 + 3];
const neu = rahmenVon(px.data, W, H);

// Bildpunkt im neuen Bild -> Punkt im Rahmen des Referenzschweins
function aufReferenz(x, y) {
  return [
    REF[0] + (x - neu[0]) / (neu[2] - neu[0]) * (REF[2] - REF[0]),
    REF[1] + (y - neu[1]) / (neu[3] - neu[1]) * (REF[3] - REF[1]),
  ];
}

// ---------- Regeln: welcher Bildpunkt gehört zu welchem Teilstück ----------
// Alle Zahlen in Pixeln des Referenzschweins (Kopf links, Rücken oben).
// bogen() macht aus geraden Schnittlinien leicht geschwungene – sieht weniger nach Kästchen aus.
const bogen = t => Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
function zone(x, y) {
  if (x > 1300) return null;                                          // Schwanz: kein Teilstück
  if (x < 300 + (y - 110) * 0.07 + 18 * bogen((y - 110) / 460)) return 'kopf';
  const vorne = 562 + (y - 40) * 0.07 + 24 * bogen((y - 40) / 560);    // Schnitt hinter der Schulter
  const hinten = 1018 - (y - 30) * 0.05 - 40 * bogen((y - 30) / 600);   // Schnitt vor dem Schinken
  if (x < vorne) {
    if (y > 572 + (x - 430) * 0.04) return 'haxe-vorne';
    return y < 250 + (x - 300) * 0.04 - 14 * bogen((x - 300) / 270) ? 'nacken' : 'schulter';
  }
  if (x > hinten) return y > 612 ? 'haxe-hinten' : 'schinken';
  const t = (x - vorne) / (hinten - vorne);
  const kotelett = 250 + 14 * bogen(t);                               // Unterkante Kotelett
  if (y < kotelett) return 'ruecken';
  // Filet: liegt unter dem hinteren Kotelett, vorne spitz, hinten am dicksten (Filetkopf)
  const u = (x - 700) / (hinten - 700);
  if (u > 0 && y < kotelett + 78 * Math.pow(Math.sin(Math.min(1, u) * Math.PI / 2), 0.9)) return 'filet';
  return 'bauch';
}

// ---------- Zonen ausrechnen ----------
const gitter = new Int8Array(W * H).fill(-1);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (alpha(x, y) <= 110) continue;
    const z = zone(...aufReferenz(x, y));
    if (z) gitter[y * W + x] = TEILE.indexOf(z);
  }
}

const zonen = {}, pins = {};
for (let i = 0; i < TEILE.length; i++) {
  const zellen = groessteFlaeche(i);
  const pfad = umriss(zellen);
  zonen[TEILE[i]] = vereinfache(pfad).map(([x, y]) => `${x},${y}`).join(' ');
  let sx = 0, sy = 0;
  for (const z of zellen) { sx += z % W; sy += Math.floor(z / W); }
  pins[TEILE[i]] = [Math.round(sx / zellen.length), Math.round(sy / zellen.length)];
}

const daten = { datei: 'bilder/schwein.webp', breite: W, hoehe: H, zonen, pins };
await sharp(fertig).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(path.join(ziel, 'schwein.webp'));
fs.writeFileSync(path.join(ziel, 'schwein-bild.js'),
  '// Erzeugt von werkzeug/schwein-zonen.mjs – Bild + Klickzonen, austauschbar\n'
  + 'window.SCHWEIN_BILD = ' + JSON.stringify(daten) + ';\n');

// Kontrollbild
const farben = ['#e06c4f', '#e0a84f', '#c9d14f', '#6fd14f', '#4fd1b5', '#4f9ed1', '#6a4fd1', '#c44fd1', '#d14f86'];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${TEILE.map((t, i) =>
  `<polygon points="${zonen[t]}" fill="${farben[i]}" fill-opacity=".45" stroke="#fff" stroke-width="2"/>
   <text x="${pins[t][0]}" y="${pins[t][1]}" font-size="26" fill="#fff" font-family="sans-serif" text-anchor="middle">${t}</text>`).join('')}</svg>`;
await sharp(fertig).flatten({ background: '#555' }).composite([{ input: Buffer.from(svg) }])
  .jpeg({ quality: 82 }).toFile(path.join(ziel, 'schwein-zonen-kontrolle.jpg'));
console.log(`fertig: ${W}×${H}, ${TEILE.length} Zonen -> ${path.normalize(ziel)}`);

// ---------- Hilfen ----------
// Rahmen um alle (fast) undurchsichtigen Bildpunkte
function rahmenVon(daten, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (daten[(y * w + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}
// Größte zusammenhängende Fläche eines Teilstücks (kleine Splitter am Rand fallen weg)
function groessteFlaeche(nr) {
  const gesehen = new Uint8Array(W * H);
  let beste = [];
  for (let s = 0; s < W * H; s++) {
    if (gitter[s] !== nr || gesehen[s]) continue;
    const flaeche = [s], stapel = [s]; gesehen[s] = 1;
    while (stapel.length) {
      const c = stapel.pop(), x = c % W;
      for (const n of [x + 1 < W ? c + 1 : -1, x > 0 ? c - 1 : -1, c + W < W * H ? c + W : -1, c - W]) {
        if (n >= 0 && !gesehen[n] && gitter[n] === nr) { gesehen[n] = 1; flaeche.push(n); stapel.push(n); }
      }
    }
    if (flaeche.length > beste.length) beste = flaeche;
  }
  return beste;
}
// Umriss einer Fläche ablaufen (Moore-Nachbarschaft), Start oben links
function umriss(zellen) {
  const menge = new Uint8Array(W * H);
  let start = Infinity;
  for (const z of zellen) { menge[z] = 1; if (z < start) start = z; }
  const drin = (x, y) => x >= 0 && y >= 0 && x < W && y < H && menge[y * W + x] === 1;
  const richtung = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const s = [start % W, Math.floor(start / W)];
  const pfad = [s];
  let cur = s, d = 6;
  for (let schritt = 0; schritt < 400000; schritt++) {
    let weiter = null;
    for (let i = 0; i < 8; i++) {
      const k = (d + i) % 8, n = [cur[0] + richtung[k][0], cur[1] + richtung[k][1]];
      if (drin(...n)) { weiter = n; d = (k + 5) % 8; break; }
    }
    if (!weiter || (weiter[0] === s[0] && weiter[1] === s[1])) break;
    cur = weiter; pfad.push(cur);
  }
  return pfad;
}
// Linie vereinfachen (Ramer-Douglas-Peucker), geschlossen: an zwei Punkten teilen
function vereinfache(p) {
  let f = 0, dmax = -1;
  for (let i = 0; i < p.length; i++) {
    const d = (p[i][0] - p[0][0]) ** 2 + (p[i][1] - p[0][1]) ** 2;
    if (d > dmax) { dmax = d; f = i; }
  }
  return [...rdp(p.slice(0, f + 1), 1.5).slice(0, -1), ...rdp([...p.slice(f), p[0]], 1.5).slice(0, -1)];
}
function rdp(p, eps) {
  if (p.length < 3) return p;
  const a = p[0], b = p[p.length - 1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let dm = 0, im = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs((b[1] - a[1]) * p[i][0] - (b[0] - a[0]) * p[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > dm) { dm = d; im = i; }
  }
  return dm > eps ? [...rdp(p.slice(0, im + 1), eps).slice(0, -1), ...rdp(p.slice(im), eps)] : [a, b];
}
