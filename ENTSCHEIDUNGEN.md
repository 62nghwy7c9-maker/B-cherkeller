# Entscheidungen

Jede Stelle, an der der Bauplan etwas offengelassen hat, und wie sie
entschieden wurde. Grundregel des Bauplans: einfachste Variante wählen.

---

## Daten

**1. Kurskennungen `rel` / `eth` / `fr` / `la`.**
Der Bauplan zeigt im Beispiel `"kurse": ["ev"]` und ein Paket `p-5-ev`. Das sind
Beispielwerte; die Kurse selbst sind in Abschnitt 8 als „Religion oder Ethik"
und „Französisch oder Latein" benannt. Gewählt wurden sprechende Kürzel:
`rel`, `eth`, `fr`, `la`. Die App verdrahtet keine davon — sie vergleicht nur
`paket.kurs` mit `schueler.kurse`. Andere Kürzel funktionieren ohne Codeänderung.

**2. Ein Titel in zwei Paketen — welcher.**
Der Bauplan verlangt, dass die Ableitung Titel entdoppelt, nennt aber keinen
konkreten Fall. Gewählt: `t-903 Green Line 5` steht sowohl in `p-9-basis` als
auch in `p-9-fr`. Begründung im Datensatz vermerkt: Pakete werden von
verschiedenen Fachschaften gepflegt, die Fremdsprachen-Fachschaft führt das
Englischbuch mit auf. Damit greift die Entdopplung bei jedem
Französisch-Schüler, und die Titelzahl bleibt bei den vom Bauplan verlangten
neun.

**3. Knapper Bestand.**
Verlangt war „teils knapp unter der Schülerzahl". Gewählt: `Green Line 1` (71
Exemplare bei 75 Fünftklässlern) und `Green Line 5` (74 bei 75). Beide gehen im
Bestand sichtbar ins Minus; die Spalte „verfügbar" färbt sich dann rot.

**4. Verteilung der Kurse.**
Religion/Ethik im Wechsel, zweite Fremdsprache im Verhältnis 2:1 zugunsten
Französisch. So enthält jede Klasse beide Varianten, und der Vorführ-Fall „zwei
Schüler derselben Klasse, verschiedene Listen" tritt sofort ein.

**5. Namen.**
Frei erfunden, aus zwei festen Listen zufällig kombiniert, mit fester
Ausgangszahl (`random.seed`), damit jeder Lauf dieselben Daten erzeugt.
Absichtlich mit Umlauten (Müller, Mühlbauer, Übelacker, Käthe, Jörn), damit die
Umlaut-Suche vorführbar ist. Keine realen Personen.

---

## Speicherung

**6. Ereignisse werden zusätzlich im Arbeitsspeicher gespiegelt.**
Der Bauplan verbietet einen „Zwischenpuffer im Arbeitsspeicher, der verloren
gehen könnte". Die Spiegelung hier ist kein solcher Puffer: Ein Ereignis wird
erst dann in die Spiegelung aufgenommen, wenn die IndexedDB-Transaktion
vollständig abgeschlossen ist. Schlägt sie fehl, existiert das Ereignis nirgends
— weder in der Datenbank noch in der Anzeige. Die Wahrheit liegt immer in der
Datenbank; die Spiegelung dient nur dem sofortigen Filtern und Rechnen.

**7. „Alle 10 abgeschlossenen Schüler" zählt Tipps auf „Fertig".**
Auch dann, wenn noch Bücher offen waren und der Helfer „Trotzdem fertig" wählt.
Alternative wäre gewesen, nur vollständige Schüler zu zählen — dann könnte der
Zähler bei vielen unvollständigen Vorgängen ewig stillstehen, und genau die
Sicherung bliebe aus.

**8. Der Sicherungs-Zähler steht in localStorage, nicht in der Datenbank.**
Er ist eine Eigenschaft des Geräts, kein Ereignis. Er wird beim Erstellen einer
Sicherung auf 0 gesetzt.

**9. Der Dialog beim Wiederöffnen ist abweisbar, der Zehner-Dialog nicht.**
Der Bauplan schreibt „nur über Sicherung erstellen verlassen" ausdrücklich für
die erzwungene Sicherung nach 10 Schülern. Für den Dialog nach dem Verlassen
und Wiederöffnen (Abschnitt 4.5) sagt er das nicht. Dort gibt es zusätzlich
„Später". Begründung: Dieser Fall tritt auch ein, wenn jemand die App nur kurz
zur Seite gelegt hat; ein unentrinnbarer Dialog wäre hier eine Bremse ohne
Gegenwert. Der Zwang nach 10 Schülern bleibt davon unberührt.

