import test from "node:test";
import assert from "node:assert/strict";
import * as game from "../js/gameplay.js";
import {
  EGGS,
  SPECIES,
  RARITIES,
  STAGES,
  DISCOVERIES,
  PET_CAPACITY,
  hatchTable,
  rollSpecies,
} from "../js/pets/catalog.js";
import {
  hatchPets,
  eggQuote,
  equipPet,
  unequipPet,
  setTeam,
  equipBest,
  setStrategy,
  togglePetFlag,
  fusePets,
} from "../js/pets/actions.js";
import { petPower, getPetBonuses, bestTeam } from "../js/pets/bonuses.js";
import { fusionQuote } from "../js/pets/evolution.js";
import { normalizePets, allocatePet, PetDataError } from "../js/pets/state.js";
import { inventoryView, INVENTORY_PAGE_SIZE } from "../js/pets/inventory.js";
import { createAutoHatcher } from "../js/pets/auto.js";
import {
  validateState,
  loadGame,
  saveGame,
  SAVE_KEY,
  V4_BACKUP_KEY,
  V3_BACKUP_KEY,
  PET_QUARANTINE_KEY,
} from "../js/storage.js";

const NOW = 1700000000000;
const clone = (state) => JSON.parse(JSON.stringify(state));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
function state() {
  const s = game.createState(NOW);
  s.pirulitos = 1e9;
  s.totalEarned = 1e9;
  s.maxScore = 1e9;
  return s;
}
function give(s, speciesId = "balinha", stage = 0, count = 1) {
  const given = [];
  for (let i = 0; i < count; i++) {
    const result = allocatePet(s.pets, speciesId, stage, NOW + s.pets.nextId);
    s.pets.nextId = result.nextId;
    s.pets.inventory = [...s.pets.inventory, result.pet];
    given.push(result.pet);
  }
  return given;
}
function storage(values = {}, fail = null) {
  const data = new Map(Object.entries(values));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) {
      if (k === fail) throw Error("quota");
      data.set(k, v);
    },
  };
}

test("pet catalog has precisely three eggs, eighteen species, six rarities and 72 discoveries", () => {
  assert.equal(Object.keys(EGGS).length, 3);
  assert.equal(Object.keys(SPECIES).length, 18);
  assert.equal(Object.keys(RARITIES).length, 6);
  assert.equal(DISCOVERIES.length, 72);
  assert.equal(new Set(DISCOVERIES).size, 72);
  assert.deepEqual(
    Object.values(EGGS).map((egg) => egg.price),
    [1500, 100000, 10000000],
  );
  assert.deepEqual(
    STAGES.map((stage) => stage.power),
    [1, 3, 10, 35],
  );
  assert.deepEqual(
    STAGES.map((stage) => stage.copies),
    [1, 5, 25, 125],
  );
});
for (const [eggId, count, expected] of [
  ["acucarado", 5, { common: 60, uncommon: 30, rare: 9, epic: 1 }],
  ["cristalizado", 6, { uncommon: 50, rare: 35, epic: 12, legendary: 3 }],
  ["celestial", 7, { rare: 65, epic: 25, legendary: 9, mythic: 1 }],
])
  test(`${eggId}: exact species/rarity probabilities, forbidden tiers and RNG boundaries`, () => {
    const table = hatchTable(eggId);
    assert.equal(table.length, count);
    assert.equal(
      table.reduce((n, row) => n + row.percent, 0),
      100,
    );
    assert.equal(
      table.reduce((n, row) => n + row.weight, 0),
      200,
    );
    const tiers = {};
    let cumulative = 0;
    for (const row of table) {
      tiers[row.species.rarity] =
        (tiers[row.species.rarity] || 0) + row.percent;
      const total = table.filter(
        (other) => other.species.rarity === row.species.rarity,
      ).length;
      assert.equal(row.percent, expected[row.species.rarity] / total);
      assert.equal(
        rollSpecies(eggId, () => cumulative / 200),
        row.species.id,
      );
      assert.equal(
        rollSpecies(eggId, () => (cumulative + row.weight / 2) / 200),
        row.species.id,
      );
      assert.equal(
        rollSpecies(eggId, () => (cumulative + row.weight - 1e-8) / 200),
        row.species.id,
      );
      cumulative += row.weight;
    }
    assert.deepEqual(tiers, expected);
    for (const value of [-1, 1, NaN, Infinity, undefined])
      assert.equal(
        rollSpecies(eggId, () => value),
        null,
      );
  });
