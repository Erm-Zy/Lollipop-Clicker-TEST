import { SPECIES } from "./catalog.js";
import { batchFusionQuote } from "./evolution.js";
import { fuseBatch, hatchPets } from "./actions.js";

const signature = (pets) =>
  JSON.stringify([
    pets.inventory,
    pets.equipped,
    pets.presets,
    pets.reserveNormals,
    pets.nextId,
  ]);

/** Dry run over original instances only; outputs never become new sources. */
export function safeFusionQuote(pets) {
  let preview = { ...pets, inventory: [...pets.inventory] };
  const eligibleIds = new Set(pets.inventory.map((p) => p.id));
  const steps = [];
  for (const speciesId of Object.keys(SPECIES))
    for (let stage = 0; stage < 3; stage++) {
      const options = {
        speciesId,
        stage,
        chain: false,
        allowEquipped: false,
        protectPresets: true,
        eligibleIds,
      };
      const quote = batchFusionQuote(preview, options);
      if (!quote.ok) continue;
      steps.push({ options, signature: quote.signature, quote });
      preview = {
        ...preview,
        inventory: quote.inventory,
        nextId: quote.nextId,
      };
    }
  return {
    ok: steps.length > 0,
    signature: signature(pets),
    steps,
    fusions: steps.reduce((n, s) => n + s.quote.operations.length, 0),
    consumed: steps.flatMap((s) => s.quote.consumed),
    outputs: steps.flatMap((s) => s.quote.outputs),
    freeSlots: Math.max(0, 500 - preview.inventory.length),
  };
}

export function fuseEligibleDuplicates(state, now, expectedSignature) {
  const quote = safeFusionQuote(state.pets);
  if (!quote.ok || !expectedSignature || quote.signature !== expectedSignature)
    return false;
  // Reuse exact, signature-checked transactional fusion machinery. The caller
  // must run this synchronous action in ONE runtime requireSave transaction.
  const draft = JSON.parse(JSON.stringify(state));
  for (const step of quote.steps) {
    const result = fuseBatch(draft, step.options, now, step.signature);
    if (!result) return false;
  }
  Object.assign(state, draft);
  return { fusions: quote.fusions, freeSlots: quote.freeSlots };
}

export function setAutoFusion(state, enabled, { confirmed = false } = {}) {
  if (typeof enabled !== "boolean" || (enabled && !confirmed)) return false;
  if (state.pets.autoFusionEnabled === enabled) return false;
  state.pets.autoFusionEnabled = enabled;
  return true;
}

export function canAutoFuse(
  runtime,
  { hidden = false, online = true, busy = false, updatePending = false } = {},
) {
  return (
    runtime.writable &&
    runtime.canSave &&
    !runtime.updating &&
    !hidden &&
    online &&
    !busy &&
    !updatePending
  );
}

/** No listener/poller: invoked only by the real foreground hatch event. Both
 * debit/reward AND consolidation persist or roll back together via runtime.act.
 * Capacity is checked BEFORE hatching: never delete pets speculatively. */
export function hatchWithAutoFusion(state, eggId, count, now, options = {}) {
  const result = hatchPets(state, eggId, count, now, options);
  if (!result) return false;
  result.autoFusion = null;
  let stats = state.pets.autoFusionStats;
  if (
    state.pets.autoFusionEnabled &&
    options.autoFusionAllowed === true &&
    options.requestId &&
    stats.lastRequestId !== options.requestId
  ) {
    const quote = safeFusionQuote(state.pets);
    if (quote.ok) {
      result.autoFusion = fuseEligibleDuplicates(state, now, quote.signature);
      if (!result.autoFusion) return result;
      stats = state.pets.autoFusionStats;
      stats.runs = Math.min(Number.MAX_SAFE_INTEGER, stats.runs + 1);
      stats.fusions = Math.min(
        Number.MAX_SAFE_INTEGER,
        stats.fusions + result.autoFusion.fusions,
      );
      stats.lastAt = state.lastTick;
      stats.lastRequestId = options.requestId;
    }
  }
  return result;
}
