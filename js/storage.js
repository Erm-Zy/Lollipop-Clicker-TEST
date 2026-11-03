import { UPGRADES_DATA, FLAVORS_DATA, SKINS_DATA, ACHIEVEMENTS_DATA,
  SAVE_VERSION, MAX_VALUE, WHEEL_REWARDS, WHEEL_DURATION_MS, BOSS_DURATION_MS
} from './data.js';
import { createState, advance, getPrestigeTarget } from './gameplay.js';

export const SAVE_KEY = 'lollipopSave';
export const BACKUP_KEY = 'lollipopSave.backup';
export const LEGACY_BACKUP_KEY = 'lollipopSave.legacy-v1';
export const RECOVERY_KEY = 'lollipopSave.recovery';

const STATE_FIELDS = new Set(['pirulitos', 'totalEarned', 'totalClicks', 'prestigeLevel', 'upgrades',
  'activeFlavor', 'activeSkin', 'unlockedFlavors', 'unlockedSkins', 'unlockedAchievements',
  'bossesKilled', 'wheelSpins', 'boostEndTime', 'timePlayed', 'maxScore', 'maxPps', 'settings']);
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const number = (value, fallback = 0, max = MAX_VALUE) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(max, value) : fallback;
const count = (value, fallback = 0) => Math.floor(number(value, fallback));
const timestamp = (value, fallback = 0) => number(value, fallback, 8640000000000000);
const list = (value, allowed, defaults = []) => [...new Set([
  ...defaults, ...(Array.isArray(value) ? value.filter(item => typeof item === 'string' && allowed.includes(item)) : [])
])];

/** Build an isolated, fully shaped state. Unknown keys never become executable state. */
export function validateState(raw, now = Date.now()) {
  if (!record(raw) || !Object.keys(raw).some(key => STATE_FIELDS.has(key))) throw new TypeError('Formato de save inválido.');
  if (number(raw.version) > SAVE_VERSION) throw new Error('Este save pertence a uma versão mais recente do jogo.');
  const state = createState(now);
  for (const key of ['pirulitos', 'totalEarned', 'timePlayed', 'maxScore', 'maxPps', 'wheelClickBonus']) {
    state[key] = number(raw[key]);
  }
  for (const key of ['totalClicks', 'prestigeLevel', 'bossesKilled', 'wheelSpins', 'boostsObtained']) {
    state[key] = count(raw[key]);
  }
  // A balance cannot exceed the lifetime amount that created it.
  state.totalEarned = Math.max(state.totalEarned, state.pirulitos);
  state.maxScore = Math.max(state.maxScore, state.pirulitos);
  const upgrades = record(raw.upgrades) ? raw.upgrades : {};
  for (const key of Object.keys(UPGRADES_DATA)) state.upgrades[key] = count(upgrades[key]);
  state.unlockedFlavors = list(raw.unlockedFlavors, Object.keys(FLAVORS_DATA), state.unlockedFlavors);
  state.unlockedSkins = list(raw.unlockedSkins, Object.keys(SKINS_DATA), state.unlockedSkins);
  state.unlockedAchievements = list(raw.unlockedAchievements, ACHIEVEMENTS_DATA.map(item => item.id));
  if (state.unlockedFlavors.includes(raw.activeFlavor)) state.activeFlavor = raw.activeFlavor;
  if (state.unlockedSkins.includes(raw.activeSkin)) state.activeSkin = raw.activeSkin;
  // Legacy skins bundled the three visuals. Preserve their appearance on migration.
  const legacy = number(raw.version) < SAVE_VERSION;
  const theme = legacy ? state.activeSkin : raw.activeTheme;
  const particles = legacy ? state.activeSkin : raw.activeParticles;
  if (state.unlockedSkins.includes(theme)) state.activeTheme = theme;
  if (state.unlockedSkins.includes(particles)) state.activeParticles = particles;
  const settings = record(raw.settings) ? raw.settings : {};
  for (const key of Object.keys(state.settings)) {
    if (typeof settings[key] === 'boolean') state.settings[key] = settings[key];
  }
  for (const key of ['lastWheelTime', 'boostEndTime', 'lastBoostTime']) state[key] = timestamp(raw[key]);
  // Old versions had no timestamp: never fabricate offline earnings for them.
  state.lastTick = timestamp(raw.lastTick, timestamp(raw.savedAt, now));
  state.savedAt = timestamp(raw.savedAt, state.lastTick);
  state.prestigeClaimed = legacy
    ? (state.prestigeLevel > 0 ? getPrestigeTarget(state) : 0)
    : Math.min(getPrestigeTarget(state), count(raw.prestigeClaimed));
  if (record(raw.boss)) {
    const hp = number(raw.boss.hp);
    const maxHp = number(raw.boss.maxHp);
    const endsAt = timestamp(raw.boss.endsAt);
    if (hp > 0 && maxHp >= hp && endsAt > 0 && endsAt <= Math.max(now, state.lastTick) + BOSS_DURATION_MS) {
      state.boss = { hp, maxHp, endsAt };
    }
  }
  if (record(raw.pendingWheel)) {
    const { index } = raw.pendingWheel;
    const startedAt = timestamp(raw.pendingWheel.startedAt);
    const endsAt = timestamp(raw.pendingWheel.endsAt);
    const reward = Number.isInteger(index) ? WHEEL_REWARDS[index] : null;
    const amount = number(raw.pendingWheel.amount);
    const validAmount = reward && (reward.type !== 'pct' || (amount >= 100 && amount <= Math.max(100, MAX_VALUE * reward.val)));
    if (validAmount && Number.isInteger(index) && index >= 0 && index < WHEEL_REWARDS.length &&
        endsAt > 0 && endsAt - startedAt === WHEEL_DURATION_MS &&
        startedAt <= Math.max(now, state.lastTick)) {
      state.pendingWheel = { index, startedAt, endsAt, amount: reward.type === 'pct' ? amount : 0 };
      state.lastWheelTime = Math.max(state.lastWheelTime, startedAt);
    }
  }
  if (record(raw.lastWheelReward)) {
    const { index } = raw.lastWheelReward;
    if (Number.isInteger(index) && index >= 0 && index < WHEEL_REWARDS.length) {
      const reward = WHEEL_REWARDS[index];
      state.lastWheelReward = {
        index, label: reward.label, type: reward.type,
        amount: number(raw.lastWheelReward.amount), at: timestamp(raw.lastWheelReward.at)
      };
    }
  }
  return state;
}

