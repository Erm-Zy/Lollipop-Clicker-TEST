import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createState, prestige } from "../js/gameplay.js";
import { getWorldStage } from "../js/world.js";
import { MUSIC_TRACKS, isTrackValid, isMusicPath, validTracks } from "../js/music/catalog.js";
import { chooseTrack, musicPool } from "../js/music/selection.js";
import { createMusicPlayer } from "../js/music/player.js";
import {
  defaultMusicPreferences, validateMusicPreferences, loadMusicPreferences, discoverMusic,
  isDiscovered, MUSIC_PREFERENCE_KEY, MUSIC_SESSION_KEY,
} from "../js/music/preferences.js";
import { matchesCollectionFilter } from "../js/ui/qol.js";

const NOW = Date.now();
// Test-only catalog. These files are not active entries and no audio is generated.
const original = MUSIC_TRACKS[0];
const chapterTrack = { id: "vale", title: "Tema do Vale", file: "assets/audio/music/worlds/vale.ogg", categories: ["world"], worlds: [2], randomEligible: false, discovery: { chapter: 2 } };
const battleTrack = { id: "geleiao", title: "Batalha", file: "assets/audio/music/bosses/geleiao.ogg", categories: ["boss"], bosses: [0], randomEligible: false };
const generalTrack = { id: "another", title: "Outro tema", file: "assets/audio/music/general/outro.mp3", categories: ["general"], randomEligible: true };
const catalog = [original, chapterTrack, battleTrack, generalTrack];
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
class Media extends EventTarget {
  paused = true; currentTime = 0; duration = 120; volume = 1; src = ""; loop = false;
  calls = 0; loads = 0; reject = null;
  play() {
    this.calls++;
    if (this.reject) return Promise.reject(Object.assign(new Error(this.reject), { name: this.reject }));
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  load() { this.loads++; if (this.src) this.dispatchEvent(new Event("loadedmetadata")); }
  removeAttribute() { this.src = ""; }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
function setup(extra = {}) {
  const state = createState(NOW);
  const media = new Media();
  const storage = memory();
  const sessionStorage = memory();
  const flags = { owner: true, page: "home" };
  const notifications = [];
  const player = createMusicPlayer(() => state.settings, {
    storage, sessionStorage, catalog, createMedia: () => media, fadeMs: 0,
    getState: () => state, isOwner: () => flags.owner, getPage: () => flags.page,
    notify: message => notifications.push(message), random: () => 0, ...extra,
  });
  return { player, state, media, storage, sessionStorage, flags, notifications };
}

test("active catalog registers only valid unique local files that really exist", () => {
  assert.ok(MUSIC_TRACKS.some(track => track.id === "original" && track.file === "assets/audio/bmg1.ogg"));
  assert.equal(validTracks().length, MUSIC_TRACKS.length);
  assert.equal(new Set(MUSIC_TRACKS.map(track => track.id)).size, MUSIC_TRACKS.length);
  for (const track of MUSIC_TRACKS) {
    assert.equal(isTrackValid(track), true);
    assert.ok(existsSync(new URL(`../${track.file}`, import.meta.url)));
    assert.ok(readFileSync(new URL(`../${track.file}`, import.meta.url)).length > 1000);
  }
  for (const path of ["https://example.com/a.ogg", "../a.ogg", "assets/audio/../a.ogg", 'assets/audio/a".ogg']) assert.equal(isMusicPath(path), false);
  assert.equal(isTrackValid({ ...original, id: undefined }), false);
  assert.equal(isTrackValid({ ...original, worlds: [4] }), false);
  assert.equal(isTrackValid({ ...original, bosses: [3] }), false);
  assert.equal(isTrackValid({ ...original, discovery: { chapter: 4 } }), false);
  assert.equal(validTracks([original, original, { ...chapterTrack, file: "missing" }]).length, 1);
});

test("chapter selection retains exactly the existing 0/5/25/100 building thresholds", () => {
  const state = createState(NOW);
  for (const [count, chapter] of [[0,0],[4,0],[5,1],[24,1],[25,2],[99,2],[100,3],[10000,3]]) {
    state.upgrades.maquina = count;
    assert.equal(getWorldStage(state), chapter);
  }
});

test("random selection avoids the previous song when possible, and handles single/empty pools", () => {
  assert.equal(chooseTrack([original, generalTrack], "original", () => 0).id, "another");
  assert.equal(chooseTrack([original], "original").id, "original");
  assert.equal(chooseTrack([]), null);
  assert.equal(chooseTrack([original, generalTrack], null, () => 0.99).id, "another");
  assert.equal(chooseTrack([original], null, () => NaN).id, "original");
});

test("world, random and original pools use discovered tracks and fall back to real general music", () => {
  const state = createState(NOW);
  let prefs = defaultMusicPreferences();
  assert.equal(prefs.mode, "original");
  assert.deepEqual(musicPool(prefs, state, catalog).tracks.map(t => t.id), ["original"]);
  prefs.mode = "random";
  assert.deepEqual(musicPool(prefs, state, catalog).tracks.map(t => t.id), ["original","another"]);
  prefs.mode = "world";
  assert.deepEqual(musicPool(prefs, state, catalog).tracks.map(t => t.id), ["original","another"]);
  state.upgrades.maquina = 25;
  prefs = discoverMusic(prefs, state, catalog).preferences;
  assert.deepEqual(musicPool(prefs, state, catalog).tracks.map(t => t.id), ["vale"]);
});

test("battle soundtrack uses the real boss identity and only overrides manual with explicit opt-in", () => {
  const state = createState(NOW);
  state.boss = { maxHp: 100, hp: 100, endsAt: NOW + 30000 };
  const prefs = { ...defaultMusicPreferences(), mode: "world" };
  assert.equal(musicPool(prefs, state, catalog, { page: "arena" }).tracks[0].id, "geleiao");
  assert.equal(musicPool(prefs, state, catalog, { page: "home" }).context, "boss:0");
  state.bossesKilled = 1;
  assert.equal(musicPool(prefs, state, catalog, { page: "arena" }).context, "world:0");
  state.bossesKilled = 3;
  assert.equal(musicPool(prefs, state, catalog, { page: "arena" }).tracks[0].id, "geleiao");
  prefs.mode = "manual";
  assert.equal(musicPool(prefs, state, catalog, { page: "arena" }).tracks[0].id, "original");
  prefs.battleOverrides = true;
  assert.equal(musicPool(prefs, state, catalog, { page: "arena" }).tracks[0].id, "geleiao");
});

test("first-load discovery is silent, later chapters announce once, and prestige preserves music", () => {
  const { player, state, storage, notifications } = setup();
  player.sync();
  assert.deepEqual(notifications, []);
  state.upgrades.maquina = 25;
  player.sync(); player.sync();
  assert.equal(notifications.length, 1);
  assert.ok(notifications[0].includes("Vale das Engenhocas"));
  assert.ok(player.snapshot().discovered.includes("vale"));
  state.totalEarned = 1e6;
  assert.equal(prestige(state, NOW), 1);
  player.sync();
  assert.ok(player.snapshot().discovered.includes("vale"));
  assert.equal(JSON.parse(storage.getItem(MUSIC_PREFERENCE_KEY)).highestChapter, 2);
  assert.equal(storage.getItem("lollipopSave"), null);
  player.dispose();
});

test("existing players arriving in a later chapter receive a silent discovery baseline", () => {
  const state = createState(NOW); state.upgrades.maquina = 100;
  const prefs = discoverMusic(defaultMusicPreferences(), state, catalog, true);
  assert.equal(prefs.chapter, null);
  assert.deepEqual(prefs.newTracks, []);
  assert.equal(prefs.preferences.highestChapter, 3);
  assert.equal(isDiscovered(chapterTrack, prefs.preferences), true);
});

test("music stays disabled without requests/play attempts and preserves old toggle state", async () => {
  const { player, state, media } = setup();
  state.settings.music = false;
  const before = JSON.stringify(state);
  player.sync(); player.unlock(true); player.sync();
  await settle();
  assert.equal(media.calls, 0); assert.equal(media.loads, 0);
  assert.equal(player.snapshot().status, "disabled");
  assert.equal(JSON.stringify(state), before);
  state.settings.music = true;
  player.sync(); await settle();
  assert.equal(media.calls, 1);
  player.dispose();
});

test("one real track loops and repeated runtime syncs never restart it", async () => {
  const { player, media } = setup({ catalog: [original] });
  player.setPreferences({ mode: "random" });
  player.unlock(); await settle();
  for (let i = 0; i < 50; i++) player.sync();
  assert.equal(media.calls, 1); assert.equal(media.loads, 1); assert.equal(media.loop, true);
  assert.equal(player.snapshot().hasNext, false);
  player.setPreferences({ mode: "world" }); await settle();
  assert.equal(media.calls, 1);
  player.dispose();
});

test("autoplay rejection waits for a gesture and never retries every tick", async () => {
  const { player, media } = setup({ catalog: [original] });
  media.reject = "NotAllowedError";
  player.unlock(); await settle();
  assert.equal(player.snapshot().status, "interaction");
  for (let i=0;i<20;i++) player.sync();
  assert.equal(media.calls, 1);
  player.unlock(); await settle();
  assert.equal(media.calls, 2);
  player.unlock(); player.sync(); await settle();
  assert.equal(media.calls, 2);
  media.reject = null;
  player.unlock(true); await settle();
  assert.equal(media.calls, 3); assert.equal(player.snapshot().status, "playing");
  player.dispose();
});

test("unavailable tracks fall back once; a wholly unavailable catalog stays quiet", async () => {
  const { player, media } = setup();
  player.selectTrack("another"); await settle();
  media.dispatchEvent(new Event("error")); await settle();
  assert.equal(player.snapshot().trackId, "original");
  const calls = media.calls;
  for (let i=0;i<20;i++) player.sync();
  assert.equal(media.calls, calls);
  media.dispatchEvent(new Event("error")); await settle();
  assert.equal(player.snapshot().trackId, null);
  assert.equal(player.snapshot().status, "unavailable");
  const last = media.calls;
  player.sync(); player.sync();
  assert.equal(media.calls, last);
  player.dispose();
});

test("manual selection, volume and Arena transitions reuse a single media element", async () => {
  const { player, state, media, flags } = setup();
  player.selectTrack("another"); await settle();
  assert.equal(player.snapshot().preferences.mode, "manual");
  player.setPreferences({ volume: 0.6 });
  assert.equal(media.volume, 0.6);
  flags.page = "arena";
  state.boss = { maxHp:100, hp:100, endsAt:NOW+30000 };
  player.sync(); await settle();
  assert.equal(player.snapshot().trackId, "another");
  player.setPreferences({ battleOverrides: true }); await settle();
  assert.equal(player.snapshot().trackId, "geleiao");
  const loads = media.loads;
  for(let i=0;i<30;i++) { state.boss.hp--; player.sync(); }
  assert.equal(media.loads, loads);
  state.boss = null;
  player.sync(); await settle();
  assert.equal(player.snapshot().trackId, "another");
  assert.equal(media.volume, 0.6);
  player.dispose();
});

test("ownership and suspension gate playback and read-only preference writes", async () => {
  const { player, media, flags, storage } = setup();
  flags.owner = false;
  player.unlock(true); player.sync();
  assert.equal(media.calls, 0);
  assert.equal(storage.getItem(MUSIC_PREFERENCE_KEY), null);
  assert.equal(player.setPreferences({ volume:1 }), false);
  flags.owner = true;
  player.sync(); player.unlock(); await settle();
  assert.equal(media.paused, false);
  player.suspend(true);
  assert.equal(media.paused, true);
  for(let i=0;i<20;i++) player.sync();
  assert.equal(media.calls, 1);
  player.suspend(false); await settle();
  assert.equal(media.calls, 2);
  flags.owner = false; player.sync();
  assert.equal(media.paused, true);
  player.dispose();
});

test("page navigation restores selected track, mode and approximate playback position", async () => {
  const shared = memory(), sessionStorage = memory();
  const first = setup({ storage: shared, sessionStorage });
  first.player.selectTrack("another"); await settle();
  first.media.currentTime = 37.5;
  first.player.suspend(true); first.player.dispose();
  const record = JSON.parse(sessionStorage.getItem(MUSIC_SESSION_KEY));
  assert.equal(record.position, 37.5);
  const second = setup({ storage: shared, sessionStorage });
  second.player.sync(); await settle();
  assert.equal(second.player.snapshot().preferences.mode, "manual");
  assert.equal(second.player.snapshot().trackId, "another");
  assert.equal(second.media.currentTime, 37.5);
  second.player.dispose();
});

test("invalid or blocked preference storage never touches gameplay saves", () => {
  const invalid = memory({ [MUSIC_PREFERENCE_KEY]: "broken", lollipopSave:"important" });
  const { player } = setup({ storage: invalid });
  player.sync(); player.setPreferences({ volume: -100 });
  assert.equal(player.snapshot().preferences.volume, 0);
  assert.equal(invalid.getItem("lollipopSave"), "important");
  assert.equal(invalid.getItem(MUSIC_PREFERENCE_KEY), "broken");
  player.dispose();
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.equal(loadMusicPreferences(blocked).canSave, false);
  assert.equal(validateMusicPreferences({ version:1, mode:"__proto__", volume:Infinity }).mode, "original");
  assert.equal(validateMusicPreferences({ version:1, mode:{toString:null} }).mode, "original");
});

test("collection filters distinguish ownership and actual purchase ability across categories", () => {
  const owned = ["free", "neon"];
  assert.equal(matchesCollectionFilter("free", {cost:0}, owned, 0, "unlocked"), true);
  assert.equal(matchesCollectionFilter("free", {cost:0}, owned, 10000, "affordable"), false);
  assert.equal(matchesCollectionFilter("paid", {cost:2500}, owned, 2499, "affordable"), false);
  assert.equal(matchesCollectionFilter("paid", {cost:2500}, owned, 2500, "affordable"), true);
  assert.equal(matchesCollectionFilter("paid", {cost:2500}, owned, 0, "locked"), true);
  assert.equal(matchesCollectionFilter("neon", {cost:2500}, owned, 0, "locked"), false);
});

test("interrupted playback waits for an explicit retry instead of a timer loop", async () => {
  const { player, media } = setup({ catalog: [original] });
  media.reject = "AbortError";
  player.unlock(); await settle();
  assert.equal(player.snapshot().status, "interaction");
  for (let i=0;i<25;i++) player.sync();
  assert.equal(media.calls, 1);
  player.dispose();
});

test("entering random mode chooses another eligible song when there are alternatives", async () => {
  const { player, media } = setup({ catalog: [original, generalTrack] });
  player.unlock(); await settle();
  player.setPreferences({ mode: "random" }); await settle();
  assert.equal(player.snapshot().trackId, "another");
  media.paused = true;
  media.dispatchEvent(new Event("ended")); await settle();
  assert.equal(player.snapshot().trackId, "original");
  player.dispose();
});