for (const count of [1, 2, 3])
  test(`hatch ×${count} samples independently and debits exactly the fixed lot`, () => {
    const s = state(),
      samples = [0, 0.7, 0.999],
      balance = s.pirulitos;
    let draws = 0;
    const result = hatchPets(s, "acucarado", count, NOW, {
      random: () => samples[draws++],
    });
    assert.equal(draws, count);
    assert.equal(s.pirulitos, balance - 1500 * count);
    assert.equal(result.received.length, count);
    assert.deepEqual(
      result.received.map((p) => p.speciesId),
      ["balinha", "goma", "guardiao_pirulito"].slice(0, count),
    );
    assert.equal(new Set(s.pets.inventory.map((p) => p.id)).size, count);
    assert.equal(s.pets.stats.hatched, count);
    assert.equal(s.pets.stats.byEgg.acucarado, count);
    assert.equal(s.pets.stats.spent, 1500 * count);
  });
test("locked egg, bad egg and invalid lots cannot grant or debit anything", () => {
  for (const [egg, count] of [
    ["cristalizado", 1],
    ["celestial", 1],
    ["__proto__", 1],
    ["acucarado", 0],
    ["acucarado", 4],
  ]) {
    const s = state(),
      before = clone(s);
    assert.equal(hatchPets(s, egg, count, NOW), false);
    assert.deepEqual(s, before);
  }
});
test("fixed batches reject insufficient balance/capacity completely", () => {
  const s = state();
  s.pirulitos = 2999;
  assert.equal(hatchPets(s, "acucarado", 2, NOW), false);
  assert.equal(s.pirulitos, 2999);
  assert.equal(s.pets.inventory.length, 0);
  s.pirulitos = 1e9;
  give(s, "balinha", 0, PET_CAPACITY - 1);
  const before = clone(s);
  assert.equal(hatchPets(s, "acucarado", 2, NOW), false);
  assert.deepEqual(s, before);
  assert.ok(hatchPets(s, "acucarado", 1, NOW));
  assert.equal(s.pets.inventory.length, PET_CAPACITY);
});
test("a bad draw in a batch creates no partial reward or debit", () => {
  const s = state(),
    before = clone(s);
  let draw = 0;
  assert.equal(
    hatchPets(s, "acucarado", 3, NOW, {
      random: () => (++draw === 2 ? NaN : 0),
    }),
    false,
  );
  assert.deepEqual(s, before);
});
test("rapid requests and a replayed request ID cannot accidentally purchase extra batches", () => {
  const s = state();
  assert.ok(hatchPets(s, "acucarado", 1, NOW, { requestId: "one" }));
  const balance = s.pirulitos;
  assert.equal(hatchPets(s, "acucarado", 1, NOW, { requestId: "two" }), false);
  assert.equal(
    hatchPets(s, "acucarado", 1, NOW + 1000, { requestId: "one" }),
    false,
  );
  assert.equal(s.pirulitos, balance);
  assert.ok(hatchPets(s, "acucarado", 1, NOW + 1000, { requestId: "two" }));
});
test("factory milestones use the existing count and stay unlocked after Prestige", () => {
  const s = state();
  s.upgrades.maquina = 24;
  game.advance(s, NOW);
  assert.deepEqual(s.pets.unlockedEggs, ["acucarado"]);
  game.buyUpgrade(s, "maquina", NOW);
  assert.deepEqual(s.pets.unlockedEggs, ["acucarado", "cristalizado"]);
  s.upgrades = {
    maquina: 40,
    calda: 25,
    fabrica: 25,
    misturador: 10,
    embaladora: 0,
    laboratorio: 0,
    linha: 0,
    superfabrica: 0,
  };
  game.prestige(s, NOW);
  assert.deepEqual(s.pets.unlockedEggs, Object.keys(EGGS));
  assert.equal(game.getTotalUpgradesCount(s), 0);
  assert.equal(
    eggQuote(s, "celestial", 1, NOW).reason.includes("bloqueado"),
    false,
  );
});
for (const stage of [0, 1, 2])
  test(`five ${STAGES[stage].name} fuse atomically into one ${STAGES[stage + 1].name}`, () => {
    const s = state(),
      pets = give(s, "balinha", stage, 5),
      unrelated = give(s, "marshmelinho", 0, 1)[0];
    s.pets.discovered = [`balinha:${stage}`];
    const result = fusePets(
      s,
      pets.map((p) => p.id),
      NOW,
    );
    assert.equal(result.stage, stage + 1);
    assert.equal(result.speciesId, "balinha");
    assert.equal(s.pets.inventory.length, 2);
    assert.ok(s.pets.inventory.some((p) => p.id === unrelated.id));
    assert.ok(s.pets.discovered.includes(`balinha:${stage}`));
    assert.ok(s.pets.discovered.includes(`balinha:${stage + 1}`));
    assert.equal(s.pets.stats.fused, 1);
    assert.equal(s.pirulitos, 1e9);
    for (const pet of pets) assert.equal(equipPet(s, pet.id, NOW), false);
  });
