/* Abnahmetests 1 bis 7 aus Abschnitt 9 des Bauplans.
 *
 * Gehört nicht zur App. Läuft auf einem Computer, nicht auf dem iPad.
 *
 * Voraussetzungen:
 *   - Node.js und Playwright (npm i -g playwright)
 *   - Die App muss unter einer Adresse erreichbar sein. Im Projektordner:
 *       npx http-server -p 8712 -c-1 .
 *
 * Aufruf (aus dem Projektordner):
 *   node werkzeuge/abnahme.mjs        alle sieben Tests
 *   node werkzeuge/abnahme.mjs 3      nur Test 3 (und 4, sie hängen zusammen)
 *
 * Anpassen, falls nötig: BASIS, BROWSER und ARBEIT weiter unten.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASIS = 'http://localhost:8712/index.html';
const PROJEKT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ARBEIT = path.join(os.tmpdir(), 'buecherkeller-abnahme');
/* Pfad zum Browser. Leer lassen, wenn Playwright seinen eigenen mitbringt. */
const BROWSER = process.env.BUECHERKELLER_BROWSER || undefined;
fs.rmSync(ARBEIT, { recursive: true, force: true });
fs.mkdirSync(ARBEIT, { recursive: true });

const ergebnisse = [];
function melde(nr, titel, ok, text) {
  ergebnisse.push({ nr, titel, ok, text });
  console.log(`${ok ? 'BESTANDEN' : 'FEHLGESCHLAGEN'}  Test ${nr}: ${titel}\n            ${text}\n`);
}

let profilZaehler = 0;
async function neuesGeraet(opts = {}) {
  const dir = path.join(ARBEIT, `profil-${++profilZaehler}`);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: true,
    acceptDownloads: true,
    executablePath: BROWSER,
    args: ['--no-sandbox'],
    ...opts,
  });
  return { ctx, dir };
}
async function wiederOeffnen(dir) {
  return chromium.launchPersistentContext(dir, {
    headless: true, acceptDownloads: true,
    executablePath: BROWSER,
    args: ['--no-sandbox'],
  });
}

