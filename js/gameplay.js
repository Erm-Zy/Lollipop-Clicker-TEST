import { createPetState, syncEggUnlocks } from "./pets/state.js";
import { getPetBonuses } from "./pets/bonuses.js";
import { getPetSlotCost, getEquippedPetSlotCapacity } from "./pets/slots.js";
import { getTotalUpgradesCount } from "./progression.js";
export { getTotalUpgradesCount } from "./progression.js";
import {
  getPrestigeTarget,
  getPrestigeGain,
  getPrestigeMultiplier,
  getFactoryCapacity,
  getPermanentFactoryCapacity,
  getActiveFactoryCount,
  getPrestigeReward,
  getStellarCost,
  getExpansionCost,
} from "./progression.js";
export {
  getPrestigeTarget,
  getPrestigeGain,
  getPrestigeMultiplier,
  getFactoryCapacity,
  getPrestigeProgress,
  getBasePrestigeMultiplier,
  getStellarMultiplier,
  getStellarCost,
  getExpansionCost,
  getPermanentFactoryCapacity,
  getActiveFactoryCount,
  getPrestigeReward,
} from "./progression.js";
import {
  UPGRADES_DATA,
  FLAVORS_DATA,
  SKINS_DATA,
  ACHIEVEMENTS_DATA,
  WHEEL_REWARDS,
  SAVE_VERSION,
  MAX_VALUE,
  WHEEL_COOLDOWN_MS,
  WHEEL_DURATION_MS,
  BOOST_DURATION_MS,
  BOOST_COOLDOWN_MS,
  BOSS_DURATION_MS,
  BOSS_COOLDOWN_MS,
  SUGAR_EVENT_INTERVAL_MS,
  SUGAR_EVENT_DURATION_MS,
  OFFLINE_CAP_MS,
} from "./data.js";

export function createState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    pets: createPetState(),
    pirulitos: 0,
    totalEarned: 0,
    totalClicks: 0,
    prestigeLevel: 0,
    prestigeClaimed: 0,
    prestigePoints: 0,
    prestigeBonusEarned: 0,
    prestigeBaseline: 0,
    stellarBoostLevel: 0,
    petSlotUpgradeLevel: 0,
    factoryExpansions: Object.fromEntries(
      Object.keys(UPGRADES_DATA).map((key) => [key, 0]),
    ),
    activeFlavor: "morango",
    activeSkin: "classic",
    activeTheme: "classic",
    activeParticles: "classic",
    upgrades: Object.fromEntries(
      Object.keys(UPGRADES_DATA).map((key) => [key, 0]),
    ),
    unlockedFlavors: ["morango", "limao", "blueberry"],
    unlockedSkins: ["classic"],
    unlockedAchievements: [],
    bossesKilled: 0,
    bossCooldownUntil: 0,
    nextEventAt: now + SUGAR_EVENT_INTERVAL_MS,
    sugarEvent: null,
    sugarEventsClaimed: 0,
    wheelSpins: 0,
    lastWheelTime: 0,
    pendingWheel: null,
    lastWheelReward: null,
    boostEndTime: 0,
    lastBoostTime: 0,
    boostsObtained: 0,
    wheelClickBonus: 0,
    boss: null,
    timePlayed: 0,
    maxScore: 0,
    maxPps: 0,
    lastTick: now,
    savedAt: now,
    settings: {
      music: true,
      sfx: true,
      particles: true,
      animations: true,
      reducedMotion: false,
    },
  };
}

const cap = (value) => Math.min(MAX_VALUE, Math.max(0, value));
export const getBossMaxHp = (state) =>
  Math.min(
    MAX_VALUE,
    Math.floor(
      100 *
        Math.pow(1.6, Math.min(10, state.bossesKilled)) *
        (1 + 0.15 * Math.max(0, state.bossesKilled - 10)),
    ),
  );

