import test from "node:test";
import assert from "node:assert/strict";
import { createState, getBulkQuote, getClickPower, getPps } from "../js/gameplay.js";
import { FLAVORS_DATA } from "../js/data.js";
import {
  affordabilitySeconds, buildingContribution, flavorEffects,
  previewFlavor, readShopView, writeShopView, SHOP_VIEW_KEY, shopOffer,
} from "../js/ui/qol.js";

const NOW = 1_800_000_000_000;

test("every flavor preview uses gameplay formulas without equipping, spending or changing cosmetics", () => {
  const state = createState(NOW);
  Object.assign(state, {
    activeFlavor: "blueberry", activeSkin: "neon", activeTheme: "gold", activeParticles: "ice",
    pirulitos: 10, prestigeLevel: 3, wheelClickBonus: 100, boostEndTime: NOW + 30000,
  });
  state.upgrades.fabrica = 1;
  const before = JSON.stringify(state);
  Object.values(state).filter(value => value && typeof value === "object").forEach(Object.freeze);
  Object.freeze(state);
  for (const id of Object.keys(FLAVORS_DATA)) {
    const result = previewFlavor(state, id, NOW);
    const projected = { ...state, activeFlavor: id };
    assert.deepEqual(result, {
      current: { click: getClickPower(state, NOW), pps: getPps(state, NOW) },
      preview: { click: getClickPower(projected, NOW), pps: getPps(projected, NOW) },
    });
    assert.equal(JSON.stringify(state), before);
  }
  assert.equal(previewFlavor(state, "__proto__", NOW), null);
});

test("Blueberry and Grape comparisons reveal the tradeoff without asserting paid is stronger", () => {
  const state = createState(NOW);
  state.activeFlavor = "blueberry";
  state.upgrades.fabrica = 1;
  const comparison = previewFlavor(state, "uva", NOW);
  assert.equal(comparison.current.click, 4);
  assert.equal(comparison.preview.click, 1);
  assert.equal(comparison.current.pps, 35.2);
  assert.equal(comparison.preview.pps, 40);
  assert.ok(comparison.current.pps + 2 * comparison.current.click > comparison.preview.pps + 2 * comparison.preview.click);
});

test("flavor effects expose all actual bonuses, including previously incomplete descriptions", () => {
  for (const [id, data] of Object.entries(FLAVORS_DATA)) {
    const effects = flavorEffects(id);
    assert.equal(effects.clickBonus, data.clickBonus);
    assert.equal(effects.ppsMult, data.ppsMult);
    assert.equal(effects.productionPercent, Math.round((data.ppsMult - 1) * 100));
  }
  assert.equal(flavorEffects("algodao").clickBonus, 20);
  assert.equal(flavorEffects("arcoiris").clickBonus, 50);
  assert.equal(flavorEffects("abacaxi").productionPercent, 10);
  assert.equal(flavorEffects("uva").focus, "Foco em produção passiva");
  assert.equal(flavorEffects("blueberry").focus, "Misto · clique e produção");
  assert.equal(flavorEffects("morango").focus, "Foco em cliques");
  assert.equal(flavorEffects("missing"), null);
});

test("shop quotes keep exact fixed lots and the true MAX affordable prefix", () => {
  const state = createState(NOW);
  state.pirulitos = 1e9;
  state.upgrades.maquina = 2;
  state.factoryExpansions.maquina = 10;
  for (const quantity of [1, 10, 100, "max"]) {
    const offer = shopOffer(state, "maquina", quantity, NOW);
    assert.deepEqual(offer.quote, getBulkQuote(state, "maquina", quantity));
    assert.equal(offer.price, offer.quote.cost);
    assert.equal(offer.available, true);
    assert.equal(offer.missing, 0);
  }
});

test("MAX with no affordable units shows the next price and never advertises a free purchase", () => {
  const state = createState(NOW);
  state.pirulitos = 5;
  const before = JSON.stringify(state);
  const offer = shopOffer(state, "maquina", "max", NOW);
  assert.deepEqual(offer.quote, { quantity: 0, cost: 0 });
  assert.equal(offer.price, 15);
  assert.equal(offer.missing, 10);
  assert.equal(offer.available, false);
  assert.equal(offer.seconds, null);
  assert.equal(JSON.stringify(state), before);
  state.upgrades.maquina = 2000;
  assert.equal(shopOffer(state, "maquina", 100, NOW).available, false);
  assert.equal(shopOffer(state, "maquina", "max", NOW).seconds, null);
});

test("purchase estimates use actual passive PPS and omit zero PPS and uncertain wheel changes", () => {
  const state = createState(NOW);
  assert.equal(affordabilitySeconds(state, 15, NOW), null);
  state.upgrades.calda = 1;
  state.activeFlavor = "uva"; // 5 PPS
  assert.equal(affordabilitySeconds(state, 15, NOW), 3);
  state.pirulitos = 3;
  assert.equal(affordabilitySeconds(state, 15, NOW), 3); // round up, never prematurely claim readiness
  assert.equal(affordabilitySeconds(state, 3, NOW), 0);
  assert.equal(affordabilitySeconds(state, Infinity, NOW), null);
  assert.equal(affordabilitySeconds(state, NaN, NOW), null);
  assert.equal(affordabilitySeconds(state, 1e30, NOW), null);
  state.pendingWheel = { endsAt: NOW + 3200, index: 2 };
  assert.equal(affordabilitySeconds(state, 15, NOW), null);
});

test("purchase estimates split at boost expiry instead of assuming a permanent multiplier", () => {
  const state = createState(NOW);
  state.upgrades.calda = 1; // 4 PPS or 8 boosted
  state.boostEndTime = NOW + 10000;
  assert.equal(affordabilitySeconds(state, 40, NOW), 5);
  assert.equal(affordabilitySeconds(state, 80, NOW), 10);
  assert.equal(affordabilitySeconds(state, 120, NOW), 20);
  assert.equal(affordabilitySeconds(state, 120, NOW + 10000), 30);
  state.lastTick = NOW + 10000;
  assert.equal(affordabilitySeconds(state, 120, NOW), 30); // backward wall clock
});

test("building contributions follow flavor, prestige and temporary multipliers", () => {
  const state = createState(NOW);
  Object.assign(state, { activeFlavor: "blueberry", prestigeLevel: 4, boostEndTime: NOW + 1000 });
  state.upgrades.maquina = 10;
  state.upgrades.fabrica = 2;
  const before = JSON.stringify(state);
  assert.equal(buildingContribution(state, "maquina", NOW), 5 * 1.1 * 1.6 * 2);
  assert.equal(buildingContribution(state, "maquina", NOW + 1000), 5 * 1.1 * 1.6);
  assert.equal(buildingContribution(state, "calda", NOW), 0);
  assert.equal(JSON.stringify(state), before);
});

test("shop view preference is independent of save data and tolerates blocked storage", () => {
  const data = new Map([["lollipopSave", "unchanged player data"]]);
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  assert.equal(readShopView(storage), "normal");
  writeShopView(storage, "compact");
  assert.equal(data.get(SHOP_VIEW_KEY), "compact");
  assert.equal(readShopView(storage), "compact");
  assert.equal(data.get("lollipopSave"), "unchanged player data");
  writeShopView(storage, "unexpected");
  assert.equal(readShopView(storage), "normal");
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.equal(readShopView(blocked), "normal");
  assert.doesNotThrow(() => writeShopView(blocked, "compact"));
});
