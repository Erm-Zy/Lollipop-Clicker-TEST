import { SPECIES, STAGES } from "./catalog.js";
import { petPower } from "./bonuses.js";

export function fusionQuote(pets, ids) {
  const fail = (reason) => ({ ok: false, reason });
  if (!Array.isArray(ids) || ids.length !== 5 || new Set(ids).size !== 5)
    return fail("Escolha cinco instâncias diferentes.");
  const sources = ids.map((id) => pets.inventory.find((pet) => pet.id === id));
  if (sources.some((pet) => !pet))
    return fail("Um dos pets não está mais no inventário.");
  const first = sources[0];
  if (first.stage === 3) return fail("Gigante é a evolução final.");
  if (
    sources.some(
      (pet) => pet.speciesId !== first.speciesId || pet.stage !== first.stage,
    )
  )
    return fail("Use cinco pets da mesma espécie e evolução.");
  if (sources.some((pet) => pet.favorite || pet.locked))
    return fail(
      "Retire o favorito e o bloqueio das cópias que deseja consumir.",
    );
  return {
    ok: true,
    sources,
    species: SPECIES[first.speciesId],
    stage: first.stage,
    nextStage: first.stage + 1,
    next: STAGES[first.stage + 1],
    power: petPower({ ...first, stage: first.stage + 1 }),
    consumesEquipped: sources.some((pet) => pets.equipped.includes(pet.id)),
  };
}
export function fusionCandidates(pets, speciesId, stage) {
  return pets.inventory
    .filter(
      (pet) =>
        pet.speciesId === speciesId &&
        pet.stage === stage &&
        !pet.favorite &&
        !pet.locked,
    )
    .sort(
      (a, b) =>
        Number(pets.equipped.includes(a.id)) -
          Number(pets.equipped.includes(b.id)) ||
        a.acquiredAt - b.acquiredAt ||
        (a.id < b.id ? -1 : 1),
    )
    .slice(0, 5)
    .map((pet) => pet.id);
}
