// Deterministic expected-rate economy scenarios, using real prices and gameplay actions.
import {
  createState, getPps, getClickPower, getUpgradeCost, buyUpgrade, addCurrency,
  selectFlavor, advance, prestige, buyStellarBoost, buyFactoryExpansion,
  getFactoryCapacity, getStellarCost, getExpansionCost,
} from "../js/gameplay.js";
import { UPGRADES_DATA, FLAVORS_DATA, FACTORY_CAPACITIES } from "../js/data.js";
import { prestigeThreshold } from "../js/progression.js";

const NOW = 1_800_000_000_000;
const income = (s, cps) => getPps(s, s.lastTick) + cps * getClickPower(s, s.lastTick);
function wait(s, seconds, cps) {
  while (seconds > 1e-8) {
    const slice = Math.min(seconds, 8 * 3600);
    const clicks = cps * slice;
    advance(s, s.lastTick + slice * 1000);
    addCurrency(s, clicks * getClickPower(s, s.lastTick));
    s.totalClicks += clicks;
    seconds -= slice;
  }
}
export function simulateJourney(s, targetLevel, cps = 2) {
  const started = s.lastTick;
  const goal = prestigeThreshold(targetLevel);
  let iterations = 0;
  while (s.totalEarned < goal && iterations++ < 20000) {
    const free = Object.keys(FLAVORS_DATA).filter(id => s.unlockedFlavors.includes(id));
    const bestFlavor = free.sort((a,b) => income({...s,activeFlavor:b},cps)-income({...s,activeFlavor:a},cps))[0];
    if (bestFlavor !== s.activeFlavor) selectFlavor(s,bestFlavor,s.lastTick);
    const rate = income(s,cps);
    const choices = [];
    for (const [key, data] of Object.entries(UPGRADES_DATA)) {
      const cost = getUpgradeCost(s,key);
      if (!Number.isFinite(cost)) continue;
      const clone = { ...s, upgrades: {...s.upgrades, [key]:s.upgrades[key]+1} };
      choices.push({cost, gain:income(clone,cps)-rate, buy:()=>buyUpgrade(s,key,s.lastTick)});
    }
    for (const [id, data] of Object.entries(FLAVORS_DATA)) {
      if (s.unlockedFlavors.includes(id)) continue;
      choices.push({cost:data.cost, gain:income({...s,activeFlavor:id},cps)-rate, buy:()=>selectFlavor(s,id,s.lastTick)});
    }
    const best = choices.filter(c=>c.gain>0).sort((a,b)=>a.cost/a.gain-b.cost/b.gain)[0];
    const untilGoal = Math.max(0,(goal-s.totalEarned)/rate);
    const untilBuy = best ? Math.max(0,(best.cost-s.pirulitos)/rate) : Infinity;
    if (untilGoal <= untilBuy) { wait(s,untilGoal + 0.001,cps); break; }
    wait(s,untilBuy + 0.001,cps);
    if (!best.buy()) throw new Error('Simulation purchase failed');
  }
  if (s.totalEarned < goal) throw new Error('Simulation did not reach milestone');
  return { seconds:Math.round((s.lastTick-started)/1000), owned:{...s.upgrades},
    full:Object.keys(UPGRADES_DATA).filter(k=>s.upgrades[k]>=getFactoryCapacity(s,k)), pps:Math.round(getPps(s,s.lastTick)) };
}
export function scenario(policy, capacities = FACTORY_CAPACITIES) {
  const previous={...FACTORY_CAPACITIES};
  Object.assign(FACTORY_CAPACITIES, capacities);
  const s=createState(NOW);selectFlavor(s,'blueberry',NOW);
  const rows=[];
  for(const target of [1,2,3,5,10,30,60,100]) {
    const trip=simulateJourney(s,target);
    const gain=prestige(s,s.lastTick);
    if(policy==='capacity-first') {
      const key=trip.full.sort((a,b)=>UPGRADES_DATA[b].basePps-UPGRADES_DATA[a].basePps)[0];
      if(key && getExpansionCost(s,key)<=s.prestigePoints) buyFactoryExpansion(s,key,s.lastTick);
    }
    while(getStellarCost(s)<=s.prestigePoints) buyStellarBoost(s,s.lastTick);
    rows.push({target,gain,...trip,stellar:s.stellarBoostLevel,points:s.prestigePoints,expansions:{...s.factoryExpansions}});
  }
  Object.assign(FACTORY_CAPACITIES,previous);
  return rows;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const selected={...FACTORY_CAPACITIES};
  const proposed={maquina:100,calda:85,fabrica:70,misturador:60,embaladora:50,laboratorio:40,linha:30,superfabrica:20};
  const lower=selected;
  const result={model:'Expected continuous 2 clicks/s; ROI-greedy purchases/free flavor selection; no Arena, wheel, boosts, offline grants or sugar-event claims.',
    proposed:{stellar:scenario('stellar-first',proposed),expansions:scenario('capacity-first',proposed)},
    comparison:{capacities:lower,stellar:scenario('stellar-first',lower),expansions:scenario('capacity-first',lower)}};
  Object.assign(FACTORY_CAPACITIES,selected);
  const late=createState(NOW);
  Object.assign(late,{prestigeLevel:1090,prestigeClaimed:1090,prestigePoints:1090,totalEarned:prestigeThreshold(1090),prestigeBaseline:prestigeThreshold(1090)});
  late.unlockedFlavors.push('lendario');selectFlavor(late,'lendario',late.lastTick);
  for(let n=0;n<20;n++)buyStellarBoost(late,late.lastTick);
  for(const key of Object.keys(late.upgrades))for(let n=0;n<10;n++)buyFactoryExpansion(late,key,late.lastTick);
  result.late={historicalLevel:1090,pointsRemaining:late.prestigePoints,next:simulateJourney(late,1091)};
  console.log(JSON.stringify(result,null,2));
}