**10. „Demo zurücksetzen" benutzt `clear()`.**
Das ist die einzige Stelle, an der Daten gelöscht werden. Der Bauplan verlangt
diese Funktion in Abschnitt 5.5 ausdrücklich und sichert sie durch die Eingabe
von `RESET`. Sonst wird nirgends `put` oder `delete` verwendet.

**11. Der Sicherungsstand wird beim Start nach unten korrigiert.**
Steht in localStorage eine höhere Zahl als tatsächlich Ereignisse vorhanden sind
(nach einem Reset), wird sie auf die tatsächliche Zahl gesetzt. Sonst zeigte der
Kopfzähler „seit Sicherung" dauerhaft 0, obwohl neu erfasst wird.

**12. Eindeutige Kennungen ohne `crypto.randomUUID`.**
`crypto.randomUUID()` gibt es nur in „sicherem Kontext" — also unter `https` oder
auf `localhost`. Falls jemand die App über einfaches `http` ausliefert, baut die
App dieselbe Form aus `crypto.getRandomValues` (UUID Fassung 4). Der empfohlene
Weg bleibt `https`; ohne ihn legt Safari die Dateien ohnehin nicht ab.

---

## Gestaltung

Der Bauplan gibt in Abschnitt 6 eine Gestaltung verbindlich vor: Papier
#EFEFEA, Akzent #4F5F3E, IBM Plex Mono in Großbuchstaben, Haarlinien, keine
Karten, keine Schatten, keine abgerundeten Ecken.

**Diese Vorgabe wurde auf ausdrückliche Weisung der Auftraggeberin ersetzt.**
Sie hat zuerst „professionell und clean wie Monday" verlangt und dann die
Gestaltung der Schulwebseite **gymnasiumkerpen.eu** als Vorlage benannt. Die
zweite Weisung gilt. Das ist die einzige Stelle, an der diese Lieferung dem
Bauplan bewusst widerspricht; alles andere aus Abschnitt 6 — Information
statt Verzierung, Bewegung nur beim Zustandswechsel, mindestens 17 Pixel im
Bedienbereich — gilt unverändert weiter.

**A. Was von der Schulwebseite übernommen ist.**
Ausgelesen aus dem gelieferten Stylesheet und dem Logo der Seite, nicht
geschätzt:

| Sache | Wert | Fundstelle |
|---|---|---|
| Schrift | Noto Sans, Regular und Bold | `html, body.portaltype-tilepage { font-family: "Noto-Sans-Regular" !important }` |
| Textfarbe | `#000000` | dieselbe Regel |
| Navigationsleiste | schwarz, weiße Schrift | `--navigation_color_background: #000000`, `--navigation_color_level_1: #FFFFFF` |
| Marken-Orange | `#FC8F00` | Schullogo, 16 Vorkommen |
| Verlaufsstrich | `linear-gradient(to right, #FC8F00, #F9EA11)` | Site-Stylesheet, als Trennelement |

Übernommen wurden davon: die Schrift, die schwarze Kopfleiste mit weißer
Schrift, das Orange und der Verlaufsstrich — dieser genau einmal, direkt unter
der Kopfleiste. Nicht übernommen wurde die Schriftgröße der Webseite (56 Pixel
für Überschriften): das ist eine Größe für eine Webseite, die gelesen wird,
nicht für ein Werkzeug, das bedient wird.

**B. Was nicht von der Schulwebseite kommt.**
Die Webseite ist eine Webseite. Sie hat keine Tabellenzeilen, keine
Zustandspillen, keine Häkchenfelder, keine Zustände für Bedienelemente. Diese
Bausteine folgen der Bauweise gängiger Arbeitswerkzeuge (Zeilenraster mit
Spaltenkopf, Zustandspille, Reiter mit Symbol, Fußleiste mit einer Hauptaktion).
Das war die erste Weisung und sie steht nicht im Widerspruch zur zweiten:
Die Marke kommt von der Schule, die Bauweise von der Aufgabe.

**C. Farbdisziplin — jede Farbe hat genau eine Aufgabe.**

| Farbe | Aufgabe | sonst nirgends |
|---|---|---|
| Schwarz / Grau | Struktur, Text, Kopfleiste | — |
| Orange `#FC8F00` | Marke, aktive Auswahl, Hauptknopf, Achtung | nie für Fehler |
| Grün `#107F49` | erledigt | nichts anderes |
| Rot `#BE2D42` | Fehler, Fehlt, Beschädigt | nichts anderes |

Grün ist nicht Teil der Schulfarben. Es bleibt trotzdem: „abgehakt ist grün"
ist eine Gewohnheit, die niemand erklären muss, und eine Spalte grüner Haken
lässt sich im Vorbeigehen zählen. Eine Marke soll ein Werkzeug wiedererkennbar
machen, nicht seine Bedienung umlernen lassen.

