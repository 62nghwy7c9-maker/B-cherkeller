/* Bücherkeller — Service Worker
 *
 * Der Service Worker ist der Code, der die Dateien der App auf dem iPad
 * ablegt. Er sorgt dafür, dass die App ohne Netz startet.
 *
 * Strategie: ausschliesslich cache-first. Jede Anfrage wird zuerst im
 * abgelegten Bestand gesucht. Nur wenn dort nichts liegt, wird überhaupt
 * ins Netz geschaut — und das kommt im normalen Betrieb nicht vor, weil
 * unten alle Dateien der App aufgezählt sind.
 *
 * WICHTIG: CACHE_NAME muss mit FASSUNG in app.js übereinstimmen. Bei jeder
 * Änderung an den Dateien beide erhöhen, sonst behalten die iPads die alte
 * Fassung.
 */

const CACHE_NAME = 'buecherkeller-2026-09-10-3';

const DATEIEN = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './daten/stammdaten.json',
  './fonts/noto-sans-400.woff2',
  './fonts/noto-sans-600.woff2',
  './fonts/noto-sans-700.woff2',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Einzeln ablegen: eine fehlende Datei darf nicht die ganze
    // Installation scheitern lassen, ohne dass man erfährt welche.
    await Promise.all(DATEIEN.map(async (pfad) => {
      try {
        await cache.add(new Request(pfad, { cache: 'reload' }));
      } catch (fehler) {
        console.error('Bücherkeller: nicht ablegbar:', pfad, fehler);
        throw fehler;
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const treffer = await cache.match(anfrage, { ignoreSearch: true });
    if (treffer) return treffer;

    // Seitenaufrufe (auch mit unbekannter Adresse) beantwortet immer die
    // abgelegte Startseite. So wartet die App nie auf das Netz.
    if (anfrage.mode === 'navigate') {
      const start = await cache.match('./index.html');
      if (start) return start;
    }

    try {
      return await fetch(anfrage);
    } catch (fehler) {
      return new Response('Offline und nicht im Zwischenspeicher.', {
        status: 504,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
