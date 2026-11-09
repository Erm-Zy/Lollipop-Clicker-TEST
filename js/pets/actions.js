import { cost as formatCost } from "../format.js";
import {
  advance,
  getPps,
  getBossDamage,
  getPrestigeReward,
} from "../gameplay.js";
import { getWorldStage } from "../world.js";
import {
  EGGS,
  SPECIES,
  STRATEGIES,
  PET_CAPACITY,
  PRESET_NAMES,
  DISCOVERIES,
  HATCH_GAP_MS,
  rollSpecies,
  discoveryKey,
} from "./catalog.js";
import { allocatePet } from "./state.js";
import { bestTeam } from "./bonuses.js";
import { getEquippedPetSlotCapacity } from "./slots.js";
import { batchFusionQuote, fusionQuote } from "./evolution.js";

const increment = (value, amount = 1) =>
  Math.min(Number.MAX_SAFE_INTEGER, value + amount);
export function eggQuote(state, eggId, count = 1, now = Date.now()) {
  const egg =
    typeof eggId === "string" && Object.hasOwn(EGGS, eggId)
      ? EGGS[eggId]
      : null;
  const fail = (reason) => ({
    ok: false,
    reason,
    cost: egg && Number.isInteger(count) ? egg.price * count : Infinity,
  });
  if (!egg || ![1, 2, 3].includes(count))
    return fail("Escolha um ovo e um lote de ×1, ×2 ou ×3.");
  if (
    !state.pets.unlockedEggs.includes(eggId) &&
    (getWorldStage(state) < egg.unlockStage ||
      (egg.requiredFactory &&
        (state.upgrades[egg.requiredFactory] < egg.requiredCount ||
          state.prestigeLevel < egg.requiredPrestige)))
  )
    return fail("Este ovo ainda está bloqueado.");
  if (state.pets.inventory.length + count > PET_CAPACITY)
    return fail(`Não há espaço para o lote inteiro (${count} pets).`);
  if (state.pets.nextId > Number.MAX_SAFE_INTEGER - count)
    return fail(
      "Limite técnico de identificadores alcançado. Exporte o save nos Ajustes.",
    );
  if (
    state.pets.stats.hatched > 0 &&
    Math.max(now, state.lastTick) - state.pets.lastHatchAt < HATCH_GAP_MS
  )
    return fail("Aguarde um instante antes de abrir outro lote.");
  const cost = egg.price * count;
  if (state.pirulitos < cost)
    return fail(
      `Faltam ${formatCost(Math.ceil(cost - state.pirulitos))} pirulitos.`,
    );
  return { ok: true, cost, egg, count };
}
/** Reward selection, IDs, debit and discovery are committed by one runtime transaction. */
export function hatchPets(
  state,
  eggId,
  count = 1,
  now = Date.now(),
  { random = Math.random, requestId = "" } = {},
) {
  advance(state, now);
  const quote = eggQuote(state, eggId, count, now);
  if (!quote.ok || (requestId && requestId === state.pets.lastRequestId))
    return false;
  if (typeof requestId !== "string" || requestId.length > 96) return false;
  const species = Array.from({ length: count }, () =>
    rollSpecies(eggId, random),
  );
  if (species.some((id) => !id)) return false;
  const proposed = { ...state.pets, inventory: [...state.pets.inventory] };
  const received = [];
  for (const speciesId of species) {
    const allocated = allocatePet(proposed, speciesId, 0, state.lastTick);
    if (!allocated) return false;
    proposed.nextId = allocated.nextId;
    proposed.inventory.push(allocated.pet);
    received.push(allocated.pet);
  }
  state.pirulitos -= quote.cost;
  state.pets.inventory = proposed.inventory;
  state.pets.nextId = proposed.nextId;
  const found = new Set([
    ...state.pets.discovered,
    ...received.map((pet) => discoveryKey(pet.speciesId, 0)),
  ]);
  state.pets.discovered = DISCOVERIES.filter((key) => found.has(key));
  state.pets.lastHatchAt = state.lastTick;
  state.pets.lastRequestId = requestId;
  state.pets.stats.hatched = increment(state.pets.stats.hatched, count);
  state.pets.stats.byEgg[eggId] = increment(
    state.pets.stats.byEgg[eggId],
    count,
  );
  state.pets.stats.spent = Math.min(1e100, state.pets.stats.spent + quote.cost);
  return { received, cost: quote.cost, eggId };
}
export function setTeam(state, ids, now = Date.now()) {
  if (
    !Array.isArray(ids) ||
    ids.length > getEquippedPetSlotCapacity(state) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !state.pets.inventory.some((pet) => pet.id === id))
  )
    return false;
  if (ids.join("/") === state.pets.equipped.join("/")) return false;
  advance(state, now); // Integrate the old team before applying the new multiplier.
  state.pets.equipped = [...ids];
  state.maxPps = Math.max(state.maxPps, getPps(state, now));
  return true;
}
export function equipPet(state, id, now = Date.now()) {
  if (state.pets.equipped.includes(id)) return false;
  return setTeam(state, [...state.pets.equipped, id], now);
}
export function unequipPet(state, id, now = Date.now()) {
  if (!state.pets.equipped.includes(id)) return false;
  return setTeam(
    state,
    state.pets.equipped.filter((other) => other !== id),
    now,
  );
}
export function equipBest(
  state,
  strategy = state.pets.strategy,
  now = Date.now(),
) {
  if (typeof strategy !== "string" || !Object.hasOwn(STRATEGIES, strategy))
    return false;
  // Resolve income and pending wheel rewards before scoring the new team.
  advance(state, now);
  // Inject authoritative nonlinear objectives without a gameplay -> bonus -> gameplay cycle.
  const evaluateTeam = ["combat", "prestige"].includes(strategy)
    ? (ids) => {
        const projection = { ...state, pets: { ...state.pets, equipped: ids } };
        if (strategy === "combat") return getBossDamage(projection, now);
        const reward = getPrestigeReward(projection);
        return reward.base > 0 ? reward.bonus : reward.rate;
      }
    : null;
  const ids = bestTeam(state.pets, strategy, state, evaluateTeam);
  if (!ids.length) return false;
  const changed = setTeam(state, ids, now);
  if (state.pets.strategy === strategy && !changed) return false;
  state.pets.strategy = strategy;
  return { ids, strategy };
}
export function setStrategy(state, strategy) {
  if (
    typeof strategy !== "string" ||
    !Object.hasOwn(STRATEGIES, strategy) ||
    state.pets.strategy === strategy
  )
    return false;
  state.pets.strategy = strategy;
  return true;
}
export function togglePetFlag(state, id, flag) {
  if (!["favorite", "locked"].includes(flag)) return false;
  const pet = state.pets.inventory.find((item) => item.id === id);
  if (!pet) return false;
  state.pets.inventory = state.pets.inventory.map((item) =>
    item.id === id ? { ...item, [flag]: !item[flag] } : item,
  );
  return true;
}
export function fusePets(
  state,
  ids,
  now = Date.now(),
  { allowEquipped = false } = {},
) {
  const quote = fusionQuote(state.pets, ids);
  if (!quote.ok || (quote.consumesEquipped && !allowEquipped)) return false;
  const allocated = allocatePet(
    state.pets,
    quote.species.id,
    quote.nextStage,
    Math.max(now, state.lastTick),
  );
  if (!allocated) return false;
  advance(state, now);
  const consumed = new Set(ids);
  state.pets.inventory = [
    ...state.pets.inventory.filter((pet) => !consumed.has(pet.id)),
    allocated.pet,
  ];
  state.pets.equipped = state.pets.equipped.filter((id) => !consumed.has(id));
  state.pets.nextId = allocated.nextId;
  const found = new Set([
    ...state.pets.discovered,
    discoveryKey(quote.species.id, quote.nextStage),
  ]);
  state.pets.discovered = DISCOVERIES.filter((key) => found.has(key));
  state.pets.stats.fused = increment(state.pets.stats.fused);
  return allocated.pet;
}

