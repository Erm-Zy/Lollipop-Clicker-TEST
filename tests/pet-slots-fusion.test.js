import test from "node:test";
import assert from "node:assert/strict";
import * as game from "../js/gameplay.js";
import { SPECIES, PRESTIGE_PET_CAP, STRATEGIES } from "../js/pets/catalog.js";
import { allocatePet } from "../js/pets/state.js";
import {
  setTeam,
  equipPet,
  equipBest,
  savePreset,
  equipPreset,
  fusePets,
} from "../js/pets/actions.js";
import {
  getEquippedPetSlotCapacity,
  getPetSlotCost,
} from "../js/pets/slots.js";
import {
  safeFusionQuote,
  fuseEligibleDuplicates,
  hatchWithAutoFusion,
  setAutoFusion,
  canAutoFuse,
} from "../js/pets/auto-fusion.js";
import { getPetBonuses, petPower } from "../js/pets/bonuses.js";
import {
  validateState,
  loadGame,
  saveGame,
  SAVE_KEY,
  V6_BACKUP_KEY,
} from "../js/storage.js";
import { SAVE_VERSION, UPGRADES_DATA } from "../js/data.js";
import { ACHIEVEMENTS_DATA } from "../js/data.js";
import { petSVG, eggSVG } from "../js/pets/art.js";
import { achievementSVG } from "../js/ui/cartoon.js";
const NOW = 1800000000000;
test("all 18 real species / 72 stages have local dimensional art and mystery fallback", () => {
  const all = new Set();
  for (const id of Object.keys(SPECIES))
    for (let stage = 0; stage < 4; stage++) {
      const svg = petSVG(id, stage);
      assert.ok(svg.includes("<linearGradient"));
      assert.ok(svg.includes('viewBox="0 0 120 132"'));
      assert.ok(!svg.includes("undefined"));
      all.add(svg.replace(/pet-\d+/g, "pet-id"));
    }
  assert.equal(all.size, 72);
});
test("all thirteen real achievements have distinct original emblems, not category clones", () => {
  const all = new Set(
    ACHIEVEMENTS_DATA.map((a) =>
      achievementSVG(a.id).replace(/badge-\d+/g, "badge-id"),
    ),
  );
  assert.equal(all.size, 13);
  for (const svg of all)
    assert.ok(
      !/<image|foreignObject|https?:/.test(
        svg.replace("http://www.w3.org/2000/svg", ""),
      ),
    );
});
test("three eggs keep original prices and independent locally illustrated SVGs", () => {
  const eggs = ["acucarado", "cristalizado", "celestial"].map(eggSVG);
  assert.equal(
    new Set(eggs.map((x) => x.replace(/egg-\d+/g, "egg-id"))).size,
    3,
  );
  for (const svg of eggs) assert.ok(svg.includes('viewBox="0 0 150 180"'));
});
function state(level = 100) {
  const s = game.createState(NOW);
  Object.assign(s, {
    prestigeLevel: level,
    prestigeClaimed: level,
    prestigePoints: level,
    pirulitos: 1e15,
    totalEarned: 1e18,
  });
  return s;
}
function give(s, id = "balinha", stage = 0, n = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = allocatePet(s.pets, id, stage, NOW + i);
    s.pets.nextId = a.nextId;
    s.pets.inventory.push(a.pet);
    out.push(a.pet);
  }
  return out;
}
function memory(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}
test("slots are 3/4/5 with exact 25/75 PP spend, stale purchase rejected, hard cap", () => {
  const s = state();
  assert.equal(getEquippedPetSlotCapacity(s), 3);
  assert.equal(getPetSlotCost(s), 25);
  assert.equal(game.buyPetSlot(s, NOW, 0).capacity, 4);
  assert.equal(s.prestigePoints, 75);
  assert.equal(game.buyPetSlot(s, NOW, 0), false);
  assert.equal(s.petSlotUpgradeLevel, 1);
  assert.equal(game.buyPetSlot(s, NOW, 1).capacity, 5);
  assert.equal(s.prestigePoints, 0);
  assert.equal(game.buyPetSlot(s, NOW), false);
  assert.equal(getPetSlotCost(s), Infinity);
  assert.equal(validateState(s, NOW).petSlotUpgradeLevel, 2);
});
test("slot purchase does not spend nonexistent points or change pets/equipment", () => {
  for (const balance of [0, 24, NaN, Infinity, -1]) {
    const s = state();
    s.prestigePoints = balance;
    const before = JSON.stringify(s);
    assert.equal(game.buyPetSlot(s, NOW), false);
    assert.equal(JSON.stringify(s), before);
  }
  const s = state();
  give(s, "balinha", 0, 5);
  const pets = JSON.stringify(s.pets);
  game.buyPetSlot(s, NOW);
  assert.equal(JSON.stringify(s.pets), pets);
});
test("migration v6 backs up exact raw save; defaults OFF/3; failed backup protects original", () => {
  const s = state();
  give(s, "gotinha", 2, 3);
  setTeam(
    s,
    s.pets.inventory.map((p) => p.id),
    NOW,
  );
  savePreset(s, "prestige");
  s.version = 6;
  delete s.petSlotUpgradeLevel;
  delete s.pets.autoFusionEnabled;
  delete s.pets.autoFusionStats;
  const raw = JSON.stringify(s, null, 2),
    store = memory({ [SAVE_KEY]: raw }),
    loaded = loadGame(store, NOW);
  assert.equal(loaded.canSave, true);
  assert.equal(store.getItem(V6_BACKUP_KEY), raw);
  assert.equal(loaded.state.version, SAVE_VERSION);
  assert.equal(loaded.state.pets.autoFusionEnabled, false);
  assert.equal(getEquippedPetSlotCapacity(loaded.state), 3);
  assert.deepEqual(loaded.state.pets.inventory, s.pets.inventory);
  assert.deepEqual(loaded.state.pets.presets, s.pets.presets);
  for (const silent of [true, false]) {
    const blocked = memory({ [SAVE_KEY]: raw });
    blocked.setItem = () => {
      if (!silent) throw Error("quota");
    };
    const result = loadGame(blocked, NOW);
    assert.equal(result.canSave, false);
    assert.equal(blocked.getItem(SAVE_KEY), raw);
  }
});
test("pre-v7 unknown automation fields cannot imply opt-in or buy extra slots", () => {
  const s = state();
  give(s, "balinha", 0, 5);
  s.version = 6;
  s.petSlotUpgradeLevel = 2;
  s.pets.autoFusionEnabled = true;
  s.pets.autoFusionStats.fusions = 99;
  const raw = JSON.stringify(s),
    store = memory({ [SAVE_KEY]: raw }),
    loaded = loadGame(store, NOW);
  assert.equal(loaded.canSave, true);
  assert.equal(store.getItem(V6_BACKUP_KEY), raw);
  assert.equal(loaded.state.pets.autoFusionEnabled, false);
  assert.equal(loaded.state.pets.autoFusionStats.fusions, 0);
  assert.equal(loaded.state.petSlotUpgradeLevel, 0);
  assert.deepEqual(loaded.state.pets.inventory, s.pets.inventory);
});
test("invalid slot level and unearned spending protect current raw save", () => {
  for (const level of [-1, 3, 1.5, "1", null]) {
    const s = state();
    s.petSlotUpgradeLevel = level;
    const raw = JSON.stringify(s),
      store = memory({ [SAVE_KEY]: raw });
    assert.equal(loadGame(store, NOW).canSave, false);
    assert.equal(store.getItem(SAVE_KEY), raw);
  }
  const s = state(24);
  s.petSlotUpgradeLevel = 1;
  assert.throws(() => validateState(s, NOW), /espaços/);
});
for (const level of [0, 1, 2])
  test(`${3 + level} slots validate equipment, presets, all bonus channels and PP cap`, () => {
    const s = state();
    for (let i = 0; i < level; i++) game.buyPetSlot(s, NOW);
    give(s, "dragao_galactico", 3, 6);
    const ids = s.pets.inventory.slice(0, 3 + level).map((p) => p.id);
    assert.ok(setTeam(s, ids, NOW));
    assert.equal(equipPet(s, s.pets.inventory.at(-1).id, NOW), false);
    assert.equal(getPetBonuses(s).prestigeReward, PRESTIGE_PET_CAP);
    assert.equal(getPetBonuses(s).pps, ids.length * 4.8);
    assert.equal(getPetBonuses(s).bossDamage, ids.length * 8);
    savePreset(s, "production");
    setTeam(s, [], NOW);
    equipPreset(s, "production", NOW);
    assert.deepEqual(s.pets.equipped, ids);
    const restored = validateState(JSON.parse(JSON.stringify(s)), NOW);
    assert.deepEqual(restored.pets.equipped, ids);
    assert.deepEqual(restored.pets.presets.production, ids);
    const before = JSON.stringify(restored.pets);
    assert.ok(game.prestige(restored, NOW));
    assert.equal(getEquippedPetSlotCapacity(restored), 3 + level);
    assert.equal(JSON.stringify(restored.pets), before);
  });
