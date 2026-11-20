# Redaktionelle Prüfung des Fragenpools (Stand: November 2026)

Jede der **167** im GitHub-Fragenpool vorhandenen Fragen wurde einzeln erfasst (eine Zeile je Frage-ID). Dieser Bericht wird von `scripts/review/build-report.ts` aus `scripts/review/verdicts.txt` erzeugt und bricht ab, sobald eine Frage fehlt.

## Abschlussbericht

| | Anzahl |
|---|---|
| Geprüfte Fragen (GitHub-Pool) | **167** |
| unverändert korrekt | 151 |
| korrigiert | 9 |
| ungeklärt / teilweise nicht prüfbar | 7 |
| davon im Auslieferungsstand (zwei Standardpakete) | 77 |

### Bestände (wichtig)

- **GitHub-Fragenpool:** 167 Fragen (alle hier geprüft).
- **Online-Bibliothek des Admins:** zeigte 202 Fragen. Die Differenz von 35 Fragen liegt nicht im Repository (vermutlich selbst angelegte oder über Import/Admin ergänzte Fragen der Online-Datenbank). **Diese 35 Fragen konnten nicht geprüft werden** – kein Zugriff auf die Online-Datenbank. Bitte im Admin → Sicherung „Inhalte sichern“ exportieren und prüfen lassen.
- **Lokale Datenbank:** nicht zugänglich; für sie gilt dasselbe.
- Korrekturen betreffen den Auslieferungsstand und künftige Installationen. Bestehende Datenbanken werden **nicht** überschrieben (INSERT OR IGNORE); veröffentlichte Paketversionen bleiben unverändert. Zum Übernehmen in eine bestehende Datenbank die Frage im Admin bearbeiten und das Paket neu veröffentlichen.

### Dubletten und problematische Fragen

- Dubletten (gleicher Inhalt in mehreren Paketversionen, keine gelöscht): Käserennen (b42-geo-c04/b43-geo-c04), Moukoko-Debütanten (b42/b43/b44-rank-t05), Tierrekorde (b44-match-tier/s4-match-tierrekorde), Kaiserslautern (b42/b44-link-t11), Champions-League-Klubs (b42/b44-unique-p20), WM-Gastgeber (b42-unique-t13/v2-einzigartig-2), BVB-Ablösen (b42/b45-rank-c09), Oktopus-Herzen (ng-bluff-3/nm-duel-2), Proben s4/s5 (7 Paare).
- Korrigiert: Sancho-/Kagawa-Ablösen (falsche Reihenfolge), Mourinho-Hinweis (Lösung im Hinweis), Wiesn-Erklärtext, Verdrehter Filmtitel, WM-Rekordtext, zwei Texte.
- Offen: VW-Teilenummer in `b42-link-c22`; Tageswert Güther (3 vs. 4 Tage); die drei Tondateien (nicht abhörbar geprüft); Doppel-Profi-Liste `b42-unique-c27`.

### Prüfmethodik und Grenzen

- [W] = Websuche November 2026 mit Quelle, [N] = nachgerechnet, [A] = Abgleich mit gesichertem Fach-/Allgemeinwissen, [T] = Spiellogik/Technik (Szenen, Reihenfolgen, Mischungen, Medien) geprüft.
- Websuchen wurden für die zeitabhängigen und unsicheren Fakten durchgeführt (Stadionkoordinaten, CL-Finalorte 2026/2028, Bundesliga-Debütanten, Ablösen, Wiesn, Cheese Rolling, Guinness u. a.). Viele Standardfakten (Jahreszahlen, Hauptstädte, Rekorde) sind **[A]** – dort wurde nicht jede Zahl erneut in einer Primärquelle aufgerufen. Das ist keine „zwei unabhängige Quellen“-Prüfung.

## Prüfliste (eine Zeile je Frage)

