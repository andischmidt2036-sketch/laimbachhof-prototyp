# Laimbachhof – Prototyp v3

Klick-Prototyp, Beispieldaten, nichts wird bestellt. Reines HTML/CSS/JS, keine Bibliotheken.

| Datei | Was drin ist |
|---|---|
| `daten.js` | **alle Hof-Daten**: Wochenplan (Hofladen, Stellplätze, Scheinfeld), Ausnahmen, Schwein, Teilstücke, Dauerware, Geschenkpakete, offene Fragen (`OFFEN`) |
| `app.js` | rechnet und zeichnet: Heute-Anzeige (Uhrzeit Berlin), Termine, Schweinewahl, Korb mit zwei Wegen (Abholen / Per Post), Kasse |
| `stil.css` | Gestaltung, Farben oben als Design-Tokens |
| `bilder/schwein-bild.js` | Schweinebild + Klickzonen (`window.SCHWEIN_BILD`) |

**Zeiten ändern:** nur `WOCHENPLAN` bzw. `AUSNAHMEN` in `daten.js`. Die Heute-Karte, die Markierung im
Fahrplan und die Abholtermine an der Kasse rechnen sich daraus.

**Schweinebild tauschen:** freigestelltes Foto (Seitenansicht) nach `python3 werkzeug/schwein-zonen.py NEU.png`
(aus dem Ordner `v3/` aufrufen). Das Skript schreibt `bilder/schwein.webp` und `bilder/schwein-bild.js` im
selben Format wie v2 – die Seite selbst ändert sich nicht. Ein `schwein-bild.js` aus v2 oder von der
Einzelseite `/schwein/` passt ebenso, solange die Zonen dieselben zehn ids tragen
(`kopf, nacken, schulter, ruecken, filet, wurst, bauch, schinken, haxe-vorne, haxe-hinten`).

**Fotos:** liegen gemeinsam unter `../bilder/` (von leimbachhof.de).
