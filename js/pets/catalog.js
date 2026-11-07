// Stable content IDs; translated names and future illustrations may change independently.
export const PET_CAPACITY = 500;
export const PET_SLOTS = 3;
export const HATCH_GAP_MS = 350;
export const RARITIES = {
  common: { name: "Comum", mark: "●", rank: 0 },
  uncommon: { name: "Incomum", mark: "◆", rank: 1 },
  rare: { name: "Raro", mark: "✦", rank: 2 },
  epic: { name: "Épico", mark: "✧", rank: 3 },
  legendary: { name: "Lendário", mark: "♛", rank: 4 },
  mythic: { name: "Mítico", mark: "★", rank: 5 },
};
export const STAGES = [
  { name: "Normal", power: 1, copies: 1 },
  { name: "Médio", power: 2, copies: 5 },
  { name: "Grande", power: 4, copies: 25 },
  { name: "Gigante", power: 8, copies: 125 },
];
export const EGGS = {
  acucarado: {
    name: "Ovo Açucarado",
    price: 1500,
    unlockStage: 0,
    colors: ["#ffb8cf", "#dd679e"],
    theme: "Doces, frutas e amigos fofinhos",
    weights: { common: 120, uncommon: 60, rare: 18, epic: 2 },
  },
  cristalizado: {
    name: "Ovo Cristalizado",
    price: 1000000,
    unlockStage: 2,
    requiredFactory: "laboratorio",
    requiredCount: 1,
    requiredPrestige: 0,
    colors: ["#aff6f4", "#609edb"],
    theme: "Gelo doce e cristais de açúcar",
    weights: { uncommon: 100, rare: 70, epic: 24, legendary: 6 },
  },
  celestial: {
    name: "Ovo Celestial",
    price: 5000000000,
    unlockStage: 3,
    requiredFactory: "superfabrica",
    requiredCount: 10,
    requiredPrestige: 10,
    colors: ["#ddbfff", "#8b76dc"],
    theme: "Estrelas, luas e doces cósmicos",
    weights: { rare: 130, epic: 50, legendary: 18, mythic: 2 },
  },
};
const rows = [
  ["balinha", "Balinha Saltitante", "acucarado", "common", "candy", "#ff91b5"],
  ["marshmelinho", "Marshmelinho", "acucarado", "common", "marsh", "#ffe7e9"],
  ["goma", "Ursinho de Goma", "acucarado", "uncommon", "bear", "#a4e5a0"],
  [
    "raposa_morango",
    "Raposa de Morango",
    "acucarado",
    "rare",
    "fox",
    "#ff818a",
  ],
  [
    "guardiao_pirulito",
    "Guardião Pirulito",
    "acucarado",
    "epic",
    "guardian",
    "#f6bd6e",
  ],
  ["cubinho", "Cubinho Gelado", "cristalizado", "uncommon", "cube", "#9cdef6"],
  [
    "gotinha",
    "Gotinha de Cristal",
    "cristalizado",
    "uncommon",
    "drop",
    "#9ef3ed",
  ],
  [
    "coelho_quartzo",
    "Coelho de Quartzo",
    "cristalizado",
    "rare",
    "rabbit",
    "#eac9f9",
  ],
  ["raposa_geada", "Raposa de Geada", "cristalizado", "rare", "fox", "#afdbff"],
  [
    "coruja_prismatica",
    "Coruja Prismática",
    "cristalizado",
    "epic",
    "owl",
    "#b9b3ff",
  ],
  [
    "dragao_cristalino",
    "Dragão Cristalino",
    "cristalizado",
    "legendary",
    "dragon",
    "#9ce5df",
  ],
  ["estrelinha", "Estrelinha Doce", "celestial", "rare", "star", "#ffe8a1"],
  ["cometinha", "Cometinha", "celestial", "rare", "comet", "#ffbcaf"],
  ["coelho_lunar", "Coelho Lunar", "celestial", "epic", "rabbit", "#e5ddff"],
  ["raposa_nebulosa", "Raposa Nebulosa", "celestial", "epic", "fox", "#c89df3"],
  ["fenix", "Fênix Açucarada", "celestial", "legendary", "phoenix", "#ffbb81"],
  [
    "guardiao_aurora",
    "Guardião da Aurora",
    "celestial",
    "legendary",
    "guardian",
    "#a7f1db",
  ],
  [
    "dragao_galactico",
    "Dragão Galáctico",
    "celestial",
    "mythic",
    "dragon",
    "#bc9bff",
  ],
];
const abilities = {
  balinha: {
    click: 0.06,
    pps: 0,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  marshmelinho: {
    click: 0,
    pps: 0.04,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  goma: {
    click: 0,
    pps: 0.02,
    bossDamage: 0.25,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  raposa_morango: {
    click: 0.09,
    pps: 0.02,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  guardiao_pirulito: {
    click: 0,
    pps: 0.03,
    bossDamage: 0.6,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  cubinho: {
    click: 0,
    pps: 0.12,
    bossDamage: 0.15,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  gotinha: {
    click: 0,
    pps: 0.08,
    bossDamage: 0,
    prestigeReward: 0.02,
    factoryCapacity: {},
  },
  coelho_quartzo: {
    click: 0.16,
    pps: 0.06,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  raposa_geada: {
    click: 0.05,
    pps: 0,
    bossDamage: 1,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  coruja_prismatica: {
    click: 0,
    pps: 0.14,
    bossDamage: 0,
    prestigeReward: 0.04,
    factoryCapacity: {},
  },
  dragao_cristalino: {
    click: 0,
    pps: 0.18,
    bossDamage: 1.5,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  estrelinha: {
    click: 0,
    pps: 0.3,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  cometinha: {
    click: 0.35,
    pps: 0,
    bossDamage: 0.4,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  coelho_lunar: {
    click: 0,
    pps: 0.12,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {
      misturador: 1,
      embaladora: 1,
      laboratorio: 1,
    },
  },
  raposa_nebulosa: {
    click: 0.1,
    pps: 0,
    bossDamage: 0,
    prestigeReward: 0.06,
    factoryCapacity: {},
  },
  fenix: {
    click: 0,
    pps: 0.2,
    bossDamage: 3,
    prestigeReward: 0,
    factoryCapacity: {},
  },
  guardiao_aurora: {
    click: 0,
    pps: 0.16,
    bossDamage: 0,
    prestigeReward: 0,
    factoryCapacity: {
      linha: 1,
      superfabrica: 1,
    },
  },
  dragao_galactico: {
    click: 0,
    pps: 0.6,
    bossDamage: 1,
    prestigeReward: 0.05,
    factoryCapacity: {},
  },
};
export const PRESTIGE_PET_CAP = 0.25;
export const PRESTIGE_STAGE_POWER = [1, 1.5, 2, 3];
export const CAPACITY_STAGE_POWER = [1, 2, 3, 4];
export const PRESET_NAMES = {
  production: "Produção",
  combat: "Combate",
  prestige: "Prestígio",
  capacity: "Construção",
};
export const SPECIES = Object.fromEntries(
  rows.map(([id, name, egg, rarity, shape, color]) => [
    id,
    Object.freeze({ id, name, egg, rarity, shape, color, ...abilities[id] }),
  ]),
);
export const STRATEGIES = {
  balanced: "Equilibrado",
  production: "Produção",
  clicks: "Cliques",
  combat: "Combate",
  prestige: "Prestígio",
  capacity: "Construção",
};
export const discoveryKey = (speciesId, stage) => `${speciesId}:${stage}`;
export const DISCOVERIES = Object.keys(SPECIES).flatMap((id) =>
  STAGES.map((_, stage) => discoveryKey(id, stage)),
);

// Integer weights total 200. Splitting rarity weights yields exact half-percent labels.
export function hatchTable(eggId) {
  if (!Object.hasOwn(EGGS, eggId)) return [];
  const species = Object.values(SPECIES).filter((pet) => pet.egg === eggId);
  return species.map((pet) => {
    const weight =
      EGGS[eggId].weights[pet.rarity] /
      species.filter((other) => other.rarity === pet.rarity).length;
    return { species: pet, weight, percent: weight / 2 };
  });
}
export function rollSpecies(eggId, random = Math.random) {
  const table = hatchTable(eggId);
  if (!table.length) return null;
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) return null;
  let cumulative = 0;
  for (const row of table) {
    cumulative += row.weight;
    if (sample < cumulative / 200) return row.species.id;
  }
  return null;
}
