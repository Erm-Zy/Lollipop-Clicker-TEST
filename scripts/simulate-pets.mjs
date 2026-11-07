import {
  createState,
  getPps,
  getClickPower,
  prestige,
  buyStellarBoost,
  getStellarCost,
} from "../js/gameplay.js";
import { simulateJourney } from "./simulate-prestige.mjs";
import { hatchPets, equipBest } from "../js/pets/actions.js";
import { getPetBonuses } from "../js/pets/bonuses.js";
import { EGGS, STAGES, SPECIES } from "../js/pets/catalog.js";
import { fileURLToPath } from "node:url";

export function petJourneySimulation(collect = false) {
  const state = createState(1700000000000),
    rows = [];
  let sample = 17;
  // Fixed test-only sequence, never used by the game. Not a promise of player luck.
  const random = () => {
    sample = (Math.imul(sample, 1664525) + 1013904223) >>> 0;
    return sample / 4294967296;
  };
  for (const target of [1, 2, 3, 5, 10]) {
    const result = simulateJourney(state, target);
    if (collect) {
      const id = Object.keys(EGGS)
        .reverse()
        .find(
          (id) =>
            state.pets.unlockedEggs.includes(id) &&
            state.pirulitos >= EGGS[id].price * 3,
        );
      if (id) {
        hatchPets(state, id, 3, state.lastTick, { random });
        equipBest(state, "balanced", state.lastTick);
      }
    }
    const petBonus = getPetBonuses(state);
    const gain = prestige(state, state.lastTick);
    while (getStellarCost(state) <= state.prestigePoints)
      buyStellarBoost(state, state.lastTick);
    rows.push({
      target,
      seconds: result.seconds,
      historicalGain: gain,
      ownedPets: state.pets.inventory.length,
      petBonus,
    });
  }
  return rows;
}
export function balanceSnapshots() {
  const examples = [
    ["25 fábricas", { maquina: 15, calda: 8, fabrica: 2 }, 0, 0],
    [
      "100 fábricas",
      {
        maquina: 30,
        calda: 20,
        fabrica: 20,
        misturador: 15,
        embaladora: 10,
        laboratorio: 5,
      },
      3,
      1,
    ],
  ];
  return examples.map(([label, upgrades, prestigeLevel, stellarBoostLevel]) => {
    const s = createState(1700000000000);
    Object.assign(s.upgrades, upgrades);
    Object.assign(s, { prestigeLevel, stellarBoostLevel });
    return {
      label,
      pps: getPps(s),
      click: getClickPower(s),
      passiveSecondsPerEgg: Object.fromEntries(
        Object.entries(EGGS).map(([id, egg]) => [
          id,
          Math.round((egg.price / getPps(s)) * 100) / 100,
        ]),
      ),
    };
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(
    JSON.stringify(
      {
        model:
          "2 cliques/s esperados, política de fábricas/sabores por retorno marginal. Sem Arena, roleta, boost ou eventos. Colecionador compra até um lote ×3 com saldo real ao fim de cada marco, antes do prestígio; sem fusão automática. Amostra determinística, não sorte média garantida.",
        baseline: petJourneySimulation(false),
        collector: petJourneySimulation(true),
        snapshots: balanceSnapshots(),
        mythicalGiant: {
          normalCopies: STAGES[3].copies,
          expectedEggs: STAGES[3].copies / 0.01,
          expectedCost: (STAGES[3].copies / 0.01) * EGGS.celestial.price,
        },
        maximumTeamMultiplier:
          1 + 3 * STAGES[3].power * SPECIES.dragao_galactico.pps,
      },
      null,
      2,
    ),
  );
