import {
  EGGS,
  SPECIES,
  STAGES,
  STRATEGIES,
  PET_SLOTS,
  DISCOVERIES,
  discoveryKey,
  PRESET_NAMES,
} from "./catalog.js";
import { getWorldStage } from "../world.js";

const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const counter = (value) =>
  Number.isFinite(value) && value >= 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))
    : 0;
const timestamp = (value, now) =>
  Number.isFinite(value) && value >= 0
    ? Math.min(value, 8640000000000000)
    : now;
export class PetDataError extends Error {
  constructor() {
    super(
      "Há pets com dados desconhecidos ou inválidos. O save foi protegido para exportação; nenhum original será apagado.",
    );
    this.name = "PetDataError";
  }
}
export function createPetState() {
  return {
    inventory: [],
    equipped: [],
    discovered: [],
    unlockedEggs: ["acucarado"],
    nextId: 1,
    strategy: "balanced",
    reserveNormals: 0,
    presets: Object.fromEntries(
      Object.keys(PRESET_NAMES).map((id) => [id, []]),
    ),
    lastHatchAt: 0,
    lastRequestId: "",
    autoFusionEnabled: false,
    autoFusionStats: { runs: 0, fusions: 0, lastAt: 0, lastRequestId: "" },
    stats: {
      hatched: 0,
      fused: 0,
      spent: 0,
      byEgg: Object.fromEntries(Object.keys(EGGS).map((id) => [id, 0])),
    },
  };
}
export function syncEggUnlocks(state) {
  const stage = getWorldStage(state);
  const unlocked = new Set(state.pets.unlockedEggs);
  for (const [id, egg] of Object.entries(EGGS))
    if (
      stage >= egg.unlockStage &&
      (!egg.requiredFactory ||
        (state.upgrades[egg.requiredFactory] >= egg.requiredCount &&
          state.prestigeLevel >= egg.requiredPrestige))
    )
      unlocked.add(id);
  const result = Object.keys(EGGS).filter((id) => unlocked.has(id));
  if (result.join() !== state.pets.unlockedEggs.join())
    state.pets.unlockedEggs = result;
}
export function normalizePets(raw, now, capacity = PET_SLOTS) {
  const pets = createPetState();
  if (raw === undefined || raw === null) return { pets, invalid: false };
  if (!record(raw)) return { pets, invalid: true };
  let invalid =
    raw.reserveNormals !== undefined &&
    (!Number.isInteger(raw.reserveNormals) ||
      raw.reserveNormals < 0 ||
      raw.reserveNormals > 125);
  invalid ||=
    raw.autoFusionEnabled !== undefined &&
    typeof raw.autoFusionEnabled !== "boolean";
  pets.autoFusionEnabled = raw.autoFusionEnabled === true;
  pets.autoFusionStats = {
    runs: counter(raw.autoFusionStats?.runs),
    fusions: counter(raw.autoFusionStats?.fusions),
    lastAt: timestamp(raw.autoFusionStats?.lastAt, 0),
    lastRequestId:
      typeof raw.autoFusionStats?.lastRequestId === "string"
        ? raw.autoFusionStats.lastRequestId.slice(0, 96)
        : "",
  };
  invalid ||= raw.inventory !== undefined && !Array.isArray(raw.inventory);
  const inventory = Array.isArray(raw.inventory) ? raw.inventory : [];
  const reserved = new Set(
    inventory
      .filter(record)
      .map((pet) => pet.id)
      .filter((id) => typeof id === "string"),
  );
  let next = Math.max(1, counter(raw.nextId));
  for (const id of reserved) {
    const match = /^pet-(\d+)$/.exec(id);
    const serial = match ? Number(match[1]) : 0;
    if (Number.isSafeInteger(serial) && serial < Number.MAX_SAFE_INTEGER)
      next = Math.max(next, serial + 1);
  }
  const used = new Set();
  for (const pet of inventory) {
    if (
      !record(pet) ||
      typeof pet.speciesId !== "string" ||
      !Object.hasOwn(SPECIES, pet.speciesId) ||
      !Number.isInteger(pet.stage) ||
      !STAGES[pet.stage]
    ) {
      invalid = true;
      continue;
    }
    // Unknown protection flags must not silently turn a protected copy consumable.
    if (
      [pet.favorite, pet.locked].some(
        (value) => value !== undefined && typeof value !== "boolean",
      )
    )
      invalid = true;
    let id = pet.id;
    if (
      typeof id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,96}$/.test(id) ||
      used.has(id)
    ) {
      while (
        next < Number.MAX_SAFE_INTEGER &&
        (reserved.has(`pet-${next}`) || used.has(`pet-${next}`))
      )
        next++;
      if (!Number.isSafeInteger(next) || next >= Number.MAX_SAFE_INTEGER) {
        invalid = true;
        continue;
      }
      id = `pet-${next++}`;
    }
    used.add(id);
    pets.inventory.push({
      id,
      speciesId: pet.speciesId,
      stage: pet.stage,
      acquiredAt: timestamp(pet.acquiredAt, now),
      favorite: pet.favorite === true,
      locked: pet.locked === true,
    });
  }
  pets.nextId = Math.min(Number.MAX_SAFE_INTEGER, next);
  pets.equipped = [
    ...new Set(
      Array.isArray(raw.equipped)
        ? raw.equipped.filter((id) => used.has(id))
        : [],
    ),
  ].slice(0, capacity);
  pets.discovered = DISCOVERIES.filter(
    (key) => Array.isArray(raw.discovered) && raw.discovered.includes(key),
  );
  const discovered = new Set(pets.discovered);
  for (const pet of pets.inventory)
    discovered.add(discoveryKey(pet.speciesId, pet.stage));
  pets.discovered = DISCOVERIES.filter((key) => discovered.has(key));
  const unlocked = new Set(
    Array.isArray(raw.unlockedEggs) ? raw.unlockedEggs : [],
  );
  for (const key of pets.discovered)
    unlocked.add(SPECIES[key.split(":")[0]].egg);
  pets.unlockedEggs = Object.keys(EGGS).filter(
    (id) => id === "acucarado" || unlocked.has(id),
  );
  if (
    typeof raw.strategy === "string" &&
    Object.hasOwn(STRATEGIES, raw.strategy)
  )
    pets.strategy = raw.strategy;
  pets.reserveNormals = Math.min(125, counter(raw.reserveNormals));
  for (const name of Object.keys(PRESET_NAMES))
    pets.presets[name] = [
      ...new Set(
        Array.isArray(raw.presets?.[name])
          ? raw.presets[name].filter((id) => used.has(id))
          : [],
      ),
    ].slice(0, capacity);
  pets.lastHatchAt = timestamp(raw.lastHatchAt, 0);
  pets.lastRequestId =
    typeof raw.lastRequestId === "string" ? raw.lastRequestId.slice(0, 96) : "";
  const stats = record(raw.stats) ? raw.stats : {};
  pets.stats.hatched = counter(stats.hatched);
  pets.stats.fused = counter(stats.fused);
  pets.stats.spent =
    Number.isFinite(stats.spent) && stats.spent >= 0
      ? Math.min(stats.spent, 1e100)
      : 0;
  for (const id of Object.keys(EGGS))
    pets.stats.byEgg[id] = counter(stats.byEgg?.[id]);
  // Preserve all valid instances even in an over-capacity import. Further hatches stop.
  return { pets, invalid };
}
export function allocatePet(pets, speciesId, stage, now) {
  let serial = pets.nextId;
  const ids = new Set(pets.inventory.map((pet) => pet.id));
  while (serial < Number.MAX_SAFE_INTEGER && ids.has(`pet-${serial}`)) serial++;
  if (!Number.isSafeInteger(serial) || serial >= Number.MAX_SAFE_INTEGER)
    return null;
  return {
    pet: {
      id: `pet-${serial}`,
      speciesId,
      stage,
      acquiredAt: now,
      favorite: false,
      locked: false,
    },
    nextId: serial + 1,
  };
}
