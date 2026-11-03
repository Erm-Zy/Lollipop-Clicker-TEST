// A complete release cache keeps all real pages and their shared modules together.
const CACHE_NAME = "lollipop-clicker-3.0.1-art:" + self.registration.scope;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./pages/achievements.html",
  "./pages/arena.html",
  "./pages/collection.html",
  "./pages/prestige.html",
  "./pages/rewards.html",
  "./pages/settings.html",
  "./pages/shop.html",
  "./pages/statistics.html",
  "./js/audio.js",
  "./js/core/runtime.js",
  "./js/data.js",
  "./js/effects.js",
  "./js/gameplay.js",
  "./js/pages/achievements.js",
  "./js/pages/arena.js",
  "./js/pages/collection.js",
  "./js/pages/home.js",
  "./js/pages/prestige.js",
  "./js/pages/rewards.js",
  "./js/pages/settings.js",
  "./js/pages/shop.js",
  "./js/pages/statistics.js",
  "./js/storage.js",
  "./js/ui/art.js",
  "./js/ui/assets.js",
  "./js/ui/shared.js",
  "./js/ui/shop.js",
  "./css/global.css",
  "./css/game.css",
  "./css/navigation.css",
  "./css/animations.css",
  "./css/pages.css",
  "./css/responsive.css",
  "./assets/audio/bmg1.ogg",
  "./assets/images/bg-purple.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  // Existing tabs finish their adventure before this complete shell takes over.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name === CACHE_NAME || !name.startsWith("lollipop-clicker-"))
          continue;
        const cache = await caches.open(name),
          requests = await cache.keys();
        // Other GitHub Pages games on the same origin must keep their own caches.
        if (
          requests.length &&
          requests.every((request) =>
            request.url.startsWith(self.registration.scope),
          )
        )
          await caches.delete(name);
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    event.request.headers.has("range")
  )
    return;
  const path = ASSETS.find(
    (asset) =>
      new URL(asset, self.registration.scope).pathname === url.pathname,
  );
  if (!path) {
    if (
      url.href.startsWith(
        new URL("./assets/images/", self.registration.scope).href,
      ) &&
      /\.(png|webp)$/.test(url.pathname)
    ) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const response = await fetch(event.request);
          if (response.ok) {
            try {
              await cache.put(event.request, response.clone());
            } catch {
              /* Cache cheio não deve esconder uma imagem recebida. */
            }
          }
          return response;
        }),
      );
    }
    return;
  }
  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => (await cache.match(path)) || fetch(event.request)),
  );
});

// Warm only explicitly configured local images. Failed optional artwork never breaks install.
self.addEventListener("message", (event) => {
  if (
    event.data?.type !== "lollipop:cache-art" ||
    !Array.isArray(event.data.paths)
  )
    return;
  const paths = event.data.paths.filter(
    (path) =>
      typeof path === "string" &&
      /^assets\/images\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(png|webp)$/.test(path),
  );
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        paths.map(async (path) => {
          const url = new URL(path, self.registration.scope).href;
          if (!(await cache.match(url))) await cache.add(url);
        }),
      ),
    ),
  );
});