test("125 independently owned Normal copies form exactly one Gigante through 31 explicit fusions", () => {
  const s = state();
  give(s, "balinha", 0, 125);
  for (const stage of [0, 1, 2])
    while (s.pets.inventory.filter((p) => p.stage === stage).length >= 5) {
      const ids = s.pets.inventory
        .filter((p) => p.stage === stage)
        .slice(0, 5)
        .map((p) => p.id);
      assert.ok(fusePets(s, ids, NOW));
    }
  assert.equal(s.pets.inventory.length, 1);
  assert.equal(s.pets.inventory[0].stage, 3);
  assert.equal(s.pets.stats.fused, 31);
  assert.deepEqual(s.pets.discovered, ["balinha:1", "balinha:2", "balinha:3"]); // Fixtures injected Normal ownership, not a fictitious hatch.
  give(s, "balinha", 3, 4);
  assert.equal(
    fusePets(
      s,
      s.pets.inventory.map((p) => p.id),
      NOW,
    ),
    false,
  );
});
test("fusion rejects mixed species/stages, unknown IDs and repeated IDs without consuming any pet", () => {
  const s = state(),
    pets = give(s, "balinha", 0, 5);
  give(s, "goma", 0, 1);
  give(s, "balinha", 1, 1);
  for (const ids of [
    [pets[0].id, ...pets.slice(0, 4).map((p) => p.id)],
    ["missing", ...pets.slice(0, 4).map((p) => p.id)],
    s.pets.inventory.slice(2, 7).map((p) => p.id),
    pets.slice(0, 4).map((p) => p.id),
  ]) {
    const before = clone(s);
    assert.equal(fusePets(s, ids, NOW), false);
    assert.deepEqual(s, before);
  }
});
for (const flag of ["favorite", "locked"])
  test(`${flag} prevents fusion until explicitly removed and survives a save roundtrip`, () => {
    const s = state(),
      pets = give(s, "goma", 0, 5);
    togglePetFlag(s, pets[0].id, flag);
    assert.equal(
      fusePets(
        s,
        pets.map((p) => p.id),
        NOW,
        { allowEquipped: true },
      ),
      false,
    );
    const loaded = validateState(clone(s), NOW);
    assert.equal(loaded.pets.inventory[0][flag], true);
    togglePetFlag(s, pets[0].id, flag);
    assert.ok(
      fusePets(
        s,
        pets.map((p) => p.id),
        NOW,
      ),
    );
  });
