import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  advance,
  click,
  buyUpgrade,
  selectFlavor,
  selectCustomization,
  getPps,
  getClickPower,
  getUpgradeCost,
  getTotalUpgradesCount,
  startBoost,
  startWheel,
  settleWheel,
  prestige,
  getPrestigeGain,
  startBoss,
  hitBoss,
  getBossMaxHp,
  checkAchievements,
  addCurrency,
} from "../js/gameplay.js";
import {
  UPGRADES_DATA,
  FLAVORS_DATA,
  SKINS_DATA,
  ACHIEVEMENTS_DATA,
  WHEEL_REWARDS,
  WHEEL_COOLDOWN_MS,
  WHEEL_DURATION_MS,
  BOOST_DURATION_MS,
  BOOST_COOLDOWN_MS,
  BOSS_DURATION_MS,
  OFFLINE_CAP_MS,
  MAX_VALUE,
} from "../js/data.js";

const NOW = 1_800_000_000_000;
const near = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-8,
    message ?? `${actual} ≈ ${expected}`,
  );

test("all original upgrade, flavor, skin and achievement IDs remain available", () => {
  assert.deepEqual(Object.keys(UPGRADES_DATA), [
    "maquina",
    "calda",
    "fabrica",
    "misturador",
    "embaladora",
    "laboratorio",
    "linha",
    "superfabrica",
  ]);
  assert.deepEqual(Object.keys(FLAVORS_DATA), [
    "morango",
    "limao",
    "blueberry",
    "uva",
    "laranja",
    "melancia",
    "abacaxi",
    "chocolate",
    "algodao",
    "arcoiris",
    "lendario",
  ]);
  assert.deepEqual(Object.keys(SKINS_DATA), [
    "classic",
    "neon",
    "rainbow",
    "gold",
    "cosmic",
    "fire",
    "ice",
  ]);
  assert.equal(ACHIEVEMENTS_DATA.length, 13);
  assert.equal(WHEEL_REWARDS.length, 6);
});

test("new games have independent nested state and clicks preserve original flavor power", () => {
  const state = createState(NOW);
  const other = createState(NOW);
  assert.equal(click(state, NOW), 2);
  assert.equal(state.pirulitos, 2);
  assert.equal(state.totalEarned, 2);
  assert.equal(state.totalClicks, 1);
  assert.equal(other.pirulitos, 0);
  state.upgrades.maquina = 1;
  assert.equal(other.upgrades.maquina, 0);
  assert.equal(selectFlavor(state, "blueberry", NOW), true);
  assert.equal(getClickPower(state, NOW), 4);
  near(getPps(state, NOW), 0.55);
});

test("upgrade purchases validate affordability and apply known geometric prices", () => {
  const state = createState(NOW);
  assert.equal(getUpgradeCost(state, "maquina"), 15);
  assert.equal(buyUpgrade(state, "maquina", NOW), false);
  state.pirulitos = 32;
  assert.equal(buyUpgrade(state, "maquina", NOW), true);
  assert.equal(state.pirulitos, 17);
  assert.equal(getUpgradeCost(state, "maquina"), 17);
  assert.equal(buyUpgrade(state, "maquina", NOW), true);
  assert.equal(state.pirulitos, 0);
  assert.equal(getUpgradeCost(state, "maquina"), 19);
  assert.equal(getTotalUpgradesCount(state), 2);
  assert.equal(buyUpgrade(state, "missing", NOW), false);
  assert.equal(getPps(state, NOW), 1);
});

test("production uses elapsed time and never produces retroactively from a new purchase", () => {
  const state = createState(NOW);
  state.pirulitos = 15;
  assert.equal(buyUpgrade(state, "maquina", NOW + 10_000), true);
  assert.equal(state.pirulitos, 0);
  near(advance(state, NOW + 10_250).earned, 0.125);
  near(advance(state, NOW + 14_000).earned, 1.875);
  near(state.pirulitos, 2);
  near(state.totalEarned, 2);
  near(state.timePlayed, 14);
  assert.equal(advance(state, NOW + 14_000).earned, 0);
  assert.equal(advance(state, NOW).earned, 0);
});

