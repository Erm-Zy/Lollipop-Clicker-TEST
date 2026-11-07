import { bootPage, format, setText } from "../ui/shared.js";
import { getWorldStage, WORLD_CHAPTERS } from "../world.js";
import { getTotalUpgradesCount } from "../progression.js";
import {
  EGGS,
  SPECIES,
  RARITIES,
  STAGES,
  PET_CAPACITY,
  PET_SLOTS,
  DISCOVERIES,
  STRATEGIES,
  discoveryKey,
  PRESET_NAMES,
  hatchTable,
} from "../pets/catalog.js";
import {
  eggQuote,
  hatchPets,
  equipPet,
  unequipPet,
  equipBest,
  setStrategy,
  togglePetFlag,
  fusePets,
  replacePet,
  savePreset,
  equipPreset,
  setReserve,
  fuseBatch,
  releasePets,
} from "../pets/actions.js";
import {
  batchFusionQuote,
  fusionQuote,
  fusionCandidates,
} from "../pets/evolution.js";
import { getPetBonuses, petPower } from "../pets/bonuses.js";
import { inventoryView } from "../pets/inventory.js";
import { createAutoHatcher } from "../pets/auto.js";
import { UPGRADES_DATA } from "../data.js";
import { petSVG, eggSVG } from "../pets/art.js";
import {
  inventoryCard,
  resultCard,
  percent,
  bonusLabel,
} from "../pets/view.js";

const runtime = await bootPage("pets");
const byId = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const selected = new Set();
let eggId = "acucarado",
  panel = "eggs",
  page = 0,
  manualBusy = false,
  fusionBusy = false,
  fusionIds = [],
  bulkReview = null,
  replaceId = null,
  returnFocus = null;
let previousInventory,
  previousEquipped,
  previousAvailability,
  previousFilters = "",
  teamSignature = "",
  catalogSignature = "";
let skipAnimation = false;
try {
  skipAnimation =
    runtime.storage.getItem("lollipopPets.skipAnimation") === "true";
} catch {
  /* UI preference only. */
}
byId("skipHatchAnimation").checked = skipAnimation;
const filters = {
  search: "",
  rarity: "all",
  egg: "all",
  stage: "all",
  sort: "strength",
};
const explanations = {
  combat: "Prioriza dano real de chefe, separado do clique que rende doces.",
  prestige:
    "Maximiza PP do próximo resgate quando há ganho; PPS desempata. Sem marco pronto, prioriza a taxa futura (teto 25%).",
  capacity:
    "Prioriza espaços por PPS base do tipo; PPS desempata. Fábricas excedentes ficam inativas sem a equipe.",
  balanced:
    "Compara equipes pelo clique e PPS real, incluindo ativação de fábricas extras. Empates usam aquisição e ID.",
  production:
    "Maximiza PPS real, incluindo fábricas extras ativas. Cliques desempata; depois aquisição e ID.",
  clicks:
    "Prioriza o bônus real de clique; o bônus de PPS desempata. Não escolhe apenas pela raridade.",
};
for (const [id, rarity] of Object.entries(RARITIES))
  byId("rarityFilter").add(new Option(rarity.name, id));
for (const [id, egg] of Object.entries(EGGS))
  byId("eggFilter").add(new Option(egg.name, id));
STAGES.forEach((stage, index) =>
  byId("stageFilter").add(new Option(stage.name, String(index))),
);
byId("eggSelection").innerHTML = Object.entries(EGGS)
  .map(
    ([id, egg]) =>
      `<button type="button" class="pet-egg" data-egg="${id}" aria-pressed="${id === eggId}">${eggSVG(id)}<strong>${egg.name}</strong><span>${money.format(egg.price)} pirulitos</span><small data-egg-state></small></button>`,
  )
  .join("");
byId("hatchButtons").innerHTML = [1, 2, 3]
  .map(
    (count) =>
      `<button type="button" class="game-button" data-hatch="${count}">Abrir ×${count}<span></span></button>`,
  )
  .join("");

