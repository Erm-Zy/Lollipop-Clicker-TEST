import { SPECIES, RARITIES, STAGES, PET_SLOTS } from "./catalog.js";
import { UPGRADES_DATA } from "../data.js";
import { petPower } from "./bonuses.js";
import { petSVG, eggSVG } from "./art.js";

import { decimal } from "../format.js";
const percentage = { format: decimal };
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
export function bonusChips(power) {
  const chips = [
    power.click && `+${percent(power.click)}% clique`,
    power.pps && `+${percent(power.pps)}% PPS`,
    power.bossDamage && `+${percent(power.bossDamage)}% combate`,
    power.prestigeReward && `+${percent(power.prestigeReward)}% PP`,
    ...Object.entries(power.factoryCapacity || {}).map(
      ([key, n]) => `+${n} espaços · ${UPGRADES_DATA[key].name}`,
    ),
  ].filter(Boolean);
  return `<span class="pet-bonus-chips">${chips.map((label) => `<span>${label}</span>`).join("")}</span><details class="pet-bonus-detail"><summary>Sobre os bônus</summary><p>${bonusLabel(power)}. Apenas equipados dão bônus. PP tem teto de equipe de 25% e é arredondado para baixo no resgate.</p></details>`;
}
export function resultCard(pet) {
  const species = SPECIES[pet.speciesId],
    rarity = RARITIES[species.rarity];
  return `<article class="pet-card pet-result" data-rarity="${species.rarity}">${petSVG(species.id, pet.stage)}<span class="pet-opening-shell" aria-hidden="true">${eggSVG(species.egg)}</span><h3>${species.name}</h3><p class="pet-rarity">${rarity.mark} ${rarity.name}</p><p class="pet-stage">${STAGES[pet.stage].name}</p>${bonusChips(petPower(pet))}<small>Instância ${pet.id}</small></article>`;
}
export function inventoryCard(
  pet,
  pets,
  { selected = false, writable = true } = {},
) {
  const species = SPECIES[pet.speciesId],
    rarity = RARITIES[species.rarity];
  const equipped = pets.equipped.includes(pet.id);
  return `<article class="pet-card ${equipped ? "equipped" : ""}" data-pet="${pet.id}" data-rarity="${species.rarity}"><span class="pet-rarity">${rarity.mark} ${rarity.name}</span>${petSVG(species.id, pet.stage)}<h3>${species.name}</h3><p class="pet-stage">${STAGES[pet.stage].name} · escala por habilidade</p>${bonusChips(petPower(pet))}<small>Instância ${pet.id}</small><p>${equipped ? "✓ Na equipe" : "No inventário"}</p><label class="pet-select"><input type="checkbox" data-select="${pet.id}" ${selected ? "checked" : ""} ${!writable ? "disabled" : ""} /> Selecionar para fusão</label><div class="pet-card-actions"><button class="item-preview" type="button" data-action="equip" ${!writable ? "disabled" : ""}>${equipped ? "Retirar" : pets.equipped.length >= PET_SLOTS ? "Substituir" : "Equipar"}</button><button class="item-preview" type="button" data-action="favorite" aria-pressed="${pet.favorite}" ${!writable ? "disabled" : ""}>${pet.favorite ? "★ Favorito" : "☆ Favoritar"}</button><button class="item-preview" type="button" data-action="locked" aria-pressed="${pet.locked}" ${!writable ? "disabled" : ""}>${pet.locked ? "🔒 Bloqueado" : "Bloquear"}</button><button class="item-preview" type="button" data-action="fusion" ${!writable || pet.stage === 3 ? "disabled" : ""}>${pet.stage === 3 ? "Gigante · final" : "Combinar 5 iguais"}</button></div></article>`;
}