test("slot ledger preserves previously purchased stellar/factory expansion and extra earned PP", () => {
  const s = state(120);
  game.buyStellarBoost(s, NOW);
  game.buyFactoryExpansion(s, "maquina", NOW);
  game.buyPetSlot(s, NOW);
  game.buyPetSlot(s, NOW);
  const restored = validateState(s, NOW);
  assert.equal(restored.stellarBoostLevel, 1);
  assert.equal(restored.factoryExpansions.maquina, 1);
  assert.equal(restored.petSlotUpgradeLevel, 2);
  assert.equal(restored.prestigePoints, 17);
  const extra = state(20);
  extra.prestigeBonusEarned = 5;
  extra.prestigePoints = 25;
  assert.ok(game.buyPetSlot(extra, NOW));
  assert.equal(validateState(extra, NOW).petSlotUpgradeLevel, 1);
});
test("slot changes do not grant retroactive production, factory and click bonuses use five owned IDs", () => {
  const s = state();
  s.upgrades.maquina = 45;
  give(s, "coelho_lunar", 3, 3);
  give(s, "balinha", 3, 2);
  game.buyPetSlot(s, NOW);
  game.buyPetSlot(s, NOW);
  setTeam(
    s,
    s.pets.inventory.map((p) => p.id),
    NOW + 1000,
  );
  assert.equal(game.getFactoryCapacity(s, "misturador"), 27);
  assert.equal(getPetBonuses(s).click, 0.96);
  assert.equal(getPetBonuses(s).pps, 2.88);
  const before = s.pirulitos;
  setTeam(s, [], NOW + 2000);
  assert.ok(s.pirulitos > before);
  assert.equal(getPetBonuses(s).click, 0);
  assert.equal(game.getFactoryCapacity(s, "misturador"), 15);
});
test("auto fusion requires informed opt-in; persistent settings never execute on load", () => {
  const s = state();
  give(s, "balinha", 0, 10);
  assert.equal(s.pets.autoFusionEnabled, false);
  assert.equal(setAutoFusion(s, true), false);
  assert.ok(setAutoFusion(s, true, { confirmed: true }));
  const loaded = validateState(s, NOW);
  assert.equal(loaded.pets.autoFusionEnabled, true);
  assert.equal(loaded.pets.inventory.length, 10);
  assert.ok(setAutoFusion(loaded, false));
  assert.equal(loaded.pets.inventory.length, 10);
  assert.throws(() =>
    validateState(
      { ...s, pets: { ...s.pets, autoFusionEnabled: "true" } },
      NOW,
    ),
  );
});
for (const stage of [0, 1, 2])
  for (const n of [4, 5])
    test(`safe duplicate fusion ${n} copies at stage ${stage}`, () => {
      const s = state();
      give(s, "balinha", stage, n);
      const quote = safeFusionQuote(s.pets);
      assert.equal(quote.ok, n === 5);
      if (n === 5) {
        assert.equal(quote.fusions, 1);
        assert.ok(fuseEligibleDuplicates(s, NOW, quote.signature));
        assert.equal(s.pets.inventory.length, 1);
        assert.equal(s.pets.inventory[0].stage, stage + 1);
        assert.equal(s.pets.stats.fused, 1);
      }
    });
