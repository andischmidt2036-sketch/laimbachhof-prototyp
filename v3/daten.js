// Laimbachhof v3 – alle Hof-Daten an EINER Stelle.
// Wer Zeiten, Stellplätze, Preise oder das aktuelle Schwein ändern will, ändert nur diese Datei;
// app.js rechnet daraus alles Weitere (Heute-Anzeige, Abholtermine, Versandtag, Korb).
//
// Herkunft: Zeiten, Orte, Dauerware, Geschenkpakete, Hofgeschichte = leimbachhof.de und das
// Faltblatt schwarzerle.pdf (abgerufen am 10.10.2026). Alles zum aktuellen Schwein = BEISPIEL.
// Was nur der Hof weiß, steht in OFFEN (unten) und erscheint auf der Seite als „Platzhalter“.

'use strict';

const HOF = {
  name: 'Laimbachhof',
  inhaber: 'Johannes Buchner',
  strasse: 'Oberlaimbach 14',
  ort: '91443 Scheinfeld',
  telefon: '09162 230000',
  telefonLink: '+499162230000',
  mail: 'info@laimbachhof.de',
  facebook: 'https://www.facebook.com/pages/Laimbachhof/263250313705911',
};

// ---------- Wo & wann ----------
// tag: wie JavaScript zählt – 0 = Sonntag, 1 = Montag … 5 = Freitag, 6 = Samstag.
// bereich: in welche Zeile der „Heute“-Übersicht der Termin gehört.
// von/bis: Uhrzeit als Text „HH:MM“. Ohne Uhrzeit (null) zeigt die Seite „Uhrzeit offen“.
const WOCHENPLAN = [
  { bereich: 'hofladen', tag: 5, von: '09:00', bis: '18:00',
    ort: 'Hofladen', platz: 'Oberlaimbach 14', plz: '91443 Scheinfeld' },

  // Verkaufswagen Nürnberg Süd – feste Stellplätze, jede Woche (Tabelle auf leimbachhof.de)
  { bereich: 'nuernberg', tag: 4, von: '11:00', bis: '11:15',
    ort: 'Kleinschwarzenlohe', platz: 'Rieterstraße 97', zusatz: 'Rangau Apotheke', plz: '90530 Wendelstein' },
  { bereich: 'nuernberg', tag: 4, von: '14:00', bis: '14:30',
    ort: 'Wendelstein', platz: 'Am alten Bahnhof 13–17', zusatz: 'Seniorenwohnheim', plz: '90530 Wendelstein' },
  { bereich: 'nuernberg', tag: 5, von: '09:35', bis: '09:45',
    ort: 'Gartenstadt', platz: 'Karl-Rorich-Straße 12', plz: '90469 Nürnberg' },
  { bereich: 'nuernberg', tag: 5, von: '09:50', bis: '10:10',
    ort: 'Gartenstadt', platz: 'Pachelbelstraße 118', plz: '90469 Nürnberg' },
  { bereich: 'nuernberg', tag: 5, von: '10:15', bis: '10:35',
    ort: 'Gartenstadt', platz: 'Johann-Krieger-Straße 17', plz: '90469 Nürnberg' },
  { bereich: 'nuernberg', tag: 5, von: '10:40', bis: '11:00',
    ort: 'Gartenstadt', platz: 'Worzeldorfer Straße 52', plz: '90469 Nürnberg' },
  { bereich: 'nuernberg', tag: 5, von: '11:05', bis: '11:30',
    ort: 'Gartenstadt', platz: 'Leerstetter Straße 4', zusatz: 'Kirche St. Rupert', plz: '90469 Nürnberg' },
  { bereich: 'nuernberg', tag: 5, von: '11:45', bis: '12:00',
    ort: 'Langwasser', platz: 'Watzmannstraße 20/22', zusatz: 'großer Parkplatz', plz: '90471 Nürnberg' },

  // Scheinfeld: „alle 14 Tage am Samstag (ungerade KW) direkt vor die Haustüre“ – ohne Uhrzeit
  { bereich: 'scheinfeld', tag: 6, nurKW: 'ungerade', von: null, bis: null,
    ort: 'Scheinfeld und Umgebung', platz: 'an die Haustür', plz: '' },
];

// Die drei Zeilen der Heute-Übersicht, in dieser Reihenfolge
const BEREICHE = [
  { id: 'hofladen', name: 'Hofladen', unter: 'Oberlaimbach' },
  { id: 'nuernberg', name: 'Verkaufswagen', unter: 'Nürnberg Süd' },
  { id: 'scheinfeld', name: 'Verkaufswagen', unter: 'Scheinfeld' },
];

// Tage, an denen abweichend nichts stattfindet (Feiertage, Urlaub). Format 'JJJJ-MM-TT'.
// Leer, weil wir sie nicht kennen – siehe OFFEN. Beispiel: { datum: '2026-12-25', grund: 'Weihnachten' }
const AUSNAHMEN = [];

