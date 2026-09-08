#!/usr/bin/env python3
"""Erzeugt daten/stammdaten.json mit erfundenen Testdaten.

Aufruf aus dem Projektordner:   python3 werkzeuge/testdaten-erzeugen.py

Dieses Skript gehoert NICHT zur App. Es laeuft einmalig auf einem Computer und
schreibt die Datei daten/stammdaten.json. Die App selbst liest nur diese Datei.
Wer andere Jahrgaenge braucht, tauscht entweder die JSON-Datei aus oder passt
die Listen weiter unten an und laesst das Skript erneut laufen.

Alle Namen sind frei erfunden. Es sind keine realen Personen gemeint.
"""

import json
import random
from pathlib import Path

random.seed(20260908)  # feste Zahl => bei jedem Lauf dieselben Testdaten

NACHNAMEN = [
    "Müller", "Bergmann", "Voigt", "Kästner", "Reinhold", "Sattler", "Hufnagel",
    "Brenner", "Dallmann", "Ellwanger", "Frohberg", "Gerlach", "Haberkorn",
    "Imhoff", "Jungbluth", "Kellermann", "Lindtner", "Marquardt", "Nordhoff",
    "Ostermann", "Pfeiffer", "Quandt", "Rothenberger", "Schuricht", "Tannhäuser",
    "Uhlmann", "Vollrath", "Wetzlar", "Zangerle", "Ahrenkiel", "Büchner",
    "Cordes", "Dietrich", "Eggebrecht", "Fahrenkamp", "Grothe", "Heidenreich",
    "Ihlenfeld", "Junghans", "Kröger", "Lemberger", "Mahlberg", "Niederhoff",
    "Oberländer", "Perlbach", "Rieckhoff", "Steinhauer", "Thelen", "Übelacker",
    "Vietinghoff", "Wemhöner", "Zeitler", "Angermann", "Bodenstein", "Cranach",
    "Düwel", "Erlenbusch", "Fingerhut", "Goldbach", "Hasselbach", "Isenbeck",
    "Kaltenbrunn", "Lohmeyer", "Mühlbauer", "Nesselrode", "Oppenrieder",
    "Prüssing", "Rebenstock", "Sonnenschein", "Trautwein", "Unverzagt",
    "Vahlbruch", "Weinhold", "Zöllner", "Achterberg", "Brüggemann", "Schöller",
    "Gerstenkorn", "Halbach", "Kienbaum", "Löwenhagen", "Maibaum", "Rautenberg",
]

VORNAMEN = [
    "Lena", "Jonas", "Mila", "Fynn", "Ida", "Emil", "Nele", "Aaron", "Frieda",
    "Levi", "Marlene", "Theo", "Johanna", "Mats", "Clara", "Bruno", "Romy",
    "Jasper", "Hedda", "Silas", "Alma", "Linus", "Greta", "Anton", "Malin",
    "Oskar", "Juna", "Milo", "Elif", "Nuri", "Amira", "Kian", "Selma", "Deniz",
    "Yara", "Levin", "Thies", "Merle", "Bela", "Nora", "Fiete", "Charlotte",
    "Karl", "Emma", "Henry", "Pia", "Jost", "Runa", "Vincent", "Elsa", "Piet",
    "Toni", "Mika", "Lia", "Jaron", "Neele", "Bosse", "Ilvy", "Arne", "Tamme",
    "Jörn", "Käthe", "Sören", "Lüder", "Björn", "Mareike", "Hendrik", "Änne",
]

