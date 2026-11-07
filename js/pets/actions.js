import { advance, getPps } from "../gameplay.js";
import { getWorldStage } from "../world.js";
import {
  EGGS,
  SPECIES,
  STRATEGIES,
  PET_CAPACITY,
  PET_SLOTS,
  DISCOVERIES,
  HATCH_GAP_MS,
  rollSpecies,
  discoveryKey,
} from "./catalog.js";
import { allocatePet } from "./state.js";
import { bestTeam } from "./bonuses.js";
import { fusionQuote } from "./evolution.js";

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
    getWorldStage(state) < egg.unlockStage
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
      `Faltam ${Math.ceil(cost - state.pirulitos).toLocaleString("pt-BR")} pirulitos.`,
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
    ids.length > PET_SLOTS ||
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
  const ids = bestTeam(state.pets, strategy);
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
