import { getPetBonuses } from "./pets/bonuses.js";
import { PRESTIGE_CONFIG, FACTORY_CAPACITIES, MAX_VALUE } from "./data.js";

export const getTotalUpgradesCount = (state) =>
  Object.values(state.upgrades).reduce((a, b) => a + b, 0);

const integer = (value, max = PRESTIGE_CONFIG.maxLevel) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.floor(value)))
    : 0;
export const getBasePrestigeMultiplier = (state) =>
  1 + integer(state.prestigeLevel) * PRESTIGE_CONFIG.baseBonusPerLevel;
export const getStellarMultiplier = (state) =>
  1 +
  integer(state.stellarBoostLevel, PRESTIGE_CONFIG.stellar.maxLevel) *
    PRESTIGE_CONFIG.stellar.bonusPerLevel;
export const getPrestigeMultiplier = (state) =>
  getBasePrestigeMultiplier(state) * getStellarMultiplier(state);
export const prestigeThreshold = (level) =>
  Math.min(MAX_VALUE, integer(level) ** 3 * PRESTIGE_CONFIG.thresholdScale);

export function getPrestigeTarget(state) {
  const total = Number.isFinite(state.totalEarned)
    ? Math.max(0, state.totalEarned)
    : 0;
  let level = integer(
    Math.floor(Math.cbrt(total / PRESTIGE_CONFIG.thresholdScale)),
  );
  // Correct cube-root rounding at exact milestones without changing the curve.
  while (level > 0 && prestigeThreshold(level) > total) level--;
  while (
    level < PRESTIGE_CONFIG.maxLevel &&
    prestigeThreshold(level + 1) <= total
  )
    level++;
  return level;
}
export function getPrestigeGain(state) {
  return Math.max(
    0,
    Math.min(
      getPrestigeTarget(state) - integer(state.prestigeClaimed),
      PRESTIGE_CONFIG.maxLevel -
        integer(state.prestigeLevel) -
        integer(state.prestigeBonusEarned),
    ),
  );
}
export function getPrestigeProgress(state) {
  const total = Math.min(
    MAX_VALUE,
    Math.max(0, Number.isFinite(state.totalEarned) ? state.totalEarned : 0),
  );
  const baseline = Math.min(
    total,
    Math.max(
      0,
      Number.isFinite(state.prestigeBaseline) ? state.prestigeBaseline : 0,
    ),
  );
  const claimed = integer(state.prestigeClaimed);
  const gain = getPrestigeGain(state);
  const atLimit =
    claimed >= PRESTIGE_CONFIG.maxLevel ||
    integer(state.prestigeLevel) + integer(state.prestigeBonusEarned) >=
      PRESTIGE_CONFIG.maxLevel;
  const nextLevel = Math.min(PRESTIGE_CONFIG.maxLevel, claimed + 1);
  const threshold = prestigeThreshold(nextLevel);
  const earned = Math.max(0, total - baseline);
  const required = Math.max(0, threshold - baseline);
  const remaining = atLimit ? 0 : Math.max(0, threshold - total);
  const fraction = atLimit
    ? 0
    : gain > 0
      ? 1
      : required > 0
        ? Math.min(1, earned / required)
        : 0;
  return {
    baseline,
    earned,
    required,
    remaining,
    nextLevel,
    threshold,
    gain,
    atLimit,
    percent: Math.max(0, fraction * 100),
  };
}
export function getPermanentFactoryCapacity(state, key) {
  if (!Object.hasOwn(FACTORY_CAPACITIES, key)) return 0;
  return (
    FACTORY_CAPACITIES[key] +
    integer(
      state.factoryExpansions?.[key],
      PRESTIGE_CONFIG.expansion.maxLevel,
    ) *
      PRESTIGE_CONFIG.expansion.slotsPerLevel
  );
}
export function getFactoryCapacity(state, key) {
  return (
    getPermanentFactoryCapacity(state, key) +
    (getPetBonuses(state).factoryCapacity[key] || 0)
  );
}
export function getActiveFactoryCount(state, key) {
  return Math.min(state.upgrades[key] || 0, getFactoryCapacity(state, key));
}
export function getPrestigeReward(state) {
  const base = getPrestigeGain(state),
    rate = getPetBonuses(state).prestigeReward;
  const room = Math.max(
    0,
    Number.MAX_SAFE_INTEGER -
      integer(state.prestigeLevel) -
      integer(state.prestigeBonusEarned) -
      base,
  );
  // Catalog PP coefficients/evolution are exact integral basis points. Integer
  // division avoids granting/losing a point through floating rounding near 2^53.
  const basisPoints = Math.round(rate * 10000);
  const bonus = Math.min(
    room,
    Number((BigInt(base) * BigInt(basisPoints)) / 10000n),
  );
  return { base, bonus, total: base + bonus, rate };
}
export function getStellarCost(state) {
  const level = integer(
    state.stellarBoostLevel,
    PRESTIGE_CONFIG.stellar.maxLevel,
  );
  return level >= PRESTIGE_CONFIG.stellar.maxLevel ? Infinity : level + 1;
}
export function getExpansionCost(state, key) {
  if (!Object.hasOwn(FACTORY_CAPACITIES, key)) return Infinity;
  const level = integer(
    state.factoryExpansions?.[key],
    PRESTIGE_CONFIG.expansion.maxLevel,
  );
  return level >= PRESTIGE_CONFIG.expansion.maxLevel
    ? Infinity
    : (level + 1) * PRESTIGE_CONFIG.expansion.costStep;
}
const stellarSpent = (level) => (level * (level + 1)) / 2;
const expansionSpent = (level) =>
  (level * (level + 1) * PRESTIGE_CONFIG.expansion.costStep) / 2;

/** Restore only upgrades supported by historical points; never invent unbounded currency. */
export function sanitizePermanentProgress(raw, prestigeLevel) {
  let budget =
    integer(prestigeLevel) +
    Math.min(
      integer(raw.prestigeBonusEarned),
      Math.floor(integer(prestigeLevel) * 0.25),
      Number.MAX_SAFE_INTEGER - integer(prestigeLevel),
    );
  let stellarBoostLevel = integer(
    raw.stellarBoostLevel,
    PRESTIGE_CONFIG.stellar.maxLevel,
  );
  while (stellarSpent(stellarBoostLevel) > budget) stellarBoostLevel--;
  budget -= stellarSpent(stellarBoostLevel);
  const factoryExpansions = {};
  const source =
    raw.factoryExpansions &&
    typeof raw.factoryExpansions === "object" &&
    !Array.isArray(raw.factoryExpansions)
      ? raw.factoryExpansions
      : {};
  for (const key of Object.keys(FACTORY_CAPACITIES)) {
    let level = integer(source[key], PRESTIGE_CONFIG.expansion.maxLevel);
    while (expansionSpent(level) > budget) level--;
    factoryExpansions[key] = level;
    budget -= expansionSpent(level);
  }
  return {
    stellarBoostLevel,
    factoryExpansions,
    prestigePoints: Math.min(budget, integer(raw.prestigePoints)),
  };
}
