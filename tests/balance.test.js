import { SAVE_VERSION } from "../js/data.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as game from "../js/gameplay.js";
import {
  SPECIES,
  EGGS,
  STAGES,
  hatchTable,
  PRESTIGE_PET_CAP,
} from "../js/pets/catalog.js";
import { petPower, getPetBonuses, bestTeam } from "../js/pets/bonuses.js";
import { allocatePet } from "../js/pets/state.js";
import {
  hatchPets,
  equipBest,
  setTeam,
  replacePet,
  setReserve,
  savePreset,
  equipPreset,
  fuseBatch,
  releasePets,
  eggQuote,
} from "../js/pets/actions.js";
import { batchFusionQuote, fusionQuote } from "../js/pets/evolution.js";
import {
  loadGame,
  saveGame,
  validateState,
  SAVE_KEY,
  V5_BACKUP_KEY,
} from "../js/storage.js";
import { PRESTIGE_CONFIG, OFFLINE_CAP_MS } from "../js/data.js";
import { fixture } from "../scripts/balance-report.mjs";
const NOW = 1700000000000;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const clone = (s) => JSON.parse(JSON.stringify(s));
function give(s, id, stage = 0, count = 1) {
  const ids = [];
  for (let n = 0; n < count; n++) {
    const a = allocatePet(s.pets, id, stage, NOW + n);
    s.pets.nextId = a.nextId;
    s.pets.inventory = [...s.pets.inventory, a.pet];
    ids.push(a.pet.id);
  }
  return ids;
}
function store(raw, fail = null) {
  const m = new Map([[SAVE_KEY, raw]]);
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      if (k === fail) throw Error("quota");
      m.set(k, v);
    },
    m,
  };
}
for (const species of Object.values(SPECIES))
  test(`${species.id}: ability channels obey tier constraints through all four stages`, () => {
    for (let stage = 0; stage < 4; stage++) {
      const b = petPower({ speciesId: species.id, stage });
      for (const key of ["click", "pps", "bossDamage", "prestigeReward"])
        assert.ok(Number.isFinite(b[key]) && b[key] >= 0);
      if (species.egg === "acucarado") {
        assert.equal(b.prestigeReward, 0);
        assert.deepEqual(b.factoryCapacity, {});
      }
      if (species.egg !== "celestial") assert.deepEqual(b.factoryCapacity, {});
      for (const slots of Object.values(b.factoryCapacity))
        assert.ok(Number.isSafeInteger(slots) && slots >= 1 && slots <= 4);
    }
  });
