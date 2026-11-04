import { bootPage, format, setText, setNodeText } from "../ui/shared.js";
import { FLAVORS_DATA, SKINS_DATA } from "../data.js";
import { selectFlavor, selectCustomization } from "../gameplay.js";
import { lollipopSVG, collectionSVG } from "../ui/art.js";
import { flavorEffects, previewFlavor, matchesCollectionFilter } from "../ui/qol.js";

const runtime = await bootPage("collection");
const grid = document.getElementById("inventoryGrid");
const comparison = document.getElementById("flavorComparison");
let category = "flavors";
let filter = "all";
let returnFocus = null;
let signature = "";
let previewId = null;
let rows = [];
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const categoryFields = { skin: "activeSkin", theme: "activeTheme", particles: "activeParticles" };
const hints = {
  flavors: "Compare os bônus antes de escolher. Um sabor pago pode favorecer outro estilo de jogo; não é sempre melhor em tudo.",
  skin: "Mude o formato do seu pirulito. Os bônus continuam vindo do sabor equipado.",
  theme: "Escolha o cenário da sua aventura. Um mundo novo, o mesmo progresso.",
  particles: "Pequenos detalhes para cada toque. Desative os efeitos nas configurações se preferir.",
};
const rarities = ["Inicial", "Incomum", "Raro", "Épico", "Lendário"];

function render(state, info = {}) {
  const flavors = category === "flavors";
  const catalog = flavors ? FLAVORS_DATA : SKINS_DATA;
  const owned = flavors ? state.unlockedFlavors : state.unlockedSkins;
  const equipped = flavors ? state.activeFlavor : state[categoryFields[category]];
  const key = [category, equipped, owned.join(",")].join("|");
  if (key !== signature) {
    signature = key;
    const focused = grid.contains(document.activeElement) ? {
      id: document.activeElement.dataset.item || document.activeElement.dataset.preview,
      preview: document.activeElement.hasAttribute("data-preview"),
    } : null;
    grid.innerHTML = Object.entries(catalog).map(([id, item], index) => {
      const unlocked = owned.includes(id);
      const active = equipped === id;
      const rarity = rarities[Math.min(4, flavors ? Math.floor(index / 3) : Math.floor((index + 1) / 2))];
      const artwork = flavors ? lollipopSVG(id, "classic", true) : collectionSVG(id, category);
      const effects = flavors ? flavorEffects(id) : null;
      const desc = flavors
        ? `<span class="flavor-bonuses">Bônus/clique: +${decimal.format(effects.clickBonus)}<br>Produção: ×${decimal.format(effects.ppsMult)} (+${effects.productionPercent}%)</span><span class="flavor-focus">${effects.focus}</span>`
        : category === "skin" ? "Aparência visual. Preserve seus bônus de sabor."
          : category === "theme" ? "Um cenário para sua fábrica de sonhos." : "Efeitos para acompanhar os seus cliques.";
      return `<article class="item-tile ${active ? "active equipped" : ""} ${unlocked ? "unlocked" : "locked"}" data-card="${id}" aria-label="${item.name}">
        <span class="item-rarity rarity-${Math.min(4, index)}">${rarity}</span>
        <span class="item-art" aria-hidden="true">${artwork}</span>
        <h2 class="item-name">${item.name}</h2>
        <div class="item-desc">${desc}</div>
        <span class="item-state">${active ? "✓ Equipado" : unlocked ? "✓ Desbloqueado" : "◇ Não adquirido"}</span>
        ${flavors ? `<button type="button" class="item-preview" data-preview="${id}" aria-label="Comparar ${item.name} com o sabor equipado" aria-controls="flavorComparison" aria-pressed="false">Comparar</button>` : ""}
        <button type="button" class="item-action" data-item="${id}" aria-pressed="${active}" aria-label="${active ? "Equipado" : unlocked ? "Equipar" : "Desbloquear"} ${item.name}${unlocked ? "" : ` por ${format(item.cost)} doces`}">${active ? "✓ Equipado" : unlocked ? "Equipar" : `Desbloquear · ${format(item.cost)} doces`}</button>
        <small class="item-shortfall"></small>
      </article>`;
    }).join("");
    rows = [...grid.querySelectorAll("[data-card]")].map(card => ({
      card, id: card.dataset.card, action: card.querySelector("[data-item]"),
      shortfall: card.querySelector(".item-shortfall"), preview: card.querySelector("[data-preview]"),
    }));
    if (focused) grid.querySelector(`[data-${focused.preview ? "preview" : "item"}="${focused.id}"]`)?.focus({ preventScroll: true });
  }
  let visible = 0;
  for (const { card, id, action, shortfall, preview } of rows) {
    const show = matchesCollectionFilter(id, catalog[id], owned, state.pirulitos, filter);
    if (card.hidden === show) card.hidden = !show;
    if (show) visible++;
    const locked = !owned.includes(id);
    const insufficient = locked && state.pirulitos < catalog[id].cost;
    action.disabled = !runtime.writable || insufficient || equipped === id;
    card.classList.toggle("affordable", locked && !insufficient);
    setNodeText(shortfall, !runtime.writable ? "Outra aba está jogando"
      : insufficient ? `Faltam ${format(Math.max(1, Math.ceil(catalog[id].cost - state.pirulitos)))} doces` : "");
    if (preview) {
      const selected = previewId === id;
      if (preview.getAttribute("aria-pressed") !== String(selected)) preview.setAttribute("aria-pressed", String(selected));
    }
  }
  document.getElementById("inventoryEmpty").hidden = visible > 0;
  if (flavors && previewId) {
    const values = previewFlavor(state, previewId, info.now ?? Date.now());
    setText("comparisonTitle", `Comparar: ${FLAVORS_DATA[previewId].name}`);
    setText("comparisonCurrent", `Equipado · ${FLAVORS_DATA[state.activeFlavor].name}`);
    setText("comparisonPreview", `Prévia · ${FLAVORS_DATA[previewId].name}`);
    setText("currentClick", `${format(values.current.click)} / toque`);
    setText("previewClick", `${format(values.preview.click)} / toque`);
    setText("currentPps", `${format(values.current.pps)} /s`);
    setText("previewPps", `${format(values.preview.pps)} /s`);
  }
  setText("flavorCount", `${state.unlockedFlavors.length} / ${Object.keys(FLAVORS_DATA).length}`);
}

