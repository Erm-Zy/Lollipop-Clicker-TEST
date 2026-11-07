import { allocatePet } from "./state.js";
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
  if (
    first.stage === 0 &&
    pets.inventory.filter(
      (p) => p.speciesId === first.speciesId && p.stage === 0,
    ).length -
      5 <
      (pets.reserveNormals || 0)
  )
    return fail("A fusão consumiria sua reserva de Normais.");
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

/** Deterministic dry-run; chaining is explicit and includes intermediate instances. */
export function batchFusionQuote(
  pets,
  { speciesId, stage = 0, chain = false, allowEquipped = false } = {},
) {
  if (
    !Object.hasOwn(SPECIES, speciesId) ||
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage > 2
  )
    return { ok: false, reason: "Escolha espécie e evolução de origem." };
  const inventory = [...pets.inventory],
    operations = [];
  let nextId = pets.nextId;
  for (let level = stage; level <= (chain ? 2 : stage); level++) {
    const total = inventory.filter(
      (p) => p.speciesId === speciesId && p.stage === level,
    ).length;
    const reserve = level === 0 ? pets.reserveNormals || 0 : 0;
    const candidates = inventory
      .filter(
        (p) =>
          p.speciesId === speciesId &&
          p.stage === level &&
          !p.favorite &&
          !p.locked &&
          (allowEquipped || !pets.equipped.includes(p.id)),
      )
      .sort((a, b) => a.acquiredAt - b.acquiredAt || (a.id < b.id ? -1 : 1));
    const groups = Math.floor(
      Math.min(candidates.length, Math.max(0, total - reserve)) / 5,
    );
    for (let group = 0; group < groups; group++) {
      const ids = candidates.slice(group * 5, group * 5 + 5).map((p) => p.id);
      const allocated = allocatePet(
        { ...pets, inventory, nextId },
        speciesId,
        level + 1,
        0,
      );
      if (!allocated)
        return {
          ok: false,
          reason: "Limite técnico de IDs. Exporte seu save.",
        };
      nextId = allocated.nextId;
      for (const id of ids)
        inventory.splice(
          inventory.findIndex((p) => p.id === id),
          1,
        );
      inventory.push(allocated.pet);
      operations.push({ ids, output: allocated.pet });
    }
  }
  if (!operations.length)
    return {
      ok: false,
      reason: "Não há grupos livres de cinco após proteções, reserva e equipe.",
    };
  const finalIds = new Set(inventory.map((p) => p.id));
  const consumed = pets.inventory.filter((p) => !finalIds.has(p.id));
  const outputs = inventory.filter(
    (p) => !pets.inventory.some((old) => old.id === p.id),
  );
  return {
    ok: true,
    inventory,
    nextId,
    operations,
    consumed,
    outputs,
    consumesEquipped: consumed.some((p) => pets.equipped.includes(p.id)),
    signature: JSON.stringify([
      operations,
      consumed.map((p) => [p.id, p.favorite, p.locked]),
      pets.reserveNormals,
      pets.equipped,
    ]),
  };
}