test("all species group independently, final Giants never fuse and outputs never chain", () => {
  const s = state();
  give(s, "balinha", 0, 25);
  give(s, "balinha", 1, 4);
  give(s, "goma", 2, 5);
  give(s, "goma", 3, 5);
  const quote = safeFusionQuote(s.pets);
  assert.equal(quote.fusions, 6);
  assert.ok(fuseEligibleDuplicates(s, NOW, quote.signature));
  assert.equal(
    s.pets.inventory.filter((p) => p.speciesId === "balinha" && p.stage === 1)
      .length,
    9,
  );
  assert.equal(
    s.pets.inventory.filter((p) => p.speciesId === "goma" && p.stage === 3)
      .length,
    6,
  );
  assert.equal(
    new Set(s.pets.inventory.map((p) => p.id)).size,
    s.pets.inventory.length,
  );
});
for (const protection of [
  "favorite",
  "locked",
  "equipped",
  "preset",
  "reserve",
])
  test(`safe fusion preserves ${protection}`, () => {
    const s = state();
    const pets = give(s, "balinha", 0, 6),
      protectedId = pets[0].id;
    if (protection === "favorite" || protection === "locked")
      pets[0][protection] = true;
    if (protection === "equipped") s.pets.equipped = [protectedId];
    if (protection === "preset") s.pets.presets.production = [protectedId];
    if (protection === "reserve") s.pets.reserveNormals = 1;
    const quote = safeFusionQuote(s.pets);
    assert.ok(quote.ok);
    fuseEligibleDuplicates(s, NOW, quote.signature);
    if (protection !== "reserve")
      assert.ok(s.pets.inventory.some((p) => p.id === protectedId));
    assert.equal(s.pets.inventory.filter((p) => p.stage === 0).length, 1);
  });
