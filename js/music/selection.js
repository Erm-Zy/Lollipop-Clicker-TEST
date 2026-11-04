import { ORIGINAL_TRACK_ID } from "./catalog.js";
import { isDiscovered } from "./preferences.js";
import { getWorldStage, getBossIdentity } from "../world.js";

export function chooseTrack(tracks, previousId = null, random = Math.random) {
  if (!tracks.length) return null;
  const candidates = tracks.length > 1 ? tracks.filter(track => track.id !== previousId) : tracks;
  const sample = random();
  const index = Number.isFinite(sample) ? Math.min(candidates.length - 1, Math.max(0, Math.floor(sample * candidates.length))) : 0;
  return candidates[index];
}
export function musicPool(preferences, state, catalog, { failed = new Set() } = {}) {
  const available = catalog.filter(track => !failed.has(track.id) && isDiscovered(track, preferences));
  const original = available.filter(track => track.id === ORIGINAL_TRACK_ID);
  const general = available.filter(track => track.categories.includes("general"));
  const fallback = general.length ? general : original;
  const chapter = getWorldStage(state);
  const bossId = getBossIdentity(state);
  const canOverride = preferences.mode === "world" || (preferences.mode === "manual" && preferences.battleOverrides);
  const battle = state.boss && canOverride
    ? available.filter(track => track.bosses?.includes(bossId)) : [];
  let tracks, context;
  if (battle.length) {
    tracks = battle;
    context = `boss:${bossId}`;
  } else if (preferences.mode === "original") {
    tracks = original.length ? original : fallback;
    context = "original";
  } else if (preferences.mode === "manual") {
    tracks = available.filter(track => track.id === preferences.manualTrackId);
    if (!tracks.length) tracks = original.length ? original : fallback;
    context = `manual:${preferences.manualTrackId}`;
  } else if (preferences.mode === "random") {
    tracks = available.filter(track => track.randomEligible);
    if (!tracks.length) tracks = fallback;
    context = "random";
  } else {
    tracks = available.filter(track => track.worlds?.includes(chapter));
    if (!tracks.length) tracks = fallback;
    context = `world:${chapter}`;
  }
  return { tracks, context, key: `${preferences.mode}/${context}/${tracks.map(track => track.id).join(",")}` };
}