// Was es im Hofladen außer dem Schwarzerle gibt (leimbachhof.de, Startseite)
const HOFLADEN_SORTIMENT = [
  'Angus-Weiderind', 'Fränkisches Lammfleisch', 'Bio-Hähnchen und Suppenhühner',
  'Fisch aus der Hagenmühle, Willanzheim',
];
// Weitere Verkaufsstellen (leimbachhof.de)
const AUCH_BEI = [
  { name: 'Metzgerei Albert', ort: '91330 Eggolsheim', was: 'Schwarzerle-Fleisch' },
  { name: 'Hofladen Obsthof Weiglein', ort: 'Rüderner Weg 4, 97353 Geesdorf-Wiesentheid', was: 'Wurstkonserven' },
];
// Restaurants, die das Fleisch anbieten (leimbachhof.de „Referenzen“, Stand der Seite unbekannt)
const RESTAURANTS = [
  'Zur Iphöfer Kammer, Iphofen', 'Kniebrecher, Castell', 'Michels Stern, Marktbreit', 'Kohlenmühle, Neustadt/Aisch',
];

// ---------- Das aktuelle Schwein (BEISPIEL) ----------
// Termine rechnet app.js relativ zu heute aus, damit der Prototyp nie veraltet.
const SCHWEIN = {
  nr: 15,
  rasse: 'Cornwallschwein',
  geboren: 'November 2025',
  weide: 'Hangweide Oberlaimbach',
  schlachtInTagen: 16,   // frühestens in 16 Tagen, dann der nächste Dienstag (Metzgertag, Beispiel)
  abholungNachTagen: 3,  // Abholung am Freitag nach der Schlachtung
};

// Teilstücke. id = gleiche id wie die Zone im Schweinebild (bilder/schwein-bild.js).
// basis = €/kg, gesamt/vergeben = kg an diesem Schwein, schritt = kleinste Bestellmenge.
const TEILE = [
  { id: 'kopf', name: 'Kopf & Backe', basis: 9.5, schritt: 0.5, gesamt: 4, vergeben: 2,
    eignung: ['Schmoren', 'Sülze'], text: 'Die Backe zum Schmoren, der Rest wird Sülze und Presssack.' },
  { id: 'nacken', name: 'Nacken', basis: 17.5, schritt: 0.5, gesamt: 5, vergeben: 4,
    eignung: ['Grill', 'Braten'], text: 'Schön durchwachsen. Für Braten, Steaks und den Grill.' },
  { id: 'schulter', name: 'Schulter', basis: 15.9, schritt: 0.5, gesamt: 9, vergeben: 6,
    eignung: ['Schäufele', 'Ofen'], text: 'Das Stück fürs Schäufele. Mit Schwarte, ab in den Ofen.' },
  { id: 'haxe-vorne', name: 'Haxe vorne', basis: 9.9, schritt: 0.5, gesamt: 2.5, vergeben: 1.5,
    eignung: ['Kochen', 'Grill'], text: 'Die kleinere Haxe. Zum Kochen oder für den Grill.' },
  { id: 'ruecken', name: 'Kotelett', basis: 21.5, schritt: 0.5, gesamt: 9, vergeben: 8,
    eignung: ['Pfanne', 'Grill'], text: 'Mit Knochen als Kotelett oder ausgelöst als Lachs. Gibt es je Schwein nur wenig.' },
  { id: 'filet', name: 'Filet', basis: 34, schritt: 0.25, gesamt: 1.2, vergeben: 1.2,
    eignung: ['Kurzbraten'], text: 'Das zarteste Stück. Ein Schwein hat davon nur gut ein Kilo.' },
  { id: 'bauch', name: 'Bauch', basis: 13.9, schritt: 0.5, gesamt: 10, vergeben: 5.5,
    eignung: ['Krustenbraten', 'Grill'], text: 'Mit Schwarte als Krustenbraten oder in Scheiben für den Grill.' },
  { id: 'wurst', name: 'Hack & Wurstfleisch', basis: 12.5, schritt: 0.5, gesamt: 12, vergeben: 7,
    eignung: ['Hack', 'Bratwurst'], text: 'Brust und Abschnitte, grob oder fein gewolft.' },
  { id: 'schinken', name: 'Schinken', basis: 16.9, schritt: 0.5, gesamt: 14, vergeben: 10,
    eignung: ['Schnitzel', 'Braten'], text: 'Oberschale, Nuss und Unterschale. Für Braten und Schnitzel.' },
  { id: 'haxe-hinten', name: 'Haxe hinten', basis: 10.9, schritt: 0.5, gesamt: 3.5, vergeben: 2.5,
    eignung: ['Ofen'], text: 'Die große Haxe, klassisch knusprig aus dem Ofen.' },
];

// Fertige Pakete vom Schwein: fester Querschnitt, ein Kilopreis (BEISPIEL)
const ANTEILE = [
  { id: 'achtel', name: 'Achtel', ca: 9, preisKg: 15.9, frei: 3,
    inhalt: 'Schinken, Schulter, Bauch, Kotelett, Nacken, Hack, frische Bratwurst, Haxe' },
  { id: 'viertel', name: 'Viertel', ca: 18, preisKg: 15.5, frei: 1,
    inhalt: 'wie das Achtel, doppelte Menge, dazu ein Stück Filet' },
];

