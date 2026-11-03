import test from "node:test";
import assert from "node:assert/strict";
import {
  SAVE_KEY,
  BACKUP_KEY,
  LEGACY_BACKUP_KEY,
  RECOVERY_KEY,
  validateState,
  loadGame,
  saveGame,
} from "../js/storage.js";
import {
  createState,
  startWheel,
  getClickPower,
  getPrestigeGain,
  startBoss,
} from "../js/gameplay.js";
import {
  SAVE_VERSION,
  WHEEL_DURATION_MS,
  BOSS_DURATION_MS,
} from "../js/data.js";

const NOW = 1_800_000_000_000;

function memoryStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  };
}

test("an absent save starts normally without writing data", () => {
  const storage = memoryStorage();
  const loaded = loadGame(storage, NOW);
  assert.equal(loaded.canSave, true);
  assert.equal(loaded.state.pirulitos, 0);
  assert.equal(loaded.state.lastTick, NOW);
  assert.equal(loaded.offlineEarned, 0);
  assert.equal(storage.getItem(SAVE_KEY), null);
});

test("legacy saves retain progress and gain safe defaults without fabricated offline earnings", () => {
  const legacy = {
    pirulitos: 1234.5,
    totalEarned: 9_000_000,
    totalClicks: 888,
    prestigeLevel: 4,
    activeFlavor: "uva",
    activeSkin: "neon",
    unlockedFlavors: ["morango", "limao", "blueberry", "uva"],
    unlockedSkins: ["classic", "neon"],
    unlockedAchievements: ["c1", "roleta_1"],
    upgrades: { maquina: 20, calda: 3 },
    settings: { music: false },
    wheelSpins: 5,
    lastWheelTime: NOW - 100_000,
    bossesKilled: 2,
  };
  const original = JSON.stringify(legacy);
  const storage = memoryStorage({ [SAVE_KEY]: original });
  const loaded = loadGame(storage, NOW);
  assert.equal(loaded.canSave, true);
  assert.equal(loaded.state.version, SAVE_VERSION);
  assert.equal(loaded.state.pirulitos, 1234.5);
  assert.equal(loaded.state.totalEarned, 9_000_000);
  assert.equal(loaded.state.totalClicks, 888);
  assert.equal(loaded.state.prestigeLevel, 4);
  assert.equal(getPrestigeGain(loaded.state), 0);
  assert.equal(loaded.state.upgrades.maquina, 20);
  assert.equal(loaded.state.upgrades.calda, 3);
  assert.equal(loaded.state.upgrades.fabrica, 0);
  assert.equal(loaded.state.activeFlavor, "uva");
  assert.equal(loaded.state.activeSkin, "neon");
  assert.equal(loaded.state.activeTheme, "neon");
  assert.equal(loaded.state.activeParticles, "neon");
  assert.equal(loaded.state.settings.music, false);
  assert.equal(loaded.state.settings.sfx, true);
  assert.equal(loaded.offlineEarned, 0);
  assert.equal(storage.getItem(LEGACY_BACKUP_KEY), original);
  assert.equal(storage.getItem(SAVE_KEY), original);
  assert.equal(saveGame(storage, loaded.state).ok, true);
  assert.equal(storage.getItem(LEGACY_BACKUP_KEY), original);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).version, SAVE_VERSION);
});

test("unclaimed prestige in a legacy save remains claimable", () => {
  const state = validateState(
    { totalEarned: 8_000_000, prestigeLevel: 0 },
    NOW,
  );
  assert.equal(getPrestigeGain(state), 2);
});

