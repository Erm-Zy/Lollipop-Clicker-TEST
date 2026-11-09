import {
  createState,
  getPps,
  getClickPower,
  getBossDamage,
  getPrestigeReward,
  buyPetSlot,
  prestige,
} from "../js/gameplay.js";
import { simulateJourney } from "./simulate-prestige.mjs";
import { getEquippedPetSlotCapacity } from "../js/pets/slots.js";
import { allocatePet } from "../js/pets/state.js";
import { equipBest } from "../js/pets/actions.js";
import { SPECIES, STRATEGIES } from "../js/pets/catalog.js";
import { performance } from "node:perf_hooks";
const now = 1800000000000;
function fixture(level, count = 72, early = false) {
  const s = createState(now);
  Object.assign(s, {
    prestigeLevel: level,
    prestigeClaimed: level,
    prestigePoints: level,
    totalEarned: (level + 10) ** 3 * 1e6,
    pirulitos: early ? 1e7 : 1e11,
  });
  for (const key of Object.keys(s.upgrades))
    s.upgrades[key] = early
      ? ["maquina", "calda", "fabrica"].includes(key)
        ? 12
        : 0
      : key === "superfabrica"
        ? 24
        : 12;
  const species = Object.keys(SPECIES).filter(
    (id) => !early || SPECIES[id].egg === "acucarado",
  );
  for (let i = 0; i < count; i++) {
    const a = allocatePet(
      s.pets,
      species[i % species.length],
      early ? 0 : Math.floor(i / 18) % 4,
      now + i,
    );
    s.pets.nextId = a.nextId;
    s.pets.inventory.push(a.pet);
  }
  return s;
}
const economy = [];
for (const [stage, level] of [
  ["early", 25],
  ["mid", 100],
  ["late", 1090],
]) {
  const s = fixture(level, stage === "early" ? 18 : 72, stage === "early");
  for (let n = 0; n < 3; n++) {
    if (n && !buyPetSlot(s, now)) break;
    equipBest(s, "production", now);
    economy.push({
      stage,
      historicalLevel: level,
      slots: getEquippedPetSlotCapacity(s),
      points: s.prestigePoints,
      pps: getPps(s, now),
      click: getClickPower(s, now),
      bossDamage: getBossDamage(s, now),
      prestige: getPrestigeReward(s),
    });
  }
}
const benchmark = [];
const journeyState = createState(now),
  journey = [];
for (const target of [1, 3, 10, 25, 60, 100]) {
  const trip = simulateJourney(journeyState, target);
  prestige(journeyState, journeyState.lastTick);
  const purchase = buyPetSlot(journeyState, journeyState.lastTick);
  journey.push({
    target,
    seconds: trip.seconds,
    points: journeyState.prestigePoints,
    slots: getEquippedPetSlotCapacity(journeyState),
    purchase: purchase || null,
  });
}
for (const slots of [3, 4, 5])
  for (const strategy of Object.keys(STRATEGIES)) {
    const s = fixture(1090, 500);
    for (let n = 3; n < slots; n++) buyPetSlot(s, now);
    const times = [];
    let ids;
    for (let i = 0; i < 5; i++) {
      const started = performance.now();
      equipBest(s, strategy, now);
      times.push(performance.now() - started);
      const current = s.pets.equipped.join(",");
      if (ids && ids !== current) throw Error("Unstable optimizer tie");
      ids = current;
    }
    benchmark.push({
      slots,
      strategy,
      inventory: 500,
      medianMs: times.sort((a, b) => a - b)[2],
      maxMs: Math.max(...times),
      distinctIds: new Set(s.pets.equipped).size,
    });
  }
console.log(
  JSON.stringify(
    {
      model:
        "Funded controlled snapshots, not time-to-acquire predictions. Early has only Normal species; mid/late all stages. Costs 25/75 PP; no coefficient changes; PP pet cap 25%. 500-instance Node timings on this executor; no phone/FPS claim. Exact 3 slots, small 4/5 exact <=150k combinations; larger 4/5 deterministic beam96.",
      economy,
      journey,
      benchmark,
    },
    null,
    2,
  ),
);
