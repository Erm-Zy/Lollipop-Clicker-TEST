// Register only real local files. Examples for future songs: docs/MUSIC_GUIDE.md.
// worlds and bosses use zero-based IDs, matching the existing SVG/world selectors.
export const MUSIC_TRACKS = [
  {
    id: "original",
    title: "Trilha original do vale",
    file: "assets/audio/bmg1.ogg",
    artist: "", // Add an artist's credit only when it is known.
    categories: ["general"],
    worlds: [],
    bosses: [],
    randomEligible: true,
  },
];
export const ORIGINAL_TRACK_ID = "original";
export const MUSIC_MODES = {
  original: "Original",
  random: "Aleatório",
  world: "Mundo dinâmico",
  manual: "Manual",
};
export function isMusicPath(path) {
  return typeof path === "string" &&
    /^assets\/audio\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(ogg|mp3|m4a|aac|wav|webm)$/.test(path);
}
export function isTrackValid(track) {
  return Boolean(track && typeof track.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(track.id) &&
    typeof track.title === "string" && track.title.trim() && isMusicPath(track.file) &&
    Array.isArray(track.categories) && track.categories.length &&
    track.categories.every(category => ["general", "world", "boss", "special"].includes(category)) &&
    (track.artist === undefined || typeof track.artist === "string") &&
    typeof track.randomEligible === "boolean" &&
    ["worlds", "bosses"].every(field => track[field] === undefined ||
      (Array.isArray(track[field]) && track[field].every(id => Number.isInteger(id) && id >= 0 && id <= (field === "worlds" ? 3 : 2)))) &&
    (track.discovery === undefined || (track.discovery &&
      Number.isInteger(track.discovery.chapter) && track.discovery.chapter >= 0 && track.discovery.chapter <= 3)));
}
export function validTracks(catalog = MUSIC_TRACKS) {
  const ids = new Set();
  return catalog.filter(track => {
    if (!isTrackValid(track) || ids.has(track.id)) return false;
    ids.add(track.id);
    return true;
  });
}
export function musicUrl(track) {
  return new URL(`../../${track.file}`, import.meta.url).href;
}
