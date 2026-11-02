/**
 * HAMSTER.IO - Service Worker (PWA Offline Cache & Installability)
 */

const CACHE_NAME = 'hamster-io-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/firebase-config.js',
  './js/audio.js',
  './js/particles.js',
  './js/food.js',
  './js/hamster.js',
  './js/bot.js',
  './js/multiplayer.js',
  './js/controls.js',
  './js/game.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

// Install event: cache core assets safely (individual try/catch so 1 missing asset doesn't fail install)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('PWA Asset non mis en cache:', asset);
        }
      }
    })
  );
});

// Activate event: clean up old caches & take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Pass through Firebase WebSockets, Google APIs, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http') ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('firebasedatabase.app') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('gstatic.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
