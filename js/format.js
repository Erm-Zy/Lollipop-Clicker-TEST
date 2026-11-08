// Presentation only. Never feed abbreviated strings back into game arithmetic.
const digits = new Map();
function localized(value, precision = 2) {
  if (!digits.has(precision))
    digits.set(
      precision,
      new Intl.NumberFormat("pt-BR", { maximumFractionDigits: precision }),
    );
  return digits.get(precision).format(value);
}
const units = ["", "mil", "mi", "bi", "tri", "qua", "qui"];
export function format(value, { cost = false } = {}) {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "",
    abs = Math.abs(value);
  if (abs > 0 && abs < 0.01 && !cost)
    return abs < 1e-18
      ? value.toExponential(2).replace(".", ",")
      : localized(value, Math.ceil(-Math.log10(abs)) + 1);
  if (abs < 1000) {
    const shown = cost ? Math.ceil(value * 100) / 100 : value;
    return shown >= 1000 ? format(shown, { cost }) : localized(shown);
  }
  let index = Math.floor(Math.log10(abs) / 3);
  if (index >= units.length)
    return `≈ ${value.toExponential(2).replace(".", ",")}`;
  let scaled = abs / 1000 ** index;
  if (cost)
    scaled = Math.ceil(scaled * 100 - Number.EPSILON * scaled * 100) / 100;
  else scaled = Math.round(scaled * 100) / 100;
  if (scaled >= 1000) {
    scaled /= 1000;
    index++;
  }
  return index < units.length
    ? `${sign}${localized(scaled)} ${units[index]}`
    : `≈ ${value.toExponential(2).replace(".", ",")}`;
}
export const cost = (value) => format(value, { cost: true });
export const exact = (value) =>
  Number.isFinite(value) ? localized(value, 20) : "—";
export const decimal = (value) =>
  Number.isFinite(value) ? localized(value, 2) : "—";
export const percent = (value) => `${decimal(value)}%`;
export const multiplier = (value) => `×${decimal(value)}`;
export const priceLabel = (value, unit = "doces") => `${exact(value)} ${unit}`;