test("validation sanitizes malformed nested data, lists, counters and selected content", () => {
  const raw = {
    version: SAVE_VERSION,
    pirulitos: -10,
    totalEarned: "1000",
    totalClicks: 3.9,
    prestigeLevel: -2,
    timePlayed: Infinity,
    maxScore: NaN,
    activeFlavor: "lendario",
    activeSkin: "ice",
    activeTheme: "unknown",
    activeParticles: "fire",
    unlockedFlavors: ["uva", "uva", "unknown", 12],
    unlockedSkins: ["neon", "neon", false],
    unlockedAchievements: ["c1", "c1", "fake"],
    upgrades: { maquina: 3.8, calda: "8", fabrica: -1, missing: 99 },
    settings: { music: "false", sfx: false, particles: false, extra: true },
    lastWheelTime: -10,
    boostEndTime: "bad",
    boss: { hp: 2, maxHp: 1, endsAt: NOW },
    pendingWheel: { index: 9, endsAt: NOW, startedAt: NOW - 3200 },
    injected: "not part of state",
  };
  const state = validateState(raw, NOW);
  assert.equal(state.pirulitos, 0);
  assert.equal(state.totalEarned, 0);
  assert.equal(state.totalClicks, 3);
  assert.equal(state.prestigeLevel, 0);
  assert.equal(state.timePlayed, 0);
  assert.equal(state.maxScore, 0);
  assert.equal(state.upgrades.maquina, 3);
  assert.equal(state.upgrades.calda, 0);
  assert.equal(state.upgrades.fabrica, 0);
  assert.equal(Object.hasOwn(state.upgrades, "missing"), false);
  assert.deepEqual(state.unlockedFlavors, [
    "morango",
    "limao",
    "blueberry",
    "uva",
  ]);
  assert.deepEqual(state.unlockedSkins, ["classic", "neon"]);
  assert.deepEqual(state.unlockedAchievements, ["c1"]);
  assert.equal(state.activeFlavor, "morango");
  assert.equal(state.activeSkin, "classic");
  assert.equal(state.activeTheme, "classic");
  assert.equal(state.activeParticles, "classic");
  assert.equal(state.settings.music, true);
  assert.equal(state.settings.sfx, false);
  assert.equal(state.settings.particles, false);
  assert.equal(state.lastWheelTime, 0);
  assert.equal(state.boostEndTime, 0);
  assert.equal(state.boss, null);
  assert.equal(state.pendingWheel, null);
  assert.equal(Object.hasOwn(state, "injected"), false);
  assert.equal(raw.upgrades.maquina, 3.8);
});

test("null or non-array collection values cannot break a loaded game", () => {
  const state = validateState(
    {
      upgrades: null,
      settings: [],
      unlockedFlavors: null,
      unlockedSkins: "neon",
      unlockedAchievements: {},
    },
    NOW,
  );
  assert.deepEqual(state.unlockedFlavors, ["morango", "limao", "blueberry"]);
  assert.deepEqual(state.unlockedSkins, ["classic"]);
  assert.deepEqual(state.unlockedAchievements, []);
  assert.equal(getClickPower(state, NOW), 2);
});

test("malformed root and future saves are rejected without mutating existing raw data", () => {
  for (const raw of [
    "{broken",
    "null",
    "[]",
    "42",
    "{}",
    '{"unrelated":1}',
    JSON.stringify({ version: SAVE_VERSION + 1, pirulitos: 9000 }),
  ]) {
    const storage = memoryStorage({ [SAVE_KEY]: raw });
    const loaded = loadGame(storage, NOW);
    assert.equal(loaded.canSave, false, raw);
    assert.ok(loaded.warnings.length > 0);
    assert.equal(storage.getItem(SAVE_KEY), raw);
    assert.equal(saveGame(storage, createState(NOW)).ok, false);
    assert.equal(storage.getItem(SAVE_KEY), raw);
  }
  for (const value of [null, [], 42, "state"])
    assert.throws(() => validateState(value, NOW));
});

test("a corrupt primary can display a valid backup while autosave remains blocked", () => {
  const backup = createState(NOW);
  backup.pirulitos = 765;
  const storage = memoryStorage({
    [SAVE_KEY]: "{broken",
    [BACKUP_KEY]: JSON.stringify(backup),
  });
  const loaded = loadGame(storage, NOW);
  assert.equal(loaded.state.pirulitos, 765);
  assert.equal(loaded.canSave, false);
  assert.ok(loaded.warnings.length >= 2);
  assert.equal(storage.getItem(SAVE_KEY), "{broken");
  assert.equal(storage.getItem(BACKUP_KEY), JSON.stringify(backup));
});

test("each normal save keeps the previous completed primary as a backup", () => {
  const storage = memoryStorage();
  const state = createState(NOW);
  state.pirulitos = 15;
  assert.equal(saveGame(storage, state).ok, true);
  const first = storage.getItem(SAVE_KEY);
  state.pirulitos = 25;
  state.lastTick = NOW + 1000;
  assert.equal(saveGame(storage, state).ok, true);
  assert.equal(storage.getItem(BACKUP_KEY), first);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).pirulitos, 25);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).savedAt, NOW + 1000);
});

