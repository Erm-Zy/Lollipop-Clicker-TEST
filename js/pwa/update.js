// Browser/PWA lifecycle only. Capacitor bundles are updated by installing a new APK.
const CHECK_INTERVAL = 60_000;
const DEFER_MS = 15 * 60_000;
const DEFER_KEY = "lollipop.pwa.deferred";
const RELOAD_KEY = "lollipop.pwa.reloaded";

function sessionGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
function sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch { /* In-memory guards still apply. */ } }
function request(worker, data, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error("worker-timeout")); }, timeout);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    try { worker.postMessage(data, [channel.port2]); }
    catch (error) { clearTimeout(timer); channel.port1.close(); reject(error); }
  });
}

export function initializeUpdates(runtime) {
  if (globalThis.Capacitor?.isNativePlatform?.() || !("serviceWorker" in navigator)) return;
  const documentRelease = document.querySelector('meta[name="lollipop-release"]')?.content;
  if (!documentRelease) return; // Raw source development is deliberately not a deployed PWA.
  const root = new URL("../../", import.meta.url);
  const workerURL = new URL("sw.js", root).href;
  const sw = navigator.serviceWorker;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let registration, candidate, prepared, expected, freezeTimer;
  let registering = false, lastRegistration = 0;
  let lastCheck = 0, checking = false, reloading = false, disposed = false, busy = false;
  let deferred;
  try { deferred = JSON.parse(sessionGet(DEFER_KEY)); } catch { /* Ignore invalid preferences. */ }
  const watched = new WeakSet();
  const cancelled = new Set();
  const banner = document.createElement("aside");
  banner.id = "pwaUpdate";
  banner.className = "pwa-update";
  banner.setAttribute("aria-label", "Atualização do jogo");
  banner.hidden = true;
  banner.dataset.ready = 'checking';
  banner.innerHTML = '<p role="status" aria-live="polite" aria-atomic="true"></p><div><button type="button" data-update>Atualizar agora</button><button type="button" data-later>Depois</button></div>';
  document.body.prepend(banner);
  const message = banner.querySelector("p");
  const updateButton = banner.querySelector("[data-update]");
  const laterButton = banner.querySelector("[data-later]");
  const errors = {
    save: "Não foi possível salvar com segurança. Exporte seu progresso nos Ajustes e tente novamente.",
    busy: "Outra janela está preparando a atualização. Aguarde um instante.",
    "window-timeout": "Uma janela do jogo não respondeu. Abra ou feche as outras janelas e tente novamente.",
    "windows-changed": "As janelas abertas mudaram. Tente atualizar novamente.",
  };
  function show(text, force = false) {
    if (!force && deferred?.id === candidate?.id && deferred.until > Date.now()) return;
    message.textContent = text;
    banner.hidden = false;
    updateButton.disabled = busy || Boolean(prepared);
    laterButton.disabled = busy || Boolean(prepared);
  }
  function cancel(transactionId, reason) {
    if (prepared !== transactionId) return;
    clearTimeout(freezeTimer);
    runtime.cancelUpdate(transactionId);
    prepared = expected = null;
    busy = false;
    show(errors[reason] || "A atualização foi adiada com segurança. Tente novamente quando todas as janelas estiverem disponíveis.", true);
  }
  function reload(id) {
    if (reloading || sessionGet(RELOAD_KEY) === id) {
      if (!reloading && prepared) cancel(prepared);
      return;
    }
    reloading = true;
    sessionSet(RELOAD_KEY, id);
    location.reload();
  }
  async function identify(worker) {
    if (!worker || worker.scriptURL !== workerURL) return null;
    const release = await request(worker, { type: "PWA_RELEASE" });
    return release?.protocol === 1 && release.ready ? release : null;
  }
  async function inspect() {
    if (!registration || disposed || busy || prepared) return;
    try {
      const worker = registration.waiting || sw.controller;
      if (registration.waiting) banner.dataset.ready = 'checking';
      const release = await identify(worker);
      if (!release || disposed || busy || prepared) {
        if (!worker && !registration.waiting) banner.dataset.ready = 'false';
        return;
      }
      if (worker !== (registration.waiting || sw.controller)) { inspect(); return; }
      if (release.id === documentRelease) {
        worker.postMessage({ type: "PWA_READY", releaseId: documentRelease });
        candidate = null;
        banner.dataset.ready = 'false';
        banner.hidden = true;
        return;
      }
      candidate = { ...release, worker };
      banner.dataset.ready = 'true';
      watch(worker);
      show("Uma nova versão do Lollipop Clicker está pronta. Seu progresso será salvo antes de atualizar.");
    } catch { /* An offline update check must never interrupt the running game. */ }
  }
  function acknowledge(worker, data) {
    try { worker.postMessage(data); }
    catch { cancel(data.transactionId, "windows-changed"); }
  }
  function watch(worker) {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener("statechange", () => {
      if (worker.state === "redundant" && candidate?.worker === worker) {
        if (prepared) cancel(prepared, "windows-changed");
        candidate = null;
        banner.dataset.ready = 'false';
        banner.hidden = true;
      }
      if (worker.state === "installed" || worker.state === "activated") setTimeout(inspect, 0);
    }, options);
  }
  async function check() {
    if (disposed || busy || prepared) return;
    if (registration && !registration.active && !registration.waiting && !registration.installing && Date.now() - lastRegistration >= CHECK_INTERVAL) registration = null;
    if (!registration) { register(); return; }
    await inspect(); // Also reports this document ready after a worker restart.
    if (checking || Date.now() - lastCheck < CHECK_INTERVAL) return;
    checking = true;
    lastCheck = Date.now();
    try { await registration.update(); watch(registration.installing); await inspect(); }
    catch { /* Keep the installed version online/offline if the network fails. */ }
    finally { checking = false; }
  }
  // Install listeners before registration/update can change the controller.
  sw.addEventListener("message", async event => {
    const data = event.data, worker = event.source;
    if (!data || worker?.scriptURL !== workerURL || data.releaseId === documentRelease) return;
    if (data.type === "PWA_PREPARE") {
      // Only a waiting worker from our registration may request a game freeze.
      if (worker !== registration?.waiting || typeof data.transactionId !== "string") return;
      let ok = false;
      try { ok = await runtime.prepareForUpdate(data.transactionId); } catch { /* Fail closed. */ }
      if (ok && cancelled.has(data.transactionId)) { runtime.cancelUpdate(data.transactionId); return; }
      if (ok) {
        prepared = data.transactionId;
        candidate = { id: data.releaseId, worker };
        show("Progresso salvo. Preparando a atualização nas janelas abertas…", true);
        // A terminated worker or lost message must not leave the game frozen forever.
        clearTimeout(freezeTimer);
        freezeTimer = setTimeout(() => {
          cancel(data.transactionId);
          busy = false;
          show("A atualização demorou para responder. Tente novamente.", true);
        }, 20_000);
      }
      acknowledge(worker, { type: "PWA_ACK", phase: "prepare", transactionId: data.transactionId, releaseId: data.releaseId, ok, reason: "save" });
    } else if (data.type === "PWA_ARM" && prepared === data.transactionId) {
      expected = data.releaseId;
      acknowledge(worker, { type: "PWA_ACK", phase: "arm", transactionId: prepared, releaseId: expected, ok: true });
    } else if (data.type === "PWA_CANCEL") {
      cancelled.add(data.transactionId);
      if (cancelled.size > 32) cancelled.delete(cancelled.values().next().value);
      cancel(data.transactionId, data.reason);
    }
  }, options);
  sw.addEventListener("controllerchange", async () => {
    try {
      const release = await identify(sw.controller);
      if (!release) return;
      if (prepared && expected === release.id) { reload(release.id); return; }
      if (release.id === documentRelease) sw.controller.postMessage({ type: "PWA_READY", releaseId: documentRelease });
      else await inspect(); // Unanticipated claims/first legacy rollout require explicit consent.
    } catch { /* Next foreground check retries without an automatic reload loop. */ }
  }, options);
  updateButton.addEventListener("click", async () => {
    if (busy || prepared || !candidate) return;
    const target = candidate;
    busy = true;
    show("Salvando o progresso e preparando a atualização…", true);
    try {
      if (target.worker === registration.waiting) {
        const result = await request(target.worker, {
          type: "PWA_ACTIVATE", releaseId: target.id,
          transactionId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        }, 15_000);
        if (!result.ok) throw new Error(result.reason || "worker-timeout");
        // Reload is exclusively performed by controllerchange after PWA_ARM.
      } else {
        // A BFCache/late-created document can find the new controller already active.
        const release = await identify(sw.controller);
        if (release?.id !== target.id) throw new Error("worker-timeout");
        const id = `active-${target.id}`;
        if (!(await runtime.prepareForUpdate(id))) throw new Error("save");
        prepared = id;
        reload(target.id);
      }
    } catch (error) {
      show(errors[error.message] || "Não foi possível atualizar agora. Reconecte e tente novamente.", true);
    } finally {
      busy = false;
      if (!reloading) { updateButton.disabled = Boolean(prepared); laterButton.disabled = Boolean(prepared); }
    }
  }, options);
  laterButton.addEventListener("click", () => {
    if (busy || prepared || !candidate) return;
    deferred = { id: candidate.id, until: Date.now() + DEFER_MS };
    sessionSet(DEFER_KEY, JSON.stringify(deferred));
    banner.hidden = true;
  }, options);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); }, options);
  window.addEventListener("online", check, options);
  window.addEventListener("pageshow", event => { if (event.persisted) check(); }, options);
  window.addEventListener("pagehide", event => {
    if (event.persisted) {
      if (prepared) {
        acknowledge(candidate.worker, { type: "PWA_ACK", phase: expected ? "arm" : "prepare", transactionId: prepared, releaseId: candidate.id, ok: false, reason: "windows-changed" });
        cancel(prepared);
      }
      return;
    }
    disposed = true;
    clearTimeout(freezeTimer);
    abort.abort();
  }, options);
  function register() {
    if (disposed || registering || Date.now() - lastRegistration < CHECK_INTERVAL) return;
    registering = true;
    lastRegistration = Date.now();
    sw.register(workerURL, { scope: root.pathname, updateViaCache: "none" }).then(value => {
      if (disposed) return;
      registration = value;
      registration.addEventListener("updatefound", () => watch(registration.installing), options);
      watch(registration.installing);
      check();
    }).catch(() => { /* A later foreground/online check can retry a failed first install. */ })
      .finally(() => { registering = false; });
  }
  register();
}
