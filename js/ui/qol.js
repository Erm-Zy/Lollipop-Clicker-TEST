import { FLAVORS_DATA, UPGRADES_DATA } from "../data.js";
import { getBulkQuote, getClickPower, getPps } from "../gameplay.js";

export const SHOP_VIEW_KEY = "lollipopUI.shopView";

export function readShopView(storage) {
  try {
    return storage.getItem(SHOP_VIEW_KEY) === "compact" ? "compact" : "normal";
  } catch {
    return "normal";
  }
}

export function writeShopView(storage, view) {
  try {
    storage.setItem(SHOP_VIEW_KEY, view === "compact" ? "compact" : "normal");
  } catch {
    // A blocked UI preference must never interrupt purchases or touch the save.
  }
}

/** Estimate only existing passive income, integrating the current boost's expiry.
 * A pending wheel can change future PPS; omit that uncertain estimate entirely.
 */
export function affordabilitySeconds(state, cost, now = Date.now()) {
  if (!Number.isFinite(cost) || state.pendingWheel) return null;
  const missing = Math.max(0, cost - state.pirulitos);
  if (!missing) return 0;
  now = Math.max(now, state.lastTick);
  const currentPps = getPps(state, now);
  const basePps = getPps(state, Infinity);
  if (!(basePps > 0) || !Number.isFinite(currentPps)) return null;
  const boostSeconds = Math.max(0, (state.boostEndTime - now) / 1000);
  const duringBoost = Math.min(missing, currentPps * boostSeconds);
  const seconds = duringBoost / currentPps + (missing - duringBoost) / basePps;
  // Very distant estimates are of little use and would suggest false precision.
  return Number.isFinite(seconds) && seconds <= 7 * 86400
    ? Math.ceil(seconds)
    : null;
}

export function shopOffer(state, key, quantity, now = Date.now(), quote = getBulkQuote(state, key, quantity)) {
  // MAX with zero units has a zero-cost quote. Explain the next unit's price,
  // without advertising that zero as an available/free purchase.
  const price = quantity === "max" && !quote.quantity
    ? getBulkQuote(state, key, 1).cost
    : quote.cost;
  return {
    quote,
    price,
    available: quote.quantity > 0 && Number.isFinite(quote.cost) && state.pirulitos >= quote.cost,
    missing: Math.max(0, price - state.pirulitos),
    seconds: affordabilitySeconds(state, price, now),
  };
}

export function buildingContribution(state, key, now = Date.now()) {
  return getPps({
    ...state,
    upgrades: Object.fromEntries(Object.keys(UPGRADES_DATA).map(id => [id, id === key ? state.upgrades[id] : 0])),
  }, now);
}

export function flavorEffects(id) {
  const flavor = Object.hasOwn(FLAVORS_DATA, id) ? FLAVORS_DATA[id] : null;
  if (!flavor) return null;
  return {
    clickBonus: flavor.clickBonus,
    ppsMult: flavor.ppsMult,
    productionPercent: Math.round((flavor.ppsMult - 1) * 100),
    focus: flavor.clickBonus > 0
      ? flavor.ppsMult > 1 ? "Misto · clique e produção" : "Foco em cliques"
      : flavor.ppsMult > 1 ? "Foco em produção passiva" : "Equilibrado",
  };
}

/** Shallow read-only projection: no equip action, currency debit or advance(). */
export function previewFlavor(state, id, now = Date.now()) {
  if (!Object.hasOwn(FLAVORS_DATA, id)) return null;
  const preview = { ...state, activeFlavor: id };
  return {
    current: { click: getClickPower(state, now), pps: getPps(state, now) },
    preview: { click: getClickPower(preview, now), pps: getPps(preview, now) },
  };
}