function eggRequirement(egg) {
  return `${WORLD_CHAPTERS[egg.unlockStage].minimum} fábricas na jornada${egg.requiredFactory ? ` + ${egg.requiredCount} ${UPGRADES_DATA[egg.requiredFactory].name}` : ""}${egg.requiredPrestige ? ` + nível histórico ${egg.requiredPrestige}` : ""}.`;
}
for (const [id, species] of Object.entries(SPECIES))
  byId("bulkSpecies").add(new Option(species.name, id));
function canAct() {
  return runtime.writable && runtime.canSave && !runtime.updating;
}
function transaction(action, sound = "buy") {
  return runtime.act(action, { requireSave: true, sound });
}
function preferenceAnimation() {
  return (
    !skipAnimation &&
    runtime.state.settings.animations &&
    !runtime.state.settings.reducedMotion &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function showOdds() {
  const egg = EGGS[eggId];
  setText("selectedEggName", egg.name);
  setText("oddsCaption", `${egg.name} · total 100%`);
  setText(
    "rarityOdds",
    Object.entries(egg.weights)
      .map(([id, weight]) => `${RARITIES[id].name}: ${weight / 2}%`)
      .join(" · "),
  );
  byId("speciesOdds").innerHTML = hatchTable(eggId)
    .map(
      (row) =>
        `<tr><td>${row.species.name}</td><td>${RARITIES[row.species.rarity].mark} ${RARITIES[row.species.rarity].name}</td><td>${String(row.percent).replace(".", ",")}%</td></tr>`,
    )
    .join("");
}
function renderControls(state) {
  const available = canAct();
  for (const id of [
    "savePetPreset",
    "loadPetPreset",
    "savePetReserve",
    "reviewBulkFusion",
    "releaseSelectedPets",
  ])
    byId(id).disabled = !available;
  const preset = state.pets.presets[byId("petPreset").value];
  setText(
    "presetStatus",
    `${preset.length} IDs salvos · ${preset.filter((id) => state.pets.inventory.some((p) => p.id === id)).length} disponíveis. Cópias consumidas são ignoradas.`,
  );
  if (document.activeElement !== byId("petReserve"))
    byId("petReserve").value = state.pets.reserveNormals;
  const egg = EGGS[eggId],
    unlocked = state.pets.unlockedEggs.includes(eggId);
  setText(
    "eggRequirement",
    unlocked
      ? `${egg.theme}. Desbloqueio permanente.`
      : `${eggRequirement(egg)} Agora: ${getTotalUpgradesCount(state)} fábricas, nível histórico ${state.prestigeLevel}.`,
  );
  for (const card of byId("eggSelection").children) {
    const id = card.dataset.egg,
      found = state.pets.unlockedEggs.includes(id);
    card.dataset.locked = String(!found);
    card.setAttribute("aria-pressed", String(id === eggId));
    card.querySelector("[data-egg-state]").textContent = found
      ? "✓ Desbloqueado"
      : `🔒 ${eggRequirement(EGGS[id])}`;
  }
  const quote = eggQuote(state, eggId, 1);
  setText(
    "hatchAvailability",
    !available
      ? "Jogando em consulta ou com save protegido. Abra os Ajustes para exportar ou recuperar."
      : quote.ok
        ? "Cada lote é salvo antes de revelar os pets."
        : quote.reason,
  );
  for (const button of byId("hatchButtons").children) {
    const count = Number(button.dataset.hatch),
      offer = eggQuote(state, eggId, count);
    button.querySelector("span").textContent =
      `${money.format(egg.price * count)} pirulitos`;
    button.disabled = !available || manualBusy || auto.active || !offer.ok;
  }
  byId("autoOpenBtn").disabled =
    !available ||
    manualBusy ||
    auto.active ||
    !eggQuote(state, eggId, Number(byId("autoBatch").value)).ok;
  byId("stopAutoBtn").hidden = !auto.active;
  byId("autoBatch").disabled = auto.active;
  byId("teamStrategy").disabled = !available;
  byId("teamStrategy").value = state.pets.strategy;
  byId("equipBestBtn").disabled = !available || !state.pets.inventory.length;
  setText("strategyExplanation", explanations[state.pets.strategy]);
  byId("fuseSelectedBtn").disabled = !available || selected.size !== 5;
  setText(
    "fusionSelectionCount",
    selected.size
      ? `${selected.size} de 5 cópias selecionadas. Nenhuma será consumida sem confirmar.`
      : "Selecione cinco cópias para uma fusão.",
  );
}
function renderTeam(state) {
  const bonuses = getPetBonuses(state);
  setText("teamCount", `${state.pets.equipped.length} / ${PET_SLOTS}`);
  setText(
    "teamBonus",
    `Equipe: ${bonusLabel(bonuses)}. Apenas equipados dão bônus; fábricas acima da capacidade ficam inativas.`,
  );
  const pets = state.pets.equipped.map((id) =>
    state.pets.inventory.find((pet) => pet.id === id),
  );
  const signature = JSON.stringify([
    pets.map((pet) => [pet.id, pet.speciesId, pet.stage]),
    canAct(),
  ]);
  if (signature === teamSignature) return;
  teamSignature = signature;
  byId("petTeam").innerHTML = Array.from({ length: PET_SLOTS }, (_, index) => {
    const pet = pets[index];
    return pet
      ? `<article class="pet-team-slot">${petSVG(pet.speciesId, pet.stage)}<div><strong>${SPECIES[pet.speciesId].name}</strong><p>${STAGES[pet.stage].name}</p><p>${bonusLabel(petPower(pet))}</p><button type="button" class="item-preview" data-unequip="${pet.id}" ${!canAct() ? "disabled" : ""}>Retirar</button></div></article>`
      : `<div class="pet-team-slot empty">Espaço ${index + 1}<br />Equipe um amigo</div>`;
  }).join("");
}
function renderInventory(state, force = false) {
  if (panel !== "inventory") return;
  const signature = JSON.stringify([filters, page]);
  if (
    !force &&
    previousInventory === state.pets.inventory &&
    previousEquipped === state.pets.equipped &&
    previousAvailability === canAct() &&
    previousFilters === signature
  )
    return;
  const validIds = new Set(state.pets.inventory.map((pet) => pet.id));
  for (const id of selected) if (!validIds.has(id)) selected.delete(id);
  const active = document.activeElement,
    focusId = active.closest?.("[data-pet]")?.dataset.pet,
    focusAction = active.dataset?.action;
  const view = inventoryView(state.pets, { ...filters, page });
  page = view.page;
  previousInventory = state.pets.inventory;
  previousEquipped = state.pets.equipped;
  previousAvailability = canAct();
  previousFilters = JSON.stringify([filters, page]);
  byId("petInventory").innerHTML = view.items
    .map((pet) =>
      inventoryCard(pet, state.pets, {
        selected: selected.has(pet.id),
        writable: canAct(),
      }),
    )
    .join("");
  byId("petsEmpty").hidden = view.total > 0;
  byId("previousPets").disabled = page === 0;
  byId("nextPets").disabled = page >= view.pages - 1;
  setText(
    "petsPageNumber",
    `Página ${page + 1} / ${view.pages} · ${view.total} pets neste filtro`,
  );
  if (focusId && focusAction)
    byId("petInventory")
      .querySelector(`[data-pet="${focusId}"] [data-action="${focusAction}"]`)
      ?.focus({ preventScroll: true });
  renderControls(state);
}
function renderCatalog(state) {
  if (panel !== "catalog") return;
  const signature = state.pets.discovered.join("|");
  if (catalogSignature === signature && byId("petCatalog").children.length)
    return;
  catalogSignature = signature;
  const discovered = new Set(state.pets.discovered);
  byId("petCatalog").innerHTML = Object.entries(EGGS)
    .map(([id, egg]) => {
      const species = Object.values(SPECIES).filter((pet) => pet.egg === id);
      const count = species.reduce(
        (sum, pet) =>
          sum +
          STAGES.filter((_, stage) =>
            discovered.has(discoveryKey(pet.id, stage)),
          ).length,
        0,
      );
      return `<section><h3>${egg.name} · ${count} / ${species.length * 4}</h3><div class="pet-catalog-grid">${species
        .map((pet) => {
          const stages = STAGES.map((_, stage) =>
              discovered.has(discoveryKey(pet.id, stage)),
            ),
            found = stages.some(Boolean);
          return `<article class="pet-catalog-entry ${stages.every(Boolean) ? "complete" : ""}" data-species="${pet.id}">${petSVG(pet.id, 0, !found)}<h4>${found ? pet.name : "??? · Amigo misterioso"}</h4><p>${RARITIES[pet.rarity].mark} ${RARITIES[pet.rarity].name}${stages.every(Boolean) ? " · ✓ Coleção completa" : ""}</p><ul class="pet-evolutions">${STAGES.map((stage, index) => `<li class="${stages[index] ? "found" : ""}" aria-label="${stage.name}: ${stages[index] ? "descoberto" : "não descoberto"}">${stages[index] ? "✓" : "?"} ${stage.name}</li>`).join("")}</ul></article>`;
        })
        .join("")}</div></section>`;
    })
    .join("");
}
function render(state) {
  setText("capacityCount", `${state.pets.inventory.length}/${PET_CAPACITY}`);
  setText(
    "inventoryCapacity",
    `${state.pets.inventory.length} / ${PET_CAPACITY} instâncias${state.pets.inventory.length > PET_CAPACITY ? " · excedente preservado; funda cópias para liberar espaço" : ""}`,
  );
  setText(
    "discoveryCount",
    `${state.pets.discovered.length}/${DISCOVERIES.length}`,
  );
  setText(
    "catalogCompletion",
    `${state.pets.discovered.length} de ${DISCOVERIES.length} evoluções descobertas · ${format((state.pets.discovered.length / DISCOVERIES.length) * 100)}% do álbum`,
  );
  setText(
    "petLifetimeStats",
    `${format(state.pets.stats.hatched)} ovos abertos · ${format(state.pets.stats.fused)} fusões · ${format(state.pets.stats.spent)} pirulitos investidos. Permanecem após o prestígio.`,
  );
  renderControls(state);
  renderTeam(state);
  renderInventory(state);
  renderCatalog(state);
}
function openBatch(id, count, automatic = false) {
  if (!canAct() || manualBusy || document.hidden) return false;
  if (!automatic) manualBusy = true;
  const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const result = transaction(
    (state, now) => hatchPets(state, id, count, now, { requestId }),
    "win",
  );
  if (!result) {
    manualBusy = false;
    render(runtime.state);
    return false;
  }
  const cards = result.received.map(resultCard).join("");
  if (automatic) {
    byId("autoResults").hidden = false;
    byId("autoPetResults").innerHTML = cards;
  } else {
    byId("hatchResults").innerHTML = cards;
    setText(
      "hatchSummary",
      `${count} ${count === 1 ? "pet recebido" : "pets recebidos"} do ${EGGS[id].name}. ${money.format(result.cost)} pirulitos pagos; progresso salvo.`,
    );
    byId("hatchDialog").classList.toggle("pet-hatching", preferenceAnimation());
    byId("skipHatchBtn").hidden = !preferenceAnimation();
    byId("hatchDialog").showModal();
    byId("closeHatchBtn").focus();
  }
  render(runtime.state);
  return result;
}
const auto = createAutoHatcher({
  runtime,
  openBatch: (id, count) => openBatch(id, count, true),
  onChange: ({ reason }) => {
    setText("autoStatus", reason);
    renderControls(runtime.state);
  },
});
function reviewFusion(ids, trigger) {
  auto.stop("Abertura parada para revisar a fusão.");
  const quote = fusionQuote(runtime.state.pets, ids);
  if (!quote.ok) {
    runtime.notify(quote.reason);
    return;
  }
  bulkReview = null;
  fusionIds = [...ids];
  returnFocus = trigger;
  fusionBusy = false;
  setText("confirmFusionBtn", "Confirmar fusão de 5 pets");
  setText("fusionTitle", `Evoluir ${quote.species.name}`);
  setText(
    "fusionDescription",
    `Cinco cópias ${STAGES[quote.stage].name} serão consumidas para criar uma ${quote.next.name}, equivalente a ${quote.next.copies} Normais. Esta fusão não pode ser desfeita.`,
  );
  byId("fusionSources").innerHTML = quote.sources
    .map(
      (pet) =>
        `<li>${quote.species.name} · ${STAGES[pet.stage].name} · ${pet.id}${runtime.state.pets.equipped.includes(pet.id) ? " · EQUIPADO" : ""}</li>`,
    )
    .join("");
  setText(
    "fusionResult",
    `Resultado: ${quote.next.name} · ${bonusLabel(quote.power)}. Sem taxa de fusão.`,
  );
  byId("equippedFusionWarning").hidden = !quote.consumesEquipped;
  byId("allowEquippedFusion").checked = false;
  byId("confirmFusionBtn").disabled = !canAct();
  setText("fusionError", "");
  byId("fusionDialog").showModal();
  byId("fusionTitle").focus();
}
for (const button of document.querySelectorAll("[data-panel]"))
  button.addEventListener("click", () => {
    panel = button.dataset.panel;
    if (panel !== "eggs") auto.stop("Abertura parada ao sair da área de ovos.");
    for (const option of document.querySelectorAll("[data-panel]")) {
      const active = option === button;
      option.setAttribute("aria-pressed", String(active));
      option.classList.toggle("secondary", !active);
      byId(`panel-${option.dataset.panel}`).hidden = !active;
    }
    render(runtime.state);
  });
byId("eggSelection").addEventListener("click", (event) => {
  const button = event.target.closest("[data-egg]");
  if (!button) return;
  auto.stop("Ovo selecionado alterado.");
  eggId = button.dataset.egg;
  showOdds();
  render(runtime.state);
});
byId("hatchButtons").addEventListener("click", (event) => {
  const button = event.target.closest("[data-hatch]");
  if (button && !button.disabled && !auto.active) {
    returnFocus = button;
    openBatch(eggId, Number(button.dataset.hatch));
  }
});
byId("skipHatchAnimation").addEventListener("change", (event) => {
  skipAnimation = event.target.checked;
  try {
    runtime.storage.setItem(
      "lollipopPets.skipAnimation",
      String(skipAnimation),
    );
  } catch {
    /* UI only. */
  }
});
byId("autoBatch").addEventListener("change", () =>
  renderControls(runtime.state),
);
byId("autoOpenBtn").addEventListener("click", () =>
  auto.start(eggId, Number(byId("autoBatch").value)),
);
byId("stopAutoBtn").addEventListener("click", () => auto.stop());
byId("skipHatchBtn").addEventListener("click", () =>
  byId("hatchDialog").classList.remove("pet-hatching"),
);
byId("closeHatchBtn").addEventListener("click", () =>
  byId("hatchDialog").close(),
);
byId("hatchDialog").addEventListener("close", () => {
  manualBusy = false;
  render(runtime.state);
  const target =
    returnFocus?.isConnected && !returnFocus.disabled
      ? returnFocus
      : byId("eggSelection").querySelector('[aria-pressed="true"]');
  target?.focus({ preventScroll: true });
});
byId("teamStrategy").addEventListener("change", (event) =>
  transaction((state) => setStrategy(state, event.target.value), null),
);
byId("equipBestBtn").addEventListener("click", () => {
  const result = transaction((state, now) =>
    equipBest(state, state.pets.strategy, now),
  );
  if (result)
    runtime.notify(
      `Equipe ${STRATEGIES[result.strategy]} equipada. Os bônus mostrados já estão em vigor.`,
    );
});
byId("petTeam").addEventListener("click", (event) => {
  const button = event.target.closest("[data-unequip]");
  if (button && !button.disabled)
    transaction((state, now) => unequipPet(state, button.dataset.unequip, now));
});
byId("petInventory").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const id = button.closest("[data-pet]").dataset.pet,
    pet = runtime.state.pets.inventory.find((item) => item.id === id);
  if (button.dataset.action === "fusion")
    return reviewFusion(
      fusionCandidates(runtime.state.pets, pet.speciesId, pet.stage),
      button,
    );
  if (
    button.dataset.action === "equip" &&
    !runtime.state.pets.equipped.includes(id) &&
    runtime.state.pets.equipped.length >= PET_SLOTS
  ) {
    replaceId = id;
    returnFocus = button;
    byId("replacePetOptions").innerHTML = runtime.state.pets.equipped
      .map(
        (old) =>
          `<button type="button" class="game-button secondary" data-replace="${old}">${SPECIES[runtime.state.pets.inventory.find((p) => p.id === old).speciesId].name} · ${old}</button>`,
      )
      .join("");
    byId("replacePetDialog").showModal();
    return;
  }
  transaction((state, now) =>
    button.dataset.action === "equip"
      ? state.pets.equipped.includes(id)
        ? unequipPet(state, id, now)
        : equipPet(state, id, now)
      : togglePetFlag(state, id, button.dataset.action),
  );
});
byId("petInventory").addEventListener("change", (event) => {
  if (!event.target.matches("[data-select]")) return;
  const id = event.target.dataset.select;
  if (event.target.checked) selected.add(id);
  else selected.delete(id);
  renderControls(runtime.state);
});
byId("fuseSelectedBtn").addEventListener("click", (event) =>
  reviewFusion([...selected], event.currentTarget),
);
byId("clearSelectionBtn").addEventListener("click", () => {
  selected.clear();
  renderInventory(runtime.state, true);
});
for (const [id, key] of [
  ["petSearch", "search"],
  ["rarityFilter", "rarity"],
  ["eggFilter", "egg"],
  ["stageFilter", "stage"],
  ["petSort", "sort"],
])
  byId(id).addEventListener(
    id === "petSearch" ? "input" : "change",
    (event) => {
      filters[key] = event.target.value;
      page = 0;
      renderInventory(runtime.state);
    },
  );