test("affordability target: starter stays accessible, crystal minutes, celestial cannot sustain 42.1M auto", () => {
  assert.equal(Object.keys(EGGS).length, 3);
  assert.equal(Object.keys(SPECIES).length, 18);
  for (const id of Object.keys(EGGS))
    close(
      hatchTable(id).reduce((n, r) => n + r.percent, 0),
      100,
    );
  const early = fixture("starter"),
    mid = fixture("crystal"),
    advanced = fixture("celestial"),
    late = fixture("late");
  assert.ok(EGGS.acucarado.price / game.getPps(early, NOW) < 20);
  const c = EGGS.cristalizado.price / game.getPps(mid, NOW);
  assert.ok(c >= 60 && c <= 180);
  const high = EGGS.celestial.price / game.getPps(advanced, NOW);
  assert.ok(high >= 180 && high <= 900);
  assert.ok(EGGS.celestial.price / 42.1e6 > 100);
  assert.ok(42.1e6 * 2.4 < EGGS.celestial.price * 3);
  assert.ok(game.getPps(late, NOW) * 2.4 > EGGS.celestial.price * 3);
});
test("new unlocks require production facilities but preserve every v5 world-based egg", () => {
  const s = game.createState(NOW);
  s.upgrades.maquina = 25;
  game.advance(s, NOW);
  assert.deepEqual(s.pets.unlockedEggs, ["acucarado"]);
  s.upgrades.laboratorio = 1;
  game.advance(s, NOW);
  assert.ok(s.pets.unlockedEggs.includes("cristalizado"));
  s.upgrades.superfabrica = 10;
  s.upgrades.calda = 25;
  s.upgrades.fabrica = 25;
  s.upgrades.misturador = 15;
  game.advance(s, NOW);
  assert.ok(!s.pets.unlockedEggs.includes("celestial"));
  s.prestigeLevel = 10;
  game.advance(s, NOW);
  assert.ok(s.pets.unlockedEggs.includes("celestial"));
  const old = clone(s);
  old.version = 5;
  old.prestigeLevel = 0;
  old.upgrades.superfabrica = 0;
  old.upgrades.maquina = 40;
  old.upgrades.misturador = 24;
  old.pets.unlockedEggs = ["acucarado"];
  const migrated = validateState(old, NOW);
  assert.ok(migrated.pets.unlockedEggs.includes("celestial"));
});
test("combat pet affects actual hit and neither click income nor PPS", () => {
  const s = fixture("player"),
    plain = game.getClickPower(s, NOW),
    pps = game.getPps(s, NOW);
  const ids = give(s, "raposa_geada");
  setTeam(s, ids, NOW);
  close(game.getClickPower(s, NOW), plain * 1.05); // Its small income secondary is explicit.
  close(game.getPps(s, NOW), pps);
  const damage = game.getBossDamage(s, NOW);
  setTeam(s, [], NOW);
  close(damage, game.getBossDamage(s, NOW) * 2);
  setTeam(s, ids, NOW);
  game.startBoss(s, NOW);
  s.boss.hp = s.boss.maxHp = 1e9;
  close(game.hitBoss(s, NOW).damage, damage);
  const currency = s.pirulitos;
  game.hitBoss(s, NOW);
  assert.equal(s.pirulitos, currency);
});
test("combat grows with factory preparation, click and PPS pets do not double-count into damage", () => {
  const s = fixture("player"),
    plain = game.getBossDamage(s, NOW);
  setTeam(s, give(s, "estrelinha", 3, 3), NOW);
  close(game.getBossDamage(s, NOW), plain);
  setTeam(s, give(s, "balinha", 3, 3), NOW);
  close(game.getBossDamage(s, NOW), plain);
  s.boostEndTime = NOW + 1000;
  close(game.getBossDamage(s, NOW), 2 * plain);
});
test("high boss history becomes linear, rewards stay bounded by preparation", () => {
  const s = fixture("player");
  s.bossesKilled = 100;
  const hp = game.getBossMaxHp(s);
  s.bossesKilled = 101;
  assert.ok(game.getBossMaxHp(s) / hp < 1.02);
  s.bossesKilled = 10000;
  assert.ok(Number.isFinite(game.getBossMaxHp(s)));
  assert.ok(
    game.getBossReward(s) <=
      Math.max(
        1500,
        game.getPps(s, Infinity) * 60 + game.getBossDamage(s, Infinity) * 60,
      ),
  );
});
for (const mode of [
  "clicks",
  "production",
  "combat",
  "prestige",
  "capacity",
  "balanced",
])
  test(`Equip Best ${mode} evaluates real target with deterministic ties`, () => {
    const s = fixture("player");
    for (const id of Object.keys(SPECIES)) give(s, id, 1);
    const team = bestTeam(s.pets, mode, s);
    assert.equal(new Set(team).size, 3);
    s.pets.inventory = [...s.pets.inventory].reverse();
    assert.deepEqual(bestTeam(s.pets, mode, s), team);
    const projected = { ...s, pets: { ...s.pets, equipped: team } };
    const metric = (x) =>
      mode === "combat"
        ? game.getBossDamage(x, NOW)
        : mode === "clicks"
          ? game.getClickPower(x, NOW)
          : mode === "production"
            ? game.getPps(x, NOW)
            : mode === "prestige"
              ? getPetBonuses(x).prestigeReward
              : null;
    if (metric(projected) !== null)
      for (const pet of s.pets.inventory)
        for (let slot = 0; slot < 3; slot++) {
          const ids = [...team];
          ids[slot] = pet.id;
          if (new Set(ids).size !== 3) continue;
          assert.ok(
            metric(projected) >=
              metric({ ...s, pets: { ...s.pets, equipped: ids } }) - 1e-6,
          );
        }
  });