test("delayed callbacks split production at boost expiry", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  assert.equal(startBoost(state, NOW), true);
  assert.equal(getPps(state, NOW), 2);
  near(advance(state, NOW + 60_000).earned, 90);
  assert.equal(getPps(state, NOW + BOOST_DURATION_MS), 1);
  assert.equal(startBoost(state, NOW + 60_000), false);
  assert.equal(state.boostsObtained, 1);
  assert.equal(startBoost(state, NOW + BOOST_COOLDOWN_MS), true);
  assert.equal(state.boostsObtained, 2);
});

test("offline gains have an eight-hour cap without adding played time or repeating a claim", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  state.boostEndTime = NOW + 30_000;
  const late = NOW + 24 * 60 * 60 * 1000;
  near(
    advance(state, late, { offline: true }).earned,
    OFFLINE_CAP_MS / 1000 + 30,
  );
  assert.equal(state.timePlayed, 0);
  assert.equal(state.lastTick, late);
  assert.equal(advance(state, late, { offline: true }).earned, 0);
});

test("flavor bonuses settle previous production before equipping and purchases occur only once", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  assert.equal(selectFlavor(state, "uva", NOW), false);
  state.pirulitos = 5000;
  assert.equal(selectFlavor(state, "uva", NOW + 10_000), true);
  assert.equal(state.pirulitos, 10);
  near(getPps(state, NOW + 10_000), 1.25);
  assert.equal(selectFlavor(state, "uva", NOW + 10_000), true);
  assert.equal(state.pirulitos, 10);
  assert.equal(state.unlockedFlavors.filter((key) => key === "uva").length, 1);
  assert.equal(selectFlavor(state, "unknown", NOW + 10_000), false);
});

test("a bought cosmetic collection unlocks all components while equipping is independent", () => {
  const state = createState(NOW);
  assert.equal(selectCustomization(state, "skin", "neon", NOW), false);
  state.pirulitos = 2500;
  assert.equal(selectCustomization(state, "skin", "neon", NOW), true);
  assert.equal(state.pirulitos, 0);
  assert.equal(state.activeSkin, "neon");
  assert.equal(state.activeTheme, "classic");
  assert.equal(state.activeParticles, "classic");
  assert.equal(selectCustomization(state, "theme", "neon", NOW), true);
  assert.equal(selectCustomization(state, "particles", "neon", NOW), true);
  assert.equal(selectCustomization(state, "skin", "classic", NOW), true);
  assert.equal(state.activeSkin, "classic");
  assert.equal(state.activeTheme, "neon");
  assert.equal(state.activeParticles, "neon");
  assert.equal(state.unlockedSkins.filter((key) => key === "neon").length, 1);
  assert.equal(
    selectCustomization(state, "not-a-category", "neon", NOW),
    false,
  );
});

