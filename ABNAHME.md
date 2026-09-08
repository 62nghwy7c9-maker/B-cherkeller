# Abnahme

Ergebnis der sieben Tests aus Abschnitt 9 des Bauplans.

**Ergebnis: 7 von 7 bestanden.**

## Wie geprüft wurde

Die Tests laufen nicht von Hand, sondern als Skript, das die App wie ein Mensch
bedient — tippen, wischen, Dateien auswählen. Steuerung über Playwright
(ein Werkzeug, das einen echten Browser fernsteuert), Browser: Chromium 1194,
ausgeliefert über einen statischen Dateiserver auf `http://localhost:8712`.

Jeder Test startet mit einem **leeren Gerät** (frisches Browserprofil, eigener
Ordner auf der Festplatte). Nichts wird zwischen den Tests weitergereicht.

Warum Chromium und nicht Safari: In dieser Umgebung steht kein iPad und kein
Safari zur Verfügung. Die geprüften Bausteine — IndexedDB, Service Worker,
`crypto.randomUUID`, Blob-Download, `navigator.storage.persist` — gibt es in
Safari ab iOS 15.4 ebenfalls. **Der Test auf einem echten iPad steht damit noch
aus** und ist der erste Schritt vor der Vorführung; die Anleitung dazu steht in
`README.md`, Abschnitt 2, Schritt 4.

Testskript: `werkzeuge/abnahme.mjs`.
Aufruf: `node werkzeuge/abnahme.mjs` (einzelner Test: `node werkzeuge/abnahme.mjs 3`).

---

## Test 1 — Offline-Test · **bestanden**

App geladen, Station 2 / Ausgabe eingerichtet, gewartet bis der Service Worker
die Kontrolle übernommen hat. Danach das Netz vollständig getrennt
(`context.setOffline(true)`, das entspricht dem Flugmodus) und die Seite neu
geladen.

Durchlaufen im getrennten Zustand: **Suche → Schüler vollständig erfasst →
Bestand → Sicherung → Sicherungsdatei heruntergeladen → Einstellungen.**

- 9 Ereignisse offline geschrieben, der Schüler danach als „fertig" markiert.
- **Fehlgeschlagene Netzwerkaufrufe: 0.** Auch keine JavaScript-Fehler.

Gemessen wurde über `requestfailed` und alle Antworten ab HTTP 400 — im
Netzwerk-Protokoll steht kein einziger fehlgeschlagener Aufruf.

## Test 2 — Neustart-Test · **bestanden**

20 Schüler vollständig erfasst (**150 Ereignisse**). Dabei hat die App zweimal
die erzwungene Sicherung verlangt; beide Male wurde sie erstellt. Danach der
harte Abbruch: der gesamte Browser wurde geschlossen (`context.close()`), das
Profil blieb auf der Festplatte liegen. Anschließend neu geöffnet.

- Nach dem Neustart: **150 Ereignisse**, unverändert.
- Bestandstabelle vor und nach dem Neustart **zeichenweise identisch**.
- **20 von 20** Schülern weiterhin mit vollem Statuspunkt.

## Test 3 — Zusammenführung · **bestanden**

Drei Geräte mit je vier erfassten Schülern. Station 2 hat vor ihrem Export die
Datei von Station 1 eingelesen — dadurch überschneiden sich die Dateien
tatsächlich, statt nur nebeneinander zu liegen.

- Drei Dateien mit zusammen **122 Zeilen**, darunter **92 verschiedene**
  Ereignisse (30 Dubletten).
- Alle drei auf einem vierten, leeren Gerät eingelesen: **92 Ereignisse**.
- Meldung der App: *„122 Ereignisse gelesen, 92 neu, 30 bereits vorhanden."*
- Die Bestandstabelle wurde **unabhängig nachgerechnet** — außerhalb der App,
  direkt aus den drei Dateien, mit einer zweiten Umsetzung der Regel „spätester
  Zeitstempel gewinnt, bei Gleichstand die größere Kennung". Alle acht Spalten
  aller 19 Titel stimmen exakt überein.

Keine Dublette zählt doppelt.

## Test 4 — Reihenfolge-Test · **bestanden**

