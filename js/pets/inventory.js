import { SPECIES, RARITIES } from "./catalog.js";
import { petPower } from "./bonuses.js";

export const INVENTORY_PAGE_SIZE = 48;
const compareId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function inventoryView(
  pets,
  {
    search = "",
    rarity = "all",
    egg = "all",
    stage = "all",
    sort = "strength",
    page = 0,
  } = {},
) {
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const query = normalize(search.trim());
  const entries = pets.inventory
    .filter((pet) => {
      const species = SPECIES[pet.speciesId];
      return (
        (rarity === "all" || species.rarity === rarity) &&
        (egg === "all" || species.egg === egg) &&
        (stage === "all" || pet.stage === Number(stage)) &&
        (!query || normalize(species.name).includes(query))
      );
    })
    .map((pet) => ({
      pet,
      power: petPower(pet),
      rank: RARITIES[SPECIES[pet.speciesId].rarity].rank,
    }));
  entries.sort((a, b) => {
    const difference =
      sort === "rarity"
        ? b.rank - a.rank
        : sort === "evolution"
          ? b.pet.stage - a.pet.stage
          : sort === "acquired"
            ? a.pet.acquiredAt - b.pet.acquiredAt
            : b.power.click + b.power.pps - (a.power.click + a.power.pps);
    return (
      difference ||
      a.pet.acquiredAt - b.pet.acquiredAt ||
      compareId(a.pet.id, b.pet.id)
    );
  });
  const pages = Math.max(1, Math.ceil(entries.length / INVENTORY_PAGE_SIZE));
  const current = Math.max(
    0,
    Math.min(pages - 1, Number.isInteger(page) ? page : 0),
  );
  return {
    items: entries
      .slice(current * INVENTORY_PAGE_SIZE, (current + 1) * INVENTORY_PAGE_SIZE)
      .map((entry) => entry.pet),
    total: entries.length,
    pages,
    page: current,
  };
}
