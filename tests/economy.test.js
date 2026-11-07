import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  getBulkQuote,
  buyBulk,
  buyUpgrade,
  getUpgradeCost,
  getFactoryCapacity,
  advance,
  getPps,
  startBoss,
  hitBoss,
  claimSugarEvent,
  getAchievementProgress,
  checkAchievements,
} from "../js/gameplay.js";
import {
  MAX_VALUE,
  UPGRADES_DATA,
  BOSS_DURATION_MS,
  BOSS_COOLDOWN_MS,
  SUGAR_EVENT_INTERVAL_MS,
  SUGAR_EVENT_DURATION_MS,
} from "../js/data.js";
import {
  validateState,
  loadGame,
  saveGame,
  SAVE_KEY,
  V2_BACKUP_KEY,
} from "../js/storage.js";

const NOW = 1_800_000_000_000;
const memoryStorage = (initial = {}) => {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
  };
};

test("bulk quotes sum rounded per-unit prices for every original building and tier", () => {
  for (const [key, data] of Object.entries(UPGRADES_DATA)) {
    for (const owned of [0, 3, 21]) {
      const state = createState(NOW);
      state.upgrades[key] = owned;
      state.factoryExpansions[key] = 10;
      for (const quantity of [1, 10, 100]) {
        const expected = Array.from({ length: quantity }, (_, i) =>
          Math.floor(data.baseCost * Math.pow(data.costMult, owned + i)),
        ).reduce((a, b) => a + b, 0);
        assert.deepEqual(getBulkQuote(state, key, quantity), {
          quantity,
          cost: owned + quantity <= getFactoryCapacity(state,key) ? expected : Infinity,
        });
      }
    }
  }
});

test("fixed bulk purchases are all-or-nothing and repeated input cannot overspend", () => {
  const state = createState(NOW);
  const quote = getBulkQuote(state, "maquina", 10);
  state.pirulitos = quote.cost - 1;
  assert.equal(buyBulk(state, "maquina", 10, NOW), false);
  assert.equal(state.upgrades.maquina, 0);
  assert.equal(state.pirulitos, quote.cost - 1);
  state.pirulitos = quote.cost;
  assert.deepEqual(buyBulk(state, "maquina", 10, NOW), quote);
  assert.equal(state.pirulitos, 0);
  assert.equal(state.upgrades.maquina, 10);
  assert.equal(buyBulk(state, "maquina", 10, NOW), false);
  assert.equal(state.pirulitos, 0);
});

test("MAX buys exactly the affordable prefix and no unpurchased level", () => {
  const state = createState(NOW);
  state.pirulitos = 1000;
  const quote = getBulkQuote(state, "maquina", "max");
  const reference = createState(NOW);
  reference.pirulitos = state.pirulitos;
  while (buyUpgrade(reference, "maquina", NOW)) {
    /* independent single-purchase reference */
  }
  assert.equal(quote.quantity, reference.upgrades.maquina);
  assert.equal(quote.cost, state.pirulitos - reference.pirulitos);
  assert.deepEqual(buyBulk(state, "maquina", "max", NOW), quote);
  assert.equal(state.pirulitos, reference.pirulitos);
  assert.ok(state.pirulitos < getUpgradeCost(state, "maquina"));
  assert.deepEqual(getBulkQuote(state, "maquina", "max"), {
    quantity: 0,
    cost: 0,
  });
});

test("bulk calculations reject invalid keys and sizes and stay finite at supported currency cap", () => {
  const state = createState(NOW);
  state.pirulitos = MAX_VALUE;
  for (const key of ["missing", "constructor", "__proto__"])
    assert.equal(buyBulk(state, key, 10, NOW), false);
  for (const quantity of [0, -1, 2, 1.5, Infinity, "10", {}, null])
    assert.equal(buyBulk(state, "maquina", quantity, NOW), false);
  const max = getBulkQuote(state, "maquina", "max");
  assert.equal(max.quantity, getFactoryCapacity(state,"maquina"));
  assert.ok(Number.isFinite(max.cost) && max.cost <= MAX_VALUE);
  assert.ok(buyBulk(state, "maquina", "max", NOW));
  assert.ok(state.pirulitos >= 0 && Number.isFinite(state.pirulitos));
  state.upgrades.maquina = 100000;
  assert.equal(buyBulk(state, "maquina", 100, NOW), false);
  assert.equal(buyBulk(state, "maquina", "max", NOW), false);
});

