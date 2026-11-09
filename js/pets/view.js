import { SPECIES, RARITIES, STAGES } from "./catalog.js";
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
  { selected = false, inspected = false } = {},
) {
  const species = SPECIES[pet.speciesId],
    rarity = RARITIES[species.rarity];
  const equipped = pets.equipped.includes(pet.id);
  return `<article class="pet-card pet-tile ${equipped ? "equipped" : ""} ${selected ? "fusion-selected" : ""}" data-pet="${pet.id}" data-rarity="${species.rarity}">
    <button type="button" data-inspect="${pet.id}" aria-pressed="${inspected}" aria-label="${species.name}, ${STAGES[pet.stage].name}, ${rarity.name}, ${pet.id}${equipped ? ", na equipe" : ""}${pet.favorite ? ", favorito" : ""}${pet.locked ? ", bloqueado" : ""}${selected ? ", selecionado para fusão" : ""}">
    <span class="pet-tile-rarity" aria-hidden="true">${rarity.mark}</span><span class="pet-tile-flags" aria-hidden="true">${pet.favorite ? "♥" : ""}${pet.locked ? "●" : ""}${equipped ? "✓" : ""}${selected ? "⑤" : ""}</span>
    ${petSVG(pet.speciesId, pet.stage)}<strong>${species.name}</strong><span class="stage-chip">${STAGES[pet.stage].name}</span></button></article>`;
}
export function inventoryDetail(
  pet,
  pets,
  capacity,
  { selected = false, writable = true } = {},
) {
  const p = SPECIES[pet.speciesId],
    rarity = RARITIES[p.rarity],
    equipped = pets.equipped.includes(pet.id);
  return `<div data-instance="${pet.id}">${petSVG(pet.speciesId, pet.stage)}<div><h2 id="petDetailTitle" tabindex="-1">${p.name}</h2><p class="pet-rarity">${rarity.mark} ${rarity.name} · ${STAGES[pet.stage].name}</p>${bonusChips(petPower(pet))}<p>${equipped ? "✓ Na equipe" : "No inventário"} · ${pet.id}</p>
 <div class="pet-card-actions"><button class="game-button" data-action="equip" ${!writable ? "disabled" : ""}>${equipped ? "Retirar" : pets.equipped.length >= capacity ? "Substituir" : "Equipar"}</button><button class="item-preview" data-action="favorite" aria-pressed="${pet.favorite}" ${!writable ? "disabled" : ""}>${pet.favorite ? "♥ Favorito" : "Favoritar"}</button><button class="item-preview" data-action="locked" aria-pressed="${pet.locked}" ${!writable ? "disabled" : ""}>${pet.locked ? "Bloqueado" : "Bloquear"}</button><button class="item-preview" data-action="fusion" ${!writable || pet.stage === 3 ? "disabled" : ""}>${pet.stage === 3 ? "Gigante · final" : "Combinar 5 iguais"}</button></div>
 <label class="pet-select"><input type="checkbox" data-select="${pet.id}" ${selected ? "checked" : ""} ${!writable ? "disabled" : ""}/> Selecionar para fusão</label><p>${pet.favorite || pet.locked ? "Protegido contra fusões." : equipped ? "Auto-fusão preserva equipados." : "Auto-fusão preserva os conjuntos e a reserva."}</p></div></div>`;
}
