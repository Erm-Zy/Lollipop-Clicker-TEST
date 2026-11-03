import { bootPage, format, setText } from "../ui/shared.js";
import { FLAVORS_DATA, SKINS_DATA } from "../data.js";
import { getPps, getClickPower, getTotalUpgradesCount } from "../gameplay.js";

const runtime = await bootPage("statistics");
function playedTime(seconds) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min ${total % 60} s`;
}
runtime.subscribe((state, info) => {
  const entries = {
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
    statPrestige: `${format(state.prestigeLevel)} · bônus de ${format(state.prestigeLevel * 15)}%`,
  };
  for (const [id, value] of Object.entries(entries)) setText(id, value);
});