async function laden(ctx) {
  const page = await ctx.newPage();
  const fehlgeschlagen = [];
  page.on('requestfailed', (r) => fehlgeschlagen.push(`${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) fehlgeschlagen.push(`${r.url()} :: HTTP ${r.status()}`); });
  page.on('pageerror', (e) => fehlgeschlagen.push(`JS-Fehler: ${e.message}`));
  await page.goto(BASIS, { waitUntil: 'load' });
  await page.waitForSelector('body[data-bereit="ja"]', { timeout: 15000 });
  return { page, fehlgeschlagen };
}

async function einrichten(page, station, modus = 'ausgabe') {
  if (await page.locator('#v-start').isVisible()) {
    await page.click(`[data-station="${station}"]`);
    await page.click(`[data-modus="${modus}"]`);
    await page.click('#start-weiter');
  }
  await page.waitForSelector('#v-suche:not([hidden])');
}

async function sicherungsDialogAbraeumen(page) {
  const schicht = page.locator('#dialog-schicht');
  if (await schicht.isVisible()) {
    const t = await page.locator('#dialog-titel').textContent();
    if (t && t.includes('Sicherung')) {
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#dialog-knoepfe button', { hasText: 'Sicherung erstellen' }).click(),
      ]);
      await dl.path();
      if (await schicht.isVisible()) await page.locator('#dialog-knoepfe button').last().click();
      await page.click('.tab[data-ziel="suche"]');
      return true;
    }
  }
  return false;
}

/* Erfasst einen Schüler vollständig. Gibt die Zahl der Berührungen zurück. */
async function schuelerErfassen(page, nachname, { alleAbhaken = true } = {}) {
  let beruehrungen = 0;
  await page.fill('#suchfeld', nachname);
  await page.waitForSelector('.treffer');
  await page.locator('.treffer').first().click();
  beruehrungen += 1;
  await page.waitForSelector('#v-schueler:not([hidden])');
  if (alleAbhaken) {
    const zeilen = await page.locator('.titelzeile').count();
    for (let i = 0; i < zeilen; i += 1) {
      const zeile = page.locator('.titelzeile').nth(i);
      await zeile.locator('.titel-schalter').click();
      beruehrungen += 1;
      await zeile.locator('.titel-schalter[aria-pressed="true"]').waitFor();
      await page.waitForFunction(
        (idx) => !document.querySelectorAll('.titelzeile')[idx].classList.contains('wartet'),
        i, { timeout: 5000 });
    }
  }
  await page.click('#knopf-fertig');
  beruehrungen += 1;
  if (await page.locator('#dialog-schicht').isVisible()) {
    const t = await page.locator('#dialog-titel').textContent();
    if (t && t.includes('Noch nicht')) {
      await page.locator('#dialog-knoepfe button', { hasText: 'Trotzdem fertig' }).click();
      beruehrungen += 1;
    }
  }
  await sicherungsDialogAbraeumen(page);
  await page.waitForSelector('#v-suche:not([hidden])');
  return beruehrungen;
}

async function ereignisAnzahl(page) {
  return page.evaluate(() => Number(document.getElementById('z-gesamt').textContent));
}

async function bestandTabelle(page) {
  await page.click('.tab[data-ziel="bestand"]');
  await page.waitForSelector('#v-bestand:not([hidden])');
  return page.evaluate(() => [...document.querySelectorAll('#bestand-koerper tr')]
    .map((tr) => [...tr.children].map((td) => td.textContent).join('|')).join('\n'));
}

async function exportieren(page) {
  await page.click('.tab[data-ziel="sicherung"]');
  await page.waitForSelector('#v-sicherung:not([hidden])');
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#knopf-export'),
  ]);
  const ziel = path.join(ARBEIT, dl.suggestedFilename());
  await dl.saveAs(ziel);
  return ziel;
}

async function importieren(page, dateien) {
  await page.click('.tab[data-ziel="sicherung"]');
  await page.waitForSelector('#v-sicherung:not([hidden])');
  await page.setInputFiles('#datei-eingabe', dateien);
  await page.waitForSelector('#import-meldung:not([hidden])');
  return page.locator('#import-meldung').textContent();
}

const NAMEN = JSON.parse(fs.readFileSync(path.join(PROJEKT, 'daten/stammdaten.json'), 'utf8'))
  .schueler.map((s) => s.nachname);
const EINDEUTIG = [...new Set(NAMEN)];

/* ================= Test 1: Offline ================= */
async function test1() {
  const { ctx } = await neuesGeraet();
  const { page, fehlgeschlagen } = await laden(ctx);
  await einrichten(page, '2');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);

  await ctx.setOffline(true);
  const offlineFehler = [];
  page.on('requestfailed', (r) => offlineFehler.push(`${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) offlineFehler.push(`${r.url()} :: HTTP ${r.status()}`); });
  page.on('pageerror', (e) => offlineFehler.push(`JS-Fehler: ${e.message}`));

  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('body[data-bereit="ja"]', { timeout: 15000 });

  const schritte = [];
  await page.waitForSelector('#v-suche:not([hidden])');
  schritte.push('Suche');
  await schuelerErfassen(page, EINDEUTIG[0]);
  schritte.push('Schüler erfasst');
  await bestandTabelle(page);
  schritte.push('Bestand');
  await page.click('.tab[data-ziel="sicherung"]');
  await page.waitForSelector('#v-sicherung:not([hidden])');
  schritte.push('Sicherung');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#knopf-export')]);
  await dl.path();
  schritte.push('Export offline');
  await page.click('.tab[data-ziel="einstellungen"]');
  await page.waitForSelector('#v-einstellungen:not([hidden])');
  schritte.push('Einstellungen');

  const anzahl = await ereignisAnzahl(page);
  await page.click('.tab[data-ziel="suche"]');
  await page.fill('#suchfeld', EINDEUTIG[0]);
  await page.waitForSelector('.treffer');
  const fertig = await page.locator('.treffer .status.fertig').count();
  await ctx.close();

  const ok = offlineFehler.length === 0 && fehlgeschlagen.length === 0 && anzahl > 0 && fertig >= 1;
  melde(1, 'Offline-Test', ok,
    `Netz getrennt, Seite neu geladen. Durchlaufen: ${schritte.join(', ')}. `
    + `${anzahl} Ereignisse offline geschrieben, Schüler danach als fertig markiert: ${fertig >= 1 ? 'ja' : 'nein'}. `
    + `Fehlgeschlagene Aufrufe vor dem Trennen: ${fehlgeschlagen.length}, danach: ${offlineFehler.length}`
    + (offlineFehler.length ? ` — ${offlineFehler.join(' / ')}` : '.'));
}