test("capacity equips activate owned units, removal retains them inactive through reload/offline and MAX", () => {
  const s = game.createState(NOW);
  s.pirulitos = s.totalEarned = 1e12;
  s.upgrades.superfabrica = 20;
  const ids = give(s, "guardiao_aurora", 3);
  setTeam(s, ids, NOW);
  assert.equal(game.getPermanentFactoryCapacity(s, "superfabrica"), 20);
  assert.equal(game.getFactoryCapacity(s, "superfabrica"), 24);
  assert.equal(game.getBulkQuote(s, "superfabrica", 10).cost, Infinity);
  assert.equal(game.getBulkQuote(s, "superfabrica", "max").quantity, 4);
  assert.ok(game.buyBulk(s, "superfabrica", "max", NOW));
  assert.equal(s.upgrades.superfabrica, 24);
  setTeam(s, [], NOW + 1000);
  const start = s.pirulitos;
  game.advance(s, NOW + 2000);
  close(s.pirulitos - start, 20 * 260000);
  assert.equal(s.upgrades.superfabrica, 24);
  assert.equal(game.getActiveFactoryCount(s, "superfabrica"), 20);
  const reloaded = validateState(clone(s), NOW + 2000);
  assert.equal(reloaded.upgrades.superfabrica, 24);
  assert.equal(game.getActiveFactoryCount(reloaded, "superfabrica"), 20);
  const raw = JSON.stringify(reloaded),
    loaded = loadGame(store(raw), NOW + 3000);
  close(loaded.offlineEarned, 20 * 260000);
  setTeam(reloaded, ids, NOW + 2000);
  assert.equal(game.getActiveFactoryCount(reloaded, "superfabrica"), 24);
  assert.ok(game.getPps(reloaded, NOW + 2000) > 20 * 260000);
});
test("production optimizer accounts for nonlinear capacity plus PPS tradeoff", () => {
  const s = game.createState(NOW);
  s.upgrades.superfabrica = 24;
  const capacity = give(s, "guardiao_aurora", 3)[0];
  give(s, "estrelinha", 0, 3);
  give(s, "marshmelinho", 0, 3);
  const team = bestTeam(s.pets, "production", s); // One capacity pet permits four units AND +128% PPS.
  assert.ok(team.includes(capacity));
});
test("extra Prestige PP exists only on successful new base gain and survives spend/reload/roundtrip", () => {
  const s = game.createState(NOW);
  setTeam(s, give(s, "coruja_prismatica", 3, 3), NOW);
  s.totalEarned = 1e6;
  assert.deepEqual(game.getPrestigeReward(s), {
    base: 1,
    bonus: 0,
    total: 1,
    rate: 0.25,
  });
  s.totalEarned = 1e9;
  const q = game.getPrestigeReward(s);
  assert.deepEqual(q, { base: 10, bonus: 2, total: 12, rate: 0.25 });
  assert.equal(
    game.prestige(s, NOW, { expectedReward: { ...q, bonus: 3 } }),
    false,
  );
  assert.equal(game.prestige(s, NOW, { expectedReward: q }), 10);
  assert.equal(s.prestigeBonusEarned, 2);
  assert.equal(s.prestigePoints, 12);
  assert.equal(s.prestigeLevel, 10);
  assert.ok(game.buyStellarBoost(s, NOW));
  assert.ok(game.buyFactoryExpansion(s, "maquina", NOW));
  const points = s.prestigePoints;
  const loaded = validateState(clone(s), NOW);
  assert.equal(loaded.prestigePoints, points);
  assert.equal(loaded.prestigeBonusEarned, 2);
  assert.equal(game.prestige(loaded, NOW), false);
  assert.equal(game.getPrestigeReward(loaded).total, 0);
  loaded.totalEarned = 8e9;
  const next = game.getPrestigeReward(loaded);
  assert.equal(next.bonus, 2);
  assert.equal(game.prestige(loaded, NOW), 10);
  assert.equal(loaded.prestigeBonusEarned, 4);
  assert.equal(validateState(clone(loaded), NOW).prestigePoints, points + 12);
});
for (const bad of [-1, NaN, Infinity, 1.5, "2", Number.MAX_SAFE_INTEGER])
  test(`malformed PP ledger ${String(bad)} cannot authorize extra spending`, () => {
    const s = game.createState(NOW);
    s.prestigeLevel = 10;
    s.prestigeBonusEarned = bad;
    assert.throws(() => validateState(s, NOW), /PP extras/);
  });
