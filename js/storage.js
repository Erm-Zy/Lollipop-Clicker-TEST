import { normalizePets, syncEggUnlocks, PetDataError } from "./pets/state.js";
import { getEquippedPetSlotCapacity, MAX_PET_SLOT_LEVEL } from "./pets/slots.js";
import {
  sanitizePermanentProgress,
  getFactoryCapacity,
} from "./progression.js";
import {
  UPGRADES_DATA,
  FLAVORS_DATA,
  SKINS_DATA,
  ACHIEVEMENTS_DATA,
  SAVE_VERSION,
  MAX_VALUE,
  WHEEL_REWARDS,
  WHEEL_DURATION_MS,
  BOSS_DURATION_MS,
  SUGAR_EVENT_DURATION_MS,
  PRESTIGE_CONFIG,
  FACTORY_CAPACITIES,
} from "./data.js";
import { createState, advance, getPrestigeTarget } from "./gameplay.js";

export const SAVE_KEY = "lollipopSave";
export const BACKUP_KEY = "lollipopSave.backup";
export const LEGACY_BACKUP_KEY = "lollipopSave.legacy-v1";
export const V2_BACKUP_KEY = "lollipopSave.legacy-v2";
export const V3_BACKUP_KEY = "lollipopSave.legacy-v3";
export const V5_BACKUP_KEY = "lollipopSave.legacy-v5";
export const V6_BACKUP_KEY = "lollipopSave.legacy-v6";
export const V4_BACKUP_KEY = "lollipopSave.legacy-v4";
export const PET_QUARANTINE_KEY = "lollipopSave.pets-v5-quarantine";
export const PRE_PRESTIGE_BACKUP_KEY = "lollipopSave.pre-prestige-v4";
export class IncompatibleLegacySaveError extends Error {
  constructor() {
    super(
      "Save beta antigo com fábricas acima dos novos limites de capacidade.",
    );
    this.name = "IncompatibleLegacySaveError";
  }
}
export const RECOVERY_KEY = "lollipopSave.recovery";

const STATE_FIELDS = new Set([
  "pirulitos",
  "totalEarned",
  "totalClicks",
  "prestigeLevel",
  "prestigePoints",
  "upgrades",
  "activeFlavor",
  "activeSkin",
  "unlockedFlavors",
  "unlockedSkins",
  "unlockedAchievements",
  "bossesKilled",
  "wheelSpins",
  "boostEndTime",
  "timePlayed",
  "maxScore",
  "maxPps",
  "settings",
]);
const record = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const number = (value, fallback = 0, max = MAX_VALUE) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(max, value)
    : fallback;
const count = (value, fallback = 0) => Math.floor(number(value, fallback));
const timestamp = (value, fallback = 0) =>
  number(value, fallback, 8640000000000000);
const list = (value, allowed, defaults = []) => [
  ...new Set([
    ...defaults,
    ...(Array.isArray(value)
      ? value.filter(
          (item) => typeof item === "string" && allowed.includes(item),
        )
      : []),
  ]),
];