function productionBase(state, bonuses) {
  const base = Object.entries(UPGRADES_DATA).reduce(
    (sum, [key, data]) =>
      sum +
      Math.min(
        state.upgrades[key],
        getPermanentFactoryCapacity(state, key) +
          (bonuses.factoryCapacity[key] || 0),
      ) *
        data.basePps,
    0,
  );
  return cap(
    base *
      FLAVORS_DATA[state.activeFlavor].ppsMult *
      getPrestigeMultiplier(state),
  );
}
function clickBase(state) {
  return cap(
    (1 + FLAVORS_DATA[state.activeFlavor].clickBonus + state.wheelClickBonus) *
      getPrestigeMultiplier(state),
  );
}
export function getPps(state, now = Date.now()) {
  const bonuses = getPetBonuses(state);
  return cap(
    productionBase(state, bonuses) *
      bonuses.ppsMultiplier *
      (Math.max(now, state.lastTick) < state.boostEndTime ? 2 : 1),
  );
}
export function getClickPower(state, now = Date.now()) {
  return cap(
    clickBase(state) *
      getPetBonuses(state).clickMultiplier *
      (Math.max(now, state.lastTick) < state.boostEndTime ? 2 : 1),
  );
}
// Combat uses preparation, its own pet channel and the existing temporary boost.
// Never divide a capped getter to reconstruct a baseline at extreme balances.
export function getBossDamage(state, now = Date.now()) {
  const bonuses = getPetBonuses(state);
  const baseline = Math.max(
    clickBase(state),
    Math.sqrt(productionBase(state, bonuses)) / 2,
  );
  return cap(
    baseline *
      (Math.max(now, state.lastTick) < state.boostEndTime ? 2 : 1) *
      bonuses.bossMultiplier,
  );
}
export function getBossReward(
  state,
  maxHp = state.boss?.maxHp || getBossMaxHp(state),
) {
  return cap(
    Math.floor(
      Math.min(
        maxHp * 15,
        Math.max(
          1500,
          getPps(state, Infinity) * 60 + getBossDamage(state, Infinity) * 60,
        ),
      ),
    ),
  );
}
export function getUpgradeCost(state, key) {
  const data = Object.hasOwn(UPGRADES_DATA, key) ? UPGRADES_DATA[key] : null;
  if (!data || state.upgrades[key] >= getFactoryCapacity(state, key))
    return Infinity;
  const cost = Math.floor(
    data.baseCost * Math.pow(data.costMult, state.upgrades[key]),
  );
  return Number.isFinite(cost) && cost <= MAX_VALUE ? cost : Infinity;
}

export function addCurrency(state, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const credited = Math.min(amount, MAX_VALUE - state.pirulitos);
  state.pirulitos = cap(state.pirulitos + credited);
  state.totalEarned = cap(state.totalEarned + credited);
  state.maxScore = Math.max(state.maxScore, state.pirulitos);
  return credited;
}

function produce(state, from, to) {
  if (to <= from) return 0;
  // Integrate on either side of expiry. A throttled tab cannot stretch a boost.
  const base = getPps(state, Infinity);
  const boostedMs = Math.max(0, Math.min(to, state.boostEndTime) - from);
  return addCurrency(state, cap(base * ((to - from + boostedMs) / 1000)));
}

export function settleWheel(state, now = Date.now()) {
  const pending = state.pendingWheel;
  if (!pending || now < pending.endsAt) return false;
  const reward = WHEEL_REWARDS[pending.index];
  // Clear the claim first. Saving the complete state makes settlement idempotent.
  state.pendingWheel = null;
  state.wheelSpins += 1;
  const result = {
    index: pending.index,
    label: reward.label,
    type: reward.type,
    amount: 0,
    at: pending.endsAt,
  };
  if (reward.type === "pct") result.amount = addCurrency(state, pending.amount);
  if (reward.type === "boost") {
    state.boostEndTime =
      Math.max(pending.endsAt, state.boostEndTime) + BOOST_DURATION_MS;
    state.boostsObtained += 1;
  }
  if (reward.type === "click") {
    state.wheelClickBonus = cap(state.wheelClickBonus + reward.val);
    result.amount = reward.val;
  }
  state.lastWheelReward = result;
  return result;
}