test("changed flags, presets, team, reserve and inventory reject stale dry runs without consumption", () => {
  for (const mutate of [
    (s) => (s.pets.inventory[0].favorite = true),
    (s) => (s.pets.presets.production = ["pet-1"]),
    (s) => (s.pets.equipped = ["pet-1"]),
    (s) => (s.pets.reserveNormals = 5),
    (s) => give(s),
  ]) {
    const s = state();
    give(s, "balinha", 0, 5);
    const q = safeFusionQuote(s.pets);
    mutate(s);
    const before = JSON.stringify(s);
    assert.equal(fuseEligibleDuplicates(s, NOW, q.signature), false);
    assert.equal(JSON.stringify(s), before);
  }
});
test("atomic hatch policy retains exact debit/results/discoveries, rejects duplicate requests, skips OFF/unsafe", () => {
  for (const [enabled, allowed] of [
    [false, true],
    [true, false],
    [true, true],
  ]) {
    const s = state();
    give(s, "balinha", 0, 4);
    s.pets.autoFusionEnabled = enabled;
    const before = s.pirulitos;
    const result = hatchWithAutoFusion(s, "acucarado", 1, NOW, {
      random: () => 0,
      requestId: "hatch-1",
      autoFusionAllowed: allowed,
    });
    assert.equal(result.received.length, 1);
    assert.equal(s.pirulitos, before - 1500);
    assert.equal(s.pets.stats.hatched, 1);
    assert.equal(s.pets.inventory.length, enabled && allowed ? 1 : 5);
    assert.ok(s.pets.discovered.includes("balinha:0"));
    if (enabled && allowed) {
      assert.ok(s.pets.discovered.includes("balinha:1"));
      assert.equal(s.pets.autoFusionStats.fusions, 1);
    }
    const committed = JSON.stringify(s);
    assert.equal(
      hatchWithAutoFusion(s, "acucarado", 1, NOW + 1000, {
        requestId: "hatch-1",
        autoFusionAllowed: true,
      }),
      false,
    );
    assert.equal(s.pets.stats.hatched, 1);
    // advance may update the clock, but never replays reward or fusion.
    assert.equal(s.pirulitos, JSON.parse(committed).pirulitos);
  }
});
test("capacity 500 never speculatively deletes duplicates to enable hatching", () => {
  const s = state();
  give(s, "balinha", 0, 500);
  s.pets.autoFusionEnabled = true;
  const before = JSON.stringify(s.pets);
  assert.equal(
    hatchWithAutoFusion(s, "acucarado", 1, NOW, {
      requestId: "full",
      autoFusionAllowed: true,
    }),
    false,
  );
  assert.equal(JSON.stringify(s.pets), before);
  const q = safeFusionQuote(s.pets);
  assert.equal(q.fusions, 100);
  fuseEligibleDuplicates(s, NOW, q.signature);
  assert.equal(s.pets.inventory.length, 100);
});
test("no funds prevents automatic fusion; manual fusion remains explicit and separate", () => {
  const s = state();
  give(s, "balinha", 0, 5);
  s.pirulitos = 0;
  s.pets.autoFusionEnabled = true;
  const before = JSON.stringify(s.pets);
  assert.equal(
    hatchWithAutoFusion(s, "acucarado", 1, NOW, {
      requestId: "poor",
      autoFusionAllowed: true,
    }),
    false,
  );
  assert.equal(JSON.stringify(s.pets), before);
  assert.ok(
    fusePets(
      s,
      s.pets.inventory.map((p) => p.id),
      NOW,
    ),
  );
  assert.equal(s.pets.autoFusionStats.fusions, 0);
});
test("auto fusion guards foreground, connectivity, ownership, save, updating and busy session", () => {
  const r = { writable: true, canSave: true, updating: false };
  assert.ok(canAutoFuse(r));
  for (const options of [
    { hidden: true },
    { online: false },
    { busy: true },
    { updatePending: true },
  ])
    assert.equal(canAutoFuse(r, options), false);
  for (const delta of [
    { writable: false },
    { canSave: false },
    { updating: true },
  ])
    assert.equal(canAutoFuse({ ...r, ...delta }), false);
});
test("save/export/import keeps auto history and original v6 key; quota does not overwrite durable save", () => {
  const s = state();
  give(s, "balinha", 0, 4);
  setAutoFusion(s, true, { confirmed: true });
  const store = memory();
  saveGame(store, s);
  const before = store.getItem(SAVE_KEY);
  const draft = structuredClone(s);
  hatchWithAutoFusion(draft, "acucarado", 1, NOW, {
    random: () => 0,
    requestId: "atomic",
    autoFusionAllowed: true,
  });
  store.setItem = () => {
    throw Error("quota");
  };
  assert.equal(saveGame(store, draft).ok, false);
  assert.equal(store.getItem(SAVE_KEY), before);
  const restored = validateState(draft, NOW);
  assert.equal(restored.pets.autoFusionStats.fusions, 1);
  assert.equal(restored.pets.autoFusionEnabled, true);
  assert.equal(restored.pets.inventory.length, 1);
});