for (const button of document.querySelectorAll("[data-category]")) {
  button.addEventListener("click", () => {
    category = button.dataset.category;
    for (const item of document.querySelectorAll("[data-category]")) {
      const active = item === button;
      item.classList.toggle("active", active);
      item.classList.toggle("secondary", !active);
      item.setAttribute("aria-pressed", String(active));
    }
    setText("categoryHint", hints[category]);
    render(runtime.state);
  });
}
grid.addEventListener("click", event => {
  const preview = event.target.closest("[data-preview]");
  if (preview) {
    returnFocus = preview;
    previewId = preview.dataset.preview;
    render(runtime.state);
    comparison.showModal();
    document.body.classList.add("comparison-open");
    comparison.focus({ preventScroll: true });
    return;
  }
  const button = event.target.closest("[data-item]");
  if (!button || button.disabled) return;
  const id = button.dataset.item;
  const flavors = category === "flavors";
  const owned = (flavors ? runtime.state.unlockedFlavors : runtime.state.unlockedSkins).includes(id);
  const item = (flavors ? FLAVORS_DATA : SKINS_DATA)[id];
  const result = runtime.act((state, now) => flavors
    ? selectFlavor(state, id, now) : selectCustomization(state, category, id, now));
  if (result) runtime.notify(owned
    ? `${item.name} equipado. ${flavors ? "Seus cosméticos foram mantidos." : "As outras categorias foram mantidas."}`
    : `${item.name} entrou para sua coleção e foi equipado!`);
});
for (const button of document.querySelectorAll("[data-filter]")) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    for (const option of document.querySelectorAll("[data-filter]"))
      option.setAttribute("aria-pressed", String(option === button));
    render(runtime.state);
  });
}
document.getElementById("closeComparison").addEventListener("click", () => comparison.close());
comparison.addEventListener("close", () => {
  const id = previewId;
  previewId = null;
  document.body.classList.remove("comparison-open");
  render(runtime.state);
  const button = returnFocus?.isConnected ? returnFocus : grid.querySelector(`[data-preview="${id}"]`);
  button?.focus({ preventScroll: true });
  returnFocus = null;
});
comparison.addEventListener("click", event => {
  if (event.target !== comparison) return;
  const rect = comparison.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
    comparison.close();
});
setText("categoryHint", hints.flavors);
runtime.subscribe(render);