test("equipped fusion requires confirmation and settles the old production before removing sources", () => {
  const s = state();
  s.upgrades.maquina = 2;
  const pets = give(s, "balinha", 0, 5);
  equipPet(s, pets[0].id, NOW);
  const ids = pets.map((p) => p.id);
  assert.equal(fusionQuote(s.pets, ids).consumesEquipped, true);
  assert.equal(fusePets(s, ids, NOW + 1000), false);
  const before = s.pirulitos;
  assert.ok(fusePets(s, ids, NOW + 1000, { allowEquipped: true }));
  close(s.pirulitos - before, 1.01);
  assert.deepEqual(s.pets.equipped, []);
  close(game.getPps(s), 1);
});
test("equipment accepts only owned distinct instances and no more than three", () => {
  const s = state(),
    pets = give(s, "balinha", 0, 4);
  for (const pet of pets.slice(0, 3)) assert.ok(equipPet(s, pet.id, NOW));
  assert.equal(equipPet(s, pets[3].id, NOW), false);
  assert.equal(equipPet(s, pets[0].id, NOW), false);
  assert.equal(setTeam(s, ["missing"], NOW), false);
  assert.equal(setTeam(s, [pets[0].id, pets[0].id], NOW), false);
  assert.ok(unequipPet(s, pets[0].id, NOW));
  assert.ok(equipPet(s, pets[3].id, NOW));
});
for (const species of Object.values(SPECIES))
  test(`${species.id}: evolution only scales its catalog click/PPS coefficient`, () => {
    for (const [stage, definition] of STAGES.entries()) {
      const power = petPower({ speciesId: species.id, stage });
      close(power.click, species.click * definition.power);
      close(power.pps, species.pps * definition.power);
    }
  });
test("equipped pet coefficients add, then flavors/Prestige/Stellar/boost multiply exactly once", () => {
  const s = state();
  s.upgrades.maquina = 2;
  s.activeFlavor = "blueberry";
  s.prestigeLevel = 3;
  s.stellarBoostLevel = 2;
  s.boostEndTime = NOW + 5000;
  const pets = give(s, "dragao_galactico", 1, 3);
  setTeam(
    s,
    pets.map((p) => p.id),
    NOW,
  );
  const petMult = 1 + 3 * 0.16 * 3,
    permanent = (1 + 3 * 0.15) * 1.1;
  close(game.getPps(s, NOW), 1 * 1.1 * permanent * petMult * 2);
  close(game.getClickPower(s, NOW), 4 * permanent * petMult * 2);
  close(game.getPps(s, NOW + 6000), 1 * 1.1 * permanent * petMult);
});
test("three maximum pets have finite bounded multipliers and never create factories or free currency", () => {
  const s = state(),
    pets = give(s, "dragao_galactico", 3, 3);
  setTeam(
    s,
    pets.map((p) => p.id),
    NOW,
  );
  close(getPetBonuses(s).ppsMultiplier, 17.8);
  close(getPetBonuses(s).clickMultiplier, 17.8);
  assert.equal(game.getPps(s, NOW), 0);
  assert.equal(s.pirulitos, 1e9);
  s.wheelClickBonus = 1e100;
  s.prestigeLevel = Number.MAX_SAFE_INTEGER;
  assert.ok(Number.isFinite(game.getClickPower(s, NOW)));
  assert.ok(game.getClickPower(s, NOW) <= 1e100);
});
test("equipment changes cannot retroactively boost production", () => {
  const s = state();
  s.pirulitos = 0;
  s.upgrades.maquina = 2;
  const [pet] = give(s, "balinha", 0, 1);
  equipPet(s, pet.id, NOW + 10000);
  close(s.pirulitos, 10);
  unequipPet(s, pet.id, NOW + 20000);
  close(s.pirulitos, 20.1);
});
test("offline production splits an expiring boost using the persisted pet team and never hatches eggs", () => {
  const s = state();
  s.upgrades.maquina = 2;
  const [pet] = give(s, "balinha", 3, 1);
  equipPet(s, pet.id, NOW);
  s.boostEndTime = NOW + 5000;
  const raw = JSON.stringify(s),
    loaded = loadGame(storage({ [SAVE_KEY]: raw }), NOW + 10000);
  close(loaded.offlineEarned, 1.35 * 15);
  assert.equal(loaded.state.pets.inventory.length, 1);
  assert.equal(loaded.state.pets.stats.hatched, 0);
});
for (const strategy of ["balanced", "production", "clicks"])
  test(`Equip Best ${strategy} selects actual strongest instances, not rarity labels`, () => {
    const s = state(),
      [candy] = give(s, "balinha", 3),
      [marsh] = give(s, "marshmelinho", 3),
      [dragon] = give(s, "dragao_galactico", 0),
      [fox] = give(s, "raposa_geada", 1);
    const expected =
      strategy === "clicks"
        ? [candy.id, marsh.id, fox.id]
        : strategy === "production"
          ? [marsh.id, candy.id, dragon.id]
          : [candy.id, marsh.id, dragon.id];
    assert.deepEqual(bestTeam(s.pets, strategy), expected);
    assert.ok(equipBest(s, strategy, NOW));
    assert.deepEqual(s.pets.equipped, expected);
    assert.equal(s.pets.inventory.length, 4);
    assert.equal(s.pets.strategy, strategy);
  });
