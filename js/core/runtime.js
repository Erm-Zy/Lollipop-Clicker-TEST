import * as game from "../gameplay.js";
import { loadGame, saveGame, validateState, SAVE_KEY } from "../storage.js";
import { ACHIEVEMENTS_DATA } from "../data.js";
import { createAudio } from "../audio.js";

const LOCK_NAME = "lollipop-writer-v3";
const LEASE_KEY = "lollipopSave.writer-v3";
const LEASE_MS = 6000;
const TICK_MS = 200;
const AUTOSAVE_MS = 5000;

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem() {
        throw new Error("Armazenamento indisponível.");
      },
      setItem() {
        throw new Error("Armazenamento indisponível.");
      },
      removeItem() {
        throw new Error("Armazenamento indisponível.");
      },
    };
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

/** One writer and one production clock per origin, shared by real HTML pages. */
export async function createRuntime() {
  const storage = browserStorage();
  const listeners = new Set();
  const owner =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  let state;
  let loaded;
  let ownership = false;
  let protectedSave = false;
  let memoryOnly = false;
  let paused = false;
  let disposed = false;
  let conflict = false;
  let background = document.hidden;
  let timer = 0;
  let releaseWebLock = null;
  let useWebLocks = Boolean(navigator.locks?.request);
  let lastLeaseRenewed = 0;
  let lastSavedAt = 0;
  let lastWrittenRaw = null;
  let lastError = "";
  let observedWheelAt = 0;
  let resumePromise = null;
  let abortListeners = new AbortController();
  const audio = createAudio(
    () => state?.settings || { music: false, sfx: false },
  );

  function notify(message) {
    document.dispatchEvent(
      new CustomEvent("lollipop:toast", { detail: { message } }),
    );
  }

  function info(type, extra = {}) {
    return {
      type,
      now: Date.now(),
      writable: isWritable(),
      canSave: !protectedSave,
      error: lastError,
      ...extra,
    };
  }

  function emit(type, extra) {
    const details = info(type, extra);
    for (const listener of listeners) listener(state, details);
    document.dispatchEvent(
      new CustomEvent("lollipop:state", { detail: details }),
    );
  }

  function readLease() {
    try {
      const value = JSON.parse(storage.getItem(LEASE_KEY));
      return value &&
        typeof value.owner === "string" &&
        Number.isFinite(value.expiresAt)
        ? value
        : null;
    } catch {
      return null;
    }
  }

  function holdsOwnership() {
    if (!ownership || paused || disposed || conflict) return false;
    if (memoryOnly) return true;
    if (useWebLocks) return Boolean(releaseWebLock);
    const lease = readLease();
    return Boolean(
      lease && lease.owner === owner && lease.expiresAt > Date.now(),
    );
  }

  function isWritable() {
    return holdsOwnership();
  }

  function releaseOwnership() {
    ownership = false;
    const release = releaseWebLock;
    releaseWebLock = null;
    release?.();
    if (!useWebLocks) {
      try {
        if (readLease()?.owner === owner) storage.removeItem(LEASE_KEY);
      } catch {
        /* A failed lease release expires automatically. */
      }
    }
  }

  async function claimWebLock() {
    let resolveAcquired;
    const acquired = new Promise((resolve) => {
      resolveAcquired = resolve;
    });
    navigator.locks
      .request(
        LOCK_NAME,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => {
          if (!lock || disposed || paused) {
            resolveAcquired(false);
            return;
          }
          let release;
          const lifetime = new Promise((resolve) => {
            release = resolve;
          });
          releaseWebLock = release;
          ownership = true;
          resolveAcquired(true);
          await lifetime;
          if (releaseWebLock === release) {
            releaseWebLock = null;
            ownership = false;
          }
        },
      )
      .catch(() => {
        useWebLocks = false;
        resolveAcquired(false);
      });
    return acquired;
  }

  async function claimLease() {
    const previous = readLease();
    if (previous && previous.owner !== owner && previous.expiresAt > Date.now())
      return false;
    try {
      const now = Date.now();
      storage.setItem(
        LEASE_KEY,
        JSON.stringify({ owner, expiresAt: now + LEASE_MS }),
      );
      // Allow competing initial pages to observe the same final owner before enabling input.
      await wait(60);
      ownership = readLease()?.owner === owner;
      lastLeaseRenewed = now;
      return ownership;
    } catch {
      // Without persistent storage there is no save to overwrite; allow exportable temporary play.
      memoryOnly = true;
      ownership = true;
      return true;
    }
  }

  async function claimOwnership() {
    if (holdsOwnership()) return true;
    for (let attempt = 0; attempt < 8 && !disposed && !paused; attempt++) {
      if (useWebLocks ? await claimWebLock() : await claimLease()) return true;
      // A normal document navigation releases its predecessor's lock on pagehide.
      if (attempt < 7) await wait(100);
    }
    return false;
  }

  function renewLease() {
    if (
      memoryOnly ||
      useWebLocks ||
      !ownership ||
      Date.now() - lastLeaseRenewed < 2000
    )
      return;
    const lease = readLease();
    if (!lease || lease.owner !== owner || lease.expiresAt <= Date.now()) {
      loseOwnership(
        "Outra página assumiu a fábrica. Recarregue para usar o progresso mais recente.",
      );
      return;
    }
    try {
      const now = Date.now();
      storage.setItem(
        LEASE_KEY,
        JSON.stringify({ owner, expiresAt: now + LEASE_MS }),
      );
      lastLeaseRenewed = now;
    } catch {
      loseOwnership(
        "O armazenamento ficou indisponível. Exporte seu progresso antes de sair.",
      );
    }
  }

  function loseOwnership(message) {
    if (conflict) return;
    conflict = true;
    releaseOwnership();
    audio.suspend(true);
    notify(message);
    emit("readonly");
  }

  function noticeTransitions(before, progress) {
    if (
      progress?.bossExpired ||
      (before.boss &&
        !state.boss &&
        state.bossesKilled === before.bossesKilled &&
        Date.now() >= before.bossDeadline)
    ) {
      notify(
        "O tempo acabou! O chefe escapou. Prepare-se para a próxima tentativa.",
      );
    }
    if (state.lastWheelReward && state.lastWheelReward.at !== observedWheelAt) {
      observedWheelAt = state.lastWheelReward.at;
      const reward = state.lastWheelReward;
      notify(
        reward.type === "pct"
          ? `Prêmio da roleta: +${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(reward.amount)} pirulitos!`
          : `Prêmio da roleta: ${reward.label}!`,
      );
      audio.play("win");
    }
    const unlocked = game.checkAchievements(state, Date.now());
    for (const id of unlocked) {
      const achievement = ACHIEVEMENTS_DATA.find((item) => item.id === id);
      notify(`Conquista desbloqueada: ${achievement.title}!`);
    }
    if (unlocked.length) audio.play("win");
    return unlocked;
  }

  function saveCurrent({ force = false } = {}) {
    if (memoryOnly || !holdsOwnership() || (protectedSave && !force))
      return false;
    const result = saveGame(storage, state, { force });
    if (!result.ok) {
      if (lastError !== result.error) notify(result.error);
      lastError = result.error;
      emit("save-error");
      return false;
    }
    lastSavedAt = Date.now();
    lastError = "";
    try {
      lastWrittenRaw = storage.getItem(SAVE_KEY);
    } catch {
      /* Save itself already succeeded. */
    }
    return true;
  }

  function advance(offline = false) {
    const before = {
      boss: Boolean(state.boss),
      bossDeadline: state.boss?.endsAt || 0,
      bossesKilled: state.bossesKilled,
    };
    const progress = game.advance(state, Date.now(), { offline });
    const unlocked = noticeTransitions(before, progress);
    return { progress, unlocked };
  }

  function flush() {
    if (!holdsOwnership()) return false;
    advance(background);
    return saveCurrent();
  }

  function tick() {
    if (disposed || paused) return;
    renewLease();
    if (!holdsOwnership() || document.hidden) return;
    const { progress, unlocked } = advance(false);
    if (
      progress.wheelReward ||
      unlocked.length ||
      Date.now() - lastSavedAt >= AUTOSAVE_MS
    )
      saveCurrent();
    emit("tick", { progress });
  }

  function startTimer() {
    clearInterval(timer);
    if (!disposed && !paused) timer = setInterval(tick, TICK_MS);
  }

  function loadCurrent() {
    // Read-only tabs may consult data without writing migration backups.
    const source =
      ownership && !memoryOnly
        ? storage
        : { getItem: (key) => storage.getItem(key), setItem() {} };
    loaded = loadGame(source, Date.now());
    state = loaded.state;
    protectedSave = memoryOnly || !loaded.canSave;
    observedWheelAt = state.lastWheelReward?.at || 0;
    try {
      lastWrittenRaw = storage.getItem(SAVE_KEY);
    } catch {
      lastWrittenRaw = null;
    }
  }

  async function resume() {
    if (disposed) return false;
    if (resumePromise) return resumePromise;
    resumePromise = (async () => {
      paused = false;
      conflict = false;
      background = document.hidden;
      await claimOwnership();
      if (disposed || paused) return false;
      loadCurrent();
      if (ownership && !protectedSave) saveCurrent();
      audio.suspend(document.hidden || !ownership);
      startTimer();
      emit("ready");
      return ownership;
    })();
    try {
      return await resumePromise;
    } finally {
      resumePromise = null;
    }
  }

  function pause() {
    if (paused || disposed) return;
    flush();
    paused = true;
    clearInterval(timer);
    timer = 0;
    releaseOwnership();
    audio.suspend(true);
  }

  function navigate(event) {
    const anchor = event.target.closest?.("a[href]");
    if (
      !anchor ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    )
      return;
    const destination = new URL(anchor.href, location.href);
    if (
      destination.origin === location.origin &&
      destination.pathname !== location.pathname
    )
      flush();
  }

  document.addEventListener("click", navigate, {
    capture: true,
    signal: abortListeners.signal,
  });
  document.addEventListener("pointerdown", () => audio.unlock(), {
    once: true,
    signal: abortListeners.signal,
  });
  document.addEventListener("keydown", () => audio.unlock(), {
    once: true,
    signal: abortListeners.signal,
  });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (disposed || paused) return;
      if (document.hidden) {
        if (holdsOwnership()) {
          advance(false);
          saveCurrent();
        }
        background = true;
        audio.suspend(true);
      } else {
        if (holdsOwnership()) {
          advance(true);
          saveCurrent();
        }
        background = false;
        audio.suspend(!holdsOwnership());
        emit("visibility");
      }
    },
    { signal: abortListeners.signal },
  );
  document.addEventListener("lollipop:native-pause", pause, {
    signal: abortListeners.signal,
  });
  document.addEventListener(
    "lollipop:native-resume",
    () => {
      if (paused) resume();
    },
    { signal: abortListeners.signal },
  );
  window.addEventListener("pagehide", pause, { signal: abortListeners.signal });
  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) resume();
    },
    { signal: abortListeners.signal },
  );
  window.addEventListener(
    "storage",
    (event) => {
      if (disposed || paused) return;
      if (
        !useWebLocks &&
        event.key === LEASE_KEY &&
        ownership &&
        readLease()?.owner !== owner
      ) {
        loseOwnership(
          "Outra página assumiu a fábrica. Recarregue para continuar.",
        );
        return;
      }
      if (event.key !== SAVE_KEY || event.newValue === lastWrittenRaw) return;
      if (ownership) {
        loseOwnership(
          "Seu progresso mudou em outra aba. Recarregue esta página antes de continuar.",
        );
      } else if (event.newValue) {
        try {
          state = validateState(JSON.parse(event.newValue), Date.now());
          game.advance(state, Date.now(), { offline: true });
          lastWrittenRaw = event.newValue;
          emit("external-save");
        } catch {
          /* Never replace a readable view with corrupt external data. */
        }
      }
    },
    { signal: abortListeners.signal },
  );

  await resume();

  return {
    get state() {
      return state;
    },
    get writable() {
      return holdsOwnership();
    },
    get canSave() {
      return !protectedSave;
    },
    get loaded() {
      return loaded;
    },
    get error() {
      return lastError;
    },
    storage,
    audio,
    notify,
    flush,
    async reconnect() {
      return resume();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state, info("subscribe"));
      return () => listeners.delete(listener);
    },
    act(action, { sound = "buy", persist = true, requireSave = false } = {}) {
      if (!holdsOwnership()) {
        notify(
          "Esta aba está em modo de consulta. Recarregue depois de fechar a outra aba do jogo.",
        );
        return false;
      }
      if (requireSave && protectedSave) {
        notify(
          "Recupere seu save nas configurações antes de resgatar recompensas.",
        );
        return false;
      }
      const before = {
        boss: Boolean(state.boss),
        bossDeadline: state.boss?.endsAt || 0,
        bossesKilled: state.bossesKilled,
      };
      const snapshot = requireSave ? clone(state) : null;
      const result = action(state, Date.now());
      const unlocked = noticeTransitions(before);
      if (result === false || result === undefined) {
        if (
          unlocked.length ||
          state.lastWheelReward?.at !== snapshot?.lastWheelReward?.at
        )
          saveCurrent();
        emit("action-rejected");
        return false;
      }
      if (persist || requireSave) {
        if (!saveCurrent() && requireSave) {
          state = snapshot;
          emit("action-rollback");
          return false;
        }
      }
      if (sound) audio.play(sound);
      audio.sync();
      emit("action", { result });
      return result;
    },
    replaceState(raw, { confirmed = false } = {}) {
      if (!confirmed)
        return {
          ok: false,
          error: "Confirmação necessária antes de substituir o progresso.",
        };
      if (!holdsOwnership())
        return {
          ok: false,
          error:
            "Feche a outra aba do jogo e recarregue para recuperar seu save.",
        };
      if (memoryOnly)
        return {
          ok: false,
          error:
            "O navegador não permitiu reservar o salvamento. Exporte esta sessão antes de sair.",
        };
      try {
        const candidate = validateState(raw, Date.now());
        game.advance(candidate, Date.now(), { offline: true });
        const result = saveGame(storage, candidate, { force: true });
        if (!result.ok) return result;
        state = candidate;
        protectedSave = false;
        observedWheelAt = state.lastWheelReward?.at || 0;
        lastSavedAt = Date.now();
        lastWrittenRaw = storage.getItem(SAVE_KEY);
        lastError = "";
        audio.sync();
        emit("replace");
        return result;
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },
    exportRaw() {
      if (protectedSave) {
        try {
          const raw = storage.getItem(SAVE_KEY);
          if (raw !== null) return raw;
        } catch {
          /* In-memory fallback remains exportable. */
        }
      }
      return JSON.stringify(state, null, 2);
    },
    dispose() {
      if (disposed) return;
      pause();
      disposed = true;
      abortListeners.abort();
      listeners.clear();
      audio.dispose();
    },
  };
}
