import { MUSIC_MODES, ORIGINAL_TRACK_ID } from "./catalog.js";
import { getWorldStage } from "../world.js";

export const MUSIC_PREFERENCE_KEY = "lollipopMusic.preferences.v1";
export const MUSIC_SESSION_KEY = "lollipopMusic.session.v1";
const validId = id => typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 100;
export function defaultMusicPreferences() {
  return { version: 1, mode: "original", volume: 0.25, manualTrackId: ORIGINAL_TRACK_ID,
    battleOverrides: false, highestChapter: 0, discovered: [ORIGINAL_TRACK_ID] };
}
export function validateMusicPreferences(raw) {
  const value = defaultMusicPreferences();
  if (!raw || raw.version !== 1) return value;
  if (typeof raw.mode === "string" && Object.hasOwn(MUSIC_MODES, raw.mode)) value.mode = raw.mode;
  if (Number.isFinite(raw.volume)) value.volume = Math.min(1, Math.max(0, raw.volume));
  if (validId(raw.manualTrackId)) value.manualTrackId = raw.manualTrackId;
  value.battleOverrides = raw.battleOverrides === true;
  if (Number.isInteger(raw.highestChapter)) value.highestChapter = Math.min(3, Math.max(0, raw.highestChapter));
  if (Array.isArray(raw.discovered))
    value.discovered = [...new Set([ORIGINAL_TRACK_ID, ...raw.discovered.filter(validId).slice(0, 200)])];
  return value;
}
export function loadMusicPreferences(storage) {
  try {
    const text = storage.getItem(MUSIC_PREFERENCE_KEY);
    if (text === null) return { preferences: defaultMusicPreferences(), initialized: false, canSave: true };
    const raw = JSON.parse(text);
    return { preferences: validateMusicPreferences(raw), initialized: true, canSave: raw?.version === 1 };
  } catch {
    return { preferences: defaultMusicPreferences(), initialized: false, canSave: false };
  }
}
export function storeMusicPreferences(storage, preferences) {
  try {
    storage.setItem(MUSIC_PREFERENCE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
export function isDiscovered(track, preferences) {
  return track.id === ORIGINAL_TRACK_ID || !track.discovery ||
    preferences.discovered.includes(track.id) || preferences.highestChapter >= track.discovery.chapter;
}
export function discoverMusic(preferences, state, catalog, initial = false) {
  const chapter = getWorldStage(state);
  const highestChapter = Math.max(chapter, preferences.highestChapter);
  const discovered = [...new Set([...preferences.discovered, ...catalog
    .filter(track => isDiscovered(track, { ...preferences, highestChapter }))
    .map(track => track.id)])];
  return {
    preferences: { ...preferences, highestChapter, discovered },
    chapter: !initial && chapter > preferences.highestChapter ? chapter : null,
    newTracks: initial ? [] : discovered.filter(id => !preferences.discovered.includes(id)),
    changed: initial || highestChapter !== preferences.highestChapter || discovered.length !== preferences.discovered.length,
  };
}
export function loadMusicSession(storage) {
  try {
    const raw = JSON.parse(storage.getItem(MUSIC_SESSION_KEY));
    return raw?.version === 1 && validId(raw.trackId) &&
      Object.hasOwn(MUSIC_MODES, raw.mode) && typeof raw.poolKey === "string" &&
      Number.isFinite(raw.position) && raw.position >= 0 && raw.position < 86400 &&
      Number.isFinite(raw.at) && Math.abs(Date.now() - raw.at) < 24 * 3600000
      ? raw : null;
  } catch {
    return null;
  }
}