test("bulk purchase settles old production before changing the production rate", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  state.pirulitos = 1000;
  const cost = getBulkQuote(state, "maquina", 10).cost;
  buyBulk(state, "maquina", 10, NOW + 10000);
  assert.equal(state.pirulitos, 1010 - cost);
  assert.equal(state.totalEarned, 10);
  assert.equal(getPps(state, NOW + 10000), 6);
});

test("boss cooldown starts once on victory and prevents another immediate reward cycle", () => {
  const state = createState(NOW);
  startBoss(state, NOW);
  state.boss.hp = 1;
  const victory = hitBoss(state, NOW + 10);
  assert.equal(victory.won, true);
  assert.equal(state.bossCooldownUntil, NOW + 10 + BOSS_COOLDOWN_MS);
  assert.equal(startBoss(state, NOW + 11), false);
  assert.equal(hitBoss(state, NOW + 11), false);
  assert.ok(startBoss(state, NOW + 10 + BOSS_COOLDOWN_MS));
  assert.equal(state.boss.maxHp, 160);
});

test("expired boss cooldown uses the true deadline instead of a late callback time", () => {
  const state = createState(NOW);
  startBoss(state, NOW);
  advance(state, NOW + BOSS_DURATION_MS + BOSS_COOLDOWN_MS + 5000, {
    offline: true,
  });
  assert.equal(state.bossesKilled, 0);
  assert.equal(
    state.bossCooldownUntil,
    NOW + BOSS_DURATION_MS + BOSS_COOLDOWN_MS,
  );
  assert.ok(startBoss(state, state.lastTick));
});

test("golden sugar only appears in a live window, pays explicitly and cannot be collected twice", () => {
  const state = createState(NOW);
  assert.equal(claimSugarEvent(state, NOW), false);
  advance(state, NOW + SUGAR_EVENT_INTERVAL_MS);
  assert.equal(state.sugarEvent.id, NOW + SUGAR_EVENT_INTERVAL_MS);
  assert.equal(
    state.sugarEvent.endsAt,
    NOW + SUGAR_EVENT_INTERVAL_MS + SUGAR_EVENT_DURATION_MS,
  );
  assert.equal(state.pirulitos, 0);
  assert.equal(claimSugarEvent(state, NOW + SUGAR_EVENT_INTERVAL_MS + 1), 25);
  assert.equal(state.sugarEventsClaimed, 1);
  assert.equal(
    claimSugarEvent(state, NOW + SUGAR_EVENT_INTERVAL_MS + 2),
    false,
  );
  assert.equal(state.pirulitos, 25);
});

test("sugar reward scales from nonboosted production and an expired event gives no reward", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 10;
  advance(state, NOW + SUGAR_EVENT_INTERVAL_MS);
  state.boostEndTime = NOW + SUGAR_EVENT_INTERVAL_MS + 5000;
  assert.equal(claimSugarEvent(state, NOW + SUGAR_EVENT_INTERVAL_MS), 150);
  const other = createState(NOW);
  advance(other, NOW + SUGAR_EVENT_INTERVAL_MS);
  assert.equal(
    claimSugarEvent(
      other,
      NOW + SUGAR_EVENT_INTERVAL_MS + SUGAR_EVENT_DURATION_MS,
    ),
    false,
  );
  assert.equal(other.sugarEventsClaimed, 0);
});