test("every wheel outcome matches the committed index and grants exactly once", async (t) => {
  for (const [index, reward] of WHEEL_REWARDS.entries()) {
    await t.test(reward.label, () => {
      const state = createState(NOW);
      state.pirulitos = 10_000;
      const pending = startWheel(
        state,
        NOW,
        () => (index + 0.5) / WHEEL_REWARDS.length,
      );
      assert.equal(pending.index, index);
      assert.equal(state.lastWheelTime, NOW);
      assert.equal(state.wheelSpins, 0);
      assert.equal(settleWheel(state, NOW + WHEEL_DURATION_MS - 1), false);
      assert.equal(startWheel(state, NOW + 1), false);
      const result = settleWheel(state, NOW + WHEEL_DURATION_MS);
      assert.equal(result.index, index);
      assert.equal(result.type, reward.type);
      assert.equal(state.pendingWheel, null);
      assert.equal(state.wheelSpins, 1);
      if (reward.type === "pct")
        assert.equal(state.pirulitos, 10_000 + Math.floor(10_000 * reward.val));
      if (reward.type === "boost")
        assert.equal(
          state.boostEndTime,
          NOW + WHEEL_DURATION_MS + BOOST_DURATION_MS,
        );
      if (reward.type === "click") {
        assert.equal(getClickPower(state, NOW + WHEEL_DURATION_MS), 102);
        assert.equal(state.pirulitos, 10_000);
      }
      const balance = state.pirulitos;
      assert.equal(settleWheel(state, NOW + WHEEL_DURATION_MS + 1), false);
      assert.equal(state.pirulitos, balance);
      assert.equal(state.wheelSpins, 1);
      assert.equal(startWheel(state, NOW + WHEEL_COOLDOWN_MS - 1), false);
      assert.ok(startWheel(state, NOW + WHEEL_COOLDOWN_MS, () => 0));
    });
  }
});

test("wheel percentage locks the amount at start and invalid randomness cannot create a claim", () => {
  const state = createState(NOW);
  for (const sample of [-1, 1, Infinity, NaN])
    assert.equal(
      startWheel(state, NOW, () => sample),
      false,
    );
  state.pirulitos = 1000;
  startWheel(state, NOW, () => 0);
  state.pirulitos = 1_000_000;
  assert.equal(settleWheel(state, NOW + WHEEL_DURATION_MS).amount, 100);
  assert.equal(state.pirulitos, 1_000_100);
});

test("a delayed wheel boost starts at its actual end and does not extend expired time", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  startWheel(state, NOW, () => 2.5 / 6);
  const outcome = advance(state, NOW + 60_000, { offline: true });
  assert.equal(outcome.wheelReward.index, 2);
  near(state.pirulitos, 90);
  assert.equal(getPps(state, NOW + 60_000), 1);
});

test("prestige cannot resell lifetime progress and keeps permanent collections and achievements", () => {
  const state = createState(NOW);
  assert.equal(prestige(state, NOW), false);
  state.totalEarned = 8_000_000;
  state.pirulitos = 1000;
  state.upgrades.maquina = 20;
  state.unlockedFlavors.push("uva");
  state.activeFlavor = "uva";
  state.unlockedSkins.push("neon");
  state.unlockedAchievements.push("c1");
  state.wheelClickBonus = 100;
  startBoss(state, NOW);
  assert.equal(getPrestigeGain(state), 2);
  assert.equal(prestige(state, NOW), 2);
  assert.equal(state.prestigeLevel, 2);
  assert.equal(state.totalEarned, 8_000_000);
  assert.equal(state.pirulitos, 0);
  assert.equal(getTotalUpgradesCount(state), 0);
  assert.equal(state.wheelClickBonus, 0);
  assert.equal(state.boss, null);
  assert.equal(state.activeFlavor, "uva");
  assert.ok(state.unlockedSkins.includes("neon"));
  assert.ok(state.unlockedAchievements.includes("c1"));
  assert.equal(prestige(state, NOW), false);
  state.totalEarned = 27_000_000;
  assert.equal(getPrestigeGain(state), 1);
  assert.equal(prestige(state, NOW), 1);
  assert.equal(state.prestigeLevel, 3);
});

test("a pending wheel prevents prestige from transferring rewards between journeys", () => {
  const state = createState(NOW);
  state.totalEarned = 1_000_000;
  startWheel(state, NOW, () => 0);
  assert.equal(prestige(state, NOW + 1), false);
  assert.equal(state.prestigeLevel, 0);
});

