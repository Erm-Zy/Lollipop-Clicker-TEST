// Source template. npm run pwa:build injects a deterministic, verified release.
const RELEASE = /*__PWA_RELEASE__*/ null;
if (!RELEASE) throw new Error("Sirva o artefato gerado por npm run pwa:build para testar o PWA.");
const SCOPE = self.registration.scope;
const PREFIX = "lollipop-pwa:" + encodeURIComponent(SCOPE) + ":";
const CACHE_NAME = PREFIX + RELEASE.id;
const ASSETS = RELEASE.assets.filter(asset=>asset.required).map(asset=>asset.path);
const COMPLETE = new URL("__pwa_complete__",SCOPE).href;
const OBSOLETE = new URL("__pwa_obsolete__",SCOPE).href;
const ownCache = name => name.startsWith(PREFIX) || (name.startsWith("lollipop-clicker-") && name.endsWith(":"+SCOPE));

async function verifiedFetch(asset) {
  const response=await fetch(new URL(asset.path,SCOPE).href,{cache:"no-store",credentials:"same-origin",redirect:"error"});
  if (response.status!==200) throw new Error("Asset indisponível: "+asset.path);
  const bytes=await response.clone().arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
  if (hash!==asset.hash) throw new Error("Asset de outra release: "+asset.path);
  return response;
}
async function complete() {
  if (!(await caches.has(CACHE_NAME))) return false;
  const cache=await caches.open(CACHE_NAME);
  if ((await cache.match(COMPLETE))?.headers.get("X-PWA-Release")!==RELEASE.id) return false;
  return (await Promise.all(ASSETS.map(path=>cache.match(new URL(path,SCOPE).href)))).every(Boolean);
}
self.addEventListener("install",event=>event.waitUntil((async()=>{
  if (await complete()) return;
  const cache=await caches.open(CACHE_NAME);
  try {
    const queue=RELEASE.assets.filter(asset=>asset.required).slice();
    const results=await Promise.allSettled(Array.from({length:4},async()=>{
      while(queue.length) { const asset=queue.shift(); await cache.put(new URL(asset.path,SCOPE).href,await verifiedFetch(asset)); }
    }));
    const failed=results.find(result=>result.status==='rejected');
    if (failed) throw failed.reason;
    await cache.put(COMPLETE,new Response("complete",{headers:{"X-PWA-Release":RELEASE.id}}));
  } catch(error) {
    // Content IDs isolate this candidate from the working release, even on retry.
    await caches.delete(CACHE_NAME);
    throw error;
  }
})()));

const readyClients=new Map();
async function appClients() {
  const paths=new Set(RELEASE.assets.filter(a=>a.path.endsWith('.html')).map(a=>new URL(a.path,SCOPE).pathname));
  paths.add(new URL('./',SCOPE).pathname);
  return (await self.clients.matchAll({type:'window',includeUncontrolled:true}))
    .filter(client=>{ const url=new URL(client.url); return url.origin===self.location.origin && paths.has(url.pathname); });
}
async function cleanup() {
  const clients=await appClients();
  const live=new Set(clients.map(client=>client.id));
  for (const id of readyClients.keys()) if (!live.has(id)) readyClients.delete(id);
  if (clients.some(client=>readyClients.get(client.id)!==RELEASE.id)) return;
  // Only candidates captured at this worker's activation. A later install's cache
  // must never be deleted by an older active worker reporting its clients ready.
  const cache=await caches.open(CACHE_NAME);
  const record=await cache.match(OBSOLETE);
  const names=record ? await record.json() : [];
  for (const name of names) if (name!==CACHE_NAME && ownCache(name)) await caches.delete(name);
}
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  if (!(await complete())) throw new Error('Cache de release incompleto');
  const cache=await caches.open(CACHE_NAME);
  const obsolete=(await caches.keys()).filter(name=>name!==CACHE_NAME && ownCache(name));
  try { await cache.put(OBSOLETE,new Response(JSON.stringify(obsolete))); } catch { /* Cleanup may wait; never fail activation for bookkeeping quota. */ }
  await self.clients.claim();
  await cleanup().catch(()=>{});
})()));

