// Money columns are numeric(12,2), so an unrounded float is rejected as having too many digits.
const FOUR_DECIMAL_FIELDS = new Set([
  'equity_shares',
  'equity_grant_price',
  'equity_current_price',
]);

export const roundOfferDecimals = <T extends Record<string, unknown>>(offer: T): T => {
  const out: Record<string, unknown> = { ...offer };
  for (const [key, value] of Object.entries(out)) {
    // Strings come back from the API already formatted, and an integer cannot overflow the scale.
    if (typeof value !== 'number' || !Number.isFinite(value) || Number.isInteger(value)) continue;
    const places = FOUR_DECIMAL_FIELDS.has(key) ? 4 : 2;
    const factor = 10 ** places;
    out[key] = Math.round(value * factor) / factor;
  }
  return out as T;
};