test("schema5 raw backup readback and failures preserve all legitimate progression", () => {
  const s = fixture("player");
  give(s, "guardiao_aurora", 3);
  s.pets.equipped = [s.pets.inventory[0].id];
  s.pets.stats.spent = 1.4e9;
  s.version = 5;
  const raw = JSON.stringify(s, null, 2),
    storage = store(raw),
    loaded = loadGame(storage, NOW);
  assert.equal(storage.getItem(V5_BACKUP_KEY), raw);
  assert.equal(loaded.canSave, true);
  assert.equal(loaded.state.version, SAVE_VERSION);
  assert.equal(loaded.state.pets.inventory[0].id, s.pets.inventory[0].id);
  assert.equal(loaded.state.pets.stats.spent, 1.4e9);
  assert.equal(loaded.state.prestigeBonusEarned, 0);
  assert.equal(saveGame(storage, loaded.state).ok, true);
  assert.equal(storage.getItem(V5_BACKUP_KEY), raw);
  const failed = store(raw, V5_BACKUP_KEY);
  assert.equal(loadGame(failed, NOW).canSave, false);
  assert.equal(saveGame(failed, loaded.state).ok, false);
  assert.equal(failed.getItem(SAVE_KEY), raw);
  const silent = store(raw);
  silent.setItem = () => {};
  assert.equal(loadGame(silent, NOW).canSave, false);
});
test("atomic replacement settles old production; presets tolerate consumed IDs and survive Prestige", () => {
  const s = game.createState(NOW);
  s.upgrades.maquina = 2;
  const old = give(s, "marshmelinho"),
    next = give(s, "estrelinha");
  setTeam(s, old, NOW);
  savePreset(s, "production");
  assert.ok(replacePet(s, next[0], old[0], NOW + 10000));
  close(s.pirulitos, 10 * 1.04);
  savePreset(s, "combat");
  assert.ok(equipPreset(s, "production", NOW + 20000));
  close(s.pirulitos, 10 * 1.04 + 10 * 1.3);
  s.totalEarned = 1e6;
  const presets = clone(s.pets.presets);
  game.prestige(s, NOW + 20000);
  assert.deepEqual(s.pets.presets, presets);
  s.pets.inventory = s.pets.inventory.filter((p) => p.id !== old[0]);
  assert.ok(equipPreset(s, "production", NOW + 20000));
  assert.deepEqual(s.pets.equipped, []);
});
test("batch fusion chains 125 Normal into one Giant and counts all 31 operations and discoveries", () => {
  const s = game.createState(NOW);
  give(s, "marshmelinho", 0, 125);
  const options = { speciesId: "marshmelinho", stage: 0, chain: true };
  const q = batchFusionQuote(s.pets, options);
  assert.equal(q.operations.length, 31);
  assert.equal(q.consumed.length, 125);
  assert.equal(q.outputs.length, 1);
  assert.equal(q.outputs[0].stage, 3);
  assert.equal(fuseBatch(s, options, NOW, "stale"), false);
  const result = fuseBatch(s, options, NOW, q.signature);
  assert.equal(result.fusions, 31);
  assert.equal(s.pets.inventory.length, 1);
  assert.equal(s.pets.stats.fused, 31);
  assert.equal(new Set(s.pets.discovered).size, 3);
  assert.equal(fuseBatch(s, options, NOW, q.signature), false);
  assert.equal(s.pets.nextId, 157);
});
test("single-stage bulk leaves results unconsumed and respects reserve/protections/equipped opt-in", () => {
  const s = game.createState(NOW);
  const ids = give(s, "balinha", 0, 37);
  s.pets.inventory[0].favorite = true;
  s.pets.inventory[1].locked = true;
  setTeam(s, [ids[2]], NOW);
  setReserve(s, 10);
  const options = { speciesId: "balinha", stage: 0 };
  let q = batchFusionQuote(s.pets, options);
  assert.equal(q.operations.length, 5);
  assert.equal(q.consumed.length, 25);
  assert.equal(q.consumesEquipped, false);
  assert.ok(fuseBatch(s, options, NOW, q.signature));
  assert.equal(s.pets.inventory.filter((p) => p.stage === 0).length, 12);
  assert.equal(s.pets.inventory.filter((p) => p.stage === 1).length, 5);
  assert.equal(
    fusionQuote(
      s.pets,
      s.pets.inventory
        .filter((p) => p.stage === 0 && !p.locked && !p.favorite)
        .slice(0, 5)
        .map((p) => p.id),
    ).ok,
    false,
  );
  const t = game.createState(NOW);
  const equipped = give(t, "goma", 0, 5);
  setTeam(t, [equipped[0]], NOW);
  assert.equal(batchFusionQuote(t.pets, { speciesId: "goma" }).ok, false);
  q = batchFusionQuote(t.pets, { speciesId: "goma", allowEquipped: true });
  assert.equal(q.consumesEquipped, true);
});
test("release resolves a full Giant inventory deliberately, never protected/equipped/reserved copies", () => {
  const s = game.createState(NOW);
  const ids = give(s, "balinha", 3, 500);
  s.pirulitos = 1e6;
  assert.equal(eggQuote(s, "acucarado", 1, NOW).ok, false);
  s.pets.inventory[0].favorite = true;
  s.pets.inventory[1].locked = true;
  setTeam(s, [ids[2]], NOW);
  for (const id of ids.slice(0, 3))
    assert.equal(releasePets(s, [id], NOW), false);
  assert.ok(releasePets(s, [ids[3]], NOW));
  assert.equal(eggQuote(s, "acucarado", 1, NOW).ok, true);
  assert.equal(s.pirulitos, 1e6);
  const normal = give(s, "marshmelinho", 0, 5);
  setReserve(s, 5);
  assert.equal(releasePets(s, normal, NOW), false);
});
test("wheel hoarding is capped prospectively while old pending rewards remain unchanged", () => {
  const s = fixture("player");
  s.pirulitos = 1e18;
  game.startWheel(s, NOW, () => 5.5 / 6);
  close(s.pendingWheel.amount, Math.floor(game.getPps(s, Infinity) * 600));
  const raw = clone(s);
  raw.version = 5;
  raw.pendingWheel.amount = 5e17;
  const loaded = validateState(raw, NOW);
  game.settleWheel(loaded, NOW + 3200);
  assert.equal(loaded.lastWheelReward.amount, 5e17);
});