// ---------- Versandshop (echte Preise, leimbachhof.de „Onlineshop“) ----------
const VERSAND = {
  tag: 1,            // Montag
  freiAb: 50,        // € Dauerware
  kosten: 10,        // € je Paket darunter
};
const GEWICHTE = [0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3];   // „0,1 kg bis 3 kg pro Portion“
const PAARE = [0.2, 0.4, 0.6, 1, 1.4, 2, 3];                 // Bratwurst: ein Paar ≈ 0,2 kg
const DAUERWARE = [
  { id: 'd-schinken', name: 'Geräucherter Schinken', bild: 'schinken.jpg', preise: { 'am Stück': 34, 'geschnitten': 39 },
    gewichte: GEWICHTE, start: 0.5,
    zutaten: 'Schweinefleisch aus der Keule, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-bauch', name: 'Geräucherter Bauch', bild: 'bauch.jpg', preise: { 'am Stück': 29, 'geschnitten': 34 },
    gewichte: GEWICHTE, start: 0.5,
    zutaten: 'Schweinefleisch vom Bauch, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-speck', name: 'Geräucherter Rückenspeck', bild: 'speck.jpg', preise: { 'am Stück': 24, 'geschnitten': 29 },
    gewichte: GEWICHTE, start: 0.3,
    zutaten: 'Schweinespeck, Steinsalz, Zucker, Gewürze, Buchenrauch.' },
  { id: 'd-bratwurst', name: 'Geräucherte Bratwurst', bild: 'bratwurst.jpg', preise: { 'am Stück': 27 },
    gewichte: PAARE, start: 0.4, paare: true,
    zutaten: 'Schweinefleisch, Steinsalz, Zucker, Gewürze, Buchenrauch. Ein Paar wiegt ca. 0,2 kg.' },
  { id: 'd-salami', name: 'Salami', bild: 'salami.jpg', preise: { 'am Stück': 33, 'geschnitten': 38 },
    gewichte: GEWICHTE, start: 0.3,
    zutaten: 'Vom Angus-Weiderind und Schwarzerle. Rindfleisch, Schweinefleisch, Schweinespeck, Nitritpökelsalz, Zucker, Gewürze, Buchenrauch. Allergen: Senfkörner. Konservierungsstoff: Natriumnitrit.' },
];
const PAKETE = [
  { id: 'p-klein', name: 'Geschenkpaket klein', bild: 'paket-klein.jpg', preis: 19.9,
    inhalt: 'Zwei Rohwürste vom Schwarzerle (zusammen ca. 150 g), Nudeln (250 g), Feingebäck (ca. 80 g).' },
  { id: 'p-gross', name: 'Geschenkpaket groß', bild: 'paket-gross.jpg', preis: 39.9,
    inhalt: 'Zwei Rohwürste vom Schwarzerle (zusammen ca. 250 g), Vesper-Gemüse aus der Region (170 g), Tafelmeerrettich von Marga’s Kren (200 g), Feingebäck (ca. 80 g), Nudeln (250 g), Grischperli Kartoffelchips (120 g).' },
];

// ---------- Offene Punkte: nur der Hof kann sie beantworten ----------
// Jeder Schlüssel taucht auf der Seite als gestrichelter „Platzhalter“-Hinweis auf.
const OFFEN = {
  wagenTage: 'Verkaufswagen Nürnberg Süd: Auf leimbachhof.de steht „Dienstag bis Freitag an die Haustür“, die Stellplatz-Tabelle nennt nur Donnerstag und Freitag. Was gilt?',
  scheinfeldZeit: 'Scheinfeld: Uhrzeit und Route der Samstagstour, und wie meldet man sich an?',
  ausnahmen: 'Feiertage und Urlaub fehlen noch – die Heute-Anzeige kennt keine Ausnahmen.',
  sortiment: 'Weitere Waren im Hofladen (Brot, Eier, Honig, Käse, Mehl, Nudeln …) stammen aus einer Produktliste von 2016. Noch aktuell?',
  rasse: 'Reinrassige Cornwallschweine oder eine Kreuzung (z. B. mit Duroc)? Das Faltblatt sagt „als Grundlage die alte Rasse Deutsches Cornwallschwein“.',
  schlachtung: 'Fester Schlachttermin – oder erst, wenn das Schwein ganz vergeben ist? Und was passiert mit Teilen, die bis dahin niemand reserviert hat?',
  zahlungAbholung: 'Bezahlung bei Abholung: bar, EC-Karte oder beides?',
  bestellschluss: 'Bestellschluss für den Montagsversand?',
  geschenkRechnung: 'Bisher liegt die Rechnung im Paket. Bei Geschenken an eine andere Adresse besser per E-Mail an den Besteller?',
  wagenSortiment: 'Was ist am Verkaufswagen an Bord – nur Dauerware und Reserviertes oder auch Frischfleisch ohne Reservierung?',
  restaurants: 'Restaurant-Liste von leimbachhof.de: noch aktuell?',
};
