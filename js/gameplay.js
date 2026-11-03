import {
  UPGRADES_DATA, FLAVORS_DATA, SKINS_DATA, ACHIEVEMENTS_DATA, WHEEL_REWARDS,
  SAVE_VERSION, MAX_VALUE, WHEEL_COOLDOWN_MS, WHEEL_DURATION_MS,
  BOOST_DURATION_MS, BOOST_COOLDOWN_MS, BOSS_DURATION_MS, OFFLINE_CAP_MS
} from './data.js';

export function createState(now = Date.now()) {
  return {
    version: SAVE_VERSION, pirulitos: 0, totalEarned: 0, totalClicks: 0,
    prestigeLevel: 0, prestigeClaimed: 0, activeFlavor: 'morango', activeSkin: 'classic',
    activeTheme: 'classic', activeParticles: 'classic',
    upgrades: Object.fromEntries(Object.keys(UPGRADES_DATA).map(key => [key, 0])),
    unlockedFlavors: ['morango', 'limao', 'blueberry'], unlockedSkins: ['classic'],
    unlockedAchievements: [], bossesKilled: 0, wheelSpins: 0, lastWheelTime: 0,
    pendingWheel: null, lastWheelReward: null, boostEndTime: 0, lastBoostTime: 0,
    boostsObtained: 0, wheelClickBonus: 0, boss: null, timePlayed: 0,
    maxScore: 0, maxPps: 0, lastTick: now, savedAt: now,
    settings: { music: true, sfx: true, particles: true, reducedMotion: false }
  };
}

const cap = value => Math.min(MAX_VALUE, Math.max(0, value));
export const getTotalUpgradesCount = state => Object.values(state.upgrades).reduce((a, b) => a + b, 0);
export const getPrestigeTarget = state => Math.floor(Math.cbrt(state.totalEarned / 1000000));
export const getPrestigeGain = state => Math.max(0, getPrestigeTarget(state) - state.prestigeClaimed);
export const getBossMaxHp = state => Math.min(MAX_VALUE, Math.floor(100 * Math.pow(1.6, state.bossesKilled)));

export function getPps(state, now = Date.now()) {
  now = Math.max(now, state.lastTick);
  const base = Object.entries(UPGRADES_DATA).reduce((sum, [key, data]) => sum + state.upgrades[key] * data.basePps, 0);
  return cap(base * FLAVORS_DATA[state.activeFlavor].ppsMult * (1 + state.prestigeLevel * 0.15) * (now < state.boostEndTime ? 2 : 1));
}

export function getClickPower(state, now = Date.now()) {
  now = Math.max(now, state.lastTick);
  return cap((1 + FLAVORS_DATA[state.activeFlavor].clickBonus + state.wheelClickBonus) *
    (1 + state.prestigeLevel * 0.15) * (now < state.boostEndTime ? 2 : 1));
}

export function getUpgradeCost(state, key) {
  const data = Object.hasOwn(UPGRADES_DATA, key) ? UPGRADES_DATA[key] : null;
  if (!data) return Infinity;
  const cost = Math.floor(data.baseCost * Math.pow(data.costMult, state.upgrades[key]));
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
  const result = { index: pending.index, label: reward.label, type: reward.type, amount: 0, at: pending.endsAt };
  if (reward.type === 'pct') result.amount = addCurrency(state, pending.amount);
  if (reward.type === 'boost') {
    state.boostEndTime = Math.max(pending.endsAt, state.boostEndTime) + BOOST_DURATION_MS;
    state.boostsObtained += 1;
  }
  if (reward.type === 'click') {
    state.wheelClickBonus = cap(state.wheelClickBonus + reward.val);
    result.amount = reward.val;
  }
  state.lastWheelReward = result;
  return result;
}

/** Advance once from lastTick; all interactions use this same clock. */
export function advance(state, now = Date.now(), { offline = false } = {}) {
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
  if (bossExpired) state.boss = null;
  state.maxPps = Math.max(state.maxPps, getPps(state, effectiveNow));
  return { earned, elapsed, bossExpired, wheelReward };
}

export function click(state, now = Date.now()) {
  advance(state, now);
  const amount = addCurrency(state, getClickPower(state, now));
  state.totalClicks += 1;
  return amount;
}

export function buyUpgrade(state, key, now = Date.now()) {
  advance(state, now);
  const cost = getUpgradeCost(state, key);
  if (!Number.isFinite(cost) || state.pirulitos < cost) return false;
  state.pirulitos -= cost;
  state.upgrades[key] += 1;
  state.maxPps = Math.max(state.maxPps, getPps(state, now));
  return true;
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
  const fields = { skin: 'activeSkin', theme: 'activeTheme', particles: 'activeParticles' };
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
  if ((state.lastBoostTime && now - state.lastBoostTime < BOOST_COOLDOWN_MS) || now < state.boostEndTime) return false;
  state.lastBoostTime = now;
  state.boostEndTime = now + BOOST_DURATION_MS;
  state.boostsObtained += 1;
  return true;
}

export function startWheel(state, now = Date.now(), random = Math.random) {
  advance(state, now);
  now = state.lastTick;
  if (state.pendingWheel || (state.lastWheelTime && now - state.lastWheelTime < WHEEL_COOLDOWN_MS)) return false;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) return false;
  const index = Math.floor(sample * WHEEL_REWARDS.length);
  const reward = WHEEL_REWARDS[index];
  state.lastWheelTime = now;
  state.pendingWheel = {
    index, startedAt: now, endsAt: now + WHEEL_DURATION_MS,
    amount: reward.type === 'pct' ? Math.max(100, Math.floor(state.pirulitos * reward.val)) : 0
  };
  return state.pendingWheel;
}

export function prestige(state, now = Date.now()) {
  advance(state, now);
  const gain = getPrestigeGain(state);
  if (gain <= 0 || state.pendingWheel) return false;
  state.prestigeClaimed = getPrestigeTarget(state);
  state.prestigeLevel += gain;
  state.pirulitos = 0;
  for (const key of Object.keys(UPGRADES_DATA)) state.upgrades[key] = 0;
  state.wheelClickBonus = 0;
  state.boostEndTime = 0;
  state.boss = null;
  return gain;
}

export function startBoss(state, now = Date.now()) {
  advance(state, now);
  now = state.lastTick;
  if (state.boss) return false;
  const maxHp = getBossMaxHp(state);
  state.boss = { maxHp, hp: maxHp, endsAt: now + BOSS_DURATION_MS };
  return state.boss;
}

export function hitBoss(state, now = Date.now()) {
  advance(state, now);
  if (!state.boss) return false;
  const damage = getClickPower(state, now);
  state.boss.hp = Math.max(0, state.boss.hp - damage);
  if (state.boss.hp > 0) return { damage, won: false, reward: 0 };
  const maxHp = state.boss.maxHp;
  state.boss = null;
  state.bossesKilled += 1;
  const reward = addCurrency(state, cap(Math.floor(maxHp * 15)));
  return { damage, won: true, reward };
}

export function checkAchievements(state, now = Date.now()) {
  const unlocked = [];
  const pps = getPps(state, now);
  for (const achievement of ACHIEVEMENTS_DATA) {
    if (!state.unlockedAchievements.includes(achievement.id) && achievement.req(state, pps)) {
      state.unlockedAchievements.push(achievement.id);
      unlocked.push(achievement.id);
    }
  }
  return unlocked;
}
