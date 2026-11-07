import {
  SPECIES,
  STAGES,
  PET_SLOTS,
  PRESTIGE_PET_CAP,
  PRESTIGE_STAGE_POWER,
  CAPACITY_STAGE_POWER,
} from "./catalog.js";
import { FACTORY_CAPACITIES, PRESTIGE_CONFIG, UPGRADES_DATA } from "../data.js";
const indices = new WeakMap();
function inventoryIndex(inventory) {
  let cached = indices.get(inventory);
  if (!cached || cached.size !== inventory.length) {
    cached = new Map(inventory.map((pet) => [pet.id, pet]));
    indices.set(inventory, cached);
  }
  return cached;
}
export function petPower(pet) {
  const species =
    typeof pet?.speciesId === "string" && Object.hasOwn(SPECIES, pet.speciesId)
      ? SPECIES[pet.speciesId]
      : null;
  const stage = Number.isInteger(pet?.stage) ? STAGES[pet.stage] : null;
  return species && stage
    ? {
        click: species.click * stage.power,
        pps: species.pps * stage.power,
        bossDamage: species.bossDamage * stage.power,
        prestigeReward:
          species.prestigeReward * PRESTIGE_STAGE_POWER[pet.stage],
        factoryCapacity: Object.fromEntries(
          Object.entries(species.factoryCapacity).map(([key, slots]) => [
            key,
            slots * CAPACITY_STAGE_POWER[pet.stage],
          ]),
        ),
      }
    : {
        click: 0,
        pps: 0,
        bossDamage: 0,
        prestigeReward: 0,
        factoryCapacity: {},
      };
}
export function sumPowers(powers) {
  const result = {
    click: 0,
    pps: 0,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {},
  };
  for (const power of powers) {
    for (const channel of ["click", "pps", "bossDamage", "prestigeReward"])
      result[channel] += power[channel];
    for (const [key, slots] of Object.entries(power.factoryCapacity))
      result.factoryCapacity[key] = (result.factoryCapacity[key] || 0) + slots;
  }
  result.prestigeReward = Math.min(PRESTIGE_PET_CAP, result.prestigeReward);
  return {
    ...result,
    clickMultiplier: 1 + result.click,
    ppsMultiplier: 1 + result.pps,
    bossMultiplier: 1 + result.bossDamage,
  };
}
/** Only equipped owned IDs contribute; additive channels are applied once by each getter. */
export function getPetBonuses(state) {
  const pets = state.pets;
  if (!Array.isArray(pets?.inventory) || !Array.isArray(pets?.equipped))
    return sumPowers([]);
  const index = inventoryIndex(pets.inventory);
  return sumPowers(
    [...new Set(pets.equipped)]
      .slice(0, PET_SLOTS)
      .map((id) => petPower(index.get(id))),
  );
}
const stable = (a, b) =>
  a.acquiredAt - b.acquiredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/** Exact search over power-equivalent groups (at most 18*4*3 candidates).
 * Three identical candidates suffice for three slots. No rarity proxy; production
 * includes capacity activation and prestige includes its shared saturation cap. */
