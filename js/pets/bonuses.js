import { SPECIES, STAGES, PET_SLOTS } from "./catalog.js";

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
    ? { click: species.click * stage.power, pps: species.pps * stage.power }
    : { click: 0, pps: 0 };
}
/** Add pet coefficients, then multiply the authoritative getter once.
 * The fixed catalog/stages/three slots bound each multiplier to [1,17.8]. */
export function getPetBonuses(state) {
  const pets = state.pets;
  if (!Array.isArray(pets?.inventory) || !Array.isArray(pets?.equipped))
    return { click: 0, pps: 0, clickMultiplier: 1, ppsMultiplier: 1 };
  const index = inventoryIndex(pets.inventory);
  let click = 0,
    pps = 0;
  for (const id of [...new Set(pets.equipped)].slice(0, PET_SLOTS)) {
    const power = petPower(index.get(id));
    click += power.click;
    pps += power.pps;
  }
  return { click, pps, clickMultiplier: 1 + click, ppsMultiplier: 1 + pps };
}
const compareId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function bestTeam(pets, strategy = "balanced") {
  const score = (pet) => {
    const power = petPower(pet);
    return strategy === "production"
      ? [power.pps, power.click]
      : strategy === "clicks"
        ? [power.click, power.pps]
        : [power.click + power.pps, Math.min(power.click, power.pps)];
  };
  return [...pets.inventory]
    .sort((a, b) => {
      const x = score(a),
        y = score(b);
      return (
        y[0] - x[0] ||
        y[1] - x[1] ||
        a.acquiredAt - b.acquiredAt ||
        compareId(a.id, b.id)
      );
    })
    .slice(0, PET_SLOTS)
    .map((pet) => pet.id);
}
