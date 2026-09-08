/* Bücherkeller — Offline-Prototyp
 *
 * Reines ES-Modul, keine Abhängigkeiten, kein Build-Schritt.
 * Aufbau dieser Datei, von oben nach unten:
 *
 *   1  Fassung und Konstanten
 *   2  Einstellungen des Geräts (Station, Modus, Sicherungsstand)
 *   3  Datenbank (IndexedDB, ausschliesslich anhängend)
 *   4  Stammdaten und Paketableitung
 *   5  Zustandsableitung aus den Ereignissen
 *   6  Dialoge
 *   7  Kopfzeile, Navigation, Ansichtswechsel
 *   8  Ansicht Start
 *   9  Ansicht Suche
 *  10  Ansicht Schüler
 *  11  Ansicht Bestand
 *  12  Ansicht Sicherung (Export, Import)
 *  13  Ansicht Einstellungen
 *  14  Sicherungspflicht
 *  15  Start der Anwendung
 */

/* ------------------------------------------------------------------ *
 * 1  Fassung und Konstanten
 * ------------------------------------------------------------------ */

/* Diese Kennung steht in den Einstellungen und muss mit CACHE_NAME in
   sw.js übereinstimmen. Bei jeder Änderung an den Dateien beide erhöhen. */
export const FASSUNG = '2026-09-08-1';

const DB_NAME = 'buecherkeller';
const DB_FASSUNG = 1;
const STORE = 'ereignisse';

const SPEICHER_STATION = 'buecherkeller.station';
const SPEICHER_MODUS = 'buecherkeller.modus';
const SPEICHER_SICHERUNG_ANZAHL = 'buecherkeller.sicherung.anzahl';
const SPEICHER_SICHERUNG_ZEIT = 'buecherkeller.sicherung.zeit';
const SPEICHER_ABGESCHLOSSEN = 'buecherkeller.abgeschlossen';
const SPEICHER_SICHERUNG_OFFEN = 'buecherkeller.sicherung.offen';

/* Nach so vielen abgeschlossenen Schülern blockiert die App und verlangt
   eine Sicherung. Höchstverlust bei Totalausfall: neun Schüler. */
const SICHERUNG_ALLE = 10;

const TYPEN = ['ausgabe', 'rueckgabe', 'fehlt', 'beschaedigt', 'zurueckgesetzt'];

const ZUSTAND_WORT = {
  offen: 'offen',
  ausgegeben: 'ausgegeben',
  zurueck: 'zurück',
  fehlt: 'fehlt',
  beschaedigt: 'beschädigt',
};

/* Prüfstand: nur für den Abnahmetest 7 (Schreibfehler). Ist im normalen
   Betrieb wirkungslos, weil niemand ihn einschaltet. */
export const pruefstand = { schreibfehler: false };
window.buecherkellerPruefstand = pruefstand;

/* ------------------------------------------------------------------ *
 * 2  Einstellungen des Geräts
 * ------------------------------------------------------------------ */

const einstellungen = {
  get station() { return localStorage.getItem(SPEICHER_STATION); },
  set station(v) { localStorage.setItem(SPEICHER_STATION, v); },
  get modus() { return localStorage.getItem(SPEICHER_MODUS); },
  set modus(v) { localStorage.setItem(SPEICHER_MODUS, v); },
  get sicherungAnzahl() { return Number(localStorage.getItem(SPEICHER_SICHERUNG_ANZAHL) || 0); },
  set sicherungAnzahl(v) { localStorage.setItem(SPEICHER_SICHERUNG_ANZAHL, String(v)); },
  get sicherungZeit() { return localStorage.getItem(SPEICHER_SICHERUNG_ZEIT) || ''; },
  set sicherungZeit(v) { localStorage.setItem(SPEICHER_SICHERUNG_ZEIT, v); },
  get abgeschlossen() { return Number(localStorage.getItem(SPEICHER_ABGESCHLOSSEN) || 0); },
  set abgeschlossen(v) { localStorage.setItem(SPEICHER_ABGESCHLOSSEN, String(v)); },
  get sicherungOffen() { return localStorage.getItem(SPEICHER_SICHERUNG_OFFEN) === '1'; },
  set sicherungOffen(v) { localStorage.setItem(SPEICHER_SICHERUNG_OFFEN, v ? '1' : '0'); },
};

/* ------------------------------------------------------------------ *
 * 3  Datenbank
 *
 * Ein Object Store, Schlüssel ist die Ereignis-Kennung. Es wird
 * ausschliesslich add() benutzt — nie put(), nie delete(). Eine Korrektur
 * ist immer ein neues Ereignis. Einzige Ausnahme: "Demo zurücksetzen".
 * ------------------------------------------------------------------ */

let db = null;