/** Build an isolated, fully shaped state. Unknown keys never become executable state. */
export function validateState(
  raw,
  now = Date.now(),
  { allowLegacyOverflow = false } = {},
) {
  if (!record(raw) || !Object.keys(raw).some((key) => STATE_FIELDS.has(key)))
    throw new TypeError("Formato de save inválido.");
  if (number(raw.version) > SAVE_VERSION)
    throw new Error("Este save pertence a uma versão mais recente do jogo.");
  const state = createState(now);
  for (const key of [
    "pirulitos",
    "totalEarned",
    "timePlayed",
    "maxScore",
    "maxPps",
    "wheelClickBonus",
  ]) {
    state[key] = number(raw[key]);
  }
  for (const key of [
    "totalClicks",
    "prestigeLevel",
    "bossesKilled",
    "wheelSpins",
    "boostsObtained",
    "sugarEventsClaimed",
  ]) {
    state[key] = count(raw[key]);
  }
  state.prestigeLevel = Math.min(PRESTIGE_CONFIG.maxLevel, state.prestigeLevel);
  if (number(raw.version) >= 6) {
    const bonus = raw.prestigeBonusEarned ?? 0;
    if (
      !Number.isSafeInteger(bonus) ||
      bonus < 0 ||
      bonus > Math.floor(state.prestigeLevel * 0.25) ||
      bonus > Number.MAX_SAFE_INTEGER - state.prestigeLevel
    )
      throw new Error(
        "Registro de PP extras inválido. Exporte o original para recuperação.",
      );
    state.prestigeBonusEarned = bonus;
  }
  // A balance cannot exceed the lifetime amount that created it.
  state.totalEarned = Math.max(state.totalEarned, state.pirulitos);
  state.maxScore = Math.max(state.maxScore, state.pirulitos);
  const upgrades = record(raw.upgrades) ? raw.upgrades : {};
  const oldPrestige = number(raw.version) < 4;
  if (
    oldPrestige &&
    !allowLegacyOverflow &&
    Object.keys(UPGRADES_DATA).some(
      (key) => count(upgrades[key]) > FACTORY_CAPACITIES[key],
    )
  )
    throw new IncompatibleLegacySaveError();
  Object.assign(
    state,
    oldPrestige
      ? { prestigePoints: state.prestigeLevel }
      : sanitizePermanentProgress(
          { ...raw, prestigeBonusEarned: state.prestigeBonusEarned,
            petSlotUpgradeLevel: number(raw.version) >= 7 ? raw.petSlotUpgradeLevel : 0 },
          state.prestigeLevel,
        ),
  );
  if (number(raw.version) >= 7) {
    const level = raw.petSlotUpgradeLevel === undefined ? 0 : raw.petSlotUpgradeLevel;
    if (!Number.isInteger(level) || level < 0 || level > MAX_PET_SLOT_LEVEL ||
        state.petSlotUpgradeLevel !== level) {
      throw new Error("Registro de espaços da equipe inválido ou sem PP histórico. Exporte o original para recuperação.");
    }
  }
  state.prestigeBaseline = oldPrestige
    ? state.totalEarned
    : Math.min(
        state.totalEarned,
        number(
          raw.prestigeBaseline,
          state.prestigeLevel > 0 || count(raw.prestigeClaimed) > 0
            ? state.totalEarned
            : 0,
        ),
      );
  for (const key of Object.keys(UPGRADES_DATA))
    state.upgrades[key] =
      number(raw.version) >= 6
        ? Math.min(10000, count(upgrades[key])) // Owned units survive equipment removal; only active units produce.
        : Math.min(getFactoryCapacity(state, key), count(upgrades[key]));
  state.unlockedFlavors = list(
    raw.unlockedFlavors,
    Object.keys(FLAVORS_DATA),
    state.unlockedFlavors,
  );
  state.unlockedSkins = list(
    raw.unlockedSkins,
    Object.keys(SKINS_DATA),
    state.unlockedSkins,
  );
  state.unlockedAchievements = list(
    raw.unlockedAchievements,
    ACHIEVEMENTS_DATA.map((item) => item.id),
  );
  if (state.unlockedFlavors.includes(raw.activeFlavor))
    state.activeFlavor = raw.activeFlavor;
  if (state.unlockedSkins.includes(raw.activeSkin))
    state.activeSkin = raw.activeSkin;
  // Legacy skins bundled the three visuals. Preserve their appearance on migration.
  const legacy = number(raw.version) < 2;
  const theme = legacy ? state.activeSkin : raw.activeTheme;
  const particles = legacy ? state.activeSkin : raw.activeParticles;
  if (state.unlockedSkins.includes(theme)) state.activeTheme = theme;
  if (state.unlockedSkins.includes(particles))
    state.activeParticles = particles;
  const settings = record(raw.settings) ? raw.settings : {};
  for (const key of Object.keys(state.settings)) {
    if (typeof settings[key] === "boolean") state.settings[key] = settings[key];
  }
  for (const key of [
    "lastWheelTime",
    "boostEndTime",
    "lastBoostTime",
    "bossCooldownUntil",
  ])
    state[key] = timestamp(raw[key]);
  // Old versions had no timestamp: never fabricate offline earnings for them.
  state.lastTick = timestamp(raw.lastTick, timestamp(raw.savedAt, now));
  state.savedAt = timestamp(raw.savedAt, state.lastTick);
  state.nextEventAt = timestamp(raw.nextEventAt, state.nextEventAt);
  if (record(raw.sugarEvent)) {
    const id = timestamp(raw.sugarEvent.id);
    const endsAt = timestamp(raw.sugarEvent.endsAt);
    if (
      id > 0 &&
      endsAt - id === SUGAR_EVENT_DURATION_MS &&
      id <= Math.max(now, state.lastTick)
    )
      state.sugarEvent = { id, endsAt };
  }
  state.prestigeClaimed = legacy
    ? state.prestigeLevel > 0
      ? getPrestigeTarget(state)
      : 0
    : Math.min(
        getPrestigeTarget(state),
        count(
          raw.prestigeClaimed,
          Math.min(getPrestigeTarget(state), state.prestigeLevel),
        ),
        PRESTIGE_CONFIG.maxLevel,
      );
  if (record(raw.boss)) {
    const hp = number(raw.boss.hp);
    const maxHp = number(raw.boss.maxHp);
    const endsAt = timestamp(raw.boss.endsAt);
    if (
      hp > 0 &&
      maxHp >= hp &&
      endsAt > 0 &&
      endsAt <= Math.max(now, state.lastTick) + BOSS_DURATION_MS
    ) {
      state.boss = { hp, maxHp, endsAt };
    }
  }
  if (record(raw.pendingWheel)) {
    const { index } = raw.pendingWheel;
    const startedAt = timestamp(raw.pendingWheel.startedAt);
    const endsAt = timestamp(raw.pendingWheel.endsAt);
    const reward = Number.isInteger(index) ? WHEEL_REWARDS[index] : null;
    const amount = number(raw.pendingWheel.amount);
    const validAmount =
      reward &&
      (reward.type !== "pct" ||
        (amount >= 100 && amount <= Math.max(100, MAX_VALUE * reward.val)));
    if (
      validAmount &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < WHEEL_REWARDS.length &&
      endsAt > 0 &&
      endsAt - startedAt === WHEEL_DURATION_MS &&
      startedAt <= Math.max(now, state.lastTick)
    ) {
      state.pendingWheel = {
        index,
        startedAt,
        endsAt,
        amount: reward.type === "pct" ? amount : 0,
      };
      state.lastWheelTime = Math.max(state.lastWheelTime, startedAt);
    }
  }
  if (record(raw.lastWheelReward)) {
    const { index } = raw.lastWheelReward;
    if (Number.isInteger(index) && index >= 0 && index < WHEEL_REWARDS.length) {
      const reward = WHEEL_REWARDS[index];
      state.lastWheelReward = {
        index,
        label: reward.label,
        type: reward.type,
        amount: number(raw.lastWheelReward.amount),
        at: timestamp(raw.lastWheelReward.at),
      };
    }
  }
  // Old schemas had no informed opt-in. Unknown fields in an old import must
  // never turn irreversible automation on; the exact raw original is backed up.
  const petSource = number(raw.version) < 7 && record(raw.pets)
    ? {...raw.pets, autoFusionEnabled:false, autoFusionStats:undefined}
    : raw.pets;
  const normalizedPets = normalizePets(petSource, now, getEquippedPetSlotCapacity(state));
  state.pets = normalizedPets.pets;
  if (number(raw.version) < 6) {
    // Grandfather old world-based unlocks before applying the new invitation requirements.
    const owned = Object.values(state.upgrades).reduce((a, b) => a + b, 0);
    if (owned >= 25 && !state.pets.unlockedEggs.includes("cristalizado"))
      state.pets.unlockedEggs.push("cristalizado");
    if (owned >= 100 && !state.pets.unlockedEggs.includes("celestial"))
      state.pets.unlockedEggs.push("celestial");
  }
  syncEggUnlocks(state);
  if (normalizedPets.invalid) {
    const error = new PetDataError();
    error.state = state;
    throw error;
  }
  return state;
}

