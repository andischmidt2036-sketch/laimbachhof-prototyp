// Prüfung der Schweinwahl-Seite: Handy (390×844, Touch) und Laptop (1440×900), mit WEBKIT=1 zusätzlich
// WebKit im iPhone-Format. Klickpfad Stück → Menge → Paket → Reservieren, Wechsel zwischen Stücken,
// kein horizontaler Überlauf, 0 JS-Fehler, 0 fehlgeschlagene Anfragen. Legt Screenshots ab.
// Braucht das Paket „playwright“ (1.60) samt Browsern; nicht Teil der Seite.
// Aufruf: NODE_PATH=<ordner>/node_modules node werkzeug/pruefe.mjs <URL> <Bilderordner> [kennung]
// Beispiel live: node werkzeug/pruefe.mjs https://andischmidt2036-sketch.github.io/laimbachhof-prototyp/schwein/ /tmp/bilder live
import { createRequire } from 'node:module';
// require statt import, damit NODE_PATH wirkt
const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const [url, ordner, kennung = 'lokal'] = process.argv.slice(2);
const browser = await chromium.launch();
const mitWebkit = process.env.WEBKIT === '1';
const wkBrowser = mitWebkit ? await webkit.launch() : null;
let fehlerGesamt = 0;
const ergebnis = [];

