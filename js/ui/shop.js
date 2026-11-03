import { UPGRADES_DATA, FLAVORS_DATA } from "../data.js";
import { getBulkQuote, buyBulk, getPps } from "../gameplay.js";
import { format } from "./shared.js";
import { buildingSVG } from "./art.js";

export function mountShop(runtime, container, controls, onBuy = () => {}) {
  let quantity = 1;
  const rows = new Map();
  container.innerHTML = Object.entries(UPGRADES_DATA)
    .map(
      ([key, data], index) =>
        `<button class="upgrade-row" data-upgrade="${key}" type="button" aria-label="Comprar ${data.name}"><span class="building-art">${buildingSVG(key, 1)}</span><span class="upgrade-info"><span class="tier-label">NÍVEL ${String(index + 1).padStart(2, "0")}</span><strong>${data.name}</strong><small class="contribution"></small><span class="price"></span></span><span class="owned" aria-label="Quantidade possuída">0</span></button>`,
    )
    .join("");
  for (const row of container.querySelectorAll("[data-upgrade]"))
    rows.set(row.dataset.upgrade, row);
  function render(state) {
    for (const [key, row] of rows) {
      const quote = getBulkQuote(state, key, quantity);
      row.disabled =
        !runtime.writable || !quote.quantity || state.pirulitos < quote.cost;
      row.classList.toggle("affordable", !row.disabled);
      row.classList.toggle("unbuilt", state.upgrades[key] === 0);
      const ownedText = String(state.upgrades[key]);
      if (row.querySelector(".owned").textContent !== ownedText)
        row.querySelector(".owned").textContent = ownedText;
      row.querySelector(".price").textContent =
        Number.isFinite(quote.cost) && quote.quantity
          ? `${format(quote.cost)} doces${quantity === "max" ? ` · ×${quote.quantity}` : ""}`
          : "Sem saldo para MAX";
      const contribution =
        state.upgrades[key] *
        UPGRADES_DATA[key].basePps *
        FLAVORS_DATA[state.activeFlavor].ppsMult *
        (1 + state.prestigeLevel * 0.15) *
        (Date.now() < state.boostEndTime ? 2 : 1);
      row.querySelector(".contribution").textContent =
        state.upgrades[key] > 0
          ? `Sua linha: ${format(contribution)} /s`
          : `+${format(UPGRADES_DATA[key].basePps)} /s base`;
      row.title = `${UPGRADES_DATA[key].name} · ${state.upgrades[key]} possuídas · comprar ${quote.quantity || 0}`;
    }
  }
  controls.querySelectorAll("[data-buy]").forEach((btn) =>
    btn.addEventListener("click", () => {
      quantity = btn.dataset.buy === "max" ? "max" : Number(btn.dataset.buy);
      controls.querySelectorAll("[data-buy]").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", b === btn);
      });
      render(runtime.state);
    }),
  );
  container.addEventListener("click", (e) => {
    const row = e.target.closest("[data-upgrade]");
    if (!row) return;
    const result = runtime.act((state, now) =>
      buyBulk(state, row.dataset.upgrade, quantity, now),
    );
    if (result) {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        row.animate(
          [
            { transform: "translateY(2px)" },
            { transform: "translateY(-2px)" },
            { transform: "translateY(0)" },
          ],
          { duration: 200 },
        );
      runtime.notify(
        `+${result.quantity} ${UPGRADES_DATA[row.dataset.upgrade].name} na sua fábrica!`,
      );
      onBuy(row.dataset.upgrade, result);
    }
  });
  runtime.subscribe(render);
  return { render };
}