**D. Auf Orange steht Schwarz, nicht Weiß.**
Weiße Schrift auf `#FC8F00` erreicht 2,3:1 und ist damit nicht lesbar
(gefordert sind 4,5:1). Schwarz auf demselben Orange erreicht 8,2:1 — und ist
genau die Paarung, die das Schullogo selbst benutzt. Deshalb trägt der
Hauptknopf „Fertig" schwarze Schrift.

**E. Der aktive Reiter trägt seinen Zustand im Text.**
Orange auf Weiß erreicht 2,3:1 und ist als alleiniges Erkennungszeichen zu
schwach. Der aktive Reiter ist deshalb fett und schwarz; der orangene Strich
darunter verstärkt nur. Dasselbe Prinzip bei den Zustandspillen: jede trägt
Farbe **und** Wort.

**F. Alle Farbpaare wurden gerechnet, nicht geschätzt.**
Neunzehn Paarungen gegen WCAG geprüft (4,5:1 für Text, 3:1 für große Schrift
und Grafik). Drei sind durchgefallen und wurden ersetzt — die beiden oben
genannten und der Rand des Achtung-Banners, der von `#E9A93A` auf `#C07C1A`
nachgezogen wurde.

**G. Schriftdateien.**
Noto Sans in den Schnitten 400, 600 und 700, als `woff2` unter `fonts/`,
lateinischer Zeichensatz mit Umlauten, zusammen 40 Kilobyte. Bezogen aus dem
Paket `@fontsource` (SIL Open Font License). Kein Google Fonts, kein CDN — das
würde die Offline-Fähigkeit brechen.

**H. Symbole.**
Neun Zeichen, von Hand als SVG geschrieben und direkt in `index.html`
abgelegt. Keine Symbolbibliothek: die kleinste wiegt mehr als diese neun
Zeichen und lädt im Zweifel nach.

**I. App-Symbol.**
Schwarze Fläche, drei Buchrücken in Orange, Gelb und Weiß auf einer Linie.
Dasselbe Motiv steht als Zeichen neben dem Namen in der Kopfleiste, damit
Home-Bildschirm und App als dasselbe erkennbar sind.

---

## Oberfläche

**13. Hauptnavigation oben, „Fertig" unten.**
Der Bauplan verankert „Fertig" unten. Damit sich beides nicht ins Gehege kommt,
liegt die Navigation zwischen Suche, Bestand, Sicherung und Einstellungen unter
der Kopfzeile.

**14. Aus dem Statuspunkt wurde eine Zustandspille.**
Der Bauplan verlangt in der Trefferzeile einen Statuspunkt. Ein farbiger Punkt
allein ist eine Farbe ohne Wort — im Kellerlicht und bei Rot-Grün-Schwäche
keine Information. Die Pille trägt beides: den Punkt und das Wort („offen",
„teilweise", „fertig"). Sie ist außerdem deutlich schwerer zu übersehen als
ein Punkt von 15 Pixeln.

**15. Die Suche zeigt bei leerem Feld keine Liste.**
Nur die Zahl der Schüler und den Hinweis „Namen eingeben". Der Bauplan verlangt
Filterung „ab dem ersten Zeichen"; eine Liste aller 150 Namen davor wäre eine
Fläche, in der man versehentlich tippt.

**16. Gesucht wird auch in „Vorname Nachname".**
Verlangt war Suche in Nachname und Vorname. Zusätzlich wird die umgekehrte
Reihenfolge geprüft, damit „lena berg" die Bergmann findet. Kostet nichts und
verhindert Ratlosigkeit an der Schlange.

**17. Der Problem-Dialog kennt kein „Zurücksetzen".**
Fehlt und Beschädigt lassen sich rückgängig machen, indem man die Zeile antippt
— dann wird ein `zurueckgesetzt`-Ereignis geschrieben. Ein zusätzlicher Knopf im
Dialog wäre ein zweiter Weg zum selben Ziel.

**18. Die Zeile zeigt den Zustand zusätzlich als Wort.**
Neben dem Häkchen steht „ausgegeben", „fehlt", „beschädigt" und gegebenenfalls
die Notiz. Farbe allein trägt keine Information — bei Rot-Grün-Schwäche und im
Kellerlicht wäre der Zustand sonst nicht ablesbar.

**19. Die Warnzeile im Bestand ändert sich nach dem Zusammenführen.**
Solange nur die eigene Station enthalten ist, steht dort wörtlich der vom
Bauplan verlangte Satz: „Nur Station 2. Gesamtzahlen erst nach dem
Zusammenführen." Sind Ereignisse mehrerer Stationen enthalten, steht dort
stattdessen, welche Stationen enthalten sind, und der Vorbehalt bleibt. Grund:
Nach dem Einlesen aller drei Dateien wäre „Nur Station 2" schlicht falsch — und
eine falsche Warnung wird beim nächsten Mal nicht mehr gelesen.