function combos(xs, k, start = 0, team = [], out = []) {
  if (team.length === k) {
    out.push(team);
    return out;
  }
  for (let i = start; i <= xs.length - (k - team.length); i++)
    combos(xs, k, i + 1, [...team, xs[i]], out);
  return out;
}
function objective(s, strategy, ids) {
  const projection = { ...s, pets: { ...s.pets, equipped: ids } },
    p = getPetBonuses(projection),
    base = game.getPps({ ...s, pets: { ...s.pets, equipped: [] } }, NOW),
    prod = base ? game.getPps(projection, NOW) / base - 1 : p.pps;
  if (strategy === "production") return [prod, p.click];
  if (strategy === "clicks") return [p.click, p.pps];
  if (strategy === "combat")
    return [game.getBossDamage(projection, NOW), p.pps];
  if (strategy === "prestige") {
    const r = game.getPrestigeReward(projection);
    return [r.base ? r.bonus : r.rate, p.pps];
  }
  if (strategy === "capacity")
    return [
      Object.entries(p.factoryCapacity).reduce(
        (n, [k, v]) => n + v * UPGRADES_DATA[k].basePps,
        0,
      ),
      p.pps,
    ];
  return [prod + p.click, Math.min(prod, p.click)];
}
for (const slots of [3, 4, 5])
  for (const strategy of Object.keys(STRATEGIES))
    test(`optimizer ${slots} slots / ${strategy} matches exhaustive actual objectives on small inventory`, () => {
      const s = state();
      s.petSlotUpgradeLevel = slots - 3;
      s.totalEarned = 106 ** 3 * 1e6;
      s.prestigeClaimed = 100;
      s.upgrades.superfabrica = 24;
      s.upgrades.maquina = 30;
      for (const [id, stage] of [
        ["dragao_galactico", 2],
        ["fenix", 2],
        ["gotinha", 3],
        ["coelho_lunar", 3],
        ["guardiao_aurora", 3],
        ["raposa_morango", 3],
        ["estrelinha", 3],
        ["raposa_nebulosa", 2],
        ["coruja_prismatica", 3],
      ])
        give(s, id, stage);
      const scores = combos(
        s.pets.inventory.map((p) => p.id),
        slots,
      ).map((ids) => objective(s, strategy, ids));
      scores.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
      equipBest(s, strategy, NOW);
      const actual = objective(s, strategy, s.pets.equipped);
      assert.ok(
        Math.abs(actual[0] - scores[0][0]) < 1e-8,
        `${actual} != ${scores[0]}`,
      );
      assert.ok(Math.abs(actual[1] - scores[0][1]) < 1e-8);
      assert.equal(s.pets.equipped.length, slots);
    });