test("combat optimizer values activating capacity through the authoritative attack getter", () => {
  const s = game.createState(NOW);
  s.upgrades.superfabrica = 24;
  give(s, "fenix");
  give(s, "dragao_cristalino");
  give(s, "goma");
  const capacity = give(s, "guardiao_aurora", 3)[0];
  const result = equipBest(s, "combat", NOW);
  assert.ok(result.ids.includes(capacity));
  const best = game.getBossDamage(s, NOW);
  for (const pet of s.pets.inventory)
    for (let slot = 0; slot < 3; slot++) {
      const ids = [...result.ids];
      ids[slot] = pet.id;
      if (new Set(ids).size !== 3) continue;
      assert.ok(
        best >=
          game.getBossDamage(
            { ...s, pets: { ...s.pets, equipped: ids } },
            NOW,
          ) -
            1e-6,
      );
    }
});
test("Prestige optimizer handles integer rounding, then chooses useful PPS among equal real awards", () => {
  const s = game.createState(NOW);
  s.totalEarned = 8e6;
  give(s, "coruja_prismatica", 0, 3);
  const production = give(s, "estrelinha", 0, 3);
  const result = equipBest(s, "prestige", NOW);
  assert.deepEqual(result.ids, production); // All legal teams award zero extra on base2.
  s.totalEarned = 64e6;
  give(s, "coruja_prismatica", 3, 3);
  equipBest(s, "prestige", NOW);
  assert.equal(game.getPrestigeReward(s).bonus, 1);
});
test("malformed reserves remain protected instead of silently exposing retained duplicates", () => {
  const s = game.createState(NOW);
  s.pets.reserveNormals = -1;
  const raw = JSON.stringify(s),
    storage = store(raw);
  assert.equal(loadGame(storage, NOW).canSave, false);
  assert.equal(storage.getItem(SAVE_KEY), raw);
});
for (const egg of ["cristalizado", "celestial"])
  for (const count of [1, 2, 3])
    test(`${egg} x${count}: new-tier prices debit exactly and preserve independent draws`, () => {
      const s = fixture(egg === "cristalizado" ? "crystal" : "celestial"),
        before = s.pirulitos;
      let draws = 0;
      const result = hatchPets(s, egg, count, NOW, {
        random: () => [0, 0.7, 0.999][draws++],
      });
      assert.equal(draws, count);
      assert.equal(result.received.length, count);
      assert.equal(s.pirulitos, before - EGGS[egg].price * count);
      assert.equal(s.pets.stats.spent, EGGS[egg].price * count);
    });
