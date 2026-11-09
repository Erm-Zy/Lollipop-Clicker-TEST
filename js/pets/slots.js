import { PET_SLOTS } from "./catalog.js";

export const PET_SLOT_COSTS = Object.freeze([25, 75]);
export const MAX_PET_SLOT_LEVEL = PET_SLOT_COSTS.length;
export function getEquippedPetSlotCapacity(state) {
  const level = state?.petSlotUpgradeLevel;
  return (
    PET_SLOTS +
    (Number.isInteger(level)
      ? Math.max(0, Math.min(MAX_PET_SLOT_LEVEL, level))
      : 0)
  );
}
export function getPetSlotCost(state) {
  const level = getEquippedPetSlotCapacity(state) - PET_SLOTS;
  return PET_SLOT_COSTS[level] ?? Infinity;
}
export const petSlotsSpent = (level) =>
  PET_SLOT_COSTS.slice(0, level).reduce((sum, cost) => sum + cost, 0);