/* ================= Test 2: Neustart ================= */
async function test2() {
  const { ctx, dir } = await neuesGeraet();
  const { page } = await laden(ctx);
  await einrichten(page, '1');
  const erfasst = [];
  for (let i = 0; i < 20; i += 1) {
    await schuelerErfassen(page, EINDEUTIG[i]);
    erfasst.push(EINDEUTIG[i]);
  }
  const vorher = await ereignisAnzahl(page);
  const bestandVorher = await bestandTabelle(page);
  await ctx.close();

  const ctx2 = await wiederOeffnen(dir);
  const { page: page2 } = await laden(ctx2);
  await page2.waitForSelector('#v-suche:not([hidden])');
  await sicherungsDialogAbraeumen(page2);
  const nachher = await ereignisAnzahl(page2);
  const bestandNachher = await bestandTabelle(page2);

  let fertige = 0;
  for (const n of erfasst) {
    await page2.click('.tab[data-ziel="suche"]');
    await page2.fill('#suchfeld', n);
    await page2.waitForSelector('.treffer');
    const punkte = await page2.locator('.treffer .status.fertig').count();
    if (punkte >= 1) fertige += 1;
  }
  await ctx2.close();

  const ok = vorher === nachher && vorher > 0 && bestandVorher === bestandNachher && fertige === 20;
  melde(2, 'Neustart-Test', ok,
    `20 Schüler erfasst (${vorher} Ereignisse), Browser hart geschlossen, neu geöffnet: `
    + `${nachher} Ereignisse, Bestandstabelle identisch: ${bestandVorher === bestandNachher ? 'ja' : 'nein'}, `
    + `${fertige} von 20 Schülern weiterhin als fertig markiert.`);
}

/* ================= Test 3 + 4: Zusammenführung und Reihenfolge ================= */
async function test34() {
  // Station 1
  const g1 = await neuesGeraet();
  const { page: p1 } = await laden(g1.ctx);
  await einrichten(p1, '1');
  for (let i = 0; i < 4; i += 1) await schuelerErfassen(p1, EINDEUTIG[i]);
  const datei1 = await exportieren(p1);
  await g1.ctx.close();

  // Station 2 — liest Datei 1 ein, erzeugt dadurch Überschneidungen
  const g2 = await neuesGeraet();
  const { page: p2 } = await laden(g2.ctx);
  await einrichten(p2, '2');
  for (let i = 4; i < 8; i += 1) await schuelerErfassen(p2, EINDEUTIG[i]);
  await importieren(p2, [datei1]);
  const datei2 = await exportieren(p2);
  await g2.ctx.close();

  // Station 3
  const g3 = await neuesGeraet();
  const { page: p3 } = await laden(g3.ctx);
  await einrichten(p3, '3');
  for (let i = 8; i < 12; i += 1) await schuelerErfassen(p3, EINDEUTIG[i]);
  const datei3 = await exportieren(p3);
  await g3.ctx.close();

  const roh = [datei1, datei2, datei3].map((d) => JSON.parse(fs.readFileSync(d, 'utf8')));
  const gesamtZeilen = roh.reduce((n, d) => n + d.ereignisse.length, 0);
  const eindeutig = new Set(roh.flatMap((d) => d.ereignisse.map((e) => e.id))).size;

  // Zusammenführen auf einem vierten Gerät, Reihenfolge A
  const gA = await neuesGeraet();
  const { page: pA } = await laden(gA.ctx);
  await einrichten(pA, '1');
  const meldungA = await importieren(pA, [datei1, datei2, datei3]);
  const anzahlA = await ereignisAnzahl(pA);
  const bestandA = await bestandTabelle(pA);
  await gA.ctx.close();

  // Reihenfolge B
  const gB = await neuesGeraet();
  const { page: pB } = await laden(gB.ctx);
  await einrichten(pB, '1');
  await importieren(pB, [datei3]);
  await importieren(pB, [datei2]);
  const meldungB = await importieren(pB, [datei1]);
  const anzahlB = await ereignisAnzahl(pB);
  const bestandB = await bestandTabelle(pB);
  await gB.ctx.close();

  // Unabhängig nachgerechnet
  const alle = new Map();
  for (const d of roh) for (const e of d.ereignisse) alle.set(e.id, e);
  const sieger = new Map();
  for (const e of alle.values()) {
    const k = `${e.schuelerId}|${e.titelId}`;
    const a = sieger.get(k);
    if (!a || e.ts > a.ts || (e.ts === a.ts && e.id > a.id)) sieger.set(k, e);
  }
  const stamm = JSON.parse(fs.readFileSync(path.join(PROJEKT, 'daten/stammdaten.json'), 'utf8'));
  const erwartet = stamm.titel.map((t) => {
    const z = { ausgegeben: 0, zurueck: 0, fehlt: 0, beschaedigt: 0 };
    for (const e of sieger.values()) {
      if (e.titelId !== t.id) continue;
      if (e.typ === 'ausgabe') z.ausgegeben += 1;
      else if (e.typ === 'rueckgabe') z.zurueck += 1;
      else if (e.typ === 'fehlt') z.fehlt += 1;
      else if (e.typ === 'beschaedigt') z.beschaedigt += 1;
    }
    return [t.titel, t.fach, t.bestandGesamt, z.ausgegeben, z.zurueck, z.fehlt, z.beschaedigt,
      t.bestandGesamt - z.ausgegeben - z.fehlt].join('|');
  }).join('\n');

  const ok3 = anzahlA === eindeutig && bestandA === erwartet;
  melde(3, 'Zusammenführung', ok3,
    `Drei Dateien mit ${gesamtZeilen} Zeilen, davon ${eindeutig} verschiedene Ereignisse `
    + `(Datei 2 enthält Datei 1 vollständig — echte Überschneidung). `
    + `Nach dem Einlesen aller drei: ${anzahlA} Ereignisse. Meldung der App: "${(meldungA || '').trim()}". `
    + `Bestandstabelle stimmt mit unabhängiger Nachrechnung überein: ${bestandA === erwartet ? 'ja' : 'nein'}.`);

  const ok4 = anzahlA === anzahlB && bestandA === bestandB;
  melde(4, 'Reihenfolge-Test', ok4,
    `Dieselben drei Dateien in der Reihenfolge 3-2-1 eingelesen: ${anzahlB} Ereignisse `
    + `(vorher ${anzahlA}). Letzte Meldung: "${(meldungB || '').trim()}". `
    + `Bestandstabellen zeichenweise identisch: ${bestandA === bestandB ? 'ja' : 'nein'}.`);
}

