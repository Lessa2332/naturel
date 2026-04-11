const CACHE_NAME = 'smartlessa-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  // Додай сюди всі flower_*.png, якщо хочеш кешувати їх заздалегідь
  './flower_1.png',
  './flower_2.png',
  './flower_3.png',
  './flower_4.png',
  './flower_5.png',
  './flower_6.png',
  './flower_7.png',
  './flower_8.png',
  './flower_9.png',
  './flower_10.png',
  './flower_11.png',
  './flower_12.png',
  './flower_13.png',
  './flower_14.png',
  './flower_15.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
