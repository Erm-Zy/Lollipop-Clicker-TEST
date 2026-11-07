import { SPECIES, RARITIES, STAGES, PET_SLOTS } from "./catalog.js";
import { UPGRADES_DATA } from "../data.js";
import { petPower } from "./bonuses.js";
import { petSVG, eggSVG } from "./art.js";

const percentage = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
export const percent = (value) => percentage.format(value * 100);
export const bonusLabel = (power) =>
  [
    power.click && `+${percent(power.click)}% cliques`,
    power.pps && `+${percent(power.pps)}% PPS`,
    power.bossDamage && `+${percent(power.bossDamage)}% dano de chefe`,
    power.prestigeReward &&
      `+${percent(power.prestigeReward)}% PP futuro (equipe: teto 25%, arredondado para baixo)`,
    ...Object.entries(power.factoryCapacity || {}).map(
      ([key, n]) => `+${n} espaços: ${UPGRADES_DATA[key].name}`,
    ),
  ]
    .filter(Boolean)
    .join(" · ") || "Sem bônus";
export function resultCard(pet) {
  const species = SPECIES[pet.speciesId],
    rarity = RARITIES[species.rarity];
  return `<article class="pet-card pet-result" data-rarity="${species.rarity}">${petSVG(species.id, pet.stage)}<span class="pet-opening-shell" aria-hidden="true">${eggSVG(species.egg)}</span><h3>${species.name}</h3><p class="pet-rarity">${rarity.mark} ${rarity.name}</p><p class="pet-stage">${STAGES[pet.stage].name}</p><p>${bonusLabel(petPower(pet))}</p><small>Instância ${pet.id}</small></article>`;
}
export function inventoryCard(
  pet,
  pets,
  { selected = false, writable = true } = {},
) {
  const species = SPECIES[pet.speciesId],
    rarity = RARITIES[species.rarity];
  const equipped = pets.equipped.includes(pet.id);
  return `<article class="pet-card ${equipped ? "equipped" : ""}" data-pet="${pet.id}" data-rarity="${species.rarity}"><span class="pet-rarity">${rarity.mark} ${rarity.name}</span>${petSVG(species.id, pet.stage)}<h3>${species.name}</h3><p class="pet-stage">${STAGES[pet.stage].name} · escala por habilidade</p><p>${bonusLabel(petPower(pet))}</p><small>Instância ${pet.id}</small><p>${equipped ? "✓ Na equipe" : "No inventário"}</p><label class="pet-select"><input type="checkbox" data-select="${pet.id}" ${selected ? "checked" : ""} ${!writable ? "disabled" : ""} /> Selecionar para fusão</label><div class="pet-card-actions"><button class="item-preview" type="button" data-action="equip" ${!writable ? "disabled" : ""}>${equipped ? "Retirar" : pets.equipped.length >= PET_SLOTS ? "Substituir" : "Equipar"}</button><button class="item-preview" type="button" data-action="favorite" aria-pressed="${pet.favorite}" ${!writable ? "disabled" : ""}>${pet.favorite ? "★ Favorito" : "☆ Favoritar"}</button><button class="item-preview" type="button" data-action="locked" aria-pressed="${pet.locked}" ${!writable ? "disabled" : ""}>${pet.locked ? "🔒 Bloqueado" : "Bloquear"}</button><button class="item-preview" type="button" data-action="fusion" ${!writable || pet.stage === 3 ? "disabled" : ""}>${pet.stage === 3 ? "Gigante · final" : "Combinar 5 iguais"}</button></div></article>`;
}