/* ================= Test 5: Korrektur ================= */
async function test5() {
  const { ctx } = await neuesGeraet();
  const { page } = await laden(ctx);
  await einrichten(page, '2');
  await page.fill('#suchfeld', EINDEUTIG[20]);
  await page.waitForSelector('.treffer');
  await page.locator('.treffer').first().click();
  await page.waitForSelector('#v-schueler:not([hidden])');

  const zeile = page.locator('.titelzeile').first();
  const zustaende = [];
  for (let i = 0; i < 3; i += 1) {
    await zeile.locator('.titel-schalter').click();
    await page.waitForFunction(
      () => !document.querySelector('.titelzeile').classList.contains('wartet'), null, { timeout: 5000 });
    zustaende.push(await page.evaluate(
      () => document.querySelector('.titelzeile .titel-schalter').getAttribute('aria-pressed')));
  }

  const daten = await page.evaluate(async () => {
    const d = await new Promise((ok) => { const a = indexedDB.open('buecherkeller', 1); a.onsuccess = () => ok(a.result); });
    const alle = await new Promise((ok) => {
      const r = d.transaction('ereignisse').objectStore('ereignisse').getAll();
      r.onsuccess = () => ok(r.result);
    });
    const erste = document.querySelector('.titelzeile').dataset.titelId;
    return alle.filter((e) => e.titelId === erste).sort((a, b) => a.ts.localeCompare(b.ts)).map((e) => e.typ);
  });
  const endzustand = await page.evaluate(
    () => document.querySelector('.titelzeile .titel-zustand-huelle').textContent);
  await ctx.close();

  const ok = daten.length === 3
    && daten.join(',') === 'ausgabe,zurueckgesetzt,ausgabe'
    && zustaende.join(',') === 'true,false,true'
    && endzustand.includes('ausgegeben');
  melde(5, 'Korrektur-Test', ok,
    `Abhaken, abwählen, erneut abhaken. Ereignisse in der Datenbank: ${daten.length} (${daten.join(' → ')}). `
    + `Angezeigter Endzustand: "${endzustand.replace(/^ · /, '')}". Kein Ereignis wurde geändert oder gelöscht.`);
}