TITEL = [
    # Jahrgang 5 -- Pflicht (6 Titel)
    {"id": "t-501", "titel": "Lambacher Schweizer 5", "fach": "Mathematik", "bestandGesamt": 96},
    {"id": "t-502", "titel": "Deutschbuch 5", "fach": "Deutsch", "bestandGesamt": 88},
    {"id": "t-503", "titel": "Green Line 1", "fach": "Englisch", "bestandGesamt": 71},
    {"id": "t-504", "titel": "Prisma Naturwissenschaften 5", "fach": "Naturwissenschaften", "bestandGesamt": 104},
    {"id": "t-505", "titel": "Terra Erdkunde 5", "fach": "Erdkunde", "bestandGesamt": 82},
    {"id": "t-506", "titel": "Musik um uns 5", "fach": "Musik", "bestandGesamt": 118},
    # Jahrgang 5 -- Wahl
    {"id": "t-510", "titel": "Wege des Glaubens 5", "fach": "Religion", "bestandGesamt": 62},
    {"id": "t-511", "titel": "Fair Play Ethik 5", "fach": "Ethik", "bestandGesamt": 60},
    # Jahrgang 9 -- Pflicht (7 Titel)
    {"id": "t-901", "titel": "Lambacher Schweizer 9", "fach": "Mathematik", "bestandGesamt": 92},
    {"id": "t-902", "titel": "Deutschbuch 9", "fach": "Deutsch", "bestandGesamt": 86},
    {"id": "t-903", "titel": "Green Line 5", "fach": "Englisch", "bestandGesamt": 74},
    {"id": "t-904", "titel": "Impulse Physik 9", "fach": "Physik", "bestandGesamt": 110},
    {"id": "t-905", "titel": "Chemie heute 9", "fach": "Chemie", "bestandGesamt": 98},
    {"id": "t-906", "titel": "Natura Biologie 9", "fach": "Biologie", "bestandGesamt": 105},
    {"id": "t-907", "titel": "Geschichte und Geschehen 9", "fach": "Geschichte", "bestandGesamt": 140},
    # Jahrgang 9 -- Wahl 2. Fremdsprache
    {"id": "t-910", "titel": "Découvertes 4", "fach": "Französisch", "bestandGesamt": 64},
    {"id": "t-911", "titel": "Cursus 4", "fach": "Latein", "bestandGesamt": 60},
    # Jahrgang 9 -- Wahl Religion / Ethik
    {"id": "t-912", "titel": "Wege des Glaubens 9", "fach": "Religion", "bestandGesamt": 66},
    {"id": "t-913", "titel": "Fair Play Ethik 9", "fach": "Ethik", "bestandGesamt": 60},
]

PAKETE = [
    {"id": "p-5-basis", "stufe": 5, "kurs": None,
     "titelIds": ["t-501", "t-502", "t-503", "t-504", "t-505", "t-506"]},
    {"id": "p-5-rel", "stufe": 5, "kurs": "rel", "titelIds": ["t-510"]},
    {"id": "p-5-eth", "stufe": 5, "kurs": "eth", "titelIds": ["t-511"]},

    {"id": "p-9-basis", "stufe": 9, "kurs": None,
     "titelIds": ["t-901", "t-902", "t-903", "t-904", "t-905", "t-906", "t-907"]},
    # Absicht: t-903 steht auch hier drin. Die Fachschaft Fremdsprachen pflegt
    # ihr Paket eigenstaendig und fuehrt das Englischbuch mit auf. Die App muss
    # den Titel trotzdem nur einmal anzeigen.
    {"id": "p-9-fr", "stufe": 9, "kurs": "fr", "titelIds": ["t-910", "t-903"]},
    {"id": "p-9-la", "stufe": 9, "kurs": "la", "titelIds": ["t-911"]},
    {"id": "p-9-rel", "stufe": 9, "kurs": "rel", "titelIds": ["t-912"]},
    {"id": "p-9-eth", "stufe": 9, "kurs": "eth", "titelIds": ["t-913"]},
]

def main():
    schueler = []
    nummer = 0
    nachnamen = NACHNAMEN[:]
    vornamen = VORNAMEN[:]

    for stufe in (5, 9):
        for klassenbuchstabe in ("a", "b", "c"):
            klasse = f"{stufe}{klassenbuchstabe}"
            for i in range(25):
                nummer += 1
                kurse = []
                # Religion / Ethik: abwechselnd, damit in jeder Klasse beides vorkommt
                kurse.append("rel" if i % 2 == 0 else "eth")
                if stufe == 9:
                    # 2. Fremdsprache: Franzoesisch / Latein, anderer Rhythmus
                    kurse.append("fr" if i % 3 != 0 else "la")
                schueler.append({
                    "id": f"s-{nummer:04d}",
                    "nachname": random.choice(nachnamen),
                    "vorname": random.choice(vornamen),
                    "klasse": klasse,
                    "stufe": stufe,
                    "kurse": kurse,
                })

    titel = TITEL

    stammdaten = {
        "version": 1,
        "schuljahr": "2026/27",
        "hinweis": "Erfundene Testdaten. Keine realen Personen.",
        "schueler": schueler,
        "titel": titel,
        "pakete": PAKETE,
    }

    ziel = Path(__file__).resolve().parent.parent / "daten" / "stammdaten.json"
    ziel.write_text(json.dumps(stammdaten, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    print(f"{ziel}: {len(schueler)} Schüler, {len(titel)} Titel, {len(PAKETE)} Pakete")


if __name__ == "__main__":
    main()
