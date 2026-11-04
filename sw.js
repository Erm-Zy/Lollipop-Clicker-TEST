// A complete release cache keeps all real pages and their shared modules together.
const CACHE_NAME = "lollipop-clicker-3.0.3-music:" + self.registration.scope;
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
  "./js/world.js",
  "./js/music/catalog.js",
  "./js/music/preferences.js",
  "./js/music/selection.js",
  "./js/music/player.js",
  "./js/ui/jukebox.js",
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
  "./js/ui/qol.js",
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
    url.origin !== self.location.origin
  )
    return;
  const audioRoot = new URL("./assets/audio/", self.registration.scope).href;
  if (url.href.startsWith(audioRoot) && /\.(ogg|mp3|m4a|aac|wav|webm)$/.test(url.pathname)) {
    event.respondWith(cachedAudio(event.request));
    return;
  }
  if (event.request.headers.has("range")) return;
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

// Cache only music actually requested by the player, never a whole future catalog.
// WebViews commonly request bytes=0-; serve ranges from the cached complete file.
async function cachedAudio(request) {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(request.url);
  if (!response) {
    const headers = new Headers(request.headers);
    headers.delete("range");
    response = await fetch(new Request(request, { headers }));
    if (response.status === 200) {
      try { await cache.put(request.url, response.clone()); } catch {
        // A full cache must not prevent online listening.
      }
    }
  }
  const range = request.headers.get("range");
  if (!range || response.status !== 200) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return response;
  const buffer = await response.arrayBuffer();
  const length = buffer.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1;
  if (start >= length || start > end || !Number.isSafeInteger(start) || !Number.isSafeInteger(end))
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${length}` } });
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(buffer.slice(start, end + 1), { status: 206, headers });
}