Dieselben drei Dateien auf einem weiteren leeren Gerät eingelesen, aber in der
Reihenfolge **3 → 2 → 1** und in drei getrennten Vorgängen statt in einem.

- **92 Ereignisse**, genau wie bei Reihenfolge 1-2-3.
- Letzte Meldung: *„30 Ereignisse gelesen, 0 neu, 30 bereits vorhanden."*
- Bestandstabellen beider Geräte **zeichenweise identisch**.

## Test 5 — Korrektur-Test · **bestanden**

Ein Buch abgehakt, wieder abgewählt, erneut abgehakt.

- In der Datenbank stehen **drei** Ereignisse:
  `ausgabe` → `zurueckgesetzt` → `ausgabe`.
- Angezeigter Endzustand: **ausgegeben**.
- Die Anzeige folgte in jedem Schritt (`true` → `false` → `true`).

Kein vorhandenes Ereignis wurde geändert oder gelöscht; jede Korrektur ist ein
neuer Datensatz.

## Test 6 — Tempo-Test · **bestanden**

Schülerin Tannhäuser, Klasse 5a, sieben Bücher.

- **9 Berührungen**: 1× Trefferzeile, 7× Buchzeile, 1× Fertig. Grenze: 9.
- **0,7 Sekunden** vom Antippen des Treffers bis zurück in der Suche.
  Grenze: 20 Sekunden.
- 7 Ereignisse geschrieben.

Die 0,7 Sekunden sind die Zeit der Maschine, nicht die eines Menschen. Aussagen
lässt sich daraus nur: die App bremst niemanden. Die Berührungszahl dagegen ist
eine echte Eigenschaft der Oberfläche und liegt genau auf der Grenze — jeder
zusätzliche Bestätigungsschritt würde sie reißen.

## Test 7 — Schreibfehler-Test · **bestanden**

Das Schreiben in IndexedDB wurde künstlich zum Scheitern gebracht
(`window.buecherkellerPruefstand.schreibfehler = true`, siehe
`ENTSCHEIDUNGEN.md`), dann ein Buch angetippt.

- Blockierende Meldung erschien: **„Nicht gespeichert. Vorgang wiederholen."**
- Zeile **rot markiert**.
- Zeile **nicht** als erledigt angezeigt (`aria-pressed="false"`).
- Fortschritt blieb bei **„0 von 7"**.
- Ereignisse in der Datenbank: **0**.

Danach die Störung aufgehoben und **Erneut versuchen** getippt: 1 Ereignis
geschrieben, Zeile erledigt. Der Fehler war also weder still noch endgültig.

---

## Was zusätzlich geprüft wurde

Nicht vom Bauplan verlangt, aber mitgelaufen:

- **Beide Bildschirmlagen.** Alle sechs Bildschirme in Quer- (1180×820) und
  Hochformat (820×1180) gerendert und angesehen. Kein Überlauf, kein
  waagerechtes Scrollen außer in der Bestandstabelle, wo es vorgesehen ist.
- **Umlaut-Suche.** „mu" findet „Mühlbauer" und „Müller".
- **Paketableitung.** Zwei Schülerinnen der Klasse 5a mit verschiedenen Kursen
  bekommen sichtbar verschiedene Listen (Religion bzw. Ethik). Der Titel
  „Green Line 5" steht absichtlich in zwei Paketen des Jahrgangs 9 und erscheint
  trotzdem nur einmal — alle 75 Neuntklässler haben genau 9 Titel.
- **Erzwungene Sicherung.** Ist in Test 2 zweimal von selbst ausgelöst worden
  und ließ sich nur über „Sicherung erstellen" verlassen.

## Was nicht geprüft ist

- **Echtes iPad, echtes Safari.** Siehe oben. Das ist die einzige verbleibende
  Lücke von Gewicht.
- **Verhalten unter Speicherdruck auf iOS.** Ob Safari die Daten unter Druck
  verwirft, lässt sich nur auf dem Gerät und über Tage feststellen. Die
  erzwungene Sicherung ist genau die Antwort darauf und hängt nicht davon ab.
- **Drei Geräte gleichzeitig im selben Raum.** Es gibt keine Verbindung zwischen
  ihnen, also auch nichts, was sich gegenseitig stören könnte; geprüft wurde die
  Zusammenführung ihrer Dateien.
