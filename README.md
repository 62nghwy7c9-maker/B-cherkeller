# Bücherkeller

Eine Web-App für die jährliche Schulbuchausgabe im Keller. Sie läuft auf iPads,
**ohne Internet**, an drei Tischen gleichzeitig. Abends werden die drei Geräte
zusammengeführt.

Dies ist ein **Prototyp** mit **erfundenen Testdaten** für zwei Jahrgangsstufen.
Er enthält keine echten Schülerdaten.

---

## Inhalt

1. [Was diese App tut](#1-was-diese-app-tut)
2. [Die Dateien ins Netz stellen](#2-die-dateien-ins-netz-stellen)
3. [Auf den iPad-Home-Bildschirm legen](#3-auf-den-ipad-home-bildschirm-legen)
4. [Der Ablauf am Ausgabetag](#4-der-ablauf-am-ausgabetag)
5. [Abends: die drei Geräte zusammenführen](#5-abends-die-drei-geräte-zusammenführen)
6. [Wenn etwas schiefgeht](#6-wenn-etwas-schiefgeht)
7. [Eigene Daten einsetzen](#7-eigene-daten-einsetzen)
8. [Was die App bewusst nicht kann](#8-was-die-app-bewusst-nicht-kann)

---

## 1. Was diese App tut

Ein Helfer tippt den Namen eines Schülers ein, tippt die Bücher an, die der
Schüler bekommt, und tippt auf **Fertig**. Das war's.

Welche Bücher ein Schüler bekommt, rechnet die App selbst aus. Gepflegt werden
nur **Pakete** — zum Beispiel „Jahrgang 5, Pflicht" und „Jahrgang 5, Ethik".
Niemand muss individuelle Bücherlisten schreiben.

Alles wird **sofort** auf dem iPad gespeichert. Es gibt keinen Speichern-Knopf.

---

## 2. Die Dateien ins Netz stellen

„Hosten" heißt: die Dateien auf einen Rechner legen, den die iPads über eine
Adresse erreichen können. Die App braucht **keinen Server, keine Datenbank und
kein Programm** — nur einen Ort, der Dateien ausliefert.

**Was hochgeladen wird:** der komplette Ordnerinhalt, mit allen Unterordnern:

```
index.html
app.js
style.css
sw.js
manifest.json
daten/stammdaten.json
fonts/     (drei Schriftdateien)
icons/     (drei Bilddateien)
```

Der Ordner `werkzeuge/` wird **nicht** gebraucht. Er enthält nur zwei Hilfsskripte,
mit denen die Testdaten und die Symbole erzeugt wurden.

**Wichtig: Die Adresse muss mit `https://` beginnen.** Sonst legt Safari die
Dateien nicht dauerhaft auf dem iPad ab, und die App startet ohne Netz nicht.
Kostenlose Möglichkeiten, die von sich aus `https` liefern, sind zum Beispiel
GitHub Pages, Netlify Drop oder Cloudflare Pages. Bei allen dreien zieht man den
Ordner auf eine Webseite und bekommt eine Adresse zurück.

**Prüfen, ob es geklappt hat:**

1. Adresse im Safari auf dem iPad öffnen. Es muss „GERÄT EINRICHTEN" erscheinen.
2. Station und Modus auswählen, auf **Weiter zur Suche** tippen.
3. Zwei Minuten warten (die App legt in dieser Zeit alle Dateien ab).
4. **Flugmodus einschalten**, Seite neu laden. Wenn die App weiterhin läuft:
   fertig.

Schritt 4 ist der einzige Test, der wirklich zählt. Vor dem Ausgabetag auf
**jedem** der drei iPads einmal machen.

---

## 3. Auf den iPad-Home-Bildschirm legen

PWA heißt „Progressive Web App": eine Webseite, die sich wie eine App verhält —
mit eigenem Symbol, ohne Adresszeile.

Auf dem iPad, in **Safari** (nicht in Chrome — dort funktioniert es nicht):

1. Die Adresse öffnen.
2. Oben das **Teilen-Symbol** antippen (Quadrat mit Pfeil nach oben).
3. In der Liste nach unten wischen, **Zum Home-Bildschirm** antippen.
4. Bestätigen. Auf dem Home-Bildschirm liegt jetzt „Bücherkeller".

Ab jetzt die App **immer über dieses Symbol** öffnen, nicht über Safari.

Danach einmalig einrichten: **Station 1, 2 oder 3** und **Ausgabe** wählen. Jedes
iPad bekommt eine andere Stationsnummer. Diese Auswahl bleibt gespeichert.

---

## 4. Der Ablauf am Ausgabetag

**Für die Helfer am Tisch. Mehr als das hier ist nicht zu wissen:**

1. Der Schüler nennt seinen Namen. Nachnamen eintippen — es genügen zwei, drei
   Buchstaben. Umlaute sind egal: „muller" findet „Müller".
2. Auf die Zeile mit dem richtigen Namen tippen. Die Klasse steht rechts daneben.
3. Jedes Buch, das der Schüler bekommt, antippen. Die Zeile wird grün.
   Versehentlich angetippt? Nochmal antippen, dann ist es wieder offen.
4. Fehlt ein Buch im Regal oder ist es kaputt: rechts in der Zeile auf
   **Problem** tippen und **Fehlt** oder **Beschädigt** wählen. Eine Notiz ist
   möglich, aber freiwillig.
5. Auf **Fertig** tippen. Wenn noch Bücher offen sind, fragt die App nach.
6. Nächster Schüler.

**Der Zähler oben rechts** zeigt, wie viele Eintragungen das Gerät hat. Er muss
mit jedem Tipp wachsen. Tut er das nicht, sofort einen Erwachsenen holen.

**Nach je 10 Schülern** blockiert die App und verlangt eine Sicherung. Auf
**Sicherung erstellen** tippen — die Datei landet auf dem iPad unter „Dateien".
Danach geht es weiter. Das dauert fünf Sekunden und ist nicht verhandelbar:
Es ist die Versicherung dagegen, dass ein kaputtes iPad einen halben Tag Arbeit
mitnimmt.

**Wenn eine rote Meldung erscheint** („Nicht gespeichert. Vorgang wiederholen."):
Der letzte Tipp ist **nicht** gespeichert. Auf **Erneut versuchen** tippen.
Hilft das nicht, das iPad neu starten und den Schüler noch einmal aufrufen.

---

## 5. Abends: die drei Geräte zusammenführen

„Zusammenführen" heißt: die Eintragungen aller drei Tische auf einem Gerät
sammeln, damit die Bestandszahlen stimmen.

**Auf jedem der drei iPads:**

1. App öffnen, oben auf **Sicherung** tippen.
2. **Sicherung erstellen** antippen. Die Datei heißt zum Beispiel
   `buecherkeller-station2-2026-09-08-1432.json`.
3. Die Datei auf **ein** Gerät bringen — per AirDrop, per E-Mail an sich selbst,
   oder alle drei iPads in dieselbe iCloud-Ablage sichern lassen.

**Dann auf dem einen Gerät:**

4. **Sicherung** → **Dateien auswählen**. Alle drei Dateien auf einmal auswählen.
5. Die App meldet zum Beispiel: „412 Ereignisse gelesen, 118 neu, 294 bereits
   vorhanden." Das ist richtig so — doppelte Eintragungen werden erkannt und
   nur einmal gezählt.
6. Auf **Bestand** tippen. Jetzt stehen dort die echten Gesamtzahlen.

Die Reihenfolge der Dateien spielt keine Rolle. Dieselben Dateien zweimal
einzulesen schadet nicht. Es kann **nichts** doppelt gezählt werden.

**Merksatz:** Die neueste Sicherungsdatei eines Geräts enthält immer *alles*,
was auf diesem Gerät jemals eingetragen wurde. Ältere Dateien kann man wegwerfen.

---

## 6. Wenn etwas schiefgeht

**Ein iPad geht kaputt oder verliert die Daten.**
Auf einem anderen iPad die letzte Sicherungsdatei des kaputten Geräts einlesen.
Verloren sind höchstens die Schüler seit der letzten Sicherung — also höchstens
neun.

**Die App startet nicht mehr / zeigt eine weiße Seite.**
App schließen (von unten hochwischen, Vorschaukarte nach oben schieben) und neu
öffnen. Hilft das nicht: iPad neu starten. Die Daten liegen im iPad, nicht in
der App-Anzeige — sie sind davon nicht betroffen. **Nicht** die App vom
Home-Bildschirm löschen: das löscht die Daten mit.

**Die App zeigt „App konnte nicht starten".**
Dann fehlt eine Datei auf dem Webspace. Alle Dateien noch einmal hochladen, in
der gleichen Ordnerstruktur.

**Zwei Geräte zeigen unterschiedliche Zahlen im Bestand.**
Das ist normal und richtig. Jedes Gerät zeigt nur, was es selbst weiß. Die rote
Zeile oben im Bestand sagt das auch. Erst nach dem Zusammenführen stimmen die
Zahlen.

**Nach einer neuen Fassung: prüfen, ob alle iPads sie haben.**
**Einstellungen** → **Fassung**. Auf allen drei Geräten muss dieselbe Kennung
stehen. Steht dort eine alte: App schließen und zweimal öffnen.

**Vor der Vorführung alles leeren.**
**Einstellungen** → **Demo zurücksetzen** → das Wort `RESET` eintippen. Das
löscht alle Eintragungen dieses Geräts. Das lässt sich nicht rückgängig machen.

---

## 7. Eigene Daten einsetzen

Alle Schüler, Titel und Pakete stehen in **einer** Datei:
`daten/stammdaten.json`. Nur diese Datei tauschen — an der App selbst ist nichts
zu ändern, auch nicht bei anderen Jahrgangsstufen.

Der Aufbau, verkürzt:

```json
{
  "version": 1,
  "schuljahr": "2026/27",
  "schueler": [
    { "id": "s-0001", "nachname": "Bergmann", "vorname": "Lena",
      "klasse": "5a", "stufe": 5, "kurse": ["rel"] }
  ],
  "titel": [
    { "id": "t-501", "titel": "Lambacher Schweizer 5",
      "fach": "Mathematik", "bestandGesamt": 96 }
  ],
  "pakete": [
    { "id": "p-5-basis", "stufe": 5, "kurs": null,
      "titelIds": ["t-501", "t-502"] },
    { "id": "p-5-rel", "stufe": 5, "kurs": "rel", "titelIds": ["t-510"] }
  ]
}
```

Die Regel, nach der die App die Bücherliste eines Schülers bildet:

> Ein Schüler bekommt die Titel **aller** Pakete, deren `stufe` zu seiner Stufe
> passt **und** deren `kurs` entweder `null` ist (dann gilt das Paket für alle
> dieser Stufe) oder in seiner Liste `kurse` steht.

Steht ein Titel in mehreren Paketen, erscheint er trotzdem nur einmal.

Zwei Regeln beim Ändern:
- Jede `id` darf nur einmal vorkommen und muss überall gleich geschrieben sein.
- Nach dem Austauschen die Kennung `FASSUNG` in `app.js` **und** `CACHE_NAME` in
  `sw.js` erhöhen (beide stehen ganz oben in der jeweiligen Datei und müssen
  gleich lauten). Sonst behalten die iPads die alten Daten.

Die Testdaten dieses Prototyps wurden mit `werkzeuge/testdaten-erzeugen.py`
erzeugt; die Symbole mit `werkzeuge/icons-erzeugen.py`. Beide Skripte laufen auf
einem Computer, nicht auf dem iPad, und gehören nicht zur App.

---

## 8. Was die App bewusst nicht kann

Kein Login. Keine Benutzerverwaltung. Keine Cloud. Keine Live-Synchronisation
zwischen den Tischen. Keine Exemplarnummern, keine Barcodes. Keine Gebühren oder
Mahnungen. Keine Druckansicht. Nur Deutsch. Keine weiteren Auswertungen als die
Bestandstabelle.

Jede dieser Funktionen würde den Prototyp größer und anfälliger machen, ohne der
Vorführung zu nützen.

---

Ergebnisse der Abnahmetests: siehe `ABNAHME.md`.
Offengelassene Entscheidungen und wie sie getroffen wurden: siehe
`ENTSCHEIDUNGEN.md`.