for (const [id, delta] of [
  ["previousPets", -1],
  ["nextPets", 1],
])
  byId(id).addEventListener("click", () => {
    page += delta;
    renderInventory(runtime.state);
    byId("inventoryTitle").focus({ preventScroll: true });
  });
byId("cancelFusionBtn").addEventListener("click", () =>
  byId("fusionDialog").close(),
);
byId("fusionDialog").addEventListener("close", () => {
  (returnFocus?.isConnected ? returnFocus : byId("inventoryTitle")).focus({
    preventScroll: true,
  });
});
byId("confirmFusionBtn").addEventListener("click", () => {
  if (fusionBusy || !canAct()) return;
  if (bulkReview) {
    const quote = batchFusionQuote(runtime.state.pets, bulkReview.options);
    if (!quote.ok || quote.signature !== bulkReview.signature) {
      setText("fusionError", "A prévia mudou. Cancele e revise novamente.");
      return;
    }
    if (quote.consumesEquipped && !byId("allowEquippedFusion").checked) {
      setText("fusionError", "Confirme o consumo dos equipados listados.");
      return;
    }
    fusionBusy = true;
    byId("confirmFusionBtn").disabled = true;
    const result = transaction(
      (state, now) =>
        fuseBatch(state, bulkReview.options, now, bulkReview.signature),
      "win",
    );
    if (result) {
      selected.clear();
      byId("fusionDialog").close();
      runtime.notify(
        `${result.fusions} fusões salvas; ${result.created} resultados no inventário.`,
      );
    } else {
      fusionBusy = false;
      byId("confirmFusionBtn").disabled = false;
      setText("fusionError", "Falha ao salvar. Nenhuma cópia foi consumida.");
    }
    return;
  }
  const quote = fusionQuote(runtime.state.pets, fusionIds);
  if (!quote.ok) {
    setText("fusionError", quote.reason);
    return;
  }
  if (quote.consumesEquipped && !byId("allowEquippedFusion").checked) {
    setText(
      "fusionError",
      "Confirme explicitamente o consumo dos pets equipados ou cancele para escolher outras cópias.",
    );
    return;
  }
  fusionBusy = true;
  byId("confirmFusionBtn").disabled = true;
  const result = transaction(
    (state, now) =>
      fusePets(state, fusionIds, now, {
        allowEquipped: byId("allowEquippedFusion").checked,
      }),
    "win",
  );
  if (result) {
    selected.clear();
    byId("fusionDialog").close();
    renderInventory(runtime.state, true);
    runtime.notify(
      `${SPECIES[result.speciesId].name} ${STAGES[result.stage].name} entrou no inventário!`,
    );
  } else {
    fusionBusy = false;
    byId("confirmFusionBtn").disabled = false;
    setText(
      "fusionError",
      "Não foi possível concluir e salvar. As cinco cópias foram preservadas.",
    );
  }
});
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) auto.dispose();
});
byId("savePetPreset").addEventListener("click", () => {
  if (transaction((state) => savePreset(state, byId("petPreset").value)))
    runtime.notify("Conjunto salvo.");
});
byId("loadPetPreset").addEventListener("click", () =>
  transaction((state, now) => equipPreset(state, byId("petPreset").value, now)),
);
byId("petPreset").addEventListener("change", () =>
  renderControls(runtime.state),
);
byId("savePetReserve").addEventListener("click", () => {
  if (
    transaction((state) => setReserve(state, Number(byId("petReserve").value)))
  )
    runtime.notify("Reserva salva.");
});
byId("cancelReplacePet").addEventListener("click", () =>
  byId("replacePetDialog").close(),
);
byId("replacePetDialog").addEventListener("close", () => {
  (returnFocus?.isConnected ? returnFocus : byId("inventoryTitle")).focus({
    preventScroll: true,
  });
});
byId("replacePetOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-replace]");
  if (!button) return;
  if (
    transaction((state, now) =>
      replacePet(state, replaceId, button.dataset.replace, now),
    )
  )
    byId("replacePetDialog").close();
});
byId("releaseSelectedPets").addEventListener("click", () => {
  const ids = [...selected];
  if (!ids.length) {
    runtime.notify("Selecione as cópias que deseja liberar.");
    return;
  }
  auto.stop("Abertura parada para revisar cópias.");
  const rows = ids.map((id) => {
    const p = runtime.state.pets.inventory.find((p) => p.id === id);
    return p
      ? `${id}: ${SPECIES[p.speciesId].name} ${STAGES[p.stage].name}`
      : id;
  });
  if (
    !confirm(
      `Liberar permanentemente ${ids.length} cópias sem recompensa?\n${rows.join("\n")}`,
    )
  )
    return;
  if (
    !confirm(
      "Confirmação final: estas cópias serão removidas. Prefira fusão; favoritos, bloqueios, equipados e reservas ficam protegidos.",
    )
  )
    return;
  if (transaction((state, now) => releasePets(state, ids, now))) {
    selected.clear();
    renderInventory(runtime.state, true);
    runtime.notify("Cópias liberadas e progresso salvo.");
  } else
    runtime.notify(
      "Nenhuma cópia liberada. Confira proteções/reserva e armazenamento.",
    );
});
byId("reviewBulkFusion").addEventListener("click", (event) => {
  auto.stop("Abertura parada para revisar fusão em lote.");
  const options = {
    speciesId: byId("bulkSpecies").value,
    stage: Number(byId("bulkStage").value),
    chain: byId("bulkChain").checked,
    allowEquipped: byId("bulkEquipped").checked,
  };
  const quote = batchFusionQuote(runtime.state.pets, options);
  if (!quote.ok) {
    runtime.notify(quote.reason);
    return;
  }
  bulkReview = { options, signature: quote.signature };
  returnFocus = event.currentTarget;
  fusionBusy = false;
  setText("confirmFusionBtn", "Confirmar fusão em lote");
  setText("fusionTitle", "Revisar fusão em lote");
  setText(
    "fusionDescription",
    `${quote.consumed.length} cópias existentes serão consumidas em ${quote.operations.length} fusões. Resultados finais: ${quote.outputs.map((p) => `${p.id} ${STAGES[p.stage].name}`).join(", ")}. ${options.chain ? "Você permitiu consumir resultados intermediários." : "Resultados novos não serão reutilizados."} Reserva: ${runtime.state.pets.reserveNormals} Normais. Sem taxa. Irreversível.`,
  );
  byId("fusionSources").innerHTML = quote.operations
    .map(
      (op) =>
        `<li>${op.ids.join(", ")} → ${op.output.id} ${STAGES[op.output.stage].name}</li>`,
    )
    .join("");
  setText(
    "fusionResult",
    quote.outputs
      .map((p) => `${SPECIES[p.speciesId].name}: ${bonusLabel(petPower(p))}`)
      .join(" · "),
  );
  byId("equippedFusionWarning").hidden = !quote.consumesEquipped;
  byId("allowEquippedFusion").checked = false;
  setText("fusionError", "");
  byId("confirmFusionBtn").disabled = !canAct();
  byId("fusionDialog").showModal();
  byId("fusionTitle").focus();
});
showOdds();
runtime.subscribe(render);
