import { UPGRADES_DATA } from "../data.js";
import {
  getBulkQuote,
  buyBulk,
  getFactoryCapacity,
  getActiveFactoryCount,
  getPermanentFactoryCapacity,
} from "../gameplay.js";
import { format, setNodeText } from "./shared.js";
import { buildingSVG } from "./art.js";
import {
  shopOffer,
  buildingContribution,
  readShopView,
  writeShopView,
} from "./qol.js";

const exact = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
function estimate(seconds) {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)} h`;
  return `${Math.ceil(seconds / 86400)} dias`;
}

export function mountShop(
  runtime,
  container,
  controls,
  onBuy = () => {},
  viewControls = null,
) {
  let quantity = 1;
  const rows = new Map();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  container.innerHTML = Object.entries(UPGRADES_DATA)
    .map(
      ([key, data], index) =>
        `<button class="upgrade-row" data-upgrade="${key}" type="button"><span class="building-art" aria-hidden="true">${buildingSVG(key, 1)}</span><span class="upgrade-info"><span class="tier-label">NÍVEL ${String(index + 1).padStart(2, "0")}</span><strong>${data.name}</strong><small class="contribution"></small><span class="price"></span><span class="purchase-status"></span><small class="purchase-estimate"></small></span><span class="owned" aria-label="Quantidade possuída">0</span></button>`,
    )
    .join("");
  for (const row of container.querySelectorAll("[data-upgrade]")) {
    rows.set(row.dataset.upgrade, {
      row,
      owned: row.querySelector(".owned"),
      price: row.querySelector(".price"),
      contribution: row.querySelector(".contribution"),
      status: row.querySelector(".purchase-status"),
      eta: row.querySelector(".purchase-estimate"),
      quoteKey: "",
      quote: null,
    });
  }
  if (viewControls) {
    function selectView(view, persist = false) {
      container.dataset.shopView = view;
      container.closest("main").dataset.shopView = view;
      for (const button of viewControls.querySelectorAll("[data-shop-view]")) {
        const active = button.dataset.shopView === view;
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("active", active);
      }
      if (persist) writeShopView(runtime.storage, view);
    }
    selectView(readShopView(runtime.storage));
    viewControls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-shop-view]");
      if (button) selectView(button.dataset.shopView, true);
    });
  }
  function render(state, info = {}) {
    const now = info.now ?? Date.now();
    for (const [key, cached] of rows) {
      const { row, owned, price, contribution, status, eta } = cached;
      // Fixed lots change only when owned/quantity changes; MAX also depends on balance.
      const quoteKey = `${quantity}/${getFactoryCapacity(state, key)}/${state.upgrades[key]}/${quantity === "max" ? state.pirulitos : ""}`;
      if (quoteKey !== cached.quoteKey) {
        cached.quote = getBulkQuote(state, key, quantity);
        cached.quoteKey = quoteKey;
      }
      const offer = shopOffer(state, key, quantity, now, cached.quote);
      row.disabled = !runtime.writable || !runtime.canSave || !offer.available;
      row.classList.toggle("affordable", !row.disabled);
      row.classList.toggle("unbuilt", state.upgrades[key] === 0);
      setNodeText(owned, `${state.upgrades[key]} / ${offer.capacity}`);
      owned.setAttribute(
        "aria-label",
        `${exact.format(state.upgrades[key])} possuídas de ${offer.capacity} espaços`,
      );
      setNodeText(
        price,
        offer.capacityBlocked
          ? offer.room === 0
            ? "Limite atingido"
            : "Lote acima da capacidade"
          : Number.isFinite(offer.price)
            ? `${format(offer.price)} doces${quantity === "max" && !offer.quote.quantity ? " · próxima unidade" : ""}`
            : "Preço fora do limite",
      );
      const produced = buildingContribution(state, key, now);
      setNodeText(
        contribution,
        state.upgrades[key] > 0
          ? `Sua linha: ${format(produced)} /s · ${getActiveFactoryCount(state, key)} ativas / ${state.upgrades[key]} possuídas · ${offer.capacity} espaços (${getPermanentFactoryCapacity(state, key)} permanentes)${state.upgrades[key] > offer.capacity ? " · excedentes inativas; equipe capacidade ou expanda" : ""}`
          : `+${format(UPGRADES_DATA[key].basePps)} /s base`,
      );
      const action =
        quantity === "max"
          ? `MAX: ${offer.quote.quantity} unidades`
          : `Comprar ×${quantity}`;
      const reason = !runtime.canSave
        ? "Recupere o save nos Ajustes"
        : !runtime.writable
          ? "Outra aba está jogando"
          : offer.capacityBlocked
            ? offer.room === 0
              ? "Expanda no Santuário · permanente"
              : `Restam apenas ${offer.room} espaços. Use ×1 ou MAX.`
            : !Number.isFinite(offer.price)
              ? "Limite de compra atingido"
              : !offer.available
                ? `Faltam ${format(Math.max(1, Math.ceil(offer.missing)))} doces`
                : `✓ ${action}`;
      setNodeText(
        status,
        quantity === "max" &&
          !offer.available &&
          Number.isFinite(offer.price) &&
          runtime.writable
          ? `MAX: 0 unidades · ${reason}`
          : reason,
      );
      setNodeText(
        eta,
        runtime.writable && !offer.available && offer.seconds > 0
          ? `≈ ${estimate(offer.seconds)} só com produção`
          : "",
      );
      const label = `${UPGRADES_DATA[key].name} · ${exact.format(state.upgrades[key])} de ${offer.capacity} espaços · ${action} · ${offer.capacityBlocked ? "capacidade insuficiente" : Number.isFinite(offer.price) ? exact.format(offer.price) + " doces" : "preço fora do limite"} · ${reason}`;
      if (row.getAttribute("aria-label") !== label) {
        row.setAttribute("aria-label", label);
        row.title = label;
      }
    }
  }
  controls.querySelectorAll("[data-buy]").forEach((btn) =>
    btn.addEventListener("click", () => {
      quantity = btn.dataset.buy === "max" ? "max" : Number(btn.dataset.buy);
      controls.querySelectorAll("[data-buy]").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      render(runtime.state);
    }),
  );
  container.addEventListener("click", (event) => {
    const row = event.target.closest("[data-upgrade]");
    if (!row || row.disabled) return;
    const result = runtime.act(
      (state, now) => buyBulk(state, row.dataset.upgrade, quantity, now),
      { requireSave: true },
    );
    if (!result) return;
    if (
      !reduceMotion.matches &&
      runtime.state.settings.animations &&
      !runtime.state.settings.reducedMotion
    ) {
      row.getAnimations().forEach((animation) => animation.cancel());
      row.animate(
        [
          { transform: "translateY(2px)" },
          { transform: "translateY(-2px)" },
          { transform: "translateY(0)" },
        ],
        { duration: 200 },
      );
    }
    runtime.notify(
      `+${result.quantity} ${UPGRADES_DATA[row.dataset.upgrade].name} na sua fábrica!`,
    );
    onBuy(row.dataset.upgrade, result);
  });
  runtime.subscribe(render);
  return { render };
}
