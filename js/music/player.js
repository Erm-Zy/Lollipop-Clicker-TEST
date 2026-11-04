import { MUSIC_TRACKS, validTracks, musicUrl } from "./catalog.js";
import {
  MUSIC_PREFERENCE_KEY, MUSIC_SESSION_KEY, loadMusicPreferences,
  storeMusicPreferences, loadMusicSession, discoverMusic, isDiscovered,
  validateMusicPreferences,
} from "./preferences.js";
import { musicPool, chooseTrack } from "./selection.js";
import { WORLD_CHAPTERS } from "../world.js";

function optionalStorage(name) {
  try { return globalThis[name]; } catch { return null; }
}

/** One media element, one runtime owner, no per-tick play() calls or polling timer. */
export function createMusicPlayer(settings, options = {}) {
  const catalog = validTracks(options.catalog ?? MUSIC_TRACKS);
  const storage = options.storage ?? optionalStorage("localStorage");
  const sessionStorage = options.sessionStorage ?? optionalStorage("sessionStorage");
  const readState = options.getState ?? (() => ({ upgrades: {}, bossesKilled: 0, boss: null }));
  const isOwner = options.isOwner ?? (() => true);
  const notify = options.notify ?? (() => {});
  const random = options.random ?? Math.random;
  const media = (options.createMedia ?? (() => new Audio()))();
  const fadeMs = options.fadeMs ?? 160;
  const loaded = loadMusicPreferences(storage);
  let preferences = loaded.preferences;
  let initialized = loaded.initialized;
  let canStore = loaded.canSave;
  let session = loadMusicSession(sessionStorage);
  let unlocked = Boolean(session?.unlocked);
  let suspended = options.startSuspended ?? false;
  let disposed = false;
  let needsGesture = false;
  let gestureAttempted = false;
  let target = null;
  let source = null;
  let pool = { tracks: [], key: "", context: "" };
  let status = "paused";
  let lastError = "";
  let generation = 0;
  let playPending = false;
  let switchingTo = null;
  let fadeHandle = 0;
  let fadeResolve = null;
  let lastSessionWrite = 0;
  let lastSnapshot = "";
  let hadOwnership = false;
  const listeners = new Set();
  const failed = new Set();
  const positions = new Map();
  const choices = new Map();
  const events = [];
  media.preload = "none";
  media.volume = preferences.volume;

  const allowed = () => !disposed && !suspended && isOwner() && settings().music;
  function snapshot() {
    return {
      preferences: { ...preferences, discovered: [...preferences.discovered] },
      catalog, trackId: target?.id ?? null, title: target?.title ?? "Nenhuma faixa disponível",
      status, lastError, canStore, canControl: isOwner(), hasNext: pool.tracks.length > 1, playlistSize: pool.tracks.length,
      discovered: catalog.filter(track => isDiscovered(track, preferences)).map(track => track.id),
    };
  }
  function emit() {
    const value = snapshot();
    const signature = JSON.stringify(value);
    if (signature === lastSnapshot) return;
    lastSnapshot = signature;
    for (const listener of listeners) listener(value);
  }
  function setStatus(value) { status = value; emit(); }
  function persistPreferences() {
    if (canStore && isOwner()) canStore = storeMusicPreferences(storage, preferences);
  }
  function rememberPosition() {
    if (source && Number.isFinite(media.currentTime)) positions.set(source.id, media.currentTime);
  }
  function saveSession() {
    if (!hadOwnership || !source) return;
    rememberPosition();
    session = { version: 1, trackId: source.id, position: positions.get(source.id) ?? 0,
      mode: preferences.mode, poolKey: pool.key, unlocked, at: Date.now() };
    try { sessionStorage?.setItem(MUSIC_SESSION_KEY, JSON.stringify(session)); } catch {
      // Continuity is optional when sessionStorage is unavailable.
    }
    lastSessionWrite = Date.now();
  }
  function cancelFade() {
    if (fadeHandle) cancelAnimationFrame(fadeHandle);
    fadeHandle = 0;
    const resolve = fadeResolve;
    fadeResolve = null;
    resolve?.(false);
  }
  function fadeTo(volume, token) {
    cancelFade();
    if (!fadeMs || media.paused || !globalThis.requestAnimationFrame) {
      media.volume = volume;
      return Promise.resolve(token === generation);
    }
    const from = media.volume;
    const start = performance.now();
    return new Promise(resolve => {
      fadeResolve = resolve;
      const step = now => {
        if (disposed || token !== generation) { cancelFade(); return; }
        const fraction = Math.min(1, (now - start) / fadeMs);
        media.volume = Math.min(1, Math.max(0, from + (volume - from) * fraction));
        if (fraction < 1) fadeHandle = requestAnimationFrame(step);
        else { fadeHandle = 0; fadeResolve = null; resolve(true); }
      };
      fadeHandle = requestAnimationFrame(step);
    });
  }
  function stopPlayback() {
    if (!media.paused || playPending || switchingTo) {
      generation++;
      switchingTo = null;
      playPending = false;
      cancelFade();
      saveSession();
      media.pause();
    }
    media.volume = preferences.volume;
  }
  function failure() {
    if (disposed || !source || failed.has(source.id)) return;
    failed.add(source.id);
    lastError = "Não foi possível abrir uma das faixas.";
    stopPlayback();
    target = null;
    pool = { tracks: [], key: "", context: "" };
    sync();
  }
  function restorePosition() {
    if (!source) return;
    const saved = positions.get(source.id) ?? (
      session?.trackId === source.id && session.mode === preferences.mode && session.poolKey === pool.key
        ? session.position : 0);
    const duration = media.duration;
    const position = Number.isFinite(duration) && duration > 0 ? saved % duration : saved;
    try { if (position > 0) media.currentTime = position; } catch {
      // Some WebViews accept seeking only after metadata has arrived.
    }
  }
  function attemptPlay() {
    if (!allowed() || !unlocked || needsGesture || playPending || !source || failed.has(source.id)) return;
    if (!media.paused) { setStatus("playing"); return; }
    const token = generation;
    playPending = true;
    setStatus("loading");
    let result;
    try { result = media.play(); } catch (error) { result = Promise.reject(error); }
    Promise.resolve(result).then(() => {
      if (token !== generation || disposed) {
        if (!allowed()) media.pause();
        return;
      }
      playPending = false;
      if (!allowed()) { stopPlayback(); return; }
      needsGesture = false;
      gestureAttempted = false;
      setStatus("playing");
      saveSession();
      fadeTo(preferences.volume, token);
    }).catch(error => {
      if (token !== generation || disposed) return;
      playPending = false;
      if (error?.name === "NotAllowedError" || error?.name === "AbortError") {
        needsGesture = true;
        setStatus("interaction");
      } else failure();
    });
  }
  function activateTarget() {
    if (!target || switchingTo === target.id) return;
    if (source?.id === target.id) {
      media.loop = pool.tracks.length === 1 || (preferences.mode === "manual" && !pool.context.startsWith("boss:")) || preferences.mode === "original";
      attemptPlay();
      return;
    }
    const token = ++generation;
    const next = target;
    switchingTo = next.id;
    playPending = false;
    cancelFade();
    const activate = () => {
      if (disposed || token !== generation || !allowed()) return;
      rememberPosition();
      media.pause();
      source = next;
      media.volume = fadeMs ? 0 : preferences.volume;
      media.loop = pool.tracks.length === 1 || (preferences.mode === "manual" && !pool.context.startsWith("boss:")) || preferences.mode === "original";
      media.src = musicUrl(next);
      media.load();
      restorePosition();
      switchingTo = null;
      attemptPlay();
    };
    // Fade out, then swap the source. A crossfade would violate the one-track rule.
    if (!media.paused && fadeMs) fadeTo(0, token).then(ok => { if (ok) activate(); });
    else activate();
  }
  function sync() {
    if (disposed) return;
    const state = readState();
    if (!state) return;
    if (isOwner()) {
      hadOwnership = true;
      const discovery = discoverMusic(preferences, state, catalog, !initialized);
      if (discovery.changed) {
        preferences = discovery.preferences;
        initialized = true;
        persistPreferences();
        if (discovery.chapter !== null) notify(`Novo capítulo descoberto: ${WORLD_CHAPTERS[discovery.chapter].name}!`);
        else if (discovery.newTracks.length) {
          const track = catalog.find(track => track.id === discovery.newTracks[0]);
          if (track) notify(`Nova trilha descoberta: ${track.title}!`);
        }
      }
    }
    const nextPool = musicPool(preferences, state, catalog, { failed });
    if (nextPool.key !== pool.key || !target || failed.has(target.id)) {
      const enteringRandom = preferences.mode === "random" && !pool.key.startsWith("random/");
      pool = nextPool;
      const rememberedId = choices.get(pool.key) ?? (session?.mode === preferences.mode && session.poolKey === pool.key ? session.trackId : null);
      target = pool.tracks.find(track => track.id === rememberedId) ??
        (!enteringRandom ? pool.tracks.find(track => track.id === target?.id) : null) ??
        chooseTrack(pool.tracks, enteringRandom ? target?.id : null, random);
      if (target) choices.set(pool.key, target.id);
    }
    if (!allowed()) {
      stopPlayback();
      setStatus(!isOwner() ? "readonly" : !settings().music ? "disabled" : "paused");
    } else if (!target) {
      stopPlayback();
      setStatus("unavailable");
    } else if (!unlocked || needsGesture) setStatus("interaction");
    else activateTarget();
    emit();
  }
  function unlock(explicit = false) {
    if (disposed || !isOwner()) return false;
    unlocked = true;
    // One gesture retry after autoplay rejection; further retries are explicit.
    if (explicit || !gestureAttempted) {
      if (needsGesture) gestureAttempted = true;
      needsGesture = false;
      sync();
    }
    return true;
  }
  function setPreferences(patch, gesture = false) {
    if (!isOwner() || disposed) return false;
    preferences = validateMusicPreferences({ ...preferences, ...patch, version: 1 });
    persistPreferences();
    if (!switchingTo) {
      cancelFade();
      media.volume = preferences.volume;
    }
    if (gesture) { unlocked = true; needsGesture = false; gestureAttempted = true; }
    sync();
    return true;
  }
  function selectTrack(id) {
    const track = catalog.find(track => track.id === id);
    if (!track || !isDiscovered(track, preferences)) return false;
    return setPreferences({ mode: "manual", manualTrackId: id }, true);
  }
  function next() {
    if (!isOwner() || pool.tracks.length < 2) return false;
    target = chooseTrack(pool.tracks, target?.id, random);
    choices.set(pool.key, target.id);
    unlocked = true;
    needsGesture = false;
    sync();
    return true;
  }
  function on(type, listener) {
    media.addEventListener(type, listener);
    events.push([type, listener]);
  }
  on("loadedmetadata", restorePosition);
  on("error", failure);
  on("ended", () => {
    if (!allowed()) return;
    if (source) positions.set(source.id, 0);
    if (pool.tracks.length > 1) next();
    else { try { media.currentTime = 0; } catch {} attemptPlay(); }
  });
  on("timeupdate", () => {
    if (isOwner() && !suspended && Date.now() - lastSessionWrite >= 5000) saveSession();
  });
  on("playing", () => {
    if (!allowed()) media.pause();
    else if (!switchingTo) setStatus("playing");
  });
  function storageChanged(event) {
    if (event.key !== MUSIC_PREFERENCE_KEY) return;
    const latest = loadMusicPreferences(storage);
    preferences = latest.preferences;
    initialized = latest.initialized;
    canStore = latest.canSave;
    sync();
  }
  globalThis.addEventListener?.("storage", storageChanged);
  return {
    sync, unlock, snapshot, setPreferences, selectTrack, next,
    suspend(value) { suspended = value; if (value) { saveSession(); stopPlayback(); } sync(); },
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    dispose() {
      if (disposed) return;
      saveSession();
      stopPlayback();
      disposed = true;
      cancelFade();
      for (const [type, listener] of events) media.removeEventListener(type, listener);
      globalThis.removeEventListener?.("storage", storageChanged);
      media.removeAttribute("src");
      media.load();
      listeners.clear();
      positions.clear(); choices.clear();
    },
  };
}