let transaction=null;
let reserving=false;
function finishTransaction(ok,reason='') {
  const current=transaction;
  if (!current) return;
  clearTimeout(current.timer);
  if (!ok) for(const client of current.clients) client.postMessage({type:'PWA_CANCEL',transactionId:current.id,releaseId:RELEASE.id,reason});
  current.port?.postMessage({ok,reason,releaseId:RELEASE.id});
  current.resolve(); transaction=null;
}
async function advanceTransaction() {
  const current=transaction;
  if (!current) return;
  if (current.advancing) { current.dirty=true; return; }
  current.advancing=true;
  try {
    const clients=await appClients();
    if (transaction!==current) return;
    if (clients.some(client=>!current.expected.has(client.id))) { finishTransaction(false,'windows-changed'); return; }
    if (clients.some(client=>!current.acks.has(client.id))) return;
    if (current.phase==='prepare') {
      current.phase='arm'; current.acks.clear();
      for(const client of clients) client.postMessage({type:'PWA_ARM',transactionId:current.id,releaseId:RELEASE.id});
    } else {
      if (!(await complete())) { finishTransaction(false,'incomplete'); return; }
      await self.skipWaiting();
      finishTransaction(true);
    }
  } finally {
    if (transaction===current) {
      current.advancing=false;
      if (current.dirty) { current.dirty=false; await advanceTransaction(); }
    }
  }
}
self.addEventListener('message',event=>{
  const data=event.data;
  if (!data || !event.source?.id) return;
  if (data.type==='PWA_RELEASE') {
    event.waitUntil(complete().then(ready=>event.ports[0]?.postMessage({id:RELEASE.id,protocol:1,ready}))); return;
  }
  if (data.type==='PWA_READY' && data.releaseId===RELEASE.id) {
    readyClients.set(event.source.id,RELEASE.id); event.waitUntil(cleanup()); return;
  }
  if (data.type==='PWA_ACTIVATE' && data.releaseId===RELEASE.id && typeof data.transactionId==='string') {
    if (transaction || reserving) { event.ports[0]?.postMessage({ok:false,reason:'busy'}); return; }
    reserving=true;
    event.waitUntil((async()=>{
      try {
      if (!(await complete())) { event.ports[0]?.postMessage({ok:false,reason:'incomplete'}); return; }
      const clients=await appClients();
      if (!clients.some(client=>client.id===event.source.id)) return;
      let resolve;
      const done=new Promise(r=>resolve=r);
      transaction={id:data.transactionId,clients,expected:new Set(clients.map(c=>c.id)),acks:new Set(),phase:'prepare',port:event.ports[0],resolve,advancing:false};
      reserving=false;
      transaction.timer=setTimeout(()=>finishTransaction(false,'window-timeout'),10000);
      for(const client of clients) client.postMessage({type:'PWA_PREPARE',transactionId:data.transactionId,releaseId:RELEASE.id});
      await done;
      } finally { reserving=false; }
    })()); return;
  }
  if (data.type==='PWA_ACK' && transaction && transaction.id===data.transactionId && data.releaseId===RELEASE.id && transaction.expected.has(event.source.id)) {
    if (!data.ok) { finishTransaction(false,data.reason||'save'); return; }
    if (data.phase===transaction.phase) { transaction.acks.add(event.source.id); event.waitUntil(advanceTransaction()); }
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === new URL("sw.js",SCOPE).pathname || url.pathname === new URL("pwa-release.json",SCOPE).pathname) return;
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
  const path = url.pathname === new URL("./",SCOPE).pathname ? "index.html" : ASSETS.find(
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
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached=await cache.match(new URL(path,SCOPE).href);
    if (cached) return cached;
    // Repair only with bytes belonging to this release, never mix newer JS/HTML.
    const asset=RELEASE.assets.find(asset=>new URL(asset.path,SCOPE).pathname===url.pathname) ?? RELEASE.assets.find(asset=>asset.path==='index.html');
    try { const response=await verifiedFetch(asset); await cache.put(new URL(asset.path,SCOPE).href,response.clone()); return response; }
    catch { return new Response("Esta versão não está disponível offline. Reconecte para atualizar.",{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
  }));
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
