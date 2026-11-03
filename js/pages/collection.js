import { bootPage, format, setText } from "../ui/shared.js";
import { FLAVORS_DATA, SKINS_DATA } from "../data.js";
import { selectFlavor, selectCustomization } from "../gameplay.js";
import { lollipopSVG, collectionSVG } from "../ui/art.js";

const runtime = await bootPage("collection");
const grid = document.getElementById("inventoryGrid");
let category = "flavors";
let signature = "";
const categoryFields = {
  skin: "activeSkin",
  theme: "activeTheme",
  particles: "activeParticles",
};
const hints = {
  flavors:
    "O sabor equipado define os bônus de clique e produção. Troque quando quiser.",
  skin: "Mude o formato do seu pirulito. Os bônus continuam vindo do sabor equipado.",
  theme: "Escolha o cenário da sua aventura. Um mundo novo, o mesmo progresso.",
  particles:
    "Pequenos detalhes para cada toque. Desative os efeitos nas configurações se preferir.",
};
const rarities = ["Inicial", "Incomum", "Raro", "Épico", "Lendário"];

function render(state) {
  const flavors = category === "flavors";
  const catalog = flavors ? FLAVORS_DATA : SKINS_DATA;
  const owned = flavors ? state.unlockedFlavors : state.unlockedSkins;
  const equipped = flavors
    ? state.activeFlavor
    : state[categoryFields[category]];
  const key = [category, equipped, owned.join(",")].join("|");
  if (key !== signature) {
    signature = key;
    const focusedItem = grid.contains(document.activeElement)
      ? document.activeElement.dataset.item
      : null;
    grid.innerHTML = Object.entries(catalog)
      .map(([id, item], index) => {
        const unlocked = owned.includes(id);
        const active = equipped === id;
        const rarity =
          rarities[
            Math.min(
              4,
              flavors ? Math.floor(index / 3) : Math.floor((index + 1) / 2),
            )
          ];
        const artwork = flavors
          ? lollipopSVG(id, "classic", true)
          : collectionSVG(id, category);
        const desc = flavors
          ? item.desc
          : category === "skin"
            ? "Aparência visual. Preserve seus bônus de sabor."
            : category === "theme"
              ? "Um cenário para sua fábrica de sonhos."
              : "Efeitos para acompanhar os seus cliques.";
        return `<button type="button" class="item-tile ${active ? "active equipped" : ""} ${unlocked ? "unlocked" : "locked"}" data-item="${id}" aria-pressed="${active}">
        <span class="item-rarity rarity-${Math.min(4, index)}">${rarity}</span>
        <span class="item-art" aria-hidden="true">${artwork}</span>
        <strong class="item-name">${item.name}</strong>
        <span class="item-desc">${desc}</span>
        <span class="item-action">${active ? "✓ Equipado" : unlocked ? "Equipar" : `Desbloquear · ${format(item.cost)} doces`}</span>
      </button>`;
      })
      .join("");
    if (focusedItem)
      grid
        .querySelector(`[data-item="${focusedItem}"]`)
        ?.focus({ preventScroll: true });
  }
  for (const button of grid.querySelectorAll("[data-item]")) {
    const item = catalog[button.dataset.item];
    button.disabled =
      !runtime.writable ||
      (!owned.includes(button.dataset.item) && state.pirulitos < item.cost);
    button.classList.toggle(
      "affordable",
      !owned.includes(button.dataset.item) && state.pirulitos >= item.cost,
    );
  }
  setText(
    "flavorCount",
    `${state.unlockedFlavors.length} / ${Object.keys(FLAVORS_DATA).length}`,
  );
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
grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-item]");
  if (!button || button.disabled) return;
  const id = button.dataset.item;
  const flavors = category === "flavors";
  const owned = (
    flavors ? runtime.state.unlockedFlavors : runtime.state.unlockedSkins
  ).includes(id);
  const item = (flavors ? FLAVORS_DATA : SKINS_DATA)[id];
  const result = runtime.act((state, now) =>
    flavors
      ? selectFlavor(state, id, now)
      : selectCustomization(state, category, id, now),
  );
  if (result)
    runtime.notify(
      owned
        ? `${item.name} equipado. Seu mundo ganhou um novo toque!`
        : `${item.name} entrou para sua coleção!`,
    );
});
runtime.subscribe(render);