function parse(raw) {
  const parsed = JSON.parse(raw);
  if (!record(parsed) || !Object.keys(parsed).some(key => STATE_FIELDS.has(key))) throw new TypeError('Formato de save inválido.');
  if (number(parsed.version) > SAVE_VERSION) throw new Error('Save de uma versão futura.');
  return parsed;
}

/** Preserve raw legacy data once, and leave corrupt or future data untouched. */
export function loadGame(storage, now = Date.now()) {
  const result = { state: createState(now), canSave: true, warnings: [], offlineEarned: 0 };
  let raw;
  try {
    storage ??= globalThis.localStorage;
    raw = storage.getItem(SAVE_KEY);
  } catch {
    result.canSave = false;
    result.warnings.push('O navegador bloqueou o armazenamento. Exporte seu progresso antes de sair.');
    return result;
  }
  if (raw === null) return result;
  try {
    const parsed = parse(raw);
    result.state = validateState(parsed, now);
    if (number(parsed.version) < SAVE_VERSION) {
      try {
        if (storage.getItem(LEGACY_BACKUP_KEY) === null) storage.setItem(LEGACY_BACKUP_KEY, raw);
      } catch {
        result.canSave = false;
        result.warnings.push('Não foi possível criar o backup do save antigo. O original está preservado; exporte uma cópia.');
      }
    }
  } catch (error) {
    result.canSave = false;
    result.warnings.push(`${error.message} O save original foi preservado. Exporte-o ou importe uma cópia válida para recuperar.`);
    try {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup !== null) {
        result.state = validateState(parse(backup), now);
        result.warnings.push('Uma cópia de segurança foi carregada para consulta. Restaure-a nas configurações para salvar novamente.');
      }
    } catch { /* A damaged backup must not replace the original either. */ }
  }
  if (result.state.lastTick > now + 1000) {
    result.warnings.push('O relógio do dispositivo está atrás do último save. Os prazos existentes foram preservados; confira a data e a hora.');
  }
  const progress = advance(result.state, now, { offline: true });
  result.offlineEarned = progress.earned;
  return result;
}

/** force is reserved for an explicitly confirmed import, recovery, or reset. */
export function saveGame(storage, state, { force = false } = {}) {
  try {
    storage ??= globalThis.localStorage;
    const previous = storage.getItem(SAVE_KEY);
    if (previous !== null) {
      if (force) storage.setItem(RECOVERY_KEY, previous);
      else parse(previous); // Refuse to overwrite corrupted or newer-version data.
      // Preserve the previous complete write before replacing it.
      if (!force) storage.setItem(BACKUP_KEY, previous);
    }
    state.savedAt = state.lastTick;
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: `Não foi possível salvar: ${error.message}` };
  }
}