test("Equip Best tie breaking is stable across inventory ordering and does not fuse favorites", () => {
  const s = state(),
    pets = give(s, "balinha", 0, 5);
  pets.forEach((p) => (p.acquiredAt = NOW));
  pets[0].favorite = true;
  const expected = bestTeam(s.pets);
  s.pets.inventory.reverse();
  assert.deepEqual(bestTeam(s.pets), expected);
  assert.equal(s.pets.inventory.length, 5);
  assert.equal(setStrategy(s, "__proto__"), false);
});
test("inventory filters/search/sorts and pagination count individual duplicates", () => {
  const s = state();
  give(s, "raposa_geada", 1, 60);
  give(s, "balinha", 0, 2);
  const view = inventoryView(s.pets, {
    search: "GEADA",
    egg: "cristalizado",
    rarity: "rare",
    stage: "1",
  });
  assert.equal(view.total, 60);
  assert.equal(view.items.length, INVENTORY_PAGE_SIZE);
  assert.equal(view.pages, 2);
  assert.equal(
    inventoryView(s.pets, { search: "geada", page: 1 }).items.length,
    12,
  );
  assert.equal(inventoryView(s.pets, { search: "nao existe" }).total, 0);
  assert.equal(inventoryView(s.pets, { sort: "evolution" }).items[0].stage, 1);
  assert.equal(
    inventoryView(s.pets, { sort: "rarity" }).items[0].speciesId,
    "raposa_geada",
  );
});
test("schema4 migrates to 5, preserving all valid progression and the exact raw v4 backup key", () => {
  const original = state();
  delete original.pets;
  Object.assign(original, {
    version: 4,
    prestigeLevel: 3,
    prestigeClaimed: 3,
    prestigePoints: 2,
    stellarBoostLevel: 1,
    prestigeBaseline: 1e6,
    activeFlavor: "blueberry",
    activeSkin: "neon",
    activeTheme: "gold",
    activeParticles: "ice",
    unlockedSkins: ["classic", "neon", "gold", "ice"],
    totalClicks: 500,
    timePlayed: 123,
    maxPps: 1000,
  });
  original.upgrades.maquina = 25;
  const raw = JSON.stringify(original, null, 2),
    store = storage({ [SAVE_KEY]: raw, unrelated: "keep" }),
    loaded = loadGame(store, NOW);
  assert.equal(loaded.canSave, true);
  assert.equal(loaded.state.version, 5);
  assert.equal(store.getItem(V4_BACKUP_KEY), raw);
  assert.equal(store.getItem(V3_BACKUP_KEY), null);
  for (const [key, value] of Object.entries(original))
    if (key !== "version") assert.deepEqual(loaded.state[key], value, key);
  assert.deepEqual(loaded.state.pets.unlockedEggs, [
    "acucarado",
    "cristalizado",
  ]);
  assert.equal(store.getItem("unrelated"), "keep");
  assert.equal(saveGame(store, loaded.state).ok, true);
  assert.equal(JSON.parse(store.getItem(SAVE_KEY)).version, 5);
});
test("required v4 backup failure (quota or silent rejection) protects the original and forbids overwrite", () => {
  for (const silent of [false, true]) {
    const raw = JSON.stringify({ ...state(), version: 4, pets: undefined }),
      store = storage({ [SAVE_KEY]: raw });
    const realSet = store.setItem;
    store.setItem = (key, value) => {
      if (key === V4_BACKUP_KEY) {
        if (silent) return;
        throw Error("quota");
      }
      realSet.call(store, key, value);
    };
    const result = loadGame(store, NOW);
    assert.equal(result.canSave, false);
    assert.equal(result.state.pirulitos, 1e9);
    assert.equal(store.getItem(SAVE_KEY), raw);
    assert.equal(saveGame(store, result.state).ok, false);
    assert.equal(store.getItem(SAVE_KEY), raw);
  }
});
test("migration never overwrites the first dedicated v4 legacy backup", () => {
  const first = JSON.stringify({ ...state(), version: 4 }),
    raw = JSON.stringify({ ...state(), version: 4, totalClicks: 99 }),
    store = storage({ [SAVE_KEY]: raw, [V4_BACKUP_KEY]: first });
  assert.equal(loadGame(store, NOW).canSave, true);
  assert.equal(store.getItem(V4_BACKUP_KEY), first);
});
test("pet export/import roundtrip retains IDs, flags, team, discoveries, eggs, preferences and lifetime stats", () => {
  const s = state();
  hatchPets(s, "acucarado", 3, NOW, {
    random: () => 0.99,
    requestId: "roundtrip",
  });
  equipBest(s, "clicks", NOW);
  togglePetFlag(s, s.pets.inventory[0].id, "favorite");
  togglePetFlag(s, s.pets.inventory[1].id, "locked");
  assert.deepEqual(validateState(clone(s), NOW).pets, s.pets);
});
test("over-capacity imports keep every valid-looking instance instead of deleting excess pets", () => {
  const s = state();
  give(s, "balinha", 0, 501);
  const loaded = validateState(clone(s), NOW);
  assert.equal(loaded.pets.inventory.length, 501);
  assert.equal(eggQuote(loaded, "acucarado", 1, NOW).ok, false);
});
test("duplicate/invalid IDs are repaired without dropping ownership; invalid equipment/counters are normalized", () => {
  const s = state();
  give(s, "balinha", 0, 3);
  s.pets.inventory[1].id = s.pets.inventory[0].id;
  s.pets.inventory[2].id = 'bad"id';
  s.pets.equipped = ["missing", "pet-1", "pet-1"];
  s.pets.nextId = -1;
  s.pets.stats.hatched = Infinity;
  const normalized = normalizePets(s.pets, NOW);
  assert.equal(normalized.invalid, false);
  assert.equal(normalized.pets.inventory.length, 3);
  assert.equal(new Set(normalized.pets.inventory.map((p) => p.id)).size, 3);
  assert.deepEqual(normalized.pets.equipped, ["pet-1"]);
  assert.equal(normalized.pets.stats.hatched, 0);
});
test("corrupt pet ownership is quarantined without wiping valid pets or unrelated progression", () => {
  const s = state();
  give(s, "balinha", 0, 2);
  s.pets.inventory.push({
    id: "unknown",
    speciesId: "future-species",
    stage: 0,
  });
  const raw = JSON.stringify(s),
    store = storage({ [SAVE_KEY]: raw });
  assert.throws(() => validateState(s, NOW), PetDataError);
  const loaded = loadGame(store, NOW);
  assert.equal(loaded.canSave, false);
  assert.equal(loaded.state.pirulitos, 1e9);
  assert.equal(loaded.state.pets.inventory.length, 2);
  assert.equal(store.getItem(SAVE_KEY), raw);
  assert.equal(store.getItem(PET_QUARANTINE_KEY), raw);
});
test("malformed pet roots and evolution stages are protected; future saves remain completely untouched", () => {
  for (const pets of [
    "wrong",
    { inventory: [{ id: "x", speciesId: "balinha", stage: 4 }] },
    { inventory: [{ speciesId: { toString: null }, stage: 0 }] },
  ])
    assert.throws(() => validateState({ ...state(), pets }, NOW), PetDataError);
  const raw = JSON.stringify({ ...state(), version: 6 }),
    store = storage({ [SAVE_KEY]: raw });
  assert.equal(loadGame(store, NOW).canSave, false);
  assert.equal(store.getItem(SAVE_KEY), raw);
  assert.equal(store.data.size, 1);
});
test("ID allocation remains monotonic after consumption and preserves exhausted-ID saves safely", () => {
  const s = state();
  const ids = give(s, "balinha", 0, 5).map((p) => p.id);
  const fused = fusePets(s, ids, NOW);
  const [next] = give(s, "goma", 0, 1);
  assert.ok(!ids.includes(fused.id) && !ids.includes(next.id));
  assert.notEqual(fused.id, next.id);
  s.pets.nextId = Number.MAX_SAFE_INTEGER;
  assert.equal(hatchPets(s, "acucarado", 1, NOW), false);
  assert.equal(validateState(clone(s), NOW).pets.inventory.length, 2);
});
test("Prestige preserves every pet field while resetting only the established temporary resources", () => {
  const s = state();
  s.upgrades.maquina = 40;
  s.upgrades.calda = 25;
  s.upgrades.fabrica = 25;
  s.upgrades.misturador = 10;
  game.advance(s, NOW);
  hatchPets(s, "celestial", 3, NOW, { random: () => 0.999 });
  equipBest(s, "production", NOW);
  togglePetFlag(s, s.pets.inventory[0].id, "locked");
  const pets = clone(s.pets);
  assert.ok(game.prestige(s, NOW));
  assert.deepEqual(s.pets, pets);
  assert.equal(s.pirulitos, 0);
  assert.equal(game.getTotalUpgradesCount(s), 0);
  assert.equal(game.getPps(s, NOW), 0);
  assert.ok(game.getClickPower(s, NOW) > 2 * (1 + s.prestigeLevel * 0.15));
  assert.deepEqual(validateState(clone(s), NOW).pets, pets);
});
test("persistent save reports silent primary failures instead of falsely confirming rewards", () => {
  const s = state(),
    raw = JSON.stringify(s),
    store = storage({ [SAVE_KEY]: raw }),
    realSet = store.setItem;
  store.setItem = (key, value) => {
    if (key !== SAVE_KEY) realSet.call(store, key, value);
  };
  hatchPets(s, "acucarado", 1, NOW);
  assert.equal(saveGame(store, s).ok, false);
  assert.equal(store.getItem(SAVE_KEY), raw);
});

