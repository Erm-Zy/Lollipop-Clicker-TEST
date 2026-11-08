import {
  exact as formatExact,
  decimal as formatDecimal,
  cost as formatCost,
  multiplier,
} from "../format.js";
import { bootPage, format, setText, setNodeText } from "../ui/shared.js";
import {
  getPrestigeGain,
  getPrestigeProgress,
  prestige,
  getBasePrestigeMultiplier,
  getStellarMultiplier,
  getPrestigeMultiplier,
  getStellarCost,
  getExpansionCost,
  getFactoryCapacity,
  getPermanentFactoryCapacity,
  getPrestigeReward,
  buyStellarBoost,
  buyFactoryExpansion,
} from "../gameplay.js";
import { UPGRADES_DATA, PRESTIGE_CONFIG } from "../data.js";
import { buildingSVG } from "../ui/art.js";

const runtime = await bootPage("prestige");
const button = document.getElementById("prestigeBtn");
const stellarButton = document.getElementById("buyStellarBtn");
const expansionGrid = document.getElementById("factoryExpansions");
const number = { format: formatDecimal };
const rows = new Map();
const nodes = document.getElementById("prestigeNodes");
nodes.innerHTML =
  `<button type="button" class="prestige-node" data-node="stellar" aria-pressed="true"><span class="star-icon" aria-hidden="true">✦</span><strong>Ímpeto Estelar</strong><small></small></button>` +
  Object.entries(UPGRADES_DATA)
    .map(
      ([key, data]) =>
        `<button type="button" class="prestige-node" data-node="${key}" aria-pressed="false"><span aria-hidden="true">${buildingSVG(key, 1)}</span><strong>${data.name}</strong><small></small></button>`,
    )
    .join("");