/* ================= Test 6: Tempo ================= */
async function test6() {
  const { ctx } = await neuesGeraet();
  const { page } = await laden(ctx);
  await einrichten(page, '2');

  // Ein Schüler der Stufe 5 hat genau sieben Bücher.
  const stamm = JSON.parse(fs.readFileSync(path.join(PROJEKT, 'daten/stammdaten.json'), 'utf8'));
  const zaehl = {};
  for (const s of stamm.schueler) zaehl[s.nachname] = (zaehl[s.nachname] || 0) + 1;
  const kandidat = stamm.schueler.find((s) => s.stufe === 5 && zaehl[s.nachname] === 1);

  await page.fill('#suchfeld', kandidat.nachname);
  await page.waitForSelector('.treffer');

  const start = Date.now();
  const beruehrungen = await schuelerErfassen(page, kandidat.nachname);
  const dauer = (Date.now() - start) / 1000;

  const anzahl = await ereignisAnzahl(page);
  await ctx.close();

  const ok = beruehrungen <= 9 && dauer < 20 && anzahl === 7;
  melde(6, 'Tempo-Test', ok,
    `Schüler ${kandidat.nachname} (Klasse ${kandidat.klasse}, sieben Bücher): `
    + `${beruehrungen} Berührungen (1 Treffer + 7 Bücher + Fertig), ${dauer.toFixed(1)} Sekunden, `
    + `${anzahl} Ereignisse geschrieben. Grenze: 9 Berührungen, 20 Sekunden.`);
}

/* ================= Test 7: Schreibfehler ================= */
async function test7() {
  const { ctx } = await neuesGeraet();
  const { page } = await laden(ctx);
  await einrichten(page, '2');
  await page.fill('#suchfeld', EINDEUTIG[30]);
  await page.waitForSelector('.treffer');
  await page.locator('.treffer').first().click();
  await page.waitForSelector('#v-schueler:not([hidden])');

  await page.evaluate(() => { window.buecherkellerPruefstand.schreibfehler = true; });
  await page.locator('.titelzeile').first().locator('.titel-schalter').click();
  await page.waitForSelector('#dialog-schicht:not([hidden])', { timeout: 5000 });

  const dialogTitel = (await page.locator('#dialog-titel').textContent()).trim();
  const zeileRot = await page.locator('.titelzeile').first().evaluate(
    (el) => el.classList.contains('schreibfehler'));
  const gedrueckt = await page.locator('.titelzeile').first()
    .locator('.titel-schalter').getAttribute('aria-pressed');
  const fortschritt = await page.locator('#fortschritt-text').textContent();
  const gesamt = await ereignisAnzahl(page);
  const inDb = await page.evaluate(async () => {
    const d = await new Promise((ok) => { const a = indexedDB.open('buecherkeller', 1); a.onsuccess = () => ok(a.result); });
    return new Promise((ok) => {
      const r = d.transaction('ereignisse').objectStore('ereignisse').count();
      r.onsuccess = () => ok(r.result);
    });
  });

  // Nach Aufheben der Störung muss der Wiederholversuch gelingen.
  await page.evaluate(() => { window.buecherkellerPruefstand.schreibfehler = false; });
  await page.locator('#dialog-knoepfe button', { hasText: 'Erneut versuchen' }).click();
  await page.waitForFunction(
    () => !document.querySelector('.titelzeile').classList.contains('wartet'), null, { timeout: 5000 });
  const nachher = await ereignisAnzahl(page);
  const gedruecktNachher = await page.locator('.titelzeile').first()
    .locator('.titel-schalter').getAttribute('aria-pressed');
  await ctx.close();

  const ok = dialogTitel === 'Nicht gespeichert. Vorgang wiederholen.'
    && zeileRot && gedrueckt === 'false' && fortschritt.startsWith('0 von')
    && gesamt === 0 && inDb === 0 && nachher === 1 && gedruecktNachher === 'true';
  melde(7, 'Schreibfehler-Test', ok,
    `IndexedDB künstlich scheitern lassen: Meldung "${dialogTitel}", Zeile rot markiert: ${zeileRot ? 'ja' : 'nein'}, `
    + `Zeile NICHT als erledigt angezeigt (aria-pressed=${gedrueckt}), Fortschritt "${fortschritt}", `
    + `Ereignisse in der Datenbank: ${inDb}. Nach Aufheben der Störung gelingt "Erneut versuchen": `
    + `${nachher} Ereignis, Zeile erledigt (aria-pressed=${gedruecktNachher}).`);
}

const nur = process.argv[2];
const laeufe = { 1: test1, 2: test2, 3: test34, 5: test5, 6: test6, 7: test7 };
for (const [k, f] of Object.entries(laeufe)) {
  if (nur && nur !== k) continue;
  try { await f(); } catch (e) { melde(k, f.name, false, `Abbruch: ${e.message}`); }
}
console.log('---');
console.log(`${ergebnisse.filter((r) => r.ok).length} von ${ergebnisse.length} bestanden`);
fs.writeFileSync(path.join(ARBEIT, 'ergebnisse.json'), JSON.stringify(ergebnisse, null, 2));
process.exit(ergebnisse.every((r) => r.ok) ? 0 : 1);