function datenbankOeffnen() {
  return new Promise((fertig, fehler) => {
    const anfrage = indexedDB.open(DB_NAME, DB_FASSUNG);
    anfrage.onupgradeneeded = () => {
      const d = anfrage.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    anfrage.onsuccess = () => fertig(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error);
    anfrage.onblocked = () => fehler(new Error('Datenbank blockiert'));
  });
}

function alleEreignisseLesen() {
  return new Promise((fertig, fehler) => {
    const t = db.transaction(STORE, 'readonly');
    const a = t.objectStore(STORE).getAll();
    a.onsuccess = () => fertig(a.result || []);
    a.onerror = () => fehler(a.error);
  });
}

/* Schreibt Ereignisse. Löst erst auf, wenn die Transaktion vollständig
   abgeschlossen ist — vorher gilt nichts als gesichert. */
function ereignisseSchreiben(liste) {
  return new Promise((fertig, fehler) => {
    if (pruefstand.schreibfehler) {
      fehler(new Error('Schreibfehler erzwungen (Prüfstand)'));
      return;
    }
    let t;
    try {
      t = db.transaction(STORE, 'readwrite');
    } catch (e) {
      fehler(e);
      return;
    }
    const store = t.objectStore(STORE);
    for (const ev of liste) store.add(ev);
    t.oncomplete = () => fertig();
    t.onerror = () => fehler(t.error || new Error('Schreibfehler'));
    t.onabort = () => fehler(t.error || new Error('Transaktion abgebrochen'));
  });
}

function alleEreignisseLoeschen() {
  return new Promise((fertig, fehler) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).clear();
    t.oncomplete = () => fertig();
    t.onerror = () => fehler(t.error);
    t.onabort = () => fehler(t.error);
  });
}

/* Weltweit eindeutige Kennung. crypto.randomUUID() gibt es nur in sicherem
   Kontext (https oder localhost); sonst wird dieselbe Form aus Zufallsbytes
   gebaut. Beides ist eine UUID der Fassung 4. */
function neueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* ------------------------------------------------------------------ *
 * 4  Stammdaten und Paketableitung
 * ------------------------------------------------------------------ */

let stammdaten = null;
const titelNach = new Map();     // titelId -> Titel
const schuelerNach = new Map();  // schuelerId -> Schüler
const paketListe = new Map();    // schuelerId -> [Titel]