test("offline or heavily delayed event callbacks skip missed events without building a backlog", () => {
  for (const offline of [false, true]) {
    const state = createState(NOW);
    advance(state, NOW + 100000, { offline });
    assert.equal(state.sugarEvent, null);
    assert.equal(state.nextEventAt, NOW + 100000 + SUGAR_EVENT_INTERVAL_MS);
    assert.equal(state.sugarEventsClaimed, 0);
    assert.equal(state.pirulitos, 0);
  }
  const state = createState(NOW);
  advance(state, NOW + SUGAR_EVENT_INTERVAL_MS, { offline: true });
  assert.equal(state.sugarEvent, null);
});

test("achievement meters follow the same thresholds and categories as original unlock rules", () => {
  const state = createState(NOW);
  assert.deepEqual(getAchievementProgress(state, "c100"), {
    current: 0,
    target: 100,
    category: "Cliques",
  });
  state.totalClicks = 100;
  assert.equal(getAchievementProgress(state, "c100").current, 100);
  assert.ok(checkAchievements(state, NOW).includes("c100"));
  state.upgrades.maquina = 1000;
  assert.deepEqual(getAchievementProgress(state, "fabrica_doces", NOW), {
    current: 500,
    target: 500,
    category: "Produção",
  });
  assert.ok(checkAchievements(state, NOW).includes("fabrica_doces"));
  assert.deepEqual(getAchievementProgress(state, "constructor"), {
    current: 0,
    target: 1,
    category: "Outras",
  });
});

test("actual version 2 format migrates independent cosmetics and unclaimed prestige into schema5", () => {
  const v2 = {
    version: 2,
    pirulitos: 1234,
    totalEarned: 8000000,
    prestigeLevel: 1,
    prestigeClaimed: 1,
    activeFlavor: "uva",
    activeSkin: "neon",
    activeTheme: "gold",
    activeParticles: "classic",
    upgrades: { maquina: 10 },
    unlockedFlavors: ["morango", "limao", "blueberry", "uva"],
    unlockedSkins: ["classic", "neon", "gold"],
    unlockedAchievements: ["c1"],
    bossesKilled: 3,
    wheelSpins: 5,
    wheelClickBonus: 100,
    lastTick: NOW,
    savedAt: NOW,
    settings: { music: false, sfx: true, particles: false },
  };
  const raw = JSON.stringify(v2);
  const storage = memoryStorage({ [SAVE_KEY]: raw });
  const result = loadGame(storage, NOW + 1000);
  assert.equal(result.state.version, 5);
  assert.equal(result.state.activeSkin, "neon");
  assert.equal(result.state.activeTheme, "gold");
  assert.equal(result.state.activeParticles, "classic");
  assert.equal(result.state.prestigeClaimed, 1);
  assert.equal(result.state.wheelClickBonus, 100);
  assert.equal(result.state.settings.animations, true);
  assert.equal(result.state.settings.music, false);
  assert.equal(result.state.pirulitos, 1234 + 7.1875);
  assert.equal(storage.getItem(V2_BACKUP_KEY), raw);
  assert.equal(storage.getItem(SAVE_KEY), raw);
  saveGame(storage, result.state);
  assert.equal(storage.getItem(V2_BACKUP_KEY), raw);
});

test("v3 boss cooldown and live sugar events survive save validation and refresh", () => {
  const state = createState(NOW);
  state.bossCooldownUntil = NOW + 30000;
  state.sugarEvent = { id: NOW, endsAt: NOW + SUGAR_EVENT_DURATION_MS };
  state.sugarEventsClaimed = 4;
  const validated = validateState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(validated.bossCooldownUntil, state.bossCooldownUntil);
  assert.deepEqual(validated.sugarEvent, state.sugarEvent);
  assert.equal(validated.sugarEventsClaimed, 4);
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(state) });
  const loaded = loadGame(storage, NOW + 1000);
  assert.deepEqual(loaded.state.sugarEvent, state.sugarEvent);
  assert.equal(claimSugarEvent(loaded.state, NOW + 1000), 25);
  assert.equal(startBoss(loaded.state, NOW + 1000), false);
});