test("an explicitly forced recovery preserves the replaced raw data separately", () => {
  const storage = memoryStorage({ [SAVE_KEY]: "{broken" });
  const state = createState(NOW);
  state.pirulitos = 77;
  assert.equal(saveGame(storage, state, { force: true }).ok, true);
  assert.equal(storage.getItem(RECOVERY_KEY), "{broken");
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).pirulitos, 77);
});

test("blocked storage and quota errors return a usable state and leave originals intact", () => {
  const blocked = {
    getItem() {
      throw new Error("Blocked");
    },
    setItem() {
      throw new Error("Blocked");
    },
  };
  const loaded = loadGame(blocked, NOW);
  assert.equal(loaded.canSave, false);
  assert.equal(loaded.state.lastTick, NOW);
  assert.ok(loaded.warnings.length);
  assert.equal(saveGame(blocked, loaded.state).ok, false);

  const original = JSON.stringify({ pirulitos: 33 });
  const quota = {
    getItem: (key) => (key === SAVE_KEY ? original : null),
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  const oldLoaded = loadGame(quota, NOW);
  assert.equal(oldLoaded.canSave, false);
  assert.equal(oldLoaded.state.pirulitos, 33);
  assert.equal(quota.getItem(SAVE_KEY), original);
  assert.equal(saveGame(quota, oldLoaded.state).ok, false);
});

test("load credits elapsed production once across a saved boost expiration", () => {
  const storage = memoryStorage();
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  state.boostEndTime = NOW + 30_000;
  saveGame(storage, state);
  const loaded = loadGame(storage, NOW + 60_000);
  assert.equal(loaded.offlineEarned, 90);
  assert.equal(loaded.state.pirulitos, 90);
  assert.equal(loaded.state.timePlayed, 0);
  saveGame(storage, loaded.state);
  const second = loadGame(storage, NOW + 60_000);
  assert.equal(second.offlineEarned, 0);
  assert.equal(second.state.pirulitos, 90);
});

test("wheel commitment survives refresh and settles once without rerolling", () => {
  const storage = memoryStorage();
  const state = createState(NOW);
  state.pirulitos = 10_000;
  startWheel(state, NOW, () => 5.5 / 6);
  saveGame(storage, state);
  const during = loadGame(storage, NOW + 1000);
  assert.equal(during.state.pendingWheel.index, 5);
  assert.equal(during.state.wheelSpins, 0);
  saveGame(storage, during.state);
  const after = loadGame(storage, NOW + WHEEL_DURATION_MS);
  assert.equal(after.state.pendingWheel, null);
  assert.equal(after.state.lastWheelReward.index, 5);
  assert.equal(after.state.wheelSpins, 1);
  assert.equal(after.state.pirulitos, 15_000);
  saveGame(storage, after.state);
  const again = loadGame(storage, NOW + WHEEL_DURATION_MS + 1000);
  assert.equal(again.state.wheelSpins, 1);
  assert.equal(again.state.pirulitos, 15_000);
});

test("boss progress survives refresh but an expired battle cannot be resumed", () => {
  const storage = memoryStorage();
  const state = createState(NOW);
  startBoss(state, NOW);
  state.boss.hp = 28;
  saveGame(storage, state);
  const during = loadGame(storage, NOW + 1000);
  assert.equal(during.state.boss.hp, 28);
  assert.equal(during.state.boss.endsAt, NOW + BOSS_DURATION_MS);
  const after = loadGame(storage, NOW + BOSS_DURATION_MS);
  assert.equal(after.state.boss, null);
  assert.equal(after.state.bossesKilled, 0);
  assert.equal(after.state.pirulitos, 0);
});

test("version 2 saves retain independently selected visual categories", () => {
  const state = createState(NOW);
  state.unlockedSkins.push("neon", "gold");
  state.activeSkin = "neon";
  state.activeTheme = "gold";
  state.activeParticles = "classic";
  const loaded = validateState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(loaded.activeSkin, "neon");
  assert.equal(loaded.activeTheme, "gold");
  assert.equal(loaded.activeParticles, "classic");
});