function chooseUpgrade(key, focus = false) {
  nodes
    .querySelectorAll("[data-node]")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.node === key)),
    );
  document.getElementById("stellarDetail").hidden = key !== "stellar";
  document.getElementById("expansionDetail").hidden = key === "stellar";
  rows.forEach((row, id) => (row.card.hidden = id !== key));
  const title = document.getElementById("upgradeSelectionTitle");
  title.textContent =
    key === "stellar" ? "Ímpeto Estelar" : UPGRADES_DATA[key].name;
  if (focus) {
    title.focus({ preventScroll: true });
    document
      .getElementById("upgradeDetails")
      .scrollIntoView({ block: "nearest" });
  }
}
nodes.addEventListener("click", (event) => {
  const b = event.target.closest("[data-node]");
  if (b) chooseUpgrade(b.dataset.node, true);
});
for (const [key, data] of Object.entries(UPGRADES_DATA)) {
  const card = document.createElement("article");
  card.className = "permanent-card expansion-card";
  card.dataset.expansion = key;
  card.hidden = true;
  card.innerHTML = `<div class="expansion-name"><span class="expansion-art" aria-hidden="true">${buildingSVG(key, 1)}</span><h3>${data.name}</h3></div><p class="expansion-level"></p><p class="expansion-capacity"></p><button class="game-button secondary" type="button" data-expand="${key}"></button><small class="expansion-status"></small>`;
  expansionGrid.append(card);
  rows.set(key, {
    card,
    level: card.querySelector(".expansion-level"),
    capacity: card.querySelector(".expansion-capacity"),
    button: card.querySelector("button"),
    status: card.querySelector(".expansion-status"),
  });
}
function availability(cost) {
  if (!runtime.writable) return "Outra aba está jogando";
  if (!runtime.canSave) return "Recupere seu save nos Ajustes";
  if (!Number.isFinite(cost)) return "Nível máximo alcançado";
  const missing = Math.max(0, cost - runtime.state.prestigePoints);
  return missing ? `Faltam ${formatCost(missing)} PP` : "✓ Disponível";
}
function render(state) {
  const progress = getPrestigeProgress(state);
  const gain = progress.gain;
  setText("prestigeLevel", format(state.prestigeLevel));
  setText("prestigePoints", `${format(state.prestigePoints)} PP`);
  setText("prestigeBase", multiplier(getBasePrestigeMultiplier(state)));
  setText("prestigeStellar", multiplier(getStellarMultiplier(state)));
  setText("prestigeCombined", multiplier(getPrestigeMultiplier(state)));
  setText(
    "prestigeBonus",
    `+${number.format((getPrestigeMultiplier(state) - 1) * 100)}%`,
  );
  const reward = getPrestigeReward(state);
  setText(
    "prestigeRewardDetails",
    `Saldo atual: ${formatExact(state.prestigePoints)} PP. Base ${formatExact(reward.base)} PP + pets ${formatExact(reward.bonus)} PP = ${formatExact(reward.total)} PP. Bônus dos pets: ${number.format(reward.rate * 100)}%, arredondado para baixo. ${reward.bonus === 0 ? "Nenhum PP extra neste resgate." : "Extras concedidos só no resgate confirmado."}`,
  );
  setText(
    "prestigeGainText",
    `+${format(gain)} ${gain === 1 ? "nível" : "níveis"} · +${format(reward.total)} PP`,
  );
  setText(
    "prestigeJourney",
    `${format(progress.earned)} doces produzidos nesta jornada`,
  );
  setText(
    "prestigeRequirement",
    progress.atLimit
      ? "Teto numérico de prestígio alcançado."
      : gain > 0
        ? `Marco alcançado! ${format(gain)} ${gain === 1 ? "nível disponível" : "níveis disponíveis"} para resgatar.`
        : `Faltam ${format(progress.remaining)} doces para o próximo marco.`,
  );
  setText(
    "prestigeLifetime",
    `Histórico preservado: ${format(state.totalEarned)} doces · ${gain > 0 ? "marco pronto para resgate" : "próximo marco histórico"}: ${format(progress.threshold)}`,
  );
  const percent = Math.round(progress.percent * 10) / 10;
  const bar = document.querySelector(".prestige-progress");
  const fill = document.getElementById("prestigeProgressFill");
  fill.style.transitionDuration = progress.percent === 0 ? "0s" : "";
  fill.style.width = `${progress.percent}%`;
  bar.setAttribute("aria-valuenow", String(percent));
  bar.setAttribute(
    "aria-valuetext",
    `${number.format(percent)}% da jornada atual; ${format(progress.remaining)} doces restantes`,
  );
  document.getElementById("prestigePending").hidden = !state.pendingWheel;
  document.getElementById("prestigeSaveWarning").hidden = runtime.canSave;
  button.disabled =
    !runtime.writable ||
    !runtime.canSave ||
    gain <= 0 ||
    Boolean(state.pendingWheel);
  const stellarCost = getStellarCost(state);
  nodes.querySelector("[data-node=stellar] small").textContent =
    `Nv. ${state.stellarBoostLevel} · ${Number.isFinite(stellarCost) ? formatCost(stellarCost) + " PP" : "MAX"}`;
  for (const [key, row] of rows) {
    const price = getExpansionCost(state, key),
      node = nodes.querySelector(`[data-node="${key}"]`);
    node.querySelector("small").textContent =
      `Nv. ${state.factoryExpansions[key]} · ${Number.isFinite(price) ? formatCost(price) + " PP" : "MAX"}`;
    node.setAttribute(
      "aria-label",
      `${UPGRADES_DATA[key].name}, expansão ${state.factoryExpansions[key]}. ${Number.isFinite(price) ? formatExact(price) + " PP" : "Máximo"}. Independente das outras melhorias.`,
    );
  }
  const maxStar = PRESTIGE_CONFIG.stellar.maxLevel;
  setText("stellarLevel", `Nível ${state.stellarBoostLevel} / ${maxStar}`);
  setText(
    "stellarBonus",
    `Bônus permanente atual: +${number.format((getStellarMultiplier(state) - 1) * 100)}%`,
  );
  setText(
    "stellarNext",
    Number.isFinite(stellarCost)
      ? `Próximo: +${number.format((state.stellarBoostLevel + 1) * PRESTIGE_CONFIG.stellar.bonusPerLevel * 100)}% · ${stellarCost} PP`
      : `MAX · +${number.format(maxStar * PRESTIGE_CONFIG.stellar.bonusPerLevel * 100)}% de bônus permanente`,
  );
  stellarButton.disabled =
    !runtime.writable ||
    !runtime.canSave ||
    state.prestigePoints < stellarCost ||
    !Number.isFinite(stellarCost);
  setNodeText(
    stellarButton,
    Number.isFinite(stellarCost)
      ? `Comprar Ímpeto · ${stellarCost} PP`
      : "Ímpeto Estelar · MAX",
  );
  setText("stellarStatus", availability(stellarCost));
  for (const [key, row] of rows) {
    const cost = getExpansionCost(state, key);
    const capacity = getPermanentFactoryCapacity(state, key);
    setNodeText(
      row.level,
      `Expansão ${state.factoryExpansions[key]} / ${PRESTIGE_CONFIG.expansion.maxLevel}`,
    );
    setNodeText(
      row.capacity,
      Number.isFinite(cost)
        ? `Capacidade: ${capacity} → ${capacity + PRESTIGE_CONFIG.expansion.slotsPerLevel}`
        : `Capacidade: ${capacity} · MAX`,
    );
    setNodeText(
      row.button,
      Number.isFinite(cost) ? `Expandir · ${cost} PP` : "Expansão · MAX",
    );
    const label = `${UPGRADES_DATA[key].name}: ${Number.isFinite(cost) ? `expandir de ${capacity} para ${capacity + PRESTIGE_CONFIG.expansion.slotsPerLevel} por ${cost} PP` : "capacidade máxima"}`;
    if (row.button.getAttribute("aria-label") !== label)
      row.button.setAttribute("aria-label", label);
    row.button.disabled =
      !runtime.writable ||
      !runtime.canSave ||
      !Number.isFinite(cost) ||
      state.prestigePoints < cost;
    setNodeText(row.status, availability(cost));
  }
}
button.addEventListener("click", () => {
  const gain = getPrestigeGain(runtime.state);
  if (button.disabled || gain <= 0 || runtime.state.pendingWheel) return;
  const expectedReward = getPrestigeReward(runtime.state);
  if (
    !confirm(
      `Renascer e ganhar +${gain} níveis e ${expectedReward.base} PP base + ${expectedReward.bonus} PP de pets = ${expectedReward.total} novos PP? Saldo, fábricas, batalha e bônus temporários reiniciam. Pontos disponíveis, Ímpeto Estelar, expansões, receitas, conquistas, histórico, todos os pets (inclusive equipados), ovos desbloqueados e descobertas ficam com você.`,
    )
  )
    return;
  const result = runtime.act(
    (state, now) => prestige(state, now, { expectedReward }),
    { sound: "win", requireSave: true },
  );
  if (result)
    runtime.notify(
      `Seu legado brilhou! +${format(result)} níveis e +${format(expectedReward.total)} PP. Uma nova jornada começa em 0%.`,
    );
});
stellarButton.addEventListener("click", () => {
  if (stellarButton.disabled) return;
  const result = runtime.act((state, now) => buyStellarBoost(state, now), {
    requireSave: true,
  });
  if (result)
    runtime.notify(
      `Ímpeto Estelar no nível ${result.level}! Cliques e produção ganharam força permanente.`,
    );
});
expansionGrid.addEventListener("click", (event) => {
  const control = event.target.closest("[data-expand]");
  if (!control || control.disabled) return;
  const key = control.dataset.expand;
  const result = runtime.act(
    (state, now) => buyFactoryExpansion(state, key, now),
    { requireSave: true },
  );
  if (result)
    runtime.notify(
      `${UPGRADES_DATA[key].name}: capacidade permanente de ${result.capacity} unidades.`,
    );
});
runtime.subscribe(render);