function autoFixture(t) {
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    now: Date.now,
  };
  globalThis.document = new EventTarget();
  globalThis.window = new EventTarget();
  let now = NOW,
    hidden = false,
    writable = true,
    updating = false;
  Date.now = () => now;
  t.after(() => {
    globalThis.document = previous.document;
    globalThis.window = previous.window;
    Date.now = previous.now;
  });
  const s = state(),
    listeners = new Set(),
    timers = new Map();
  let id = 0,
    opens = 0;
  const runtime = {
    state: s,
    get writable() {
      return writable;
    },
    canSave: true,
    get updating() {
      return updating;
    },
    subscribe(fn) {
      listeners.add(fn);
      fn();
      return () => listeners.delete(fn);
    },
  };
  const auto = createAutoHatcher({
    runtime,
    hidden: () => hidden,
    schedule: (fn) => {
      timers.set(++id, fn);
      return id;
    },
    unschedule: (key) => timers.delete(key),
    openBatch: (egg, count) => {
      opens++;
      return hatchPets(s, egg, count, now, { random: () => 0 });
    },
  });
  t.after(() => auto.dispose());
  return {
    auto,
    s,
    timers,
    get opens() {
      return opens;
    },
    step() {
      now += 2400;
      const task = [...timers.values()][0];
      timers.clear();
      task?.();
    },
    hide() {
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    readonly() {
      writable = false;
      for (const fn of listeners) fn();
    },
    update() {
      updating = true;
      for (const fn of listeners) fn();
    },
  };
}
test("auto hatches independent fixed batches on one timer and never resumes after an explicit stop", (t) => {
  const f = autoFixture(t);
  assert.equal(f.auto.start("acucarado", 3), true);
  assert.equal(f.opens, 1);
  assert.equal(f.timers.size, 1);
  assert.equal(f.auto.start("acucarado", 3), false);
  f.step();
  assert.equal(f.s.pets.inventory.length, 6);
  assert.equal(f.timers.size, 1);
  f.auto.stop();
  f.step();
  assert.equal(f.opens, 2);
  assert.equal(f.timers.size, 0);
});
for (const reason of [
  "hidden",
  "readonly",
  "update",
  "pagehide",
  "blur",
  "native",
])
  test(`auto stops on ${reason} without scheduling offline hatches`, (t) => {
    const f = autoFixture(t);
    f.auto.start("acucarado", 1);
    if (reason === "hidden") f.hide();
    else if (reason === "readonly") f.readonly();
    else if (reason === "update") f.update();
    else if (reason === "native")
      document.dispatchEvent(new Event("lollipop:native-pause"));
    else window.dispatchEvent(new Event(reason));
    assert.equal(f.auto.active, false);
    f.step();
    assert.equal(f.opens, 1);
    assert.equal(f.timers.size, 0);
  });