async function lauf(name, opts, tippen, b = browser) {
  const ctx = await b.newContext({ ...opts, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  page.on('requestfailed', r => fehler.push('requestfailed: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) fehler.push(`HTTP ${r.status()}: ${r.url()}`); });
  // Jeder Abbruch eines Schritts zählt als Fehler, die bis dahin gesammelten Befunde bleiben sichtbar
  let titel = '', menge = '', leiste = '', posten2 = 0, fortschrittMit = '', ende = '', vergeben = '';
  try {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const breite = async () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  // body hat overflow-x: hidden – das kann einen Überlauf verstecken (iOS lässt dann trotzdem seitlich wischen).
  // Darum zusätzlich: kein sichtbares Element darf rechts oder links aus dem Fenster ragen.
  const ueberstand = () => page.evaluate(() => {
    const iw = window.innerWidth, raus = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg') && el.tagName !== 'svg') continue;
      if (el.closest('.meldung, #blatt:not(.offen), [hidden]')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > iw + 1 || r.left < -1)) raus.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(r.left)}–${Math.round(r.right)}`);
    }
    return raus.slice(0, 5);
  });
  const pruefeBreite = async schritt => {
    const b = await breite(); if (b.sw > b.iw) fehler.push(`horizontaler Scroll bei ${schritt}: ${b.sw} > ${b.iw}`);
    // Handy: ist der Inhalt zu breit, zieht der Browser das Layout breiter als den Bildschirm (rauszoomen) –
    // dann stimmt innerWidth nicht mehr mit der Gerätebreite überein
    if (b.iw !== opts.viewport.width) fehler.push(`Layout ${b.iw} px breit statt ${opts.viewport.width} px bei ${schritt} (Seite zu breit, Browser zoomt raus)`);
    const raus = await ueberstand(); if (raus.length) fehler.push(`ragt aus dem Fenster bei ${schritt}: ${raus.join(', ')}`);
  };
  await pruefeBreite('Start');
  vergeben = await page.textContent('#fortschritt-text');
  await page.screenshot({ path: `${ordner}/${kennung}-${name}-1-start.png` });

  // 0) Erst Schulter über ihren Punkt öffnen – danach muss ein Tipp aufs Tier direkt wechseln
  const sp = page.locator('.pin[data-teil="schulter"]');
  if (tippen) await sp.tap(); else await sp.click();
  await page.waitForSelector('#blatt.offen');
  await page.waitForTimeout(600);
  const erst = (await page.textContent('#blatt-titel')).trim();
  if (erst !== 'Schulter') fehler.push('Punkt Schulter öffnet: ' + erst);

  // 1) Stück am Tier antippen: Kotelett (Fläche neben dem Punkt)
  const pin = page.locator('.pin[data-teil="ruecken"]');
  const box = await pin.boundingBox();
  // Neben den Punkt tippen (auf die Fläche), damit wirklich die Zone getroffen wird
  const x = box.x + box.width / 2 - 34, y = box.y + box.height / 2 + 2;
  if (tippen) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
  await page.waitForSelector('#blatt.offen');
  await page.waitForTimeout(700);
  titel = await page.textContent('#blatt-titel');
  if (titel.trim() !== 'Kotelett') fehler.push('Detail zeigt falsches Stück: ' + titel);
  const leuchtet = await page.evaluate(() => document.querySelector('#leinwand').classList.contains('hat-wahl') && document.querySelector('.zone.aktiv')?.dataset.teil);
  if (leuchtet !== 'ruecken') fehler.push('Zone leuchtet nicht: ' + leuchtet);
  await pruefeBreite('Detail');
  // Menge: einmal plus (0,4 → 0,8 kg)
  const plus = page.locator('[data-menge="1"]');
  if (tippen) await plus.tap(); else await plus.click();
  await page.waitForTimeout(350);
  menge = await page.textContent('#menge-anzeige');
  await page.screenshot({ path: `${ordner}/${kennung}-${name}-2-stueck.png` });
  const ins = page.locator('[data-ins-paket]');
  if (tippen) await ins.tap(); else await ins.click();
  await page.waitForSelector('#paketleiste:not([hidden])');
  await page.waitForTimeout(900);
  leiste = await page.textContent('#paketleiste');
  await page.screenshot({ path: `${ordner}/${kennung}-${name}-2b-leiste.png` });

  // 2) Zweites Stück über die Liste (Zweitweg): Schinken
  const posten = page.locator('.posten[data-teil="schinken"]');
  if (tippen) await posten.tap(); else await posten.click();
  await page.waitForSelector('#blatt.offen');
  await page.waitForTimeout(500);
  const ins2 = page.locator('[data-ins-paket]');
  if (tippen) await ins2.tap(); else await ins2.click();
  await page.waitForTimeout(700);

  // 3) Paket ansehen
  const pl = page.locator('#paketleiste');
  if (tippen) await pl.tap(); else await pl.click();
  await page.waitForSelector('[data-reservieren]');
  await page.waitForTimeout(700);
  await pruefeBreite('Paket');
  posten2 = await page.locator('.paket-liste li').count();
  await page.screenshot({ path: `${ordner}/${kennung}-${name}-3-paket.png` });
  fortschrittMit = await page.textContent('#fortschritt-text');

  // 4) Reservieren → Demo-Ende
  const res = page.locator('[data-reservieren]');
  if (tippen) await res.tap(); else await res.click();
  await page.waitForSelector('.demo-hinweis');
  await page.waitForTimeout(900);
  ende = await page.textContent('.demo-hinweis');
  if (ende.trim() !== 'Demo – keine echte Bestellung') fehler.push('Endtext falsch: ' + ende);
  await page.screenshot({ path: `${ordner}/${kennung}-${name}-4-reserviert.png` });
  await pruefeBreite('Ende');

  } catch (e) {
    fehler.push('Abbruch: ' + e.message.split('\n')[0]);
  }
  // Tippziele der Punkte am Handy (≥ 44 px)
  const pins = await page.$$eval('.pin', ps => ps.map(p => Math.round(p.getBoundingClientRect().width)));
  ergebnis.push({ name, vergeben, titel: (titel || '').trim(), menge: (menge || '').trim(), leiste: (leiste || '').replace(/\s+/g, ' ').trim(),
    paketPosten: posten2, fortschrittMit, ende: (ende || '').trim(), pinBreiten: [...new Set(pins)], fehler });
  fehlerGesamt += fehler.length;
  await ctx.close();
}

await lauf('handy', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }, true);
await lauf('laptop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, false);
if (mitWebkit) {
  await lauf('webkit-iphone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, true, wkBrowser);
  await wkBrowser.close();
}
await browser.close();
console.log(JSON.stringify(ergebnis, null, 1));
console.log(fehlerGesamt === 0 ? 'ERGEBNIS: gruen (0 Fehler)' : `ERGEBNIS: ROT (${fehlerGesamt} Fehler)`);
process.exit(fehlerGesamt ? 1 : 0);