**20. Station und Modus lassen sich beide nur mit Rückfrage ändern.**
Der Bauplan verlangt die Rückfrage für den Modus. Die Station steht in jedem
neuen Ereignis und entscheidet über den Dateinamen der Sicherung; ein
Versehen dort ist genauso teuer.

**21. Eine Schriftfamilie, keine Paarung.**
Noto Sans in drei Schnitten trägt Überschriften, Beschriftungen, Fließtext und
Zahlen. Zwei ähnliche Groteske nebeneinander sähen nach Versehen aus, und für
ein Werkzeug ist Hierarchie über Gewicht und Größe genug. Die Zahlen laufen im
Tabellenschnitt (`tabular-nums`), damit die Spalten im Bestand stehen.

**22. Leerzustände erklären statt zu melden.**
Das leere Suchfeld sagt nicht „keine Ergebnisse", sondern was einzugeben ist
und dass Umlaute egal sind. Der Helfer hat keine Einweisung bekommen; der
Bildschirm, den er zuerst sieht, ist die Einweisung.

---

## Technik

**23. Ein einziges `app.js` statt mehrerer Module.**
Der Bauplan zählt in Abschnitt 11 genau eine JavaScript-Datei auf. Sie ist in
15 nummerierte Abschnitte gegliedert, deren Verzeichnis oben in der Datei steht.
Wer etwas reparieren muss, sucht an einer Stelle statt in acht Dateien.

**24. Der Service Worker legt jede Datei einzeln ab.**
`cache.addAll` scheitert stumm als Ganzes, wenn eine Datei fehlt.
Hier wird jede Datei einzeln abgelegt und der Name einer fehlenden Datei in die
Entwicklerkonsole geschrieben. Der Fehler bleibt ein Fehler — er ist nur
auffindbar.

**25. Zwei Kennungen für die Fassung, von Hand gleichzuhalten.**
`FASSUNG` in `app.js` (steht in den Einstellungen) und `CACHE_NAME` in `sw.js`.
Automatisch gleichzuhalten ginge nur über einen Build-Schritt — den verbietet
der Bauplan. Beide stehen deshalb ganz oben in ihrer Datei, mit gegenseitigem
Verweis im Kommentar.

**26. Ein Prüfstand-Schalter für Abnahmetest 7.**
`window.buecherkellerPruefstand.schreibfehler = true` lässt jedes Schreiben
scheitern. Ohne diesen Schalter ließe sich Abnahmetest 7 („IndexedDB künstlich
scheitern lassen") nicht durchführen. Er ist keine Funktion der App: er ist
standardmäßig aus, wird nirgends in der Oberfläche angeboten, und sein
Einschalten kann nur dazu führen, dass die App weniger tut — nie, dass sie etwas
still verliert.

**27. Ordner `werkzeuge/` gehört nicht zur App.**
Enthält den Testdaten-Erzeuger, den Symbol-Erzeuger und die Abnahmetests. Wird
nicht ausgeliefert, nicht vom Service Worker abgelegt, nicht von der App
geladen. Er liegt bei, damit sich die Testdaten und die Prüfung reproduzieren
lassen.

**28. Geprüft wurde in Chromium, nicht in Safari.**
In der Bauumgebung war kein iPad verfügbar. Alle sieben Abnahmetests laufen
gegen einen echten Browser, aber nicht gegen den Zielbrowser. Das ist die eine
offene Lücke; sie steht auch in `ABNAHME.md`. Der Offline-Test auf dem echten
iPad (README, Abschnitt 2, Schritt 4) ist vor der Vorführung nachzuholen.

---

## Ein Fehler, der beim Prüfen gefunden wurde

Beim ersten Testlauf blieb der Dialog-Hintergrund unsichtbar über der ganzen
Seite liegen und fing jede Berührung ab. Ursache: Das HTML-Attribut `hidden`
setzt `display: none` nur mit sehr schwachem Gewicht; die eigene Regel
`display: flex` überstimmte es. Die App war dadurch nach dem ersten Öffnen eines
Dialogs vollständig unbedienbar — im Browser sichtbar nichts, in der Bedienung
alles. Behoben durch eine ausdrückliche Regel `[hidden] { display: none
!important; }`.

Der Fall ist hier vermerkt, weil er zeigt, wofür die Abnahmetests da sind: Er
wäre bei bloßem Ansehen der Seite nicht aufgefallen.