/** Advance once from lastTick; all interactions use this same clock. */
export function advance(state, now = Date.now(), { offline = false } = {}) {
  syncEggUnlocks(state);
  const from = state.lastTick;
  const effectiveNow = Math.max(from, now);
  const to = Math.min(effectiveNow, from + OFFLINE_CAP_MS);
  let earned = 0;
  let wheelReward = false;
  if (state.pendingWheel && state.pendingWheel.endsAt <= effectiveNow) {
    const split = Math.max(from, Math.min(to, state.pendingWheel.endsAt));
    earned += produce(state, from, split);
    wheelReward = settleWheel(state, effectiveNow);
    earned += produce(state, split, to);
  } else earned += produce(state, from, to);
  const elapsed = to - from;
  if (!offline) state.timePlayed += elapsed / 1000;
  state.lastTick = effectiveNow;
  const bossExpired = Boolean(state.boss && effectiveNow >= state.boss.endsAt);
  if (bossExpired) {
    state.bossCooldownUntil = Math.max(
      state.bossCooldownUntil,
      state.boss.endsAt + BOSS_COOLDOWN_MS,
    );
    state.boss = null;
  }
  if (state.sugarEvent && effectiveNow >= state.sugarEvent.endsAt)
    state.sugarEvent = null;
  if (!state.sugarEvent && effectiveNow >= state.nextEventAt) {
    const startedAt = state.nextEventAt;
    // Late/offline callbacks skip missed events rather than creating a backlog.
    if (!offline && effectiveNow < startedAt + SUGAR_EVENT_DURATION_MS)
      state.sugarEvent = {
        id: startedAt,
        endsAt: startedAt + SUGAR_EVENT_DURATION_MS,
      };
    state.nextEventAt = effectiveNow + SUGAR_EVENT_INTERVAL_MS;
  }
  state.maxPps = Math.max(state.maxPps, getPps(state, effectiveNow));
  return { earned, elapsed, bossExpired, wheelReward };
}

export function click(state, now = Date.now()) {
  advance(state, now);
  const amount = addCurrency(state, getClickPower(state, now));
  state.totalClicks += 1;
  return amount;
}

/** Sum the exact rounded unit prices; a geometric-sum floor is not equivalent. */
export function getBulkQuote(state, key, quantity = 1) {
  const data = Object.hasOwn(UPGRADES_DATA, key) ? UPGRADES_DATA[key] : null;
  if (!data || ![1, 10, 100, "max"].includes(quantity))
    return { quantity: 0, cost: Infinity };
  const room = Math.max(
    0,
    getFactoryCapacity(state, key) - state.upgrades[key],
  );
  if (quantity !== "max" && quantity > room)
    return { quantity, cost: Infinity };
  const limit = quantity === "max" ? room : quantity;
  let cost = 0;
  let count = 0;
  for (; count < limit; count++) {
    const unit = Math.floor(
      data.baseCost * Math.pow(data.costMult, state.upgrades[key] + count),
    );
    if (!Number.isFinite(unit) || unit > MAX_VALUE || cost > MAX_VALUE - unit)
      break;
    if (quantity === "max" && cost + unit > state.pirulitos) break;
    cost += unit;
  }
  if (quantity !== "max" && count !== quantity)
    return { quantity, cost: Infinity };
  return { quantity: count, cost };
}

/** A single atomic debit prevents repeated input from partially buying a fixed lot. */
export function buyBulk(state, key, quantity = 1, now = Date.now()) {
  advance(state, now);
  const quote = getBulkQuote(state, key, quantity);
  if (
    !quote.quantity ||
    !Number.isFinite(quote.cost) ||
    state.pirulitos < quote.cost
  )
    return false;
  state.pirulitos = Math.max(0, state.pirulitos - quote.cost);
  state.upgrades[key] += quote.quantity;
  syncEggUnlocks(state);
  state.maxPps = Math.max(state.maxPps, getPps(state, now));
  return quote;
}

export function buyUpgrade(state, key, now = Date.now()) {
  return Boolean(buyBulk(state, key, 1, now));
}