| Fragen-ID | Modus | Kurzbezeichnung | Ergebnis | Festgestelltes Problem | Änderung | Prüfnachweis | im Paket |
|---|---|---|---|---|---|---|---|
| v2-heimspiel-1 | geo | Wo steht die Allianz Arena? | korrekt | – | – | [A] Allianz Arena, A9, Fröttmaning | nein |
| v2-heimspiel-2 | geo | Wo fand das Champions-League-Finale 2025 zwischen Paris Saint-Germain  | korrekt | – | – | [A] CL-Finale 31.5.2025 PSG–Inter 5:0 (höchster Finalsieg) | nein |
| v2-heimspiel-3 | geo | Wo liegt Bodø, die Heimat des norwegischen Klubs Bodø/Glimt? | korrekt | – | – | [A] Bodø 67,28/14,40, ca. 80 km nördlich des Polarkreises [N] | ja |
| v2-heimspiel-4 | geo | 1930 fand die allererste Fußball-Weltmeisterschaft statt. Wo stand das | korrekt | – | – | [A] Estadio Centenario, Finale 1930 Uruguay–Argentinien 4:2 | ja |
| v2-wer-war-zuerst-1 | rank | Was gibt es schon am längsten? – die älteste Marke zuerst | korrekt | – | – | [A] Coca-Cola 1886 · Nintendo 1889 · LEGO 1932 · PlayStation 1994 · Netflix 1997 | nein |
| v2-wer-war-zuerst-2 | rank | Was geschah zuerst? – das älteste Ereignis zuerst | korrekt | – | – | [A] 1869 · 1896 · 1903 · 1912 · 1961 | ja |
| v2-wer-war-zuerst-3 | rank | Wie hoch ist es? – das höchste Bauwerk zuerst | korrekt | – | – | [A] 828 · ca. 330 · 157 · 96 · 56 m | ja |
| v2-wahnsinnszahlen-1 | estimate | Wie viele Stufen führen im Kölner Dom auf die Aussichtsplattform des S | korrekt | – | – | [A] 533 Stufen, Plattform ca. 97 m | ja |
| v2-wahnsinnszahlen-2 | estimate | Wie viele Nieten halten den Eiffelturm zusammen? | korrekt | – | – | [W] 18.038 Eisenteile, 2,5 Mio. Nieten, davon 1.050.846 vor Ort (Structurae) | ja |
| v2-alles-im-blick-1 | glitch | Welcher Preis wurde verändert? Tippe darauf. | korrekt | – | – | [T] Szene menu1: Schnitzel 14,90 → 19,40 | nein |
| v2-alles-im-blick-2 | glitch | Welche Nachricht wurde verändert? Tippe darauf. | korrekt | – | – | [T] Szene chat1: Nordeingang → Südeingang | ja |
| v2-alles-im-blick-3 | glitch | Welche Angabe wurde verändert? Tippe darauf. | korrekt | – | – | [T] Szene ticket1: Reihe 12 → 21 | nein |
| v2-alles-im-blick-4 | glitch | Welcher Spieler hat sich bewegt? Tippe darauf. | korrekt | – | – | [T] Szene pitch1: ein Spieler um 80 Einheiten verschoben | ja |
| v2-passt-zusammen-1 | match | Was haben diese Unternehmen ursprünglich hergestellt oder verkauft? | korrekt | – | – | [A] Nintendo Hanafuda 1889, BMW Flugmotoren 1916, Nokia Papier 1865, Toyota Webstühle, Samsung 1938, LEGO Holz 1932 | nein |
| v2-passt-zusammen-2 | match | Wer hat’s erfunden? Erfinder aus Deutschland und ihre Erfindung | korrekt | – | – | [A] Gutenberg, Röntgen 1895, Melitta Bentz 1908, Drais 1817, Zuse Z3 1941, Diesel | nein |
| v2-passt-zusammen-3 | match | Wer hat’s gedreht? Regisseurinnen, Regisseure und ihre Filme | korrekt | – | – | [A] Spielberg–Jurassic Park, Nolan–Inception, Tarantino–Pulp Fiction, Cameron–Titanic, Jackson–Herr der Ringe, Gerwig–Barbie | nein |
| v2-orte-mit-geschichte-1 | geo | Wo steht Schloss Neuschwanstein, das Vorbild für das Märchenschloss vo | korrekt | – | – | [A] Neuschwanstein, Baubeginn 1869 | nein |
| v2-orte-mit-geschichte-2 | geo | Ein Dorf mit rund 2.000 Einwohnern, in dem einmal im Jahr bis zu 85.00 | korrekt | – | – | [A] Wacken 54,02/9,38, ca. 2.000 Einwohner, 85.000 Festivalgäste | ja |
| v2-orte-mit-geschichte-3 | geo | Hier wohnt – offiziell – der Weihnachtsmann: Wo liegt das Santa-Claus- | korrekt | – | – | [A] Santa Claus Village (66,54/25,85), am Polarkreis | nein |
| v2-orte-mit-geschichte-4 | geo | Timbuktu klingt wie ein Ort aus dem Märchen – aber es gibt ihn wirklic | korrekt | – | – | [A] Timbuktu 16,77/−3,01 | ja |
| v2-fussball-zeitreise-1 | rank | Gründungsjahr des Klubs – der älteste zuerst | korrekt | – | – | [A] 1878 · 1897 · 1899 · 1900 · 1902 | ja |
| v2-fussball-zeitreise-2 | rank | Was geschah zuerst? – Fußball-Geschichte, das älteste Ereignis zuerst | korrekt | – | – | [A] 1960 · 1963 · 1991 · 1992 · 2017 | ja |
| v2-fussball-zeitreise-3 | rank | Länderspiele für Deutschland – die meisten zuerst | korrekt | – | – | [A] Matthäus 150 · Klose 137 · Podolski 130 · Schweinsteiger 121 · Lahm 113 | nein |
| v2-wer-oder-was-1 | link | Welcher Ort wird gesucht? | korrekt | – | – | [A] Venedig: Holzpfähle, Canal Grande ca. 3,8 km, Karneval, Seufzerbrücke | nein |
| v2-wer-oder-was-2 | link | Welcher Alltagsgegenstand wird gesucht? | korrekt | – | – | [A] Post-it: Spencer Silver 1968, Art Fry, gelbes Notizpapier | ja |
| v2-wer-oder-was-3 | link | Welche Person wird gesucht? | korrekt | – | – | [A] Marie Curie: zwei Nobelpreise (1903 Physik, 1911 Chemie), Polonium, Notizbücher in Bleikisten | nein |
| v2-sport-und-pop-1 | estimate | Wie viele Tore fielen insgesamt bei der Fußball-WM 2014 in Brasilien ( | korrigiert | „damals WM-Rekord“ ungenau: 1998 gab es ebenfalls 171 Tore | Erklärtext: gleichauf mit dem Rekord von 1998 | [A] 171 Tore 2014, 172 Tore 2022 | ja |
| v2-sport-und-pop-2 | estimate | Wie viele Sekunden dauert „Bohemian Rhapsody“ von Queen in der Origina | korrekt | – | – | [A] Bohemian Rhapsody 5:55 = 355 s [N] | ja |
| v2-einzigartig-1 | unique | Nenne ein Land, durch das die Donau fließt. | korrekt | – | – | [A] Donau durch 10 Länder | ja |
| v2-einzigartig-2 | unique | Nenne ein Land, das schon einmal eine Fußball-Weltmeisterschaft ausger | korrekt | – | – | [A] 19 WM-Gastgeber (inkl. Kanada 2026); Dublette zu b42-unique-t13 | nein |
| v2-final-1 | geo | Der abgelegenste dauerhaft bewohnte Ort der Welt: Wo liegt die Insel T | korrekt | – | – | [A] Tristan da Cunha −37,11/−12,28; ca. 2.400 km bis St. Helena, über 2.700 km bis Kapstadt | nein |
| v2-final-2 | link | Welches Spiel wird gesucht? | korrekt | – | – | [A] Tetris 1984 Moskau, Paschitnow, Korobeiniki | nein |
| v2-final-3 | rank | Zu Gast bei Freunden – die Fußball-WM in … Das früheste Turnier zuerst | korrekt | – | – | [A] WM-Gastgeber 1958/1966/1978/1994/2010 | nein |
| v2-final-4 | estimate | Wie viele Kilometer beträgt die Luftlinie von Berlin nach Sydney? | korrekt | – | – | [N] Großkreisentfernung Berlin–Sydney ≈ 16.100 km | nein |
| s3-match-spitznamen | match | Welcher Verein trägt welchen Spitznamen? | korrekt | – | – | [A] Fohlen, Knappen, Geißböcke, Adler, Alte Dame, Kiezkicker | ja |
| s3-unique-orchester | unique | Nenne ein Instrument, das in einem klassischen Sinfonieorchester gespi | korrekt | – | – | [A] gängige Orchesterinstrumente inkl. Celesta, Englischhorn | nein |
| s3-link-pele | link | Welche Person wird gesucht? | korrekt | – | – | [A] 3 WM-Titel, 1958-Finale 5:2 mit 17 J. 249 T. | ja |
| s3-rank-tech | rank | Technik-Zeitreise – das früheste Ereignis zuerst | korrigiert | Erklärtext „drei der vier jüngeren Meilensteine…“ missverständlich | Erklärtext: „Facebook, YouTube und iPhone liegen nur drei Jahre auseinander“ | [A] Web 1991, Google 1998, Facebook 2004, YouTube 2005, iPhone 2007 | ja |
| s3-geo-helgoland | geo | Deutschlands einzige Hochseeinsel: Wo liegt Helgoland? | korrekt | – | – | [A] Helgoland ca. 46 km vor der Küste | nein |
| s3-geo-zugspitze | geo | Wo ragt Deutschlands höchster Berg auf, die Zugspitze? | korrekt | – | – | [A] 2.962 m, Wetterstein | nein |
| s3-geo-montsaintmichel | geo | Bei Flut wird dieses Kloster zur Insel: Wo liegt der Mont-Saint-Michel | korrekt | – | – | [A] Tidenhub bis ca. 14 m | nein |
| s3-geo-anfield | geo | Wo steht das Stadion Anfield, die Heimat des FC Liverpool? | korrekt | – | – | [A] Anfield 53,4308/−2,9608 | nein |
| s3-geo-maracana | geo | Wo liegt das legendäre Maracanã-Stadion? | korrekt | – | – | [A] Maracanã Rio; WM-Finale 1950 und 2014 | nein |
| s3-geo-ushuaia | geo | Sie nennt sich die südlichste Stadt der Welt: Wo liegt Ushuaia? | korrekt | – | – | [A] Ushuaia −54,80/−68,30 | nein |
| s3-rank-berge | rank | Wie hoch ist der Berg? – der höchste zuerst | korrekt | – | – | [A] 8.849 · 8.611 · 4.806 · 2.962 · 1.141 m, absteigend [T] | nein |
| s3-rank-olympia | rank | Olympische Sommerspiele – das früheste Jahr zuerst | korrekt | – | – | [A] 1936 · 1964 · 1972 · 1984 · 2000 | ja |
| s3-est-dombau | estimate | Wie viele Jahre liegen zwischen der Grundsteinlegung des Kölner Doms ( | korrekt | – | – | [N] 1880 − 1248 = 632; Bauunterbrechung ab 1473 [A] | nein |
| s3-est-isner | estimate | Wie viele Minuten dauerte das längste Tennismatch der Geschichte (Isne | korrekt | – | – | [A] 11 h 5 min = 665 min, 70:68 im 5. Satz, drei Tage [N] | ja |
| s3-est-saarland | estimate | Wie viele Fußballfelder (105 × 68 m) passen auf die Fläche des Saarlan | korrekt | – | – | [N] 2.570 km² / 7.140 m² ≈ 360.000 | ja |
| s3-glitch-abfahrt | glitch | Was hat sich geändert? Tippe darauf. | korrekt | – | – | [T] Szene timetable1: IC 2012 Gleis 7 → 12 stimmt mit Erklärtext | ja |
| s3-glitch-kassenzettel | glitch | Welcher Preis wurde verändert? (Die Summe unten stimmt nur mit dem ech | korrekt | – | – | [N] 2,49+2,19+3,29+1,15+2,99+1,29 = 13,40; [T] Butter 2,19 → 2,91 | nein |
| s3-glitch-marktwerte | glitch | Welcher Wert wurde gefälscht? Tippe darauf. | korrekt | – | – | [T] Szene market1: Kowalczyk 18,0 → 28,0; Reihenfolge bleibt plausibel | ja |
| s3-glitch-tabelle | glitch | Eine Punktzahl wurde gefälscht! Tipp: In jeder Zeile gilt Punkte = 3 × | korrekt | – | – | [N] Punkte = 3·S + U für alle 8 Zeilen nachgerechnet; Dynamo Süd 24 → 26 [T] | ja |
| s3-match-spiele | match | Welche Spielfigur gehört zu welchem Videospiel? | korrekt | – | – | [A] Master Chief–Halo, Kratos–God of War, Geralt–The Witcher, Link–Zelda, Samus–Metroid, Lara Croft–Tomb Raider | nein |
| s3-match-baender | match | Aus welchem Land kommt die Band? | korrekt | – | – | [A] Queen England, ABBA Schweden, Rammstein Deutschland, U2 Irland, AC/DC Australien, Metallica USA | nein |
| s3-link-mozart | link | Welche Person wird gesucht? | korrekt | – | – | [A] Maria Theresia 1762, †1791 mit 35, Mozartkugel seit 1890 | nein |
| s3-link-everest | link | Welcher Ort wird gesucht? | korrekt | – | – | [A] Sagarmatha/Chomolungma, Hillary & Norgay 1953, 8.849 m | nein |
| s3-link-oktoberfest | link | Welches Ereignis wird gesucht? | korrekt | – | – | [A] 1810 Hochzeit Ludwig/Therese, O’zapft is | nein |
| s3-unique-spanisch | unique | Nenne ein Land, in dem Spanisch Amtssprache ist. | korrekt | – | – | [A] 20 Staaten mit Spanisch als Amtssprache (einige de facto) | nein |
| s3-unique-fluesse | unique | Nenne einen Fluss in Deutschland (Grenzflüsse wie Oder und Neiße zähle | korrigiert | „durch Deutschland fließt“ ist für Grenzflüsse (Oder, Neiße) unscharf | Aufgabentext: „Fluss in Deutschland (Grenzflüsse zählen mit)“ | [A] Liste der 36 gültigen Flüsse plausibel | nein |
| s4-probe-geo | geo | Probe: Wo steht die Allianz Arena? | korrekt | – | – | [A] Allianz Arena 48,2188/11,6247 | nein |
| s4-probe-match | match | Probe: Welches Tier macht welches Geräusch? | korrekt | – | – | [A] Tierlaute | nein |
| s4-probe-rank | rank | Probe: Wie weit ist der Planet von der Sonne entfernt? – der nächste z | korrekt | – | – | [A] Merkur 58 · Venus 108 · Erde 150 · Mars 228 · Jupiter 778 Mio. km | nein |
| s4-probe-estimate | estimate | Probe: Wie viele Bundesländer hat Deutschland? | korrekt | – | – | [A] 16 Bundesländer | nein |
| s4-probe-glitch | glitch | Probe: Was hat sich verändert? Tippe auf deinem Handy darauf. | korrekt | – | – | [T] Szene pitch2: ein Spieler fehlt, Ball verschoben | nein |
| s4-probe-unique | unique | Probe: Nenne eine Farbe der deutschen Flagge. | korrekt | – | – | [A] Schwarz-Rot-Gold | nein |
| s4-probe-link | link | Probe: Was ist gesucht? | korrekt | – | – | [A] Mond: 384.000 km, Ebbe/Flut, Armstrong 1969 | nein |
| s4-match-tierrekorde | match | Welches Tier hält welchen Rekord? | korrekt | – | – | siehe b44-match-tier (Dublette) | nein |
| s5-probe-geo | geo | Probe: Wo steht die Allianz Arena? | korrekt | – | – | Dublette zu s4-probe-geo | ja |
| s5-probe-match | match | Probe: Welches Tier macht welches Geräusch? | korrekt | – | – | Dublette zu s4-probe-match | ja |
| s5-probe-rank | rank | Probe: Wie weit ist der Planet von der Sonne entfernt? – der nächste z | korrekt | – | – | Dublette zu s4-probe-rank | ja |
| s5-probe-estimate | estimate | Probe: Wie viele Bundesländer hat Deutschland? | korrekt | – | – | Dublette zu s4-probe-estimate | ja |
| s5-probe-glitch | glitch | Probe: Was hat sich verändert? Tippe auf deinem Handy darauf. | korrekt | – | – | Dublette zu s4-probe-glitch | ja |
| s5-probe-unique | unique | Probe: Nenne eine Farbe der deutschen Flagge. | korrekt | – | – | Dublette zu s4-probe-unique | ja |
| s5-probe-link | link | Probe: Was ist gesucht? | korrekt | – | – | Dublette zu s4-probe-link | ja |
| s5-kk-1 | vote | Wer von uns würde 65 Millionen für Marco Reus ausgeben? | korrekt | – | – | Meinungsfrage | nein |
| s5-kk-2 | vote | Wer von uns würde im Kickbase-Spiel zuerst sein ganzes Budget auf eine | korrekt | – | – | Meinungsfrage | nein |
| s5-kk-3 | vote | Wer von uns würde einen Spieler nur deshalb kaufen, weil ihm der Name  | korrekt | – | – | Meinungsfrage | nein |
| b42-geo-c02 | geo | Marco Reus gewann mit 35 Jahren seinen ersten Meistertitel. Wo wurde d | korrekt | – | – | [A] MLS-Cup 7.12.2024 LA Galaxy–NY Red Bulls 2:1, Dignity Health Sports Park Carson; Reus geb. 31.5.1989 → 35 [N] | ja |
| b42-geo-c04 | geo | In welchem Ort stürzen sich jedes Jahr Menschen einen extrem steilen H | korrekt | – | – | [W] Cooper’s Hill 2025: Tom Kopke (YouTuber aus München) gewann zum 2. Mal in Folge das erste Männer-Rennen (AP/Sky); Koordinate geprüft [T]. Dublette zu b43-geo-c04 | nein |
| b42-geo-t01 | geo | Für die EM 2004 baute ein europäischer Verein ein Fußballstadion in ei | korrekt | – | – | [A] Estádio Municipal de Braga (EM 2004, „A Pedreira“, Steinbruch-Felswand), 41,5625/−8,43 | ja |
| b42-geo-c05 | geo | Markiere den Punkt auf der Erde, der weiter von jedem Stück Land entfe | korrekt | – | – | [A] Point Nemo 48°52′S 123°23′W; NOAA: ca. 2.688 km zum nächsten Land | ja |
| b42-match-t03 | match | Ordne jeden Star dem Verein zu, bei dem er spielte, bevor er zu der je | korrekt | – | – | [A] Haaland Molde→Salzburg, Salah Basel→Chelsea, Bellingham Birmingham→BVB, De Bruyne Genk→Chelsea, Lewandowski Lech→BVB, Son HSV→Leverkusen | nein |
| b42-match-c08 | match | Wozu wurde dieses Produkt ursprünglich entwickelt bzw. woraus entstand | korrekt | – | – | [A] Play-Doh (Tapetenreiniger), Luftpolsterfolie (Struktur-Tapete), Slinky (Schiffsinstrumente), Listerine (Antiseptikum), Viagra (Angina pectoris), Coca-Cola (Apothekentonikum); Primärquellen je Produkt nicht einzeln recherchiert | nein |
| b42-match-c06 | match | Sechs Maskottchen – welcher Bundesliga-Verein gehört dazu? | korrekt | – | – | [W] Hoffi = Elch (tsg-hoffenheim.de); Fritzle Krokodil, Emma Biene, Jünter Fohlen, Bulli Bulle, Berni Bär [A]; Mischung gültig [T] | ja |
| b42-match-c07 | match | Was bedeutet der Name dieser Marke wirklich? | korrekt | – | – | [A] Audi=Horch!, LEGO=leg godt, HARIBO=Hans Riegel Bonn, IKEA-Initialen, Nivea=niveus, Häagen-Dazs erfunden | ja |
| b42-rank-c09 | rank | Sortiere diese fünf BVB-Neuzugänge nach ihrer gemeldeten Ablösesumme – | korrigiert | Sancho-Ablöse 20,59 Mio. € falsch (Transfer 2017 ca. 7,84 Mio.); Kagawa war nicht ablösefrei (ca. 0,35 Mio. €); Reihenfolge ändert sich | Werte und Reihenfolge korrigiert (Kagawa 0,35 · Sancho 7,84 · Haaland 20,00 · Bellingham 30,15 · Hummels 30,50), Erklärtext angepasst | [W] Wikipedia Kagawa (350.000 €), 7,84 Mio. € für Sancho (ligainsider/90min: knapp 8 Mio.); Haaland/Bellingham/Hummels laut Transfermarkt [A] | nein |
| b42-rank-c10 | rank | Sortiere chronologisch, ältestes Ereignis zuerst. | korrekt | – | – | [A] Cheops ca. 2560 v. Chr., Wrangel-Mammuts ca. 2000 v. Chr., Kleopatra 51 v. Chr., Oxford ab 1096, Tenochtitlan 1325; Abstände groß, Reihenfolge stabil | ja |
| b42-rank-t05 | rank | Sortiere nach Alter beim ersten Bundesligaspiel, jüngster zuerst. | korrigiert | Bischof-Wert 263 Tage; korrekt 16 J. 264 T. (Debüt 19.3.2022) | 264 Tage; Reihenfolge unverändert | [W] Quellen nennen 263/264, Nachrechnung ab Geburtsdatum ergibt 264; Güther 3 oder 4 Tage je nach Quelle (Bundesliga.com 3, Sport1 4) – Rest [W] Iličević 1.11.2026 (Bundesliga.com), Lemke 214 T. (Stuttgarter Zeitung/hsv.de) | nein |
| b42-glitch-t07 | glitch | Was hat sich verändert? Tippe darauf. | korrekt | – | – | [T] Szene transfer1: Reus-Preis 6,5 → 65,0 Mio. € stimmt mit Erklärtext | ja |
| b42-glitch-c16 | glitch | Was hat sich verändert? Tippe darauf. | korrekt | – | – | [T] Szene kiosk1: „Bier 0,5 l“ → „0,4 l“ stimmt mit Erklärtext | ja |
| b42-glitch-c14 | glitch | Was hat sich verändert? Tippe darauf. | korrekt | – | – | [T] Szene table2: Differenzspalte Nordstern +14 → −14 (22:8 = +14 nachgerechnet [N]) | ja |
| b42-glitch-t08 | glitch | Was hat sich verändert? Tippe darauf. | korrekt | – | – | [T] Szene receipt2: Summe 52,50 → 525,00 €; Einzelposten summieren zu 52,50 [N] | ja |
| b42-est-t09 | estimate | Wie viele Tore erzielte Youssoufa Moukoko laut BVB-Angabe in seinen in | korrekt | – | – | [W] BVB-Profil: 141 Tore in 88 Spielen für U17/U19 (bvb.de); 141/88 = 1,6 [N] | ja |
| b42-est-c18 | estimate | Wie viel wiegt der Original-WM-Pokal der Männer laut FIFA, in Gramm? | korrekt | – | – | [A] FIFA: Pokal 6,175 kg (18 Karat Gold) = 6175 g | ja |
| b42-est-c19 | estimate | Wie viele Millionen Maß Bier wurden laut der vorläufigen Wiesn-Bilanz  | korrigiert | Erklärtext nannte „spätere städtische Auswertung 6,7 Mio. Maß“ – diese Zahl gehört zur Wiesn 2026, für 2025 nicht belegt | Erklärtext korrigiert (Festwirte-Schätzung 6,5 Mio. Maß; 2024 ca. 7 Mio.) | [W] tageskarte.io/muenchen.de „Bilanz Wiesn 2025“: 6,5 Mio. Besucher, ca. 6,5 Mio. Maß (Festwirte-Schätzung) | ja |
| b42-est-t10 | estimate | Wie viele Kilometer lang ist der reguläre Linienflug zwischen Westray  | korrekt | – | – | [W] Guinness World Records „Shortest domestic scheduled flight“: 2,74 km (1,7 mi), Rekordflug 53 s | ja |
| b42-link-t11 | link | Welcher Verein wird gesucht? | korrekt | – | – | [A] FCK: Abstieg & Pokalsieg 1996, Meister 1998 unter Rehhagel als Aufsteiger, Fritz-Walter-Stadion/Betzenberg. Dublette zu b44-link-t11 | nein |
| b42-link-c22 | link | Was wird gesucht? | ungeklärt | VW-Teilenummer „199 398 500 A“ per Websuche nicht belegbar (Chillup-Marke 1959 dagegen bestätigt) | keine – Hinweis 1 vor Einsatz ersetzen oder selbst prüfen | [W] DPMA „Spirit of Currywurst“: Marke „Chillup“ Nr. 721319, eingetragen 21.1.1959; Rest [A] | ja |
| b42-link-c24 | link | Was wird gesucht? | korrekt | – | – | [A] Tofiq Bahramov (Baku), Wembley 1966, Pokal-Diebstahl März 1966 (Hund Pickles), Lampard 2010 | ja |
| b42-link-c23 | link | Was wird gesucht? | korrekt | – | – | [A] Game-Boy-Exemplar überstand 1991 Bombenanschlag im Golfkrieg (Nintendo-Ausstellung), 4 Graustufen, Tetris, Pokémon Rot/Blau | ja |
| b42-unique-t13 | unique | Nenne eine Nation, die von 1930 bis einschließlich 2026 mindestens ein | korrekt | – | – | [A] 19 Gastgeberländer 1930–2026 nachgezählt (Kanada neu 2026) [N] | ja |
| b42-unique-c27 | unique | Nenne einen Profi, der mindestens ein Pflichtspiel der Männer-Ersten f | ungeklärt | Liste der Doppel-Profis (Bayern+BVB) nicht vollständig belegbar; Nerlinger-Zeiträume widersprüchlich | keine (Frage ist offen: Showmaster entscheidet unbekannte Antworten) | [W] Feulner (BVB 2009–11) und Nerlinger (Bayern 1992–98, BVB ab 1998) bestätigt; Rest [A] | ja |
| b42-unique-t14 | unique | Nenne ein chemisches Element, dessen offizielles Elementsymbol aus exa | korrekt | – | – | [A] Elemente mit 1-Buchstaben-Symbol: H B C N O F P S K V Y I W U = 14 [N] | ja |
| b42-unique-p20 | unique | Nenne einen Verein, der spätestens 2026 den Europapokal der Landesmeis | korrekt | – | – | [A] 13 Vereine nachgezählt; [W] PSG gewann 2025 und 2026 (UEFA/Euronews, 30.5.2026 vs. Arsenal i. E.) [N] | nein |
| b42-kk-1 | vote | Wer von uns würde am ehesten 65 Millionen für einen Spieler bieten, nu | korrekt | – | – | Meinungsfrage (Gruppen-Konsens), kein Faktenanspruch | nein |
| b42-kk-2 | vote | Wer von uns kontrolliert seine Kickbase-Aufstellung fünf Minuten vor A | korrekt | – | – | Meinungsfrage (Gruppen-Konsens), kein Faktenanspruch | nein |
| b42-kk-3 | vote | Wer von uns verkauft am ehesten einen Spieler eine Woche, bevor dieser | korrekt | – | – | Meinungsfrage (Gruppen-Konsens), kein Faktenanspruch | nein |
| b43-geo-2028 | geo | In welchem Stadion wird das Champions-League-Finale 2028 stattfinden? | korrekt | – | – | [W] UEFA-Beschluss 15.9.2026 (Thessaloniki): CL-Finale 2028 in der Münchner Allianz Arena („Munich Football Arena“), 3. Finale nach 2012 und 2025 | ja |
| b43-geo-c04 | geo | In welchem Ort stürzen sich jedes Jahr Menschen einen extrem steilen H | korrekt | – | – | [W] siehe b42-geo-c04; Karte „Welt“ bewusst (Variante) | ja |
| b43-rank-t05 | rank | Sortiere nach Alter beim ersten Bundesligaspiel, jüngster zuerst. | ungeklärt | Güther 3 oder 4 Tage je nach Quelle; Moukoko/Iličević sind laut Bundesliga.com gleichauf (hier nur Moukoko genannt) | keine | [W] Bundesliga.com: Iličević 1.11.2026 gleichauf mit Moukoko; Reihenfolge der fünf Karten sicher | nein |
| b44-match-tier | match | Welches Tier hält welchen Rekord? | korrekt | – | – | [A] Gepard, Blauwal, Strauß, Giraffe, Bienenelfe (ca. 2 g), Grönlandhai (>250 J.); Dublette zu s4-match-tierrekorde | ja |
| b44-match-t03 | match | Ordne jeden Star dem Verein zu, bei dem er spielte, bevor er zu der je | korrekt | – | – | siehe b42-match-t03 | ja |
| b44-rank-t05 | rank | Sortiere diese fünf Karten nach dem Alter beim ersten Bundesliga-Einsa | ungeklärt | Güther 3 oder 4 Tage je nach Quelle (Reihenfolge nicht betroffen) | keine | [W] Moukoko & Iličević 16 J. 1 T. (Bundesliga.com, 1.11.2026), Wanner 15 T., Lemke 214 T., Bischof 264 T. (Nachrechnung) | ja |
| b44-unique-p20 | unique | Nenne einen Verein außerhalb von Deutschland, England und Spanien, der | korrekt | – | – | siehe b42-unique-p20 | ja |
| b45-rank-c09 | rank | Sortiere diese fünf BVB-Neuzugänge nach ihrer gemeldeten Ablösesumme – | korrigiert | wie b42-rank-c09: Kagawa nicht ablösefrei | Kagawa 0,35 Mio. €, Erklärtext angepasst (Sancho 7,84 war bereits korrigiert) | [W] Wikipedia Kagawa 350.000 €; Rest siehe b42-rank-c09 | ja |
| b44-link-t11 | link | Welcher Verein wird gesucht? | korrekt | – | – | siehe b42-link-t11 (verbesserter Hinweis 1) | ja |
| b44-kk-1 | vote | Wer würde von uns am ehesten 65 Millionen für einen Spieler ausgeben,  | korrekt | – | – | Meinungsfrage, kein Faktenanspruch | ja |
| b44-kk-2 | vote | Wer kontrolliert seine Kickbase-Aufstellung fünf Minuten vor Anpfiff n | korrekt | – | – | Meinungsfrage, kein Faktenanspruch | ja |
| b44-kk-3 | vote | Wer sorgt in unserer Gruppe am häufigsten für Ragebait? | korrekt | – | – | Meinungsfrage, kein Faktenanspruch | ja |
| b44-kk-4 | vote | Wer würde bei einem gemeinsamen Urlaub am ehesten den Zug oder Flug ve | korrekt | – | – | Meinungsfrage, kein Faktenanspruch | ja |
| b44-kk-5 | vote | Wer würde in einer Quizshow am überzeugendsten eine komplett falsche A | korrekt | – | – | Meinungsfrage, kein Faktenanspruch | ja |
| after2-geo-dance1518 | geo | 1518 tanzten in einer Stadt im Elsass, nahe der heutigen deutsch-franz | korrekt | – | – | [A] Tanzwahn 1518 in Straßburg (Chroniken); Koordinate Straßburg 48,584/7,746 [T] | ja |
| after2-match-exclubs | match | Welcher Star spielte tatsächlich auch einmal für diesen Verein? | korrekt | – | – | [A] Boateng Barcelona (Leihe 2019), Matthäus MetroStars (2000), Ribéry Salernitana, Şahin Real Madrid, Balotelli Adana Demirspor, Ronaldo Corinthians; Mischung gültig [T] | ja |
| after2-match-sameyear | match | Welcher Fußballmoment geschah im selben Jahr wie dieses Popkultur-Erei | korrekt | – | – | [A] 1997 Titanic/BVB-CL, 1999 Star Wars I/ManUnited, 2009 Avatar/Wolfsburg, 2014 Ice Bucket/WM, 2016 Pokémon GO/EM Portugal, 2023 Barbie/Man City | ja |
| after2-link-mourinho | link | Welche Person wird gesucht? | korrigiert | Letzter Hinweis nannte den Namen „Ich bin José Mourinho“ – Lösung stand in der Aufgabe | Hinweis 4 ersetzt durch „Ich trainierte unter anderem Chelsea, Inter Mailand, Real Madrid und Manchester United.“ | [A] Übersetzer für Bobby Robson, CL-Siege Porto 2004/Inter 2010, „The Special One“; neue Hinweise faktisch korrekt | ja |
| after2-link-bttf | link | Welche Filmreihe wird gesucht? | korrekt | – | – | [A] Eric Stoltz ersetzt durch Michael J. Fox, 88 mph, 1985→1955→2015, DeLorean | ja |
| after2-unique-bayernfinals | unique | Nenne einen Verein, den der FC Bayern bis einschließlich 2026 in einem | korrekt | – | – | [A] Bayern-Finalsiege: Atlético 1974, Leeds 1975, St-Étienne 1976, Valencia 2001, Dortmund 2013, PSG 2020; [W] 2026 gewann PSG (Bayern nicht im Finale) | ja |
| after-link-dassler | link | Welche ZWEI Sportartikelmarken sind gesucht? | korrekt | – | – | [A] Adolf/Rudolf Dassler, Adidas & Puma, beide Herzogenaurach; Akzeptierte Schreibweisen (Adidas/Puma, &, und) vollständig [T] | ja |
| after-unique-meister | unique | Nenne einen Verein, der seit Einführung der Bundesliga 1963 mindestens | korrekt | – | – | [A] 13 Meistervereine der Bundesliga-Ära (Bayern, BVB, Gladbach, Bremen, HSV, Stuttgart, Köln, FCK, Wolfsburg, Leverkusen, Nürnberg, Braunschweig, 1860) nachgezählt [N]; Stand Nov. 2026: kein neuer Meisterverein bekannt | ja |
| after-final-gspon | geo | Wo liegt die Ottmar-Hitzfeld-Arena, ein Fußballplatz auf rund 2.000 Me | korrekt | – | – | [W] Wikipedia „Ottmar Hitzfeld Arena“: 46°13′39″N 7°54′08″E (= 46,2275/7,9022), ca. 2.000 m, nur per Seilbahn erreichbar | ja |
| after-final-fax | rank | Sortiere diese Ereignisse chronologisch – das früheste zuerst. | korrekt | – | – | [A] Bain 1843, Bell 1876, Coca-Cola 1886, Eiffelturm 1889, Titanic 1912; Reihenfolge der Items = chronologisch [T] | ja |
| after-final-tv2014 | estimate | Wie viele Millionen Menschen sahen das WM-Finale 2014 zwischen Deutsch | korrekt | – | – | [A] ARD-Schnitt 34,65 Mio., 86,3 % Marktanteil (Quotenmeter/ARD-Mitteilung 2014); zeitlos, da abgeschlossenes Ereignis | ja |
| after-final-breweries | unique | Nenne eine der sechs Münchner Brauereien, deren Bier auf der Wiesn aus | korrekt | – | – | [A] Sechs Wiesn-Brauereien (Augustiner, Hacker-Pschorr, Hofbräu, Löwenbräu, Paulaner, Spaten) = Festsatzung der Stadt München; Liste vollständig, geschlossen (closed) [T] | ja |
| ng-bluff-1 | bluff | Wie nennt man das @-Zeichen im Italienischen umgangssprachlich? | korrekt | – | – | [A] @ = „chiocciola“ (Schnecke) im Italienischen | nein |
| ng-bluff-2 | bluff | Welches Land hat als einziges der Welt eine Nationalflagge, die weder  | korrekt | – | – | [A] Nepal: einzige nicht-rechteckige Nationalflagge | nein |
| ng-bluff-3 | bluff | Wie viele Herzen hat ein Oktopus? | korrekt | – | – | [A] Oktopus: 3 Herzen (2 Kiemen-, 1 Körperherz) | nein |
| ng-corr-1 | corridor | Wie hoch ist der Mount Everest laut offizieller Vermessung (Gipfelhöhe | korrekt | – | – | [A] Everest 8.848,86 m (2020, China/Nepal) | nein |
| ng-corr-2 | corridor | Wie lang ist der Rhein vom Ursprung bis zur Mündung? | korrekt | – | – | [A] Rhein 1.233 km (WSV-Angabe; andere Quellen ≈1.230) | nein |
| ng-corr-3 | corridor | Wie hoch ist das Burj Khalifa in Dubai, das höchste Gebäude der Welt? | korrekt | – | – | [A] Burj Khalifa 828 m, Stand Nov. 2026 weiterhin höchstes Gebäude | nein |
| ng-twist-1 | twist | Welcher bekannte Filmtitel wurde hier ins Gegenteil verdreht? | korrigiert | Erklärtext „wütend → neugierig“ ist kein Gegenteil | Verdreht jetzt „Langsame und Gelassene“ | [A] Originaltitel Fast & Furious; Gegenteil von „wütend“ = „gelassen“ | nein |
| ng-twist-2 | twist | Welcher bekannte Filmtitel wurde hier ins Gegenteil verdreht? | korrekt | – | – | [A] Pretty Woman → „Hässlicher Mann“ | nein |
| ng-twist-3 | twist | Welcher bekannte Filmtitel wurde hier ins Gegenteil verdreht? | korrekt | – | – | [A] Stirb langsam → „Lebe schnell“ | nein |
| ng-twist-4 | twist | Welcher bekannte Filmtitel wurde hier ins Gegenteil verdreht? | korrekt | – | – | [A] Zurück in die Zukunft → „Vorwärts in die Vergangenheit“ | nein |
| ng-twist-5 | twist | Welcher bekannte Filmtitel wurde hier ins Gegenteil verdreht? | korrekt | – | – | [A] Das Schweigen der Lämmer → „Das Gebrüll der Wölfe“ | nein |
| nm-pix-1 | pixel | Was ist auf dem Bild zu sehen? | korrekt | – | – | [T] Bild (Noto Color Emoji „Trophäe“, Apache-2.0) angesehen: Pokal; Bildrechte unproblematisch | nein |
| nm-pix-2 | pixel | Was ist auf dem Bild zu sehen? | korrekt | – | – | [T] Bild (Noto Color Emoji „Tor“, Apache-2.0) angesehen: Fußballtor mit Netz (wirkt wie Eishockeytor, Lösung „Tor“ bleibt eindeutig) | nein |
| nm-pix-3 | pixel | Was ist auf dem Bild zu sehen? | korrekt | – | – | [T] Bild (Noto Color Emoji „Freiheitsstatue“, Apache-2.0) angesehen | nein |
| nm-duel-1 | duel | WER KENNT SICH BESSER AUS? – Fußballgeschichte | korrekt | – | – | [A] Brasilien 5 Titel (bis 2022), WM 2010 Südafrika, BVB–Bayern 2013 Wembley | nein |
| nm-duel-2 | duel | WER KENNT SICH BESSER AUS? – Pop & Planet | korrekt | – | – | [A] Queen, Canberra, 3 Herzen (Dublette zu ng-bluff-3) | nein |
| nm-duel-3 | duel | WER KENNT SICH BESSER AUS? – Schlaukopf-Duell | korrekt | – | – | [A] Vatikanstadt, Fe = Eisen, Ankara | nein |
| nm-arena-1 | arena | DIE ARENA – Champions League 2004 | korrekt | – | – | [A] CL 2004: Porto–Monaco 3:0, Trainer Mourinho, Finale Gelsenkirchen; je 1 richtige Option [T] | nein |
| nm-arena-2 | arena | DIE ARENA – Wissens-Gauntlet | korrekt | – | – | [A] 32 Zähne, Saturn (meiste bekannte Monde, 2026 weiter Saturn), Wolga längster Fluss Europas | nein |
| nm-arena-3 | arena | DIE ARENA – Kino-Gauntlet | korrekt | – | – | [A] Johnny Depp, Titanic (11 Oscars bei der Verleihung 1998), Tarantino | nein |
| nm-sound-1 | sound | Was hörst du? | ungeklärt | Tondatei (synthetisiert, 2,6 s) technisch gültig, aber hier nicht abhörbar – Erkennbarkeit nicht bestätigt | keine – vor dem Abend im Admin „Testen“ anhören | [T] gültige WAV (12 kHz, mono); Töne selbst synthetisiert → keine Rechteprobleme | nein |
| nm-sound-2 | sound | Was hörst du? | ungeklärt | wie nm-sound-1 (Modem-Einwahl) | keine – vor dem Abend anhören | [T] gültige WAV (2,8 s) | nein |
| nm-sound-3 | sound | Was hörst du? | ungeklärt | wie nm-sound-1 (Torjubel) | keine – vor dem Abend anhören | [T] gültige WAV (3,0 s) | nein |
| nm-time-1 | timeline | Wann wurde YouTube gegründet? | korrekt | – | – | [A] YouTube gegründet 14.2.2005; Ankerjahre 1990/1998/2006/2014 korrekt | nein |
| nm-time-2 | timeline | Wann kam das erste iPhone auf den Markt? | korrekt | – | – | [A] iPhone Juni 2007; Anker Mauerfall 1989, Google 1998, Euro-Bargeld 2002, WM 2014 | nein |
| nm-time-3 | timeline | Wann startete die erste Bundesliga-Saison? | korrekt | – | – | [A] Bundesliga-Start Saison 1963/64; Anker WM 1954/1974/1990/2014 | nein |
| nm-time-4 | timeline | Wann wurde Griechenland überraschend Europameister? | korrekt | – | – | [A] Griechenland EM-Titel 2004; Anker 1990, 1996, 2006, 2014 | nein |
| nm-panic-1 | panic | Tresor „Brasilien 7:1“ | korrekt | – | – | [N] 7 Tore, 4 Eckfahnen halbiert = 2, 4 → Code 724 | nein |
| nm-panic-2 | panic | Tresor „Elfmeter“ | korrekt | – | – | [N] Quersumme 90 = 9, 1 Torwart, 5 Schützen → Code 915 | nein |
| nm-panic-3 | panic | Tresor „Spielfeld“ | korrekt | – | – | [N] 3 Punkte, 6 Würfelseiten, 2 Halbzeiten → Code 362 | nein |
| nm-imp-1 | impostor | Fußball | korrekt | – | – | Wortspiel: Wort „Abseits“ zum Thema Fußball, Varianten plausibel | nein |
| nm-imp-2 | impostor | Essen | korrekt | – | – | Wortspiel: „Currywurst“ zum Thema Essen | nein |
| nm-imp-3 | impostor | Urlaub | korrekt | – | – | Wortspiel: „Campingplatz“ zum Thema Urlaub | nein |