function normal(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

async function stammdatenLaden() {
  const antwort = await fetch('daten/stammdaten.json');
  if (!antwort.ok) throw new Error('stammdaten.json nicht lesbar');
  stammdaten = await antwort.json();

  for (const t of stammdaten.titel) titelNach.set(t.id, t);

  for (const s of stammdaten.schueler) {
    s.such = normal(`${s.nachname} ${s.vorname}`);
    s.suchUmgekehrt = normal(`${s.vorname} ${s.nachname}`);
    schuelerNach.set(s.id, s);
    paketListe.set(s.id, buecherliste(s));
  }

  stammdaten.schueler.sort((a, b) =>
    a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
}

/* Ein Schüler erhält die Titel aller Pakete, deren Stufe passt und deren
   Kurs entweder leer ist oder von ihm belegt wird. Ein Titel, der in
   mehreren Paketen steht, erscheint trotzdem nur einmal. */
function buecherliste(schueler) {
  const ids = [];
  for (const paket of stammdaten.pakete) {
    if (paket.stufe !== schueler.stufe) continue;
    if (paket.kurs !== null && !schueler.kurse.includes(paket.kurs)) continue;
    for (const id of paket.titelIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids.map((id) => titelNach.get(id)).filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * 5  Zustandsableitung
 *
 * Der Zustand wird nie gespeichert. Für jedes Paar (Schüler, Titel)
 * gewinnt das Ereignis mit dem spätesten Zeitstempel; bei gleichem
 * Zeitstempel die alphabetisch grössere Kennung. Dadurch kommen alle
 * drei Geräte auf dasselbe Ergebnis, egal in welcher Reihenfolge die
 * Ereignisse zusammenkommen.
 * ------------------------------------------------------------------ */

let ereignisse = [];
const ereignisIds = new Set();
const sieger = new Map(); // "schuelerId|titelId" -> Ereignis

function schluessel(schuelerId, titelId) { return `${schuelerId}|${titelId}`; }

function gewinnt(neu, alt) {
  if (!alt) return true;
  if (neu.ts > alt.ts) return true;
  if (neu.ts < alt.ts) return false;
  return neu.id > alt.id;
}

function siegerEintragen(ev) {
  const k = schluessel(ev.schuelerId, ev.titelId);
  if (gewinnt(ev, sieger.get(k))) sieger.set(k, ev);
}

function ereignisseUebernehmen(liste) {
  for (const ev of liste) {
    ereignisse.push(ev);
    ereignisIds.add(ev.id);
    siegerEintragen(ev);
  }
}

function zustand(schuelerId, titelId) {
  const ev = sieger.get(schluessel(schuelerId, titelId));
  if (!ev) return 'offen';
  switch (ev.typ) {
    case 'ausgabe': return 'ausgegeben';
    case 'rueckgabe': return 'zurueck';
    case 'fehlt': return 'fehlt';
    case 'beschaedigt': return 'beschaedigt';
    default: return 'offen';
  }
}

function notiz(schuelerId, titelId) {
  const ev = sieger.get(schluessel(schuelerId, titelId));
  return ev && ev.notiz ? ev.notiz : '';
}

/* Erledigt heisst je nach Modus etwas anderes. */
function istErledigt(z) {
  if (einstellungen.modus === 'rueckgabe') {
    return z === 'zurueck' || z === 'fehlt' || z === 'beschaedigt';
  }
  return z === 'ausgegeben';
}

function fortschritt(schueler) {
  const liste = paketListe.get(schueler.id) || [];
  let erledigt = 0;
  for (const t of liste) if (istErledigt(zustand(schueler.id, t.id))) erledigt += 1;
  return { erledigt, gesamt: liste.length };
}

function gesamtStatus(schueler) {
  const { erledigt, gesamt } = fortschritt(schueler);
  if (gesamt > 0 && erledigt === gesamt) return 'fertig';
  if (erledigt > 0) return 'teilweise';
  return 'offen';
}

/* ------------------------------------------------------------------ *
 * 6  Dialoge
 * ------------------------------------------------------------------ */

const schicht = document.getElementById('dialog-schicht');
const dialogKasten = document.getElementById('dialog');
const dialogTitel = document.getElementById('dialog-titel');
const dialogInhalt = document.getElementById('dialog-inhalt');
const dialogKnoepfe = document.getElementById('dialog-knoepfe');

function dialogZeigen({ titel, inhalt, knoepfe, warnung = false }) {
  dialogTitel.textContent = titel;
  dialogInhalt.replaceChildren();
  if (typeof inhalt === 'string') {
    for (const absatz of inhalt.split('\n')) {
      if (!absatz) continue;
      const p = document.createElement('p');
      p.textContent = absatz;
      dialogInhalt.append(p);
    }
  } else if (inhalt) {
    dialogInhalt.append(inhalt);
  }
  dialogKnoepfe.replaceChildren();
  for (const k of knoepfe) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = k.art === 'haupt' ? 'knopf-haupt'
      : k.art === 'warnung' ? 'knopf-warnung' : 'knopf-zweit';
    b.textContent = k.text;
    b.addEventListener('click', () => k.fn());
    dialogKnoepfe.append(b);
  }
  dialogKasten.classList.toggle('warnung', warnung);
  schicht.hidden = false;
}

function dialogSchliessen() {
  schicht.hidden = true;
  dialogInhalt.replaceChildren();
  dialogKnoepfe.replaceChildren();
}

function dialogOffen() { return !schicht.hidden; }

/* ------------------------------------------------------------------ *
 * 7  Kopfzeile, Navigation, Ansichtswechsel
 * ------------------------------------------------------------------ */

const nav = document.getElementById('nav');
const sichten = {
  start: document.getElementById('v-start'),
  suche: document.getElementById('v-suche'),
  schueler: document.getElementById('v-schueler'),
  bestand: document.getElementById('v-bestand'),
  sicherung: document.getElementById('v-sicherung'),
  einstellungen: document.getElementById('v-einstellungen'),
};

let aktuelleSicht = 'start';

function sichtZeigen(name) {
  aktuelleSicht = name;
  for (const [schluesselName, el] of Object.entries(sichten)) {
    el.hidden = schluesselName !== name;
  }
  nav.hidden = (name === 'start');
  for (const knopf of nav.querySelectorAll('.nav-knopf')) {
    const ziel = knopf.dataset.ziel;
    const aktiv = ziel === name || (name === 'schueler' && ziel === 'suche');
    if (aktiv) knopf.setAttribute('aria-current', 'page');
    else knopf.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
  if (name === 'suche') sucheOeffnen();
  if (name === 'bestand') bestandZeichnen();
  if (name === 'sicherung') sicherungZeichnen();
  if (name === 'einstellungen') einstellungenZeichnen();
}

nav.addEventListener('click', (e) => {
  const knopf = e.target.closest('.nav-knopf');
  if (!knopf) return;
  sichtZeigen(knopf.dataset.ziel);
});

const zGesamt = document.getElementById('z-gesamt');
const zSeit = document.getElementById('z-seit');
const zSeitHuelle = document.getElementById('z-seit-huelle');
const kopfStation = document.getElementById('kopf-station');

function kopfZeichnen() {
  zGesamt.textContent = String(ereignisse.length);
  const seit = Math.max(0, ereignisse.length - einstellungen.sicherungAnzahl);
  zSeit.textContent = String(seit);
  zSeitHuelle.classList.toggle('mahnung', einstellungen.abgeschlossen >= SICHERUNG_ALLE - 2);
  if (einstellungen.station) {
    const modusWort = einstellungen.modus === 'rueckgabe' ? 'Rücknahme' : 'Ausgabe';
    kopfStation.textContent = `Station ${einstellungen.station} · ${modusWort}`;
  } else {
    kopfStation.textContent = '';
  }
}

/* ------------------------------------------------------------------ *
 * 8  Ansicht Start
 * ------------------------------------------------------------------ */

let startStation = null;
let startModus = null;

const startWeiter = document.getElementById('start-weiter');

document.getElementById('start-stationen').addEventListener('click', (e) => {
  const b = e.target.closest('[data-station]');
  if (!b) return;
  startStation = b.dataset.station;
  for (const k of document.querySelectorAll('[data-station]')) {
    k.setAttribute('aria-pressed', String(k === b));
  }
  startPruefen();
});

document.getElementById('start-modi').addEventListener('click', (e) => {
  const b = e.target.closest('[data-modus]');
  if (!b) return;
  startModus = b.dataset.modus;
  for (const k of document.querySelectorAll('[data-modus]')) {
    k.setAttribute('aria-pressed', String(k === b));
  }
  startPruefen();
});

function startPruefen() {
  startWeiter.disabled = !(startStation && startModus);
}

startWeiter.addEventListener('click', () => {
  if (!startStation || !startModus) return;
  einstellungen.station = startStation;
  einstellungen.modus = startModus;
  kopfZeichnen();
  sichtZeigen('suche');
});

/* ------------------------------------------------------------------ *
 * 9  Ansicht Suche
 * ------------------------------------------------------------------ */

const suchfeld = document.getElementById('suchfeld');
const trefferliste = document.getElementById('trefferliste');
const suchMeta = document.getElementById('such-meta');

function sucheOeffnen() {
  suchfeld.focus();
  trefferZeichnen();
}

suchfeld.addEventListener('input', trefferZeichnen);

function trefferZeichnen() {
  const roh = suchfeld.value.trim();
  trefferliste.replaceChildren();

  if (!roh) {
    suchMeta.textContent = `${stammdaten.schueler.length} Schüler · Namen eingeben`;
    return;
  }

  const begriff = normal(roh);
  const treffer = stammdaten.schueler.filter(
    (s) => s.such.includes(begriff) || s.suchUmgekehrt.includes(begriff));

  suchMeta.textContent = treffer.length === 1
    ? '1 Treffer'
    : `${treffer.length} Treffer`;

  const bruch = document.createDocumentFragment();
  for (const s of treffer) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'treffer';

    const punkt = document.createElement('span');
    punkt.className = `punkt ${gesamtStatus(s)}`;
    punkt.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'treffer-name';
    const stark = document.createElement('b');
    stark.textContent = s.nachname;
    name.append(stark, document.createTextNode(`, ${s.vorname}`));

    const klasse = document.createElement('span');
    klasse.className = 'treffer-klasse';
    klasse.textContent = s.klasse;

    b.append(punkt, name, klasse);
    b.addEventListener('click', () => schuelerOeffnen(s.id));
    li.append(b);
    bruch.append(li);
  }
  trefferliste.append(bruch);
}

/* ------------------------------------------------------------------ *
 * 10  Ansicht Schüler
 * ------------------------------------------------------------------ */

let offenerSchueler = null;

const schuelerName = document.getElementById('schueler-name');
const schuelerMeta = document.getElementById('schueler-meta');
const fortschrittText = document.getElementById('fortschritt-text');
const fortschrittBalken = document.getElementById('fortschritt-balken');
const titelliste = document.getElementById('titelliste');

document.getElementById('schueler-zurueck').addEventListener('click', () => {
  offenerSchueler = null;
  sichtZeigen('suche');
});

function schuelerOeffnen(id) {
  offenerSchueler = schuelerNach.get(id);
  schuelerZeichnen();
  sichtZeigen('schueler');
}

function schuelerZeichnen() {
  const s = offenerSchueler;
  if (!s) return;
  schuelerName.textContent = `${s.nachname}, ${s.vorname}`;
  const modusWort = einstellungen.modus === 'rueckgabe' ? 'Rücknahme' : 'Ausgabe';
  schuelerMeta.textContent = `Klasse ${s.klasse} · ${modusWort}`;

  titelliste.replaceChildren();
  for (const t of paketListe.get(s.id)) {
    titelliste.append(titelzeileBauen(s, t));
  }
  fortschrittZeichnen();
}

function fortschrittZeichnen() {
  const { erledigt, gesamt } = fortschritt(offenerSchueler);
  fortschrittText.textContent = `${erledigt} von ${gesamt}`;
  fortschrittBalken.style.width = gesamt ? `${(erledigt / gesamt) * 100}%` : '0';
}

function titelzeileBauen(schueler, titel) {
  const li = document.createElement('li');
  li.className = 'titelzeile';
  li.dataset.titelId = titel.id;

  const schalter = document.createElement('button');
  schalter.type = 'button';
  schalter.className = 'titel-schalter';

  const haken = document.createElement('span');
  haken.className = 'haken';
  haken.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'titel-text';
  const name = document.createElement('span');
  name.className = 'titel-name';
  name.textContent = titel.titel;
  const unten = document.createElement('span');
  unten.className = 'titel-fach';
  const zustandEl = document.createElement('span');
  zustandEl.className = 'titel-zustand';
  text.append(name, document.createElement('br'), unten, zustandEl);

  schalter.append(haken, text);
  schalter.addEventListener('click', () => umschalten(schueler, titel, li));

  const problem = document.createElement('button');
  problem.type = 'button';
  problem.className = 'knopf-problem';
  problem.textContent = 'Problem';
  problem.addEventListener('click', () => problemDialog(schueler, titel, li));

  li.append(schalter, problem);
  zeileAktualisieren(li, schueler, titel);
  return li;
}

function zeileAktualisieren(li, schueler, titel) {
  const z = zustand(schueler.id, titel.id);
  const erledigt = istErledigt(z);
  const schalter = li.querySelector('.titel-schalter');
  schalter.setAttribute('aria-pressed', String(erledigt));
  li.classList.toggle('problem', z === 'fehlt' || z === 'beschaedigt');
  li.querySelector('.titel-fach').textContent = titel.fach;
  const anmerkung = notiz(schueler.id, titel.id);
  const zustandEl = li.querySelector('.titel-zustand');
  if (z === 'offen') {
    zustandEl.textContent = '';
  } else {
    zustandEl.textContent = ` · ${ZUSTAND_WORT[z]}${anmerkung ? ` · ${anmerkung}` : ''}`;
  }
}

/* Tippen schaltet um: offen -> erledigt -> offen. Jeder Wechsel schreibt
   ein neues Ereignis, nie wird eines geändert. */
function umschalten(schueler, titel, li) {
  const z = zustand(schueler.id, titel.id);
  const neuerTyp = istErledigt(z)
    ? 'zurueckgesetzt'
    : (einstellungen.modus === 'rueckgabe' ? 'rueckgabe' : 'ausgabe');
  ereignisAusloesen(schueler, titel, li, neuerTyp, '');
}

function problemDialog(schueler, titel, li) {
  const huelle = document.createElement('div');
  const beschreibung = document.createElement('p');
  beschreibung.textContent = titel.titel;
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.className = 'dialog-eingabe';
  feld.placeholder = 'Notiz (freiwillig)';
  feld.value = notiz(schueler.id, titel.id);
  feld.autocapitalize = 'sentences';
  huelle.append(beschreibung, feld);

  dialogZeigen({
    titel: 'Problem melden',
    inhalt: huelle,
    warnung: true,
    knoepfe: [
      { text: 'Fehlt', art: 'warnung', fn: () => {
        dialogSchliessen();
        ereignisAusloesen(schueler, titel, li, 'fehlt', feld.value.trim());
      } },
      { text: 'Beschädigt', art: 'warnung', fn: () => {
        dialogSchliessen();
        ereignisAusloesen(schueler, titel, li, 'beschaedigt', feld.value.trim());
      } },
      { text: 'Abbrechen', art: 'zweit', fn: dialogSchliessen },
    ],
  });
}

/* Optimistische Anzeige: die Zeile reagiert sofort, gilt aber erst als
   endgültig, wenn die Transaktion durch ist. Schlägt sie fehl, wird die
   Zeile rot markiert und der Vorgang blockierend gemeldet. */
async function ereignisAusloesen(schueler, titel, li, typ, anmerkung) {
  if (!TYPEN.includes(typ)) throw new Error(`Unbekannter Typ: ${typ}`);

  const ev = {
    id: neueId(),
    ts: new Date().toISOString(),
    station: einstellungen.station || '?',
    schuelerId: schueler.id,
    titelId: titel.id,
    typ,
    notiz: anmerkung || '',
  };

  li.classList.remove('schreibfehler');
  li.classList.add('wartet');
  const vorschau = typ === 'zurueckgesetzt' ? false : istErledigt(
    { ausgabe: 'ausgegeben', rueckgabe: 'zurueck', fehlt: 'fehlt', beschaedigt: 'beschaedigt' }[typ]);
  li.querySelector('.titel-schalter').setAttribute('aria-pressed', String(vorschau));

  try {
    await ereignisseSchreiben([ev]);
  } catch (fehler) {
    li.classList.remove('wartet');
    li.classList.add('schreibfehler');
    zeileAktualisieren(li, schueler, titel);
    schreibfehlerMelden(fehler, () => ereignisAusloesen(schueler, titel, li, typ, anmerkung));
    return;
  }

  ereignisseUebernehmen([ev]);
  li.classList.remove('wartet');
  zeileAktualisieren(li, schueler, titel);
  fortschrittZeichnen();
  kopfZeichnen();
}

function schreibfehlerMelden(fehler, wiederholen) {
  dialogZeigen({
    titel: 'Nicht gespeichert. Vorgang wiederholen.',
    inhalt: `Der letzte Tipp konnte nicht gespeichert werden. Die rot markierte Zeile ist NICHT erfasst.\nBitte erneut versuchen. Hilft das nicht, Gerät neu starten und den Schüler noch einmal aufrufen.\nTechnische Meldung: ${fehler && fehler.message ? fehler.message : String(fehler)}`,
    warnung: true,
    knoepfe: [
      { text: 'Erneut versuchen', art: 'haupt', fn: () => { dialogSchliessen(); wiederholen(); } },
      { text: 'Schliessen', art: 'zweit', fn: dialogSchliessen },
    ],
  });
}

document.getElementById('knopf-fertig').addEventListener('click', () => {
  const { erledigt, gesamt } = fortschritt(offenerSchueler);
  const offen = gesamt - erledigt;
  if (offen > 0) {
    dialogZeigen({
      titel: 'Noch nicht alles erfasst',
      inhalt: `${offen} von ${gesamt} Büchern ${offen === 1 ? 'ist' : 'sind'} noch offen.\nTrotzdem abschliessen?`,
      knoepfe: [
        { text: 'Trotzdem fertig', art: 'haupt', fn: () => { dialogSchliessen(); schuelerAbschliessen(); } },
        { text: 'Zurück zur Liste', art: 'zweit', fn: dialogSchliessen },
      ],
    });
    return;
  }
  schuelerAbschliessen();
});

function schuelerAbschliessen() {
  offenerSchueler = null;
  einstellungen.abgeschlossen = einstellungen.abgeschlossen + 1;
  suchfeld.value = '';
  kopfZeichnen();
  sichtZeigen('suche');
  sicherungspflichtPruefen();
}

/* ------------------------------------------------------------------ *
 * 11  Ansicht Bestand
 * ------------------------------------------------------------------ */

const bestandKoerper = document.getElementById('bestand-koerper');
const bestandWarnung = document.getElementById('bestand-warnung');

function bestandZaehlen() {
  const zahlen = new Map();
  for (const t of stammdaten.titel) {
    zahlen.set(t.id, { ausgegeben: 0, zurueck: 0, fehlt: 0, beschaedigt: 0 });
  }
  for (const ev of sieger.values()) {
    const z = zahlen.get(ev.titelId);
    if (!z) continue;
    if (ev.typ === 'ausgabe') z.ausgegeben += 1;
    else if (ev.typ === 'rueckgabe') z.zurueck += 1;
    else if (ev.typ === 'fehlt') z.fehlt += 1;
    else if (ev.typ === 'beschaedigt') z.beschaedigt += 1;
  }
  return zahlen;
}

function stationenImBestand() {
  const menge = new Set();
  for (const ev of ereignisse) menge.add(String(ev.station));
  return [...menge].sort();
}

function bestandZeichnen() {
  const stationen = stationenImBestand();
  if (stationen.length > 1) {
    bestandWarnung.textContent =
      `Enthält Stationen ${stationen.join(', ')}. `
      + 'Gesamtzahlen nur dann, wenn die Sicherungen aller drei Stationen eingelesen sind.';
  } else {
    bestandWarnung.textContent =
      `Nur Station ${einstellungen.station || '?'}. Gesamtzahlen erst nach dem Zusammenführen.`;
  }

  const zahlen = bestandZaehlen();
  bestandKoerper.replaceChildren();
  const bruch = document.createDocumentFragment();

  for (const t of stammdaten.titel) {
    const z = zahlen.get(t.id);
    const verfuegbar = t.bestandGesamt - z.ausgegeben - z.fehlt;
    const tr = document.createElement('tr');
    const zellen = [
      ['links', t.titel],
      ['links', t.fach],
      ['', t.bestandGesamt],
      ['', z.ausgegeben],
      ['', z.zurueck],
      ['', z.fehlt],
      ['', z.beschaedigt],
      [verfuegbar <= 0 ? 'knapp' : '', verfuegbar],
    ];
    for (const [klasse, wert] of zellen) {
      const td = document.createElement('td');
      if (klasse) td.className = klasse;
      td.textContent = String(wert);
      tr.append(td);
    }
    bruch.append(tr);
  }
  bestandKoerper.append(bruch);
}

/* ------------------------------------------------------------------ *
 * 12  Ansicht Sicherung
 * ------------------------------------------------------------------ */

const sicherungAnzahlEl = document.getElementById('sicherung-anzahl');
const sicherungLetzteEl = document.getElementById('sicherung-letzte');
const importMeldung = document.getElementById('import-meldung');
const dateiEingabe = document.getElementById('datei-eingabe');

function sicherungZeichnen() {
  sicherungAnzahlEl.textContent = String(ereignisse.length);
  const zeit = einstellungen.sicherungZeit;
  sicherungLetzteEl.textContent = zeit
    ? `Letzte Sicherung: ${lesbareZeit(zeit)} mit ${einstellungen.sicherungAnzahl} Ereignissen.`
    : 'Auf diesem Gerät wurde noch keine Sicherung erstellt.';
}

function lesbareZeit(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())} Uhr`;
}

function dateiname(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `buecherkeller-station${einstellungen.station || 'x'}`
    + `-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    + `-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

/* Der Export enthält immer alle bisherigen Ereignisse, nicht nur die neuen.
   Die jeweils neueste Datei genügt zur vollständigen Wiederherstellung. */
function sicherungErstellen() {
  const jetzt = new Date();
  const inhalt = {
    typ: 'buecherkeller-sicherung',
    version: 1,
    station: einstellungen.station || '?',
    erstellt: jetzt.toISOString(),
    anzahl: ereignisse.length,
    ereignisse,
  };
  const blob = new Blob([JSON.stringify(inhalt, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname(jetzt);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  einstellungen.sicherungAnzahl = ereignisse.length;
  einstellungen.sicherungZeit = jetzt.toISOString();
  einstellungen.abgeschlossen = 0;
  einstellungen.sicherungOffen = false;
  kopfZeichnen();
  sicherungZeichnen();
  return a.download;
}

document.getElementById('knopf-export').addEventListener('click', () => {
  const name = sicherungErstellen();
  importMeldung.hidden = false;
  importMeldung.classList.remove('fehler');
  importMeldung.textContent = `Sicherung erstellt: ${name}`;
});

document.getElementById('knopf-import').addEventListener('click', () => dateiEingabe.click());

dateiEingabe.addEventListener('change', async () => {
  const dateien = [...dateiEingabe.files];
  dateiEingabe.value = '';
  if (!dateien.length) return;
  try {
    const ergebnis = await sicherungenEinlesen(dateien);
    importMeldung.hidden = false;
    importMeldung.classList.remove('fehler');
    importMeldung.textContent =
      `${ergebnis.gelesen} Ereignisse gelesen, ${ergebnis.neu} neu, ${ergebnis.bekannt} bereits vorhanden.`;
  } catch (fehler) {
    importMeldung.hidden = false;
    importMeldung.classList.add('fehler');
    importMeldung.textContent = `Nicht eingelesen: ${fehler.message}`;
  }
});

function ereignisGueltig(ev) {
  return ev && typeof ev.id === 'string' && typeof ev.ts === 'string'
    && typeof ev.schuelerId === 'string' && typeof ev.titelId === 'string'
    && TYPEN.includes(ev.typ);
}

export async function sicherungenEinlesen(dateien) {
  let gelesen = 0;
  let bekannt = 0;
  const neue = [];
  const inDiesemLauf = new Set();

  for (const datei of dateien) {
    const text = await datei.text();
    let inhalt;
    try {
      inhalt = JSON.parse(text);
    } catch (e) {
      throw new Error(`${datei.name} ist keine gültige Sicherungsdatei.`);
    }
    const liste = Array.isArray(inhalt) ? inhalt : inhalt && inhalt.ereignisse;
    if (!Array.isArray(liste)) {
      throw new Error(`${datei.name} enthält keine Ereignisse.`);
    }
    for (const ev of liste) {
      if (!ereignisGueltig(ev)) continue;
      gelesen += 1;
      if (ereignisIds.has(ev.id) || inDiesemLauf.has(ev.id)) {
        bekannt += 1;
        continue;
      }
      inDiesemLauf.add(ev.id);
      neue.push({
        id: ev.id,
        ts: ev.ts,
        station: String(ev.station == null ? '?' : ev.station),
        schuelerId: ev.schuelerId,
        titelId: ev.titelId,
        typ: ev.typ,
        notiz: typeof ev.notiz === 'string' ? ev.notiz : '',
      });
    }
  }

  if (neue.length) await ereignisseSchreiben(neue);
  ereignisseUebernehmen(neue);
  kopfZeichnen();
  sicherungZeichnen();

  return { gelesen, neu: neue.length, bekannt };
}

/* ------------------------------------------------------------------ *
 * 13  Ansicht Einstellungen
 * ------------------------------------------------------------------ */

function einstellungenZeichnen() {
  document.getElementById('ein-station').textContent = `Station ${einstellungen.station || '—'}`;
  document.getElementById('ein-modus').textContent =
    einstellungen.modus === 'rueckgabe' ? 'Rücknahme' : 'Ausgabe';
  document.getElementById('ein-version').textContent = FASSUNG;
  document.getElementById('ein-speicher').textContent = speicherText;
}

let speicherText = 'Dauerhafter Speicher: wird geprüft …';

document.getElementById('knopf-modus-wechseln').addEventListener('click', () => {
  const neu = einstellungen.modus === 'rueckgabe' ? 'ausgabe' : 'rueckgabe';
  const wort = neu === 'rueckgabe' ? 'Rücknahme' : 'Ausgabe';
  dialogZeigen({
    titel: `Auf ${wort} umstellen?`,
    inhalt: 'Der Modus bestimmt, was ein Häkchen bedeutet. Bereits erfasste Ereignisse bleiben unverändert erhalten.',
    knoepfe: [
      { text: `Ja, auf ${wort}`, art: 'haupt', fn: () => {
        einstellungen.modus = neu;
        dialogSchliessen();
        kopfZeichnen();
        einstellungenZeichnen();
      } },
      { text: 'Abbrechen', art: 'zweit', fn: dialogSchliessen },
    ],
  });
});

document.getElementById('knopf-station-wechseln').addEventListener('click', () => {
  const huelle = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = 'Die Stationsnummer steht in jedem neuen Ereignis. Sie zu ändern ist nur nötig, wenn dieses iPad an einem anderen Tisch steht.';
  const reihe = document.createElement('div');
  reihe.className = 'wahl-gross';
  for (const n of ['1', '2', '3']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'flaeche';
    b.setAttribute('aria-pressed', String(einstellungen.station === n));
    const zahl = document.createElement('span');
    zahl.className = 'flaeche-zahl';
    zahl.textContent = n;
    b.append(zahl);
    b.addEventListener('click', () => {
      einstellungen.station = n;
      dialogSchliessen();
      kopfZeichnen();
      einstellungenZeichnen();
    });
    reihe.append(b);
  }
  huelle.append(p, reihe);
  dialogZeigen({
    titel: 'Station ändern',
    inhalt: huelle,
    knoepfe: [{ text: 'Abbrechen', art: 'zweit', fn: dialogSchliessen }],
  });
});

document.getElementById('knopf-reset').addEventListener('click', () => {
  const huelle = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = `Alle ${ereignisse.length} Ereignisse dieses Geräts werden gelöscht. Zum Bestätigen das Wort RESET eingeben.`;
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.className = 'dialog-eingabe';
  feld.placeholder = 'RESET';
  feld.autocapitalize = 'characters';
  feld.autocomplete = 'off';
  huelle.append(p, feld);

  dialogZeigen({
    titel: 'Demo zurücksetzen',
    inhalt: huelle,
    warnung: true,
    knoepfe: [
      { text: 'Endgültig löschen', art: 'warnung', fn: async () => {
        if (feld.value.trim().toUpperCase() !== 'RESET') {
          feld.value = '';
          feld.placeholder = 'Bitte RESET eingeben';
          feld.focus();
          return;
        }
        await alleEreignisseLoeschen();
        ereignisse = [];
        ereignisIds.clear();
        sieger.clear();
        einstellungen.sicherungAnzahl = 0;
        einstellungen.sicherungZeit = '';
        einstellungen.abgeschlossen = 0;
        einstellungen.sicherungOffen = false;
        dialogSchliessen();
        kopfZeichnen();
        einstellungenZeichnen();
      } },
      { text: 'Abbrechen', art: 'zweit', fn: dialogSchliessen },
    ],
  });
});

/* ------------------------------------------------------------------ *
 * 14  Sicherungspflicht
 * ------------------------------------------------------------------ */

function sicherungspflichtPruefen() {
  if (einstellungen.abgeschlossen >= SICHERUNG_ALLE) {
    sicherungDialog(true);
  }
}

function sicherungDialog(erzwungen) {
  if (dialogOffen()) return;
  const seit = Math.max(0, ereignisse.length - einstellungen.sicherungAnzahl);
  const knoepfe = [
    { text: 'Sicherung erstellen', art: 'haupt', fn: () => {
      sicherungErstellen();
      dialogSchliessen();
      sichtZeigen('sicherung');
    } },
  ];
  if (!erzwungen) {
    knoepfe.push({ text: 'Später', art: 'zweit', fn: () => {
      einstellungen.sicherungOffen = false;
      dialogSchliessen();
    } });
  }
  dialogZeigen({
    titel: erzwungen ? 'Sicherung jetzt erstellen' : 'Sicherung nachholen',
    inhalt: erzwungen
      ? `${SICHERUNG_ALLE} Schüler sind abgeschlossen. ${seit} Ereignisse sind seit der letzten Sicherung dazugekommen.\nDie Datei landet auf dem iPad unter "Dateien". Erst danach geht es weiter.`
      : `Seit der letzten Sicherung sind ${seit} Ereignisse dazugekommen.\nJetzt eine Sicherung erstellen?`,
    knoepfe,
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (ereignisse.length > einstellungen.sicherungAnzahl) {
      einstellungen.sicherungOffen = true;
    }
  } else if (document.visibilityState === 'visible') {
    if (einstellungen.sicherungOffen && ereignisse.length > einstellungen.sicherungAnzahl) {
      sicherungDialog(false);
    }
  }
});

/* ------------------------------------------------------------------ *
 * 15  Start
 * ------------------------------------------------------------------ */

async function speicherAnfragen() {
  if (!navigator.storage || !navigator.storage.persist) {
    speicherText = 'Dauerhafter Speicher: von diesem Browser nicht angeboten. '
      + 'Die erzwungene Sicherung bleibt deshalb Pflicht.';
    return;
  }
  try {
    const schon = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    const ok = schon || await navigator.storage.persist();
    speicherText = ok
      ? 'Dauerhafter Speicher: zugesagt. Trotzdem gilt die Sicherungspflicht — eine Zusage ist keine Garantie.'
      : 'Dauerhafter Speicher: nicht zugesagt. Das Gerät darf die Daten notfalls verwerfen. '
        + 'Deshalb ist die erzwungene Sicherung Pflicht.';
  } catch (e) {
    speicherText = `Dauerhafter Speicher: Anfrage fehlgeschlagen (${e.message}).`;
  }
}

function serviceWorkerAnmelden() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost'
      && location.hostname !== '127.0.0.1') return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* ohne SW läuft die App auch */ });
}

function startfehlerZeigen(fehler) {
  document.getElementById('haupt').innerHTML = '';
  dialogZeigen({
    titel: 'App konnte nicht starten',
    inhalt: `Es wurde nichts gespeichert und nichts verändert.\nMeldung: ${fehler && fehler.message ? fehler.message : String(fehler)}\nBitte die Seite neu laden. Bleibt es dabei, fehlt vermutlich eine Datei im Ordner.`,
    warnung: true,
    knoepfe: [{ text: 'Neu laden', art: 'haupt', fn: () => location.reload() }],
  });
}

async function starten() {
  try {
    await stammdatenLaden();
    db = await datenbankOeffnen();
    ereignisseUebernehmen(await alleEreignisseLesen());
  } catch (fehler) {
    startfehlerZeigen(fehler);
    return;
  }

  /* Sicherungsstand darf nie über der tatsächlichen Anzahl liegen
     (etwa nachdem die Demo zurückgesetzt wurde). */
  if (einstellungen.sicherungAnzahl > ereignisse.length) {
    einstellungen.sicherungAnzahl = ereignisse.length;
  }

  kopfZeichnen();

  if (einstellungen.station && einstellungen.modus) {
    sichtZeigen('suche');
  } else {
    sichtZeigen('start');
  }

  speicherAnfragen().then(() => {
    if (aktuelleSicht === 'einstellungen') einstellungenZeichnen();
  });
  serviceWorkerAnmelden();

  if (einstellungen.abgeschlossen >= SICHERUNG_ALLE) {
    sicherungDialog(true);
  } else if (einstellungen.sicherungOffen && ereignisse.length > einstellungen.sicherungAnzahl) {
    sicherungDialog(false);
  }

  document.body.dataset.bereit = 'ja';
}

starten();