export function selectFlavor(state, key, now = Date.now()) {
  advance(state, now);
  const data = Object.hasOwn(FLAVORS_DATA, key) ? FLAVORS_DATA[key] : null;
  if (!data) return false;
  if (!state.unlockedFlavors.includes(key)) {
    if (state.pirulitos < data.cost) return false;
    state.pirulitos -= data.cost;
    state.unlockedFlavors.push(key);
  }
  state.activeFlavor = key;
  state.maxPps = Math.max(state.maxPps, getPps(state, now));
  return true;
}

/** Purchasing a collection unlocks its three components; equipping stays independent. */
export function selectCustomization(state, category, key, now = Date.now()) {
  advance(state, now);
  const fields = {
    skin: "activeSkin",
    theme: "activeTheme",
    particles: "activeParticles",
  };
  const field = Object.hasOwn(fields, category) ? fields[category] : null;
  const data = Object.hasOwn(SKINS_DATA, key) ? SKINS_DATA[key] : null;
  if (!field || !data) return false;
  if (!state.unlockedSkins.includes(key)) {
    if (state.pirulitos < data.cost) return false;
    state.pirulitos -= data.cost;
    state.unlockedSkins.push(key);
  }
  state[field] = key;
  return true;
}

export function startBoost(state, now = Date.now()) {
  advance(state, now);
  now = state.lastTick;
  if (
    (state.lastBoostTime && now - state.lastBoostTime < BOOST_COOLDOWN_MS) ||
    now < state.boostEndTime
  )
    return false;
  state.lastBoostTime = now;
  state.boostEndTime = now + BOOST_DURATION_MS;
  state.boostsObtained += 1;
  return true;
}

export function startWheel(state, now = Date.now(), random = Math.random) {
  advance(state, now);
  now = state.lastTick;
  if (
    state.pendingWheel ||
    (state.lastWheelTime && now - state.lastWheelTime < WHEEL_COOLDOWN_MS)
  )
    return false;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) return false;
  const index = Math.floor(sample * WHEEL_REWARDS.length);
  const reward = WHEEL_REWARDS[index];
  state.lastWheelTime = now;
  state.pendingWheel = {
    index,
    startedAt: now,
    endsAt: now + WHEEL_DURATION_MS,
    amount:
      reward.type === "pct"
        ? Math.max(
            100,
            Math.floor(
              Math.min(
                state.pirulitos * reward.val,
                Math.max(100, getPps(state, Infinity) * 600),
              ),
            ),
          )
        : 0,
  };
  return state.pendingWheel;
}

export function prestige(
  state,
  now = Date.now(),
  { expectedReward = null } = {},
) {
  advance(state, now);
  const gain = getPrestigeGain(state);
  const reward = getPrestigeReward(state);
  if (
    gain <= 0 ||
    state.pendingWheel ||
    (expectedReward &&
      JSON.stringify(expectedReward) !== JSON.stringify(reward))
  )
    return false;
  state.prestigeClaimed = getPrestigeTarget(state);
  state.prestigeLevel += gain;
  state.prestigePoints += reward.total;
  state.prestigeBonusEarned += reward.bonus;
  state.prestigeBaseline = state.totalEarned;
  state.pirulitos = 0;
  for (const key of Object.keys(UPGRADES_DATA)) state.upgrades[key] = 0;
  state.wheelClickBonus = 0;
  state.boostEndTime = 0;
  state.boss = null;
  state.sugarEvent = null;
  state.nextEventAt = state.lastTick + SUGAR_EVENT_INTERVAL_MS;
  return gain;
}

export function buyStellarBoost(state, now = Date.now()) {
  const cost = getStellarCost(state);
  if (
    !Number.isFinite(cost) ||
    !Number.isSafeInteger(state.prestigePoints) ||
    state.prestigePoints < cost
  )
    return false;
  advance(state, now);
  state.prestigePoints -= cost;
  state.stellarBoostLevel += 1;
  state.maxPps = Math.max(state.maxPps, getPps(state, now));
  return { cost, level: state.stellarBoostLevel };
}

