#!/usr/bin/env node
// Nur für den Platzhalter (Stich/Foto von 1911): macht aus der alten, nebligen Vorlage
// ein Bild, das auf der dunklen Bühne wie ein Studiofoto wirkt.
//   1. Druckraster glätten (Median), Schwarz satter (Kontrast)
//   2. klare Kante statt Nebel: Alphakanal weich → Schwelle → minimal geglättet
//   3. warmes Randlicht oben an der Kontur, wie ein Spot von hinten-oben
//
// Aufruf (aus dem Ordner schwein/):
//     NODE_PATH=<ordner-mit-sharp>/node_modules node werkzeug/platzhalter-aufbereiten.mjs ../v2/bilder/schwein.png /tmp/schwein-aufbereitet.png
// danach:
//     node werkzeug/schwein-zonen.mjs /tmp/schwein-aufbereitet.png
//
// Für ein echtes, gutes Foto vom Hof braucht es diesen Schritt NICHT – dann direkt schwein-zonen.mjs.

import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');

const [quelle, ziel] = process.argv.slice(2);
if (!quelle || !ziel) { console.log('Aufruf: node werkzeug/platzhalter-aufbereiten.mjs QUELLE.png ZIEL.png'); process.exit(1); }

const { data: rgba, info } = await sharp(quelle).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const einKanal = buf => sharp(buf, { raw: { width: W, height: H, channels: 1 } });

// Alphakanal herauslösen
const alpha = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) alpha[i] = rgba[i * C + 3];

// 2. klare Kante
const kante = await einKanal(alpha).blur(1.5).threshold(120).blur(0.8).extractChannel(0).raw().toBuffer();

// 3. Randlicht: schmaler Saum innen an der Kante, oben kräftig, ab der Bauchmitte aus
const weich = await einKanal(kante).blur(9).extractChannel(0).raw().toBuffer();
const saum = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) {
  const y = Math.floor(i / W) / H;
  const oben = Math.max(0, Math.min(1, (0.62 - y) / 0.45));
  saum[i] = Math.max(0, Math.min(255, (kante[i] - weich[i]) * 2.4 * oben * 0.8));
}
const saumMaske = await einKanal(saum).blur(1.5).extractChannel(0).png().toBuffer();
const licht = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 226, b: 192 } } })
  .joinChannel(saumMaske).png().toBuffer();

// 1. Grauwerte: Raster glätten, Kontrast etwas hoch
const grau = await sharp(quelle).removeAlpha().greyscale().median(5).linear(1.15, -10).extractChannel(0).raw().toBuffer();
const rgb = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = grau[i];

const tier = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
  .joinChannel(kante, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
await sharp(tier).composite([{ input: licht, blend: 'atop' }]).png().toFile(ziel);
console.log('fertig:', ziel);