test("capacity removal integrates the old active team on both sides of boost expiry exactly once", () => {
  const s = game.createState(NOW);
  s.upgrades.superfabrica = 24;
  setTeam(s, give(s, "guardiao_aurora", 3), NOW);
  s.boostEndTime = NOW + 5000;
  const old = game.getPps(s, Infinity);
  setTeam(s, [], NOW + 10000);
  close(s.pirulitos, old * 15);
  const before = s.pirulitos;
  game.advance(s, NOW + 20000);
  close(s.pirulitos - before, 20 * 260000 * 10);
  assert.equal(s.upgrades.superfabrica, 24);
});

test("combined historical and bonus PP budget remains safe at the numeric ceiling", () => {
  const s = game.createState(NOW);
  s.prestigeLevel = Number.MAX_SAFE_INTEGER - 10;
  s.prestigeClaimed = s.prestigeLevel;
  s.prestigeBonusEarned = 2;
  s.totalEarned = 1e100;
  assert.equal(game.getPrestigeGain(s), 8);
  assert.equal(game.prestige(s, NOW), 8);
  assert.equal(
    s.prestigeLevel + s.prestigeBonusEarned,
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(game.getPrestigeGain(s), 0);
  assert.equal(game.getPrestigeProgress(s).atLimit, true);
  assert.equal(validateState(clone(s), NOW).prestigePoints, 8);
});

test("large Prestige rewards use exact basis-point division, not floating multiplication", () => {
  const s = game.createState(NOW);
  setTeam(s, give(s, "dragao_galactico", 1), NOW);
  s.totalEarned = 1e6 * 4000000000000000 ** 3;
  const reward = game.getPrestigeReward(s);
  const expected = Number((BigInt(reward.base) * 750n) / 10000n);
  assert.equal(reward.bonus, expected);
  assert.ok(Number.isSafeInteger(reward.total));
  game.prestige(s, NOW, { expectedReward: reward });
  assert.equal(validateState(clone(s), NOW).prestigeBonusEarned, expected);
});

test("Equip Best settles pending income before evaluating integer Prestige rewards", () => {
  const s = game.createState(NOW);
  s.upgrades.maquina = 2;
  s.totalEarned = 999999;
  give(s, "raposa_nebulosa", 0, 3);
  const income = give(s, "estrelinha", 0, 3);
  const result = equipBest(s, "prestige", NOW + 2000);
  assert.deepEqual(result.ids, income);
  close(s.pirulitos, 2);
  assert.equal(game.getPrestigeGain(s), 1);
});