test("bosses require a live battle, pay only on victory and scale the next battle", () => {
  const state = createState(NOW);
  assert.equal(hitBoss(state, NOW), false);
  assert.equal(startBoss(state, NOW).maxHp, 100);
  assert.equal(startBoss(state, NOW), false);
  for (let i = 0; i < 49; i++)
    assert.equal(hitBoss(state, NOW + 100).won, false);
  assert.equal(state.pirulitos, 0);
  const final = hitBoss(state, NOW + 100);
  assert.equal(final.won, true);
  assert.equal(final.reward, 1500);
  assert.equal(state.pirulitos, 1500);
  assert.equal(state.totalEarned, 1500);
  assert.equal(state.bossesKilled, 1);
  assert.equal(state.boss, null);
  assert.equal(hitBoss(state, NOW + 100), false);
  assert.equal(getBossMaxHp(state), 160);
});

test("an expired boss rejects the killing hit even if no timer callback ran", () => {
  const state = createState(NOW);
  startBoss(state, NOW);
  state.boss.hp = 1;
  assert.equal(hitBoss(state, NOW + BOSS_DURATION_MS), false);
  assert.equal(state.boss, null);
  assert.equal(state.bossesKilled, 0);
  assert.equal(state.pirulitos, 0);
});

test("achievement checks require their conditions and never duplicate unlocks", () => {
  const state = createState(NOW);
  assert.deepEqual(checkAchievements(state, NOW), []);
  click(state, NOW);
  assert.deepEqual(checkAchievements(state, NOW), ["c1"]);
  assert.deepEqual(checkAchievements(state, NOW), []);
  state.upgrades.maquina = 1000;
  const unlocked = checkAchievements(state, NOW);
  assert.ok(unlocked.includes("fabrica_doces"));
  assert.ok(unlocked.includes("upgrades_10"));
  assert.equal(
    state.unlockedAchievements.filter((key) => key === "c1").length,
    1,
  );
});

test("large production cannot introduce Infinity and overflow upgrades cannot be bought", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 100_000;
  assert.equal(getUpgradeCost(state, "maquina"), Infinity);
  state.pirulitos = MAX_VALUE;
  assert.equal(buyUpgrade(state, "maquina", NOW), false);
  assert.equal(addCurrency(state, Infinity), 0);
  assert.equal(addCurrency(state, NaN), 0);
  assert.equal(addCurrency(state, -10), 0);
  advance(state, NOW + OFFLINE_CAP_MS);
  assert.ok(Number.isFinite(state.pirulitos));
  assert.ok(Number.isFinite(state.totalEarned));
  assert.ok(state.pirulitos <= MAX_VALUE);
});

test("inherited object keys cannot be bought, equipped or assigned as categories", () => {
  const state = createState(NOW);
  state.pirulitos = 10_000;
  for (const key of ["toString", "constructor", "__proto__"]) {
    assert.equal(buyUpgrade(state, key, NOW), false);
    assert.equal(selectFlavor(state, key, NOW), false);
    assert.equal(selectCustomization(state, "skin", key, NOW), false);
    assert.equal(selectCustomization(state, key, "classic", NOW), false);
  }
  assert.equal(state.pirulitos, 10_000);
  assert.equal(state.activeFlavor, "morango");
  assert.equal(state.activeSkin, "classic");
});

test("a backward clock never revives expired boosts or resets event deadlines", () => {
  const state = createState(NOW);
  state.upgrades.maquina = 2;
  startBoost(state, NOW);
  advance(state, NOW + 60_000);
  const before = state.pirulitos;
  assert.equal(getClickPower(state, NOW), 2);
  assert.equal(getPps(state, NOW), 1);
  assert.equal(advance(state, NOW).earned, 0);
  assert.equal(state.pirulitos, before);
  assert.equal(startBoost(state, NOW), false);
  const boss = startBoss(state, NOW);
  assert.equal(boss.endsAt, NOW + 60_000 + BOSS_DURATION_MS);
  const pending = startWheel(state, NOW, () => 0);
  assert.equal(pending.startedAt, NOW + 60_000);
  assert.equal(pending.endsAt, NOW + 60_000 + WHEEL_DURATION_MS);
});
