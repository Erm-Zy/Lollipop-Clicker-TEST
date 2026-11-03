// Bump this name whenever any application-shell asset changes.
const CACHE_NAME = 'lollipop-clicker-2.0.0';
const ASSETS = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/main.css', './css/components.css', './css/responsive.css',
  './js/app.js', './js/data.js', './js/gameplay.js', './js/storage.js',
  './js/audio.js', './js/effects.js', './assets/images/bg-purple.png', './assets/audio/bmg1.ogg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  // Wait for existing game tabs to close before activating a complete new shell.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('lollipop-clicker-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || event.request.headers.has('range')) return;
  const shellPath = ASSETS.find(path => new URL(path, self.registration.scope).pathname === url.pathname);
  if (!shellPath && event.request.mode !== 'navigate') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(shellPath || './index.html');
    // Never mutate a released shell with individual newer files: its modules must agree.
    return cached || fetch(event.request);
  })());
});