export function bestTeam(
  pets,
  strategy = "balanced",
  state = null,
  evaluateTeam = null,
) {
  const seen = new Map();
  let candidates = [...pets.inventory]
    .sort(stable)
    .filter((pet) => {
      const key = pet.speciesId + ":" + pet.stage,
        n = seen.get(key) || 0;
      seen.set(key, n + 1);
      return n < PET_SLOTS;
    })
    .map((pet) => ({ pet, power: petPower(pet) }));
  if (!candidates.length) return [];
  const capacityScore = (p) =>
    Object.entries(p.factoryCapacity).reduce(
      (n, [key, slots]) => n + slots * UPGRADES_DATA[key].basePps,
      0,
    );
  if (["clicks", "combat", "capacity"].includes(strategy) && !evaluateTeam) {
    const channel =
      strategy === "clicks"
        ? "click"
        : strategy === "combat"
          ? "bossDamage"
          : null;
    return candidates
      .sort(
        (a, b) =>
          (channel
            ? b.power[channel] - a.power[channel]
            : capacityScore(b.power) - capacityScore(a.power)) ||
          b.power.pps - a.power.pps ||
          stable(a.pet, b.pet),
      )
      .slice(0, PET_SLOTS)
      .map((x) => x.pet.id);
  }
  // Three component-wise dominators guarantee an unused replacement for any
  // three-slot team. Pruning preserves the exact optimum and its stable ties.
  const relevantCapacity =
    state && strategy !== "prestige"
      ? Object.keys(FACTORY_CAPACITIES).filter(
          (key) =>
            state.upgrades[key] >
            FACTORY_CAPACITIES[key] +
              (state.factoryExpansions[key] || 0) *
                PRESTIGE_CONFIG.expansion.slotsPerLevel,
        )
      : [];
  candidates = candidates.filter((candidate, index, all) => {
    let count = 0;
    for (let other = 0; other < all.length; other++) {
      if (other === index) continue;
      const a = all[other].power,
        b = candidate.power;
      const channels =
        strategy === "prestige"
          ? ["prestigeReward", "pps"]
          : strategy === "combat"
            ? ["bossDamage", "pps"]
            : ["pps", "click"];
      if (
        channels.some((key) => a[key] < b[key]) ||
        relevantCapacity.some(
          (key) =>
            (a.factoryCapacity[key] || 0) < (b.factoryCapacity[key] || 0),
        )
      )
        continue;
      const strict = channels.some((key) => a[key] > b[key]);
      // Saturation in the PP channel can erase a strict edge, so retain earlier ties.
      if (
        (strategy !== "prestige" && strict) ||
        stable(all[other].pet, candidate.pet) < 0
      )
        if (++count >= PET_SLOTS) return false;
    }
    return true;
  });
  const factoryKeys = Object.keys(FACTORY_CAPACITIES);
  const permanent = factoryKeys.map(
    (key) =>
      FACTORY_CAPACITIES[key] +
      (state?.factoryExpansions?.[key] || 0) *
        PRESTIGE_CONFIG.expansion.slotsPerLevel,
  );
  const base = state
    ? factoryKeys.reduce(
        (n, key, i) =>
          n +
          Math.min(state.upgrades[key], permanent[i]) *
            UPGRADES_DATA[key].basePps,
        0,
      )
    : 1;
  const score = (team) => {
    let click = 0,
      pps = 0,
      boss = 0,
      prestige = 0,
      capacity = 0,
      active = 0;
    for (const item of team) {
      const p = item.power;
      click += p.click;
      pps += p.pps;
      boss += p.bossDamage;
      prestige += p.prestigeReward;
    }
    if (
      strategy === "production" ||
      strategy === "balanced" ||
      strategy === "capacity"
    ) {
      for (let i = 0; i < factoryKeys.length; i++) {
        const key = factoryKeys[i],
          slots = team.reduce(
            (n, c) => n + (c.power.factoryCapacity[key] || 0),
            0,
          );
        capacity += slots * UPGRADES_DATA[key].basePps;
        if (state)
          active +=
            Math.min(state.upgrades[key], permanent[i] + slots) *
            UPGRADES_DATA[key].basePps;
      }
    }
    const production =
      (state ? (base > 0 ? active / base : 1) : 1) * (1 + pps) - 1;
    if (strategy === "production") return [production, click];
    if (strategy === "clicks") return [click, pps];
    if (strategy === "combat")
      return [
        evaluateTeam ? evaluateTeam(team.map((item) => item.pet.id)) : boss,
        pps,
      ];
    if (strategy === "prestige")
      return [
        evaluateTeam
          ? evaluateTeam(team.map((item) => item.pet.id))
          : Math.min(PRESTIGE_PET_CAP, prestige),
        pps,
      ];
    if (strategy === "capacity") return [capacity, pps];
    return [production + click, Math.min(production, click)];
  };
  let best = [],
    bestScore = [-Infinity, -Infinity];
  const consider = (team) => {
    const x = score(team);
    if (
      x[0] > bestScore[0] + 1e-12 ||
      (Math.abs(x[0] - bestScore[0]) <= 1e-12 && x[1] > bestScore[1] + 1e-12)
    ) {
      best = team;
      bestScore = x;
    }
  };
  const count = Math.min(PET_SLOTS, candidates.length);
  for (let a = 0; a < candidates.length; a++) {
    if (count === 1) {
      consider([candidates[a]]);
      continue;
    }
    for (let b = a + 1; b < candidates.length; b++) {
      if (count === 2) {
        consider([candidates[a], candidates[b]]);
        continue;
      }
      for (let c = b + 1; c < candidates.length; c++)
        consider([candidates[a], candidates[b], candidates[c]]);
    }
  }
  return best.map((item) => item.pet.id);
}
