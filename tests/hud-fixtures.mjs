// Disposable visual fixtures built/validated by the real state helpers. No live saves.
import { createState } from "../js/gameplay.js";
import { validateState } from "../js/storage.js";
import {
  UPGRADES_DATA,
  FLAVORS_DATA,
  SKINS_DATA,
  ACHIEVEMENTS_DATA,
} from "../js/data.js";
import { SPECIES } from "../js/pets/catalog.js";
export function hudFixtures(now = Date.now()) {
  const fresh = createState(now);
  const mid = createState(now),
    late = createState(now);
  Object.assign(mid, {
    pirulitos: 2e8,
    totalEarned: 5e9,
    prestigeLevel: 10,
    prestigeClaimed: 10,
    prestigePoints: 8,
    stellarBoostLevel: 1,
  });
  Object.keys(UPGRADES_DATA).forEach(
    (id, i) => (mid.upgrades[id] = i < 3 ? 10 : 2),
  );
  Object.assign(late, {
    pirulitos: 1e15,
    totalEarned: 2e15,
    prestigeLevel: 1000,
    prestigeClaimed: 1000,
    prestigePoints: 950,
    stellarBoostLevel: 5,
  });
  Object.keys(UPGRADES_DATA).forEach((id) => (late.upgrades[id] = 12));
  for (const [state, count] of [
    [mid, 6],
    [late, 12],
  ]) {
    state.unlockedFlavors = Object.keys(FLAVORS_DATA);
    state.unlockedSkins = Object.keys(SKINS_DATA);
    state.unlockedAchievements = ACHIEVEMENTS_DATA.map((a) => a.id);
    state.pets.inventory = Array.from({ length: count }, (_, i) => ({
      id: `pet-${i + 1}`,
      speciesId: Object.keys(SPECIES)[i % 6],
      stage: i < 3 ? 2 : 0,
      acquiredAt: now - 60000 + i,
      favorite: i === 0,
      locked: i === 1,
    }));
    state.pets.equipped = ["pet-1", "pet-2", "pet-3"];
    state.pets.nextId = count + 1;
    state.pets.stats.hatched = count;
  }
  for (const s of [fresh, mid, late])
    Object.assign(s.settings, {
      music: false,
      sfx: false,
      particles: false,
      reducedMotion: true,
    });
  return Object.fromEntries(
    Object.entries({ fresh, mid, late }).map(([k, s]) => [
      k,
      validateState(s, now),
    ]),
  );
}
console.log(JSON.stringify(hudFixtures()));
