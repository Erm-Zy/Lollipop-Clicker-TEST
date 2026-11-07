import { getTotalUpgradesCount } from "./progression.js";

// The existing visual chapters, shared by the world scene and its soundtrack.
export const WORLD_CHAPTERS = [
  { name: "Colina de Açúcar", minimum: 0, story: "Uma receita, um sonho e muito açúcar." },
  { name: "Vila Caramelada", minimum: 5, story: "As primeiras chaminés já perfumam o vale." },
  { name: "Vale das Engenhocas", minimum: 25, story: "Sua pequena vila virou uma doce potência." },
  { name: "Reino dos Pirulitos", minimum: 100, story: "Um mundo inteiro gira ao redor da sua receita." },
];
export function getWorldStage(state) {
  const count = getTotalUpgradesCount(state);
  return WORLD_CHAPTERS.findLastIndex(chapter => count >= chapter.minimum);
}

export const BOSS_STORIES = [
  { name: "Geleião do Pomar", story: "Ele se esconde entre as frutas e coleciona todo açúcar que encontra." },
  { name: "Capitão Caramelo", story: "Sua armadura de caramelo é dura. Seu orgulho é ainda mais duro." },
  { name: "Dragão de Suspiro", story: "Um sopro de glacê e uma montanha de doces guardada a sete chaves." },
];
export const getBossIdentity = state => state.bossesKilled % BOSS_STORIES.length;