export function buyFactoryExpansion(state, key, now = Date.now()) {
  const cost = getExpansionCost(state, key);
  if (
    !Number.isFinite(cost) ||
    !Number.isSafeInteger(state.prestigePoints) ||
    state.prestigePoints < cost
  )
    return false;
  advance(state, now);
  state.prestigePoints -= cost;
  state.factoryExpansions[key] += 1;
  return {
    cost,
    level: state.factoryExpansions[key],
    capacity: getFactoryCapacity(state, key),
  };
}

export function buyPetSlot(state, now = Date.now(), expectedLevel = state.petSlotUpgradeLevel) {
  const cost = getPetSlotCost(state);
  if (state.petSlotUpgradeLevel !== expectedLevel || !Number.isFinite(cost) ||
      !Number.isSafeInteger(state.prestigePoints) || state.prestigePoints < cost) return false;
  advance(state, now);
  state.prestigePoints -= cost;
  state.petSlotUpgradeLevel += 1;
  return {cost, level: state.petSlotUpgradeLevel, capacity: getEquippedPetSlotCapacity(state)};
}

export function startBoss(state, now = Date.now()) {
  advance(state, now);
  now = state.lastTick;
  if (state.boss || now < state.bossCooldownUntil) return false;
  const maxHp = getBossMaxHp(state);
  state.boss = { maxHp, hp: maxHp, endsAt: now + BOSS_DURATION_MS };
  return state.boss;
}

export function hitBoss(state, now = Date.now()) {
  advance(state, now);
  if (!state.boss) return false;
  const damage = getBossDamage(state, now);
  state.boss.hp = Math.max(0, state.boss.hp - damage);
  if (state.boss.hp > 0) return { damage, won: false, reward: 0 };
  const maxHp = state.boss.maxHp;
  const quotedReward = getBossReward(state, maxHp);
  state.boss = null;
  state.bossesKilled += 1;
  state.bossCooldownUntil = state.lastTick + BOSS_COOLDOWN_MS;
  const reward = addCurrency(state, quotedReward);
  return { damage, won: true, reward };
}

export function checkAchievements(state, now = Date.now()) {
  const unlocked = [];
  const pps = getPps(state, now);
  for (const achievement of ACHIEVEMENTS_DATA) {
    if (
      !state.unlockedAchievements.includes(achievement.id) &&
      achievement.req(state, pps)
    ) {
      state.unlockedAchievements.push(achievement.id);
      unlocked.push(achievement.id);
    }
  }
  return unlocked;
}

/** Optional world event: only a live, explicit click grants its one-time reward. */
export function claimSugarEvent(state, now = Date.now()) {
  advance(state, now);
  if (!state.sugarEvent || state.lastTick >= state.sugarEvent.endsAt)
    return false;
  state.sugarEvent = null;
  state.sugarEventsClaimed += 1;
  return addCurrency(state, Math.max(25, getPps(state, Infinity) * 30));
}

/** Data for game-style achievement meters; original unlock requirements are unchanged. */
export function getAchievementProgress(state, id, now = Date.now()) {
  const progress = {
    c1: [state.totalClicks, 1, "Cliques"],
    c100: [state.totalClicks, 100, "Cliques"],
    c1000: [state.totalClicks, 1000, "Cliques"],
    viciado: [state.totalEarned, 10000, "Produção"],
    fabrica_doces: [getPps(state, now), 500, "Produção"],
    magnata: [getPps(state, now), 1000000, "Produção"],
    sabores_3: [state.unlockedFlavors.length, 4, "Coleção"],
    sabores_todos: [state.unlockedFlavors.length, 8, "Coleção"],
    fashionista: [state.unlockedSkins.length, 3, "Coleção"],
    roleta_1: [state.wheelSpins, 1, "Aventura"],
    upgrades_10: [getTotalUpgradesCount(state), 10, "Produção"],
    boss_1: [state.bossesKilled, 1, "Aventura"],
    tempo_10m: [state.timePlayed, 600, "Aventura"],
  };
  if (!Object.hasOwn(progress, id))
    return { current: 0, target: 1, category: "Outras" };
  const [current, target, category] = progress[id];
  return { current, target, category };
}
