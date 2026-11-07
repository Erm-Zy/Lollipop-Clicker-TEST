import test from "node:test";
import assert from "node:assert/strict";
import * as game from "../js/gameplay.js";
import { prestigeThreshold } from "../js/progression.js";
import { FACTORY_CAPACITIES, UPGRADES_DATA, PRESTIGE_CONFIG, MAX_VALUE, SAVE_VERSION } from "../js/data.js";
import { validateState, loadGame, saveGame, SAVE_KEY, BACKUP_KEY, V3_BACKUP_KEY, PRE_PRESTIGE_BACKUP_KEY, IncompatibleLegacySaveError } from "../js/storage.js";
import { shopOffer, buildingContribution, previewFlavor } from "../js/ui/qol.js";
import { simulateJourney } from "../scripts/simulate-prestige.mjs";
const NOW=1_800_000_000_000;
function memory(initial={}) { const map=new Map(Object.entries(initial)); return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))}; }
function entitled(level=5000) { const s=game.createState(NOW);Object.assign(s,{prestigeLevel:level,prestigeClaimed:level,prestigePoints:level,totalEarned:prestigeThreshold(level),prestigeBaseline:prestigeThreshold(level)});return s; }
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-10,`${a} != ${b}`);

test("new journey starts at zero and multiple levels award an equal number of points only once",()=>{
 const s=game.createState(NOW);assert.equal(game.getPrestigeProgress(s).percent,0);
 game.addCurrency(s,500000);assert.equal(game.getPrestigeProgress(s).percent,50);
 game.addCurrency(s,26500000);assert.equal(game.getPrestigeProgress(s).percent,100);
 assert.equal(game.prestige(s,NOW),3);assert.equal(s.prestigePoints,3);assert.equal(s.prestigeLevel,3);
 assert.equal(s.totalEarned,27000000);assert.equal(game.getPrestigeProgress(s).percent,0);
 assert.equal(game.prestige(s,NOW),false);assert.equal(s.prestigePoints,3);
 const storage=memory();saveGame(storage,s);const loaded=loadGame(storage,NOW).state;
 assert.equal(game.prestige(loaded,NOW),false);assert.equal(loaded.prestigePoints,3);assert.equal(game.getPrestigeProgress(loaded).percent,0);
});
test("215.2 billion near the 216 billion milestone resets from lifetime fullness to a fresh journey",()=>{
 const s=entitled(58);s.totalEarned=215200000000;s.pirulitos=1234;
 assert.equal(game.prestige(s,NOW),1);assert.equal(s.prestigeLevel,59);
 const p=game.getPrestigeProgress(s);assert.equal(p.percent,0);assert.equal(p.earned,0);assert.equal(p.threshold,216000000000);assert.equal(p.remaining,800000000);
 game.addCurrency(s,400000000);assert.equal(game.getPrestigeProgress(s).percent,50);
 game.addCurrency(s,400000000);assert.equal(game.getPrestigeProgress(s).percent,100);
 assert.equal(s.totalEarned,216000000000);
 const reloaded=validateState(JSON.parse(JSON.stringify(s)),NOW);assert.equal(game.getPrestigeProgress(reloaded).percent,100);
});
test("milestone cube rounding and very large values remain finite and bounded",()=>{
 for(const level of [1,2,3,35,59,60,999,1000000,1000000000]) {
  const s=game.createState(NOW);s.totalEarned=prestigeThreshold(level);
  assert.equal(game.getPrestigeTarget(s),level);assert.equal(game.getPrestigeProgress(s).percent,100);
 }
 const s=game.createState(NOW);s.totalEarned=MAX_VALUE;
 assert.equal(game.getPrestigeTarget(s),PRESTIGE_CONFIG.maxLevel);
 assert.equal(game.prestige(s,NOW),PRESTIGE_CONFIG.maxLevel);
 assert.ok(Number.isSafeInteger(s.prestigePoints));
 for(const value of Object.values(game.getPrestigeProgress(s))) if(typeof value==='number') assert.ok(Number.isFinite(value));
 assert.equal(game.prestige(s,NOW),false);
});
test("stellar purchases debit points atomically without touching level, claims or ordinary balance",()=>{
 const s=entitled(3);s.pirulitos=123;
 assert.deepEqual(game.buyStellarBoost(s,NOW),{cost:1,level:1});assert.equal(s.prestigePoints,2);
 assert.deepEqual(game.buyStellarBoost(s,NOW),{cost:2,level:2});assert.equal(s.prestigePoints,0);
 const before=JSON.stringify(s);assert.equal(game.buyStellarBoost(s,NOW),false);assert.equal(JSON.stringify(s),before);
 assert.equal(s.prestigeLevel,3);assert.equal(s.prestigeClaimed,3);assert.equal(s.pirulitos,123);
});
test("stellar reaches level 20 with a total price of 210 points and cannot be overbought",()=>{
 const s=entitled(210);for(let i=0;i<20;i++){assert.equal(game.getStellarCost(s),i+1);assert.ok(game.buyStellarBoost(s,NOW));}
 assert.equal(s.prestigePoints,0);assert.equal(game.getStellarMultiplier(s),2);assert.equal(game.buyStellarBoost(s,NOW),false);
 s.prestigePoints=NaN;assert.equal(game.buyStellarBoost(s,NOW),false);
});
test("click, PPS, shop contribution, flavor preview and offline production apply Stellar once",()=>{
 const s=entitled(3);game.buyStellarBoost(s,NOW);s.upgrades.calda=2;s.boostEndTime=NOW+10000;
 const permanent=(1+3*.15)*1.05;
 near(game.getPrestigeMultiplier(s),permanent);near(game.getPps(s,NOW),8*permanent*2);near(game.getClickPower(s,NOW),2*permanent*2);
 near(buildingContribution(s,'calda',NOW),game.getPps(s,NOW));near(previewFlavor(s,'limao',NOW).preview.pps,8*1.2*permanent*2);
 const before=s.pirulitos;game.advance(s,NOW+20000,{offline:true});near(s.pirulitos-before,8*permanent*30);
});
test("buying Stellar settles production using the old multiplier before the transaction",()=>{
 const s=entitled(1);s.upgrades.calda=1;game.buyStellarBoost(s,NOW+10000);
 near(s.pirulitos,4*1.15*10);near(game.getPps(s,NOW+10000),4*1.15*1.05);
});
test("every factory starts with its configured capacity and expansion levels remain independent",()=>{
 const s=entitled();for(const key of Object.keys(UPGRADES_DATA))assert.equal(game.getFactoryCapacity(s,key),FACTORY_CAPACITIES[key]);
 game.buyFactoryExpansion(s,'maquina',NOW);assert.equal(game.getFactoryCapacity(s,'maquina'),FACTORY_CAPACITIES.maquina+10);
 assert.equal(game.getFactoryCapacity(s,'calda'),FACTORY_CAPACITIES.calda);
 for(const key of ['__proto__','constructor','unknown'])assert.equal(game.buyFactoryExpansion(s,key,NOW),false);
});
for(const key of Object.keys(UPGRADES_DATA))test(`${key}: all purchase modes respect the final slots without partial fixed purchases`,()=>{
 const s=game.createState(NOW);s.pirulitos=MAX_VALUE;s.upgrades[key]=FACTORY_CAPACITIES[key]-5;
 const before=s.upgrades[key];assert.equal(game.buyBulk(s,key,10,NOW),false);assert.equal(game.buyBulk(s,key,100,NOW),false);assert.equal(s.upgrades[key],before);
 const quote=game.getBulkQuote(s,key,'max');assert.equal(quote.quantity,5);
 assert.ok(game.buyBulk(s,key,'max',NOW));assert.equal(s.upgrades[key],FACTORY_CAPACITIES[key]);
 assert.equal(game.getUpgradeCost(s,key),Infinity);assert.equal(game.buyBulk(s,key,1,NOW),false);
 assert.deepEqual(game.getBulkQuote(s,key,'max'),{quantity:0,cost:0});
 const offer=shopOffer(s,key,'max',NOW);assert.equal(offer.capacityBlocked,true);assert.equal(offer.seconds,null);assert.equal(offer.missing,0);
});
test("fixed batches can buy exactly 10 or 100 remaining slots when expansions allow it",()=>{
 const s=entitled();s.pirulitos=MAX_VALUE;s.factoryExpansions.maquina=10;s.upgrades.maquina=game.getFactoryCapacity(s,'maquina')-100;
 assert.equal(game.buyBulk(s,'maquina',100,NOW).quantity,100);
 s.upgrades.maquina-=10;assert.equal(game.buyBulk(s,'maquina',10,NOW).quantity,10);
 s.upgrades.maquina--;assert.ok(game.buyUpgrade(s,'maquina',NOW));assert.equal(game.buyUpgrade(s,'maquina',NOW),false);
});
test("MAX remains limited by actual money as well as remaining capacity",()=>{
 const s=game.createState(NOW);s.pirulitos=32;
 assert.deepEqual(game.getBulkQuote(s,'maquina','max'),{quantity:2,cost:32});assert.ok(game.buyBulk(s,'maquina','max',NOW));assert.equal(s.pirulitos,0);
});
test("expansions cost 2/4/.../20 and persist with Stellar, points and lifetime history through rebirth",()=>{
 const s=entitled();for(let i=0;i<10;i++){assert.equal(game.getExpansionCost(s,'maquina'),(i+1)*2);assert.ok(game.buyFactoryExpansion(s,'maquina',NOW));}
 assert.equal(game.buyFactoryExpansion(s,'maquina',NOW),false);assert.equal(s.prestigePoints,4890);
 game.buyStellarBoost(s,NOW);s.upgrades.maquina=100;s.totalEarned=prestigeThreshold(5001);s.pirulitos=123;s.wheelClickBonus=100;s.boostEndTime=NOW+1000;game.startBoss(s,NOW);
 const points=s.prestigePoints;assert.equal(game.prestige(s,NOW),1);
 assert.equal(s.prestigePoints,points+1);assert.equal(s.stellarBoostLevel,1);assert.equal(s.factoryExpansions.maquina,10);assert.equal(s.upgrades.maquina,0);
 assert.equal(game.getFactoryCapacity(s,'maquina'),FACTORY_CAPACITIES.maquina+100);assert.equal(s.boss,null);assert.equal(s.boostEndTime,0);assert.equal(s.wheelClickBonus,0);
 const loaded=validateState(JSON.parse(JSON.stringify(s)),NOW);assert.equal(loaded.prestigePoints,s.prestigePoints);assert.equal(loaded.factoryExpansions.maquina,10);assert.equal(loaded.stellarBoostLevel,1);
});
test("capacity failure has a distinct UI quote and no affordability countdown",()=>{
 const s=game.createState(NOW);s.upgrades.maquina=FACTORY_CAPACITIES.maquina-5;s.upgrades.calda=1;
 const offer=shopOffer(s,'maquina',10,NOW);assert.equal(offer.room,5);assert.equal(offer.capacityBlocked,true);assert.equal(offer.available,false);assert.equal(offer.seconds,null);
});
test("schema 3 within capacity migrates points once, retains cosmetics and creates a raw backup",()=>{
 const raw=JSON.stringify({version:3,totalEarned:215200000000,prestigeLevel:59,prestigeClaimed:59,upgrades:{maquina:10},lastTick:NOW,activeFlavor:'blueberry',activeSkin:'neon',activeTheme:'gold',activeParticles:'ice',unlockedSkins:['classic','neon','gold','ice']});
 const storage=memory({[SAVE_KEY]:raw});const loaded=loadGame(storage,NOW);
 assert.equal(loaded.canSave,true);assert.equal(loaded.state.version,4);assert.equal(loaded.state.prestigePoints,59);assert.equal(loaded.state.prestigeBaseline,215200000000);
 assert.equal(loaded.state.activeTheme,'gold');assert.equal(loaded.state.activeParticles,'ice');assert.equal(storage.getItem(V3_BACKUP_KEY),raw);
 game.buyStellarBoost(loaded.state,NOW);saveGame(storage,loaded.state);
 const again=loadGame(storage,NOW).state;assert.equal(again.prestigePoints,58);assert.equal(again.stellarBoostLevel,1);
});
test("only incompatible old factory quantities trigger the authorized one-time beta reset",()=>{
 const raw=JSON.stringify({version:3,pirulitos:999,totalEarned:999,upgrades:{maquina:1000}});
 const storage=memory({[SAVE_KEY]:raw,unrelated:'keep'});const result=loadGame(storage,NOW);
 assert.equal(result.prestigeReset,true);assert.equal(result.canSave,true);assert.equal(result.state.version,4);assert.equal(result.state.pirulitos,0);
 assert.equal(storage.getItem(PRE_PRESTIGE_BACKUP_KEY),raw);assert.equal(storage.getItem('unrelated'),'keep');assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).version,4);
 assert.ok(result.warnings[0].includes('reiniciada'));const again=loadGame(storage,NOW);assert.equal(again.prestigeReset,undefined);assert.equal(again.warnings.length,0);
 assert.throws(()=>validateState(JSON.parse(raw),NOW),IncompatibleLegacySaveError);
});
test("reset storage failure or read-only loading preserves the raw primary",()=>{
 const raw=JSON.stringify({version:3,upgrades:{maquina:1000}});
 for(const setItem of [()=>{},()=>{throw Error('quota')}]){
  const storage={getItem:k=>k===SAVE_KEY?raw:null,setItem};const result=loadGame(storage,NOW);
  assert.equal(result.canSave,false);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(result.prestigeReset,undefined);
 }
});
test("corruption is not a beta reset and an incompatible backup cannot revive old progression",()=>{
 const old=JSON.stringify({version:3,upgrades:{maquina:1000}});
 const storage=memory({[SAVE_KEY]:'broken',[BACKUP_KEY]:old});const result=loadGame(storage,NOW);
 assert.equal(result.canSave,false);assert.equal(result.prestigeReset,undefined);assert.equal(storage.getItem(SAVE_KEY),'broken');assert.equal(result.state.upgrades.maquina,0);
});
test("validation bounds points by historical earnings minus actual upgrade cost",()=>{
 const s=validateState({version:4,totalEarned:27000000,prestigeLevel:3,prestigeClaimed:3,prestigePoints:1e100,stellarBoostLevel:999,factoryExpansions:{maquina:999,__proto__:10},prestigeBaseline:Infinity},NOW);
 assert.equal(s.stellarBoostLevel,2);assert.equal(s.prestigePoints,0);assert.equal(s.factoryExpansions.maquina,0);assert.equal(s.prestigeBaseline,s.totalEarned);
 const missing=validateState({version:4,prestigeLevel:10,totalEarned:1e9},NOW);assert.equal(missing.prestigePoints,0);assert.equal(game.getPrestigeGain(missing),0);
 const array=validateState({version:4,prestigeLevel:10,factoryExpansions:[10,10],prestigePoints:-100,stellarBoostLevel:-1,prestigeBaseline:-1},NOW);
 assert.equal(array.prestigePoints,0);assert.equal(array.stellarBoostLevel,0);assert.deepEqual(Object.values(array.factoryExpansions),Array(8).fill(0));
});
test("deterministic early simulation reaches prestige and can fund the first permanent boost",()=>{
 const s=game.createState(NOW);game.selectFlavor(s,'blueberry',NOW);const result=simulateJourney(s,1);
 assert.ok(result.seconds>0&&result.seconds<1200);assert.ok(Object.values(result.owned).some(n=>n>0));assert.equal(game.prestige(s,s.lastTick),1);assert.ok(game.buyStellarBoost(s,s.lastTick));
});

test("unaffordable permanent purchases leave even the elapsed clock unchanged",()=>{
 const s=game.createState(NOW);s.upgrades.calda=2;
 const before=JSON.stringify(s);
 assert.equal(game.buyStellarBoost(s,NOW+10000),false);
 assert.equal(game.buyFactoryExpansion(s,'calda',NOW+10000),false);
 assert.equal(JSON.stringify(s),before);
});
