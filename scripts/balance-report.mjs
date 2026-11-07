// Controlled valid fixtures and policies use production actions/getters. Never reads a player save.
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const root =
  process.env.BALANCE_ROOT || fileURLToPath(new URL("../", import.meta.url));
const load = (path) => import(pathToFileURL(`${root}/${path}`));
const g = await load("js/gameplay.js"),
  p = await load("js/progression.js"),
  d = await load("js/data.js");
const { EGGS, SPECIES, STAGES, hatchTable } = await load("js/pets/catalog.js");
const a = await load("js/pets/actions.js"),
  { allocatePet } = await load("js/pets/state.js");
const now = 1700000000000;
export function fixture(name) {
  const s = g.createState(now);
  const configs = {
    starter: [0, 0, { maquina: 15, calda: 8, fabrica: 2 }, "morango"],
    crystal: [
      1,
      1,
      { maquina: 25, calda: 10, fabrica: 5, laboratorio: 1 },
      "limao",
    ],
    celestial: [
      10,
      4,
      {
        maquina: 40,
        calda: 25,
        fabrica: 25,
        misturador: 15,
        embaladora: 15,
        laboratorio: 15,
        linha: 10,
        superfabrica: 10,
      },
      "morango",
    ],
    player: [
      30,
      7,
      {
        maquina: 40,
        calda: 25,
        fabrica: 25,
        misturador: 15,
        embaladora: 15,
        laboratorio: 15,
        linha: 13,
        superfabrica: 19,
      },
      "morango",
    ],
    late: [
      1090,
      20,
      {
        maquina: 140,
        calda: 125,
        fabrica: 125,
        misturador: 115,
        embaladora: 115,
        laboratorio: 115,
        linha: 120,
        superfabrica: 120,
      },
      "lendario",
    ],
  };
  const [level, stellar, owned, flavor] = configs[name];
  s.totalEarned = p.prestigeThreshold(level);
  g.prestige(s, now);
  for (let i = 0; i < stellar; i++) g.buyStellarBoost(s, now);
  if (name === "late")
    for (const key of Object.keys(s.upgrades))
      for (let i = 0; i < 10; i++) g.buyFactoryExpansion(s, key, now);
  // Explicit test funding, not claimed earned playtime. Purchases enforce actual prices/caps.
  g.addCurrency(
    s,
    { starter: 1e5, crystal: 5e6, celestial: 50e9, player: 200e9, late: 1e20 }[
      name
    ],
  );
  for (const [key, count] of Object.entries(owned))
    for (let n = 0; n < count; n++)
      if (!g.buyUpgrade(s, key, now))
        throw Error(`Invalid fixture ${name}/${key}`);
  g.selectFlavor(s, flavor, now);
  return s;
}
function give(s, id, stage = 0) {
  const x = allocatePet(s.pets, id, stage, now);
  s.pets.nextId = x.nextId;
  s.pets.inventory = [...s.pets.inventory, x.pet];
  return x.pet.id;
}
function summary(s) {
  const opportunities = Object.entries(d.UPGRADES_DATA)
    .map(([key, data]) => ({
      key,
      cost: g.getUpgradeCost(s, key),
      gain:
        g.getPps(
          { ...s, upgrades: { ...s.upgrades, [key]: s.upgrades[key] + 1 } },
          now,
        ) - g.getPps(s, now),
    }))
    .filter((x) => Number.isFinite(x.cost) && x.gain > 0)
    .sort((a, b) => a.cost / a.gain - b.cost / b.gain);
  const pps = g.getPps(s, now),
    attack = (g.getBossDamage || g.getClickPower)(s, now);
  return {
    nextFactory: opportunities[0],
    owned: s.upgrades,
    flavor: s.activeFlavor,
    level: s.prestigeLevel,
    stellar: s.stellarBoostLevel,
    expansions: s.factoryExpansions,
    team: s.pets.equipped.map((id) => {
      const pet = s.pets.inventory.find((p) => p.id === id);
      return `${pet.speciesId}:${pet.stage}`;
    }),
    pps,
    click: g.getClickPower(s, now),
    bossDamage: attack,
    bossHp: g.getBossMaxHp(s),
    bossSecondsAt2Taps: g.getBossMaxHp(s) / (2 * attack),
    prestigeReward: p.getPrestigeReward?.(s) || {
      base: g.getPrestigeGain(s),
      bonus: 0,
      total: g.getPrestigeGain(s),
    },
    eggs: Object.fromEntries(
      Object.entries(EGGS).map(([id, e]) => [
        id,
        {
          unlocked: s.pets.unlockedEggs.includes(id),
          price: e.price,
          seconds: e.price / pps,
          batchSeconds: (3 * e.price) / pps,
          autoIncomeFraction: (pps * 2.4) / (3 * e.price),
          autoSustainable: pps * 2.4 >= 3 * e.price,
        },
      ]),
    ),
  };
}
function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  };
}
function percentile(rows, q) {
  return rows[Math.min(rows.length - 1, Math.floor(rows.length * q))];
}
function monteCarlo(probability, copies, runs = 4000) {
  const random = seeded(20261107),
    samples = [];
  for (let run = 0; run < runs; run++) {
    let eggs = 0;
    // Sum independent geometric waiting times, exactly equivalent to Bernoulli hatches.
    for (let copy = 0; copy < copies; copy++)
      eggs +=
        Math.floor(Math.log(1 - random()) / Math.log(1 - probability)) + 1;
    samples.push(eggs);
  }
  samples.sort((a, b) => a - b);
  return {
    runs,
    expected: copies / probability,
    p10: percentile(samples, 0.1),
    p50: percentile(samples, 0.5),
    p90: percentile(samples, 0.9),
    p99: percentile(samples, 0.99),
    mean: samples.reduce((a, b) => a + b, 0) / runs,
  };
}
function journey(cps, policy) {
  const s = g.createState(now);
  let firstEgg = null,
    teamTime = null,
    clock = 0,
    iterations = 0;
  if (!cps) {
    g.selectFlavor(s, "blueberry", now);
    for (let i = 0; i < 4; i++) g.click(s, now);
    g.buyUpgrade(s, "maquina", now);
  }
  const milestones = [],
    eggUnlockSeconds = { acucarado: 0 };
  const income = (x) =>
    g.getPps(x, x.lastTick) + cps * g.getClickPower(x, x.lastTick);
  let rng = seeded(911);
  for (const target of [1, 2, 3, 5, 10, 30, 60, 100]) {
    const started = s.lastTick;
    if (!cps && !g.getPps(s, s.lastTick)) {
      g.selectFlavor(s, "blueberry", s.lastTick);
      while (s.pirulitos < g.getUpgradeCost(s, "maquina"))
        g.click(s, s.lastTick);
      g.buyUpgrade(s, "maquina", s.lastTick);
    }
    while (g.getPrestigeTarget(s) < target && iterations++ < 15000) {
      const targetEgg = policy === "prestige" ? "cristalizado" : "acucarado";
      if (
        ["collector", "prestige", "arena"].includes(policy) &&
        s.pets.inventory.length < 3 &&
        s.pirulitos >= EGGS[targetEgg].price * 3 &&
        a.eggQuote(s, targetEgg, 3, s.lastTick).ok
      ) {
        a.hatchPets(s, targetEgg, 3, s.lastTick, { random: rng });
        a.equipBest(
          s,
          policy === "arena"
            ? "combat"
            : policy === "prestige"
              ? "prestige"
              : "production",
          s.lastTick,
        );
        if (!firstEgg) firstEgg = (s.lastTick - now) / 1000;
        teamTime = (s.lastTick - now) / 1000;
      }
      if (
        policy === "arena" &&
        s.lastTick >= s.bossCooldownUntil &&
        g.getBossMaxHp(s) /
          (2 * (g.getBossDamage || g.getClickPower)(s, s.lastTick)) <=
          30
      ) {
        const start = s.lastTick;
        if (g.startBoss(s, start))
          for (let i = 0; i < 60 && s.boss; i++) g.hitBoss(s, start + i * 500);
      }
      if (g.getPrestigeTarget(s) >= target) break;
      const rate = income(s);
      const choices = [];
      for (const key of Object.keys(d.UPGRADES_DATA)) {
        const cost = g.getUpgradeCost(s, key),
          clone = {
            ...s,
            upgrades: { ...s.upgrades, [key]: s.upgrades[key] + 1 },
          };
        if (Number.isFinite(cost))
          choices.push({
            cost,
            gain: income(clone) - rate,
            buy: () => g.buyUpgrade(s, key, s.lastTick),
          });
      }
      for (const [id, f] of Object.entries(d.FLAVORS_DATA))
        if (
          id !== s.activeFlavor &&
          (s.unlockedFlavors.includes(id) || policy !== "factories-first")
        )
          choices.push({
            cost: s.unlockedFlavors.includes(id) ? 0 : f.cost,
            gain: income({ ...s, activeFlavor: id }) - rate,
            buy: () => g.selectFlavor(s, id, s.lastTick),
          });
      const best = choices
        .filter((c) => c.gain > 0)
        .sort((a, b) => a.cost / a.gain - b.cost / b.gain)[0];
      const toGoal = (p.prestigeThreshold(target) - s.totalEarned) / rate;
      const seconds = Math.max(
        0.001,
        Math.min(
          toGoal,
          best ? Math.max(0, (best.cost - s.pirulitos) / rate) : Infinity,
        ),
      );
      // Casual policy checks in every ten minutes; offline production uses the same engine.
      const elapsed = policy === "casual" ? Math.max(600, seconds) : seconds;
      const slice = Math.min(elapsed, 8 * 3600);
      g.advance(s, s.lastTick + slice * 1000, { offline: policy === "casual" });
      g.addCurrency(
        s,
        cps *
          (policy === "casual" ? Math.min(30, slice) : slice) *
          g.getClickPower(s, s.lastTick),
      );
      if (!firstEgg && s.pirulitos >= EGGS.acucarado.price)
        firstEgg = (s.lastTick - now) / 1000;
      if (best && s.pirulitos >= best.cost) best.buy();
      for (const id of s.pets.unlockedEggs)
        eggUnlockSeconds[id] ??= (s.lastTick - now) / 1000;
    }
    if (iterations >= 15000)
      throw Error(`Policy did not converge: ${policy}/${cps}/${target}`);
    const beforeReward = p.getPrestigeReward?.(s) || {
      base: g.getPrestigeGain(s),
      bonus: 0,
      total: g.getPrestigeGain(s),
    };
    const gained = g.prestige(s, s.lastTick);
    while (g.getStellarCost(s) <= s.prestigePoints)
      g.buyStellarBoost(s, s.lastTick);
    milestones.push({
      target,
      seconds: (s.lastTick - started) / 1000,
      gained,
      reward: beforeReward,
    });
    clock = (s.lastTick - now) / 1000;
  }
  return {
    arenaWins: s.bossesKilled,
    seedManualClicks: cps ? 0 : 4,
    eggUnlockSeconds,
    firstEggAffordableSeconds: firstEgg,
    firstTeamSeconds: teamTime,
    totalSeconds: clock,
    milestones,
  };
}
function collectionMilestone(eggId, copies, runs = 500) {
  const table = hatchTable(eggId),
    random = seeded(342 + copies),
    samples = [];
  for (let run = 0; run < runs; run++) {
    const owned = table.map(() => 0);
    let remaining = owned.length,
      draws = 0;
    while (remaining) {
      let sample = random() * 200,
        index = 0;
      while (sample >= table[index].weight) sample -= table[index++].weight;
      if (++owned[index] === copies) remaining--;
      draws++;
    }
    samples.push(draws);
  }
  samples.sort((a, b) => a - b);
  return {
    runs,
    copiesPerSpecies: copies,
    p10: percentile(samples, 0.1),
    p50: percentile(samples, 0.5),
    p90: percentile(samples, 0.9),
    p99: percentile(samples, 0.99),
    mean: samples.reduce((a, b) => a + b, 0) / runs,
    meanCost: (samples.reduce((a, b) => a + b, 0) / runs) * EGGS[eggId].price,
  };
}
function arenaScenario(kills, mode, stage = 0) {
  const s = fixture("player");
  s.bossesKilled = kills;
  if (mode !== "none") {
    for (const id of Object.keys(SPECIES)) give(s, id, stage);
    a.equipBest(s, "combat", now);
  }
  if (mode === "boost") g.startBoost(s, now);
  g.startBoss(s, now);
  let result = null,
    taps = 0;
  for (let i = 0; i < 60 && s.boss; i++) {
    result = g.hitBoss(s, now + i * 500);
    taps++;
  }
  return {
    kills,
    mode,
    stage,
    taps,
    won: !!result?.won,
    elapsedSeconds: (taps - 1) / 2,
    reward: result?.won ? result.reward : 0,
    passivePps: g.getPps(s, Infinity),
  };
}
export function balanceReport() {
  const snapshots = Object.fromEntries(
    ["starter", "crystal", "celestial", "player", "late"].map((name) => [
      name,
      summary(fixture(name)),
    ]),
  );
  const teams = {};
  for (const mode of [
    "no-pet",
    "clicks",
    "production",
    "combat",
    "prestige",
    "capacity",
    "observed-boosted",
  ]) {
    const s = fixture("player");
    if (mode === "observed-boosted") {
      s.pets.equipped = [
        give(s, "dragao_galactico"),
        give(s, "guardiao_aurora"),
        give(s, "guardiao_aurora"),
      ];
      s.boostEndTime = now + 30000;
    } else if (mode !== "no-pet") {
      for (const id of Object.keys(SPECIES)) give(s, id);
      a.equipBest(s, mode, now);
    }
    teams[mode] = summary(s);
  }
  const species = Object.fromEntries(
    Object.entries(EGGS).flatMap(([eggId, e]) =>
      hatchTable(eggId).map((row) => [
        row.species.id,
        {
          egg: eggId,
          chance: row.percent / 100,
          firstExpectedCost: e.price / (row.percent / 100),
          stages: STAGES.map((stage) => ({
            name: stage.name,
            copies: stage.copies,
            expectedEggs: stage.copies / (row.percent / 100),
            expectedCost: (e.price * stage.copies) / (row.percent / 100),
          })),
        },
      ]),
    ),
  );
  const bosses = [0, 5, 10, 20, 40, 100, 1000].map((kills) => {
    const s = fixture("player");
    s.bossesKilled = kills;
    const hp = g.getBossMaxHp(s);
    return {
      kills,
      hp,
      secondsAt2Taps: hp / (2 * (g.getBossDamage || g.getClickPower)(s, now)),
      reward: g.getBossReward?.(s) || hp * 15,
    };
  });
  const s = fixture("player");
  s.pirulitos = 150e9;
  g.startWheel(s, now, () => 5.5 / 6);
  return {
    schema: d.SAVE_VERSION,
    model:
      "Controlled funded fixtures bought with real actions; no fixture playtime claim. Journeys use actual quotes/advance/Prestige, 2 clicks/s, alternate policies; casual credits at most 30s of clicks per 10-minute check-in as a conservative separate projection. Boost separate. No boss/wheel/events in factory journeys.",
    arena: [0, 10, 40, 100, 1000].flatMap((kills) => [
      arenaScenario(kills, "none"),
      arenaScenario(kills, "combat"),
      arenaScenario(kills, "boost"),
      arenaScenario(kills, "combat", 3),
    ]),
    collection: Object.fromEntries(
      Object.keys(EGGS).map((id) => [
        id,
        {
          normal: collectionMilestone(id, 1),
          giant: collectionMilestone(id, 125),
        },
      ]),
    ),
    snapshots,
    freshZeroClick: { pps: 0, stalled: true },
    teams,
    bosses,
    wheel50Reward: s.pendingWheel.amount,
    policies: Object.fromEntries(
      [0, 2].flatMap((cps) =>
        ["factories-first", "collector", "prestige", "arena", "casual"].map(
          (policy) => [`${policy}-${cps}cps`, journey(cps, policy)],
        ),
      ),
    ),
    species,
    rareMonteCarlo: {
      firstMythic: monteCarlo(0.01, 1),
      firstMythicFusion: monteCarlo(0.01, 5),
      mythicGiant: monteCarlo(0.01, 125),
      commonGiant: monteCarlo(0.3, 125),
    },
    observed421MPps: {
      pps: 42100000,
      eggs: Object.fromEntries(
        Object.entries(EGGS).map(([id, e]) => [
          id,
          {
            seconds: e.price / 42100000,
            batchSeconds: (3 * e.price) / 42100000,
            sustainable: 42100000 * 2.4 >= 3 * e.price,
          },
        ]),
      ),
    },
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(
    JSON.stringify(
      process.env.BALANCE_ROOT
        ? balanceReport()
        : {
            baselineCommit: "db03583",
            before: JSON.parse(
              readFileSync(
                new URL("../tests/fixtures/balance-v5.json", import.meta.url),
                "utf8",
              ),
            ),
            after: balanceReport(),
          },
      null,
      2,
    ),
  );