export function replacePet(state, id, replacedId, now = Date.now()) {
  if (
    state.pets.equipped.includes(id) ||
    !state.pets.equipped.includes(replacedId)
  )
    return false;
  return setTeam(
    state,
    state.pets.equipped.map((old) => (old === replacedId ? id : old)),
    now,
  );
}
export function savePreset(state, name) {
  if (!Object.hasOwn(PRESET_NAMES, name)) return false;
  state.pets.presets = {
    ...state.pets.presets,
    [name]: [...state.pets.equipped],
  };
  return true;
}
export function equipPreset(state, name, now = Date.now()) {
  if (!Object.hasOwn(PRESET_NAMES, name)) return false;
  const ids = state.pets.presets[name].filter((id) =>
    state.pets.inventory.some((p) => p.id === id),
  );
  return setTeam(state, ids, now);
}
export function setReserve(state, count) {
  if (!Number.isInteger(count) || count < 0 || count > 125) return false;
  state.pets.reserveNormals = count;
  return true;
}
export function fuseBatch(
  state,
  options,
  now = Date.now(),
  expectedSignature = null,
) {
  const quote = batchFusionQuote(state.pets, options);
  if (!quote.ok || !expectedSignature || quote.signature !== expectedSignature)
    return false;
  advance(state, now);
  const oldIds = new Set(state.pets.inventory.map((p) => p.id));
  state.pets.inventory = quote.inventory.map((p) =>
    oldIds.has(p.id) ? p : { ...p, acquiredAt: state.lastTick },
  );
  state.pets.nextId = quote.nextId;
  const valid = new Set(quote.inventory.map((p) => p.id));
  state.pets.equipped = state.pets.equipped.filter((id) => valid.has(id));
  const found = new Set(state.pets.discovered);
  for (const operation of quote.operations)
    found.add(discoveryKey(operation.output.speciesId, operation.output.stage));
  state.pets.discovered = DISCOVERIES.filter((key) => found.has(key));
  state.pets.stats.fused = increment(
    state.pets.stats.fused,
    quote.operations.length,
  );
  return {
    consumed: quote.consumed.length,
    created: quote.outputs.length,
    fusions: quote.operations.length,
  };
}
/** No rewards for releasing; exact protected/reserved IDs must be explicitly confirmed. */
export function releasePets(state, ids, now = Date.now()) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length)
    return false;
  const consumed = state.pets.inventory.filter((p) => ids.includes(p.id));
  if (
    consumed.length !== ids.length ||
    consumed.some(
      (p) => p.favorite || p.locked || state.pets.equipped.includes(p.id),
    )
  )
    return false;
  for (const species of new Set(
    consumed.filter((p) => p.stage === 0).map((p) => p.speciesId),
  )) {
    const remaining = state.pets.inventory.filter(
      (p) => p.speciesId === species && p.stage === 0 && !ids.includes(p.id),
    ).length;
    if (remaining < state.pets.reserveNormals) return false;
  }
  advance(state, now);
  state.pets.inventory = state.pets.inventory.filter(
    (p) => !ids.includes(p.id),
  );
  return { released: consumed.length };
}