test("auto stops after the last affordable/capacity-fitting complete batch", (t) => {
  const f = autoFixture(t);
  f.s.pirulitos = 4500;
  f.auto.start("acucarado", 3);
  assert.equal(f.s.pets.inventory.length, 3);
  assert.equal(f.auto.active, false);
  assert.equal(f.timers.size, 0);
  f.s.pirulitos = 1e9;
  give(f.s, "balinha", 0, 495);
  f.step();
  assert.equal(f.auto.start("acucarado", 3), false);
  assert.equal(f.s.pets.inventory.length, 498);
  f.auto.start("acucarado", 2);
  assert.equal(f.s.pets.inventory.length, 500);
  assert.equal(f.auto.active, false);
  assert.equal(f.timers.size, 0);
});
test("a failed auto transaction stops immediately with no retry loop", (t) => {
  const f = autoFixture(t);
  f.auto.dispose();
  let opens = 0;
  const auto = createAutoHatcher({
    runtime: {
      state: f.s,
      writable: true,
      canSave: true,
      updating: false,
      subscribe: () => () => {},
    },
    hidden: () => false,
    openBatch: () => {
      opens++;
      return false;
    },
  });
  assert.equal(auto.start("acucarado", 1), false);
  assert.equal(opens, 1);
  assert.equal(auto.active, false);
  auto.dispose();
});