export function preserveLegacyBackup(storage, raw, version) {
  if (version >= SAVE_VERSION) return;
  const key =
    version < 2
      ? LEGACY_BACKUP_KEY
      : version < 3
        ? V2_BACKUP_KEY
        : version < 4
          ? V3_BACKUP_KEY
          : version < 5
            ? V4_BACKUP_KEY
            : version < 6 ? V5_BACKUP_KEY : V6_BACKUP_KEY;
  const previous = storage.getItem(key);
  if (previous === null) {
    storage.setItem(key, raw);
    if (storage.getItem(key) !== raw)
      throw new Error("Backup não confirmado pelo armazenamento.");
  } else if (version >= 4 && JSON.parse(previous)?.version !== version) {
    throw new Error(
      "O backup legado existente precisa ser exportado e recuperado nos Ajustes.",
    );
  }
}

function parse(raw) {
  const parsed = JSON.parse(raw);
  if (
    !record(parsed) ||
    !Object.keys(parsed).some((key) => STATE_FIELDS.has(key))
  )
    throw new TypeError("Formato de save inválido.");
  if (number(parsed.version) > SAVE_VERSION)
    throw new Error("Save de uma versão futura.");
  return parsed;
}

/** Preserve raw legacy data once, and leave corrupt or future data untouched. */
export function loadGame(storage, now = Date.now()) {
  const result = {
    state: createState(now),
    canSave: true,
    warnings: [],
    offlineEarned: 0,
    offlineElapsed: 0,
  };
  let raw;
  try {
    storage ??= globalThis.localStorage;
    raw = storage.getItem(SAVE_KEY);
  } catch {
    result.canSave = false;
    result.warnings.push(
      "O navegador bloqueou o armazenamento. Exporte seu progresso antes de sair.",
    );
    return result;
  }
  if (raw === null) return result;
  try {
    const parsed = parse(raw);
    result.state = validateState(parsed, now);
    if (number(parsed.version) < SAVE_VERSION) {
      try {
        preserveLegacyBackup(storage, raw, number(parsed.version));
      } catch {
        result.canSave = false;
        result.warnings.push(
          "Não foi possível criar o backup do save antigo. O original está preservado; exporte uma cópia.",
        );
      }
    }
  } catch (error) {
    if (
      error instanceof IncompatibleLegacySaveError ||
      error instanceof PetDataError
    ) {
      result.canSave = false;
      let petError = error instanceof PetDataError ? error : null;
      if (petError) result.state = petError.state;
      else {
        try {
          result.state = validateState(JSON.parse(raw), now, {
            allowLegacyOverflow: true,
          });
        } catch (previewError) {
          if (previewError instanceof PetDataError) {
            petError = previewError;
            result.state = previewError.state;
          }
          // The original remains protected even if a safe preview is unavailable.
        }
      }
      result.warnings.push(
        error instanceof PetDataError
          ? error.message
          : "Este save antigo excede as capacidades atuais. O original está preservado para exportação nos Ajustes; a visualização usa os limites atuais, sem reset nem escrita automática.",
      );
      if (petError) {
        try {
          if (storage.getItem(PET_QUARANTINE_KEY) === null)
            storage.setItem(PET_QUARANTINE_KEY, raw);
        } catch {
          /* Primary remains untouched. */
        }
      }
      return result;
    }
    result.canSave = false;
    result.warnings.push(
      `${error.message} O save original foi preservado. Exporte-o ou importe uma cópia válida para recuperar.`,
    );
    try {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup !== null) {
        result.state = validateState(parse(backup), now);
        result.warnings.push(
          "Uma cópia de segurança foi carregada para consulta. Restaure-a nas configurações para salvar novamente.",
        );
      }
    } catch {
      /* A damaged backup must not replace the original either. */
    }
  }
  if (result.state.lastTick > now + 1000) {
    result.warnings.push(
      "O relógio do dispositivo está atrás do último save. Os prazos existentes foram preservados; confira a data e a hora.",
    );
  }
  const progress = advance(result.state, now, { offline: true });
  result.offlineEarned = progress.earned;
  result.offlineElapsed = progress.elapsed;
  return result;
}

/** force is reserved for an explicitly confirmed import, recovery, or reset. */
export function saveGame(storage, state, { force = false } = {}) {
  try {
    storage ??= globalThis.localStorage;
    const previous = storage.getItem(SAVE_KEY);
    if (previous !== null) {
      if (force) storage.setItem(RECOVERY_KEY, previous);
      else {
        const parsed = parse(previous); // Refuse corrupted or future data.
        preserveLegacyBackup(storage, previous, number(parsed.version));
      }
      // Preserve the previous complete write before replacing it.
      if (!force) storage.setItem(BACKUP_KEY, previous);
    }
    state.savedAt = state.lastTick;
    const serialized = JSON.stringify(state);
    storage.setItem(SAVE_KEY, serialized);
    if (storage.getItem(SAVE_KEY) !== serialized)
      throw new Error("A gravação não foi confirmada pelo armazenamento.");
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: `Não foi possível salvar: ${error.message}` };
  }
}
