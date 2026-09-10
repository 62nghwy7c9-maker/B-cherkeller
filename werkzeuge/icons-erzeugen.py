#!/usr/bin/env python3
"""Erzeugt die App-Symbole in icons/ (180, 192 und 512 Pixel).

Aufruf aus dem Projektordner:   python3 werkzeuge/icons-erzeugen.py

Gehoert nicht zur App, laeuft einmalig. Schreibt schlichte PNG-Dateien aus den
Projektfarben: Papierfarbe als Flaeche, drei Buchruecken in der Akzentfarbe.
Ohne Zusatzbibliotheken -- PNG wird direkt zusammengesetzt.
"""

import struct
import zlib
from pathlib import Path

# Farben aus dem Logo der Schule (gymnasiumkerpen.eu).
GRUND = (0x11, 0x11, 0x11)
ORANGE = (0xFC, 0x8F, 0x00)
GELB = (0xF9, 0xEA, 0x11)
WEISS = (0xFF, 0xFF, 0xFF)


def png_schreiben(pfad, breite, hoehe, pixel):
    """pixel: Liste von Zeilen, jede Zeile eine Liste von (r,g,b)."""
    roh = bytearray()
    for zeile in pixel:
        roh.append(0)  # Filtertyp 0 = keiner
        for r, g, b in zeile:
            roh += bytes((r, g, b))

    def chunk(typ, daten):
        return (struct.pack(">I", len(daten)) + typ + daten
                + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF))

    kopf = struct.pack(">IIBBBBB", breite, hoehe, 8, 2, 0, 0, 0)
    datei = (b"\x89PNG\r\n\x1a\n"
             + chunk(b"IHDR", kopf)
             + chunk(b"IDAT", zlib.compress(bytes(roh), 9))
             + chunk(b"IEND", b""))
    Path(pfad).write_bytes(datei)


def symbol(groesse):
    e = groesse / 512.0  # Einheit: alles ist fuer 512 Pixel gedacht
    ruecken = [
        (112, 150, 300, ORANGE),   # x, y, hoehe, farbe
        (208, 118, 332, GELB),
        (304, 176, 274, WEISS),
    ]
    breite_ruecken = 64
    zeilen = []
    for y in range(groesse):
        zeile = []
        for x in range(groesse):
            farbe = GRUND
            for rx, ry, rh, rf in ruecken:
                if rx * e <= x < (rx + breite_ruecken) * e and ry * e <= y < (ry + rh) * e:
                    farbe = rf
                    break
            # Bodenlinie (Regalbrett), Haarlinie im Sinne der Gestaltung
            if 450 * e <= y < 454 * e and 80 * e <= x < 432 * e:
                farbe = WEISS
            zeile.append(farbe)
        zeilen.append(zeile)
    return zeilen


def main():
    ziel = Path(__file__).resolve().parent.parent / "icons"
    ziel.mkdir(exist_ok=True)
    for g in (180, 192, 512):
        pfad = ziel / f"icon-{g}.png"
        png_schreiben(pfad, g, g, symbol(g))
        print(f"{pfad} ({pfad.stat().st_size} Bytes)")


if __name__ == "__main__":
    main()