test("balance journeys keep first-run economy intact and later pet/permanent multipliers finite", async () => {
  const { petJourneySimulation, balanceSnapshots } = await import(
    "../scripts/simulate-pets.mjs"
  );
  const baseline = petJourneySimulation(false),
    collector = petJourneySimulation(true);
  assert.equal(baseline[0].seconds, collector[0].seconds);
  assert.ok(
    collector.slice(1).some((row, i) => row.seconds < baseline[i + 1].seconds),
  );
  for (const row of collector) {
    assert.ok(row.seconds > 0 && Number.isFinite(row.seconds));
    assert.ok(
      row.petBonus.ppsMultiplier >= 1 && row.petBonus.ppsMultiplier <= 17.8,
    );
    assert.ok(row.ownedPets <= 15);
  }
  for (const snapshot of balanceSnapshots())
    assert.ok(
      snapshot.pps > 0 &&
        Object.values(snapshot.passiveSecondsPerEgg).every(Number.isFinite),
    );
});

test("combined legacy overflow and malformed pets still return a protected preview without resetting anything", () => {
  const raw = JSON.stringify({
      ...state(),
      version: 3,
      upgrades: { maquina: 999 },
      pets: { inventory: [{ speciesId: "unknown", stage: 99 }] },
    }),
    store = storage({ [SAVE_KEY]: raw });
  const result = loadGame(store, NOW);
  assert.equal(result.canSave, false);
  assert.equal(store.getItem(SAVE_KEY), raw);
  assert.equal(result.state.totalEarned, 1e9);
  assert.equal(result.state.pirulitos, 1e9);
});
