import { bootPage, format, setText } from "../ui/shared.js";
import { FLAVORS_DATA, SKINS_DATA, PRESTIGE_CONFIG } from "../data.js";
import { getPps, getClickPower, getTotalUpgradesCount, getPrestigeMultiplier } from "../gameplay.js";

import { getPetBonuses } from "../pets/bonuses.js";

const runtime = await bootPage("statistics");
function playedTime(seconds) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min ${total % 60} s`;
}
runtime.subscribe((state, info) => {
  const entries = {
    statPets: `${state.pets.inventory.length} pets · ${state.pets.stats.hatched} ovos · ${state.pets.stats.fused} fusões · ${state.pets.discovered.length}/72 descobertas`,
    statPetBonus: `+${format(getPetBonuses(state).click*100)}% cliques · +${format(getPetBonuses(state).pps*100)}% PPS`,
    statCurrent: `${format(state.pirulitos)} pirulitos`,
    statTotalEarned: `${format(state.totalEarned)} pirulitos`,
    statPps: `${format(getPps(state, info.now))} / seg`,
    statClickPower: `${format(getClickPower(state, info.now))} / clique`,
    statTotalClicks: format(state.totalClicks),
    statTimePlayed: playedTime(state.timePlayed),
    statWheelSpins: format(state.wheelSpins),
    statBoostsObtained: format(state.boostsObtained),
    statFlavorsUnlocked: `${state.unlockedFlavors.length} de ${Object.keys(FLAVORS_DATA).length}`,
    statSkinsUnlocked: `${state.unlockedSkins.length} de ${Object.keys(SKINS_DATA).length}`,
    statUpgradesBought: format(getTotalUpgradesCount(state)),
    statMaxScore: `${format(state.maxScore)} pirulitos`,
    statMaxPps: `${format(state.maxPps)} / seg`,
    statBossesKilled: format(state.bossesKilled),
    statPrestige: `${format(state.prestigeLevel)} níveis · ×${format(getPrestigeMultiplier(state))}` ,
    statPrestigePoints: format(state.prestigePoints),
    statStellar: `${state.stellarBoostLevel} / ${PRESTIGE_CONFIG.stellar.maxLevel}`,
  };
  for (const [id, value] of Object.entries(entries)) setText(id, value);
});
