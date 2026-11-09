// Independent disposable fixtures; never read any real player's storage.
import { createState } from "../js/gameplay.js";
import { validateState } from "../js/storage.js";
import { SPECIES } from "../js/pets/catalog.js";
import { ACHIEVEMENTS_DATA, UPGRADES_DATA } from "../js/data.js";
const now = Date.now(),
  result = {};
for (const [name, level, count] of [
  ["fresh", 0, 0],
  ["mid", 60, 36],
  ["late", 1000, 144],
]) {
  const s = createState(now);
  Object.assign(s, {
    pirulitos: level ? 1.3476e11 : 0,
    totalEarned: level ? Math.max(1.3476e11, level ** 3 * 1e6) : 0,
    prestigeLevel: level,
    prestigeClaimed: level,
    prestigePoints: level,
    totalClicks: level ? 1000 : 0,
    bossesKilled: level ? 5 : 0,
  });
  if (level) Object.keys(UPGRADES_DATA).forEach((k) => (s.upgrades[k] = 12));
  s.unlockedAchievements = level
    ? ACHIEVEMENTS_DATA.slice(0, name === "late" ? 13 : 8).map((a) => a.id)
    : [];
  s.pets.inventory = Array.from({ length: count }, (_, i) => ({
    id: `pet-${i + 1}`,
    speciesId: Object.keys(SPECIES)[i % 18],
    stage: name === "late" ? Math.floor(i / 18) % 4 : i < 18 ? 0 : 1,
    acquiredAt: now - 100000 + i,
    favorite: i === 0,
    locked: i === 1,
  }));
  s.pets.nextId = count + 1;
  s.pets.equipped = count ? ["pet-1", "pet-2", "pet-3"] : [];
  s.pets.stats.hatched = count;
  Object.assign(s.settings, {
    music: false,
    sfx: false,
    particles: false,
    reducedMotion: true,
  });
  result[name] = validateState(s, now);
}
console.log(JSON.stringify(result));
