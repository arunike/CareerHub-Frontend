interface EquityFields {
  equity: number;
  equity_total_grant?: number | null;
  equity_buyback_value?: number | null;
  equity_ticker?: string | null;
  equity_shares?: number | null;
  equity_grant_price?: number | null;
  equity_current_price?: number | null;
}

export type PriceBySymbol = Record<string, number>;

const num = (value: unknown) => Number(value) || 0;

export const normalizeSymbol = (value: unknown) =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';

// Whatever dollar figure the grant is measured by, so an offer priced only by buyback still works.
const grantValueOf = (offer: EquityFields) =>
  num(offer.equity_total_grant) || num(offer.equity) || num(offer.equity_buyback_value);

// A private company has no ticker, so its price lives on the offer; a listed one shares a quote.
export const currentPriceOf = (offer: EquityFields, prices: PriceBySymbol): number => {
  const own = num(offer.equity_current_price);
  if (own > 0) return own;
  const symbol = normalizeSymbol(offer.equity_ticker);
  return symbol ? num(prices[symbol]) : 0;
};

// A ratio rather than a rebuilt grant, so vesting, cliffs and refresh schedules stay untouched.
export const priceRatio = (offer: EquityFields, prices: PriceBySymbol): number => {
  const current = currentPriceOf(offer, prices);
  if (current <= 0) return 1;

  const grantPrice = num(offer.equity_grant_price);
  if (grantPrice > 0) return current / grantPrice;

  // No grant price, but a share count implies one: the grant's dollar value divided by the shares.
  const shares = num(offer.equity_shares);
  const grantValue = grantValueOf(offer);
  if (shares > 0 && grantValue > 0) return (shares * current) / grantValue;

  return 1;
};

// A private buyback is priced per share too; the price is just an internal one, not a market one.
export const impliedShares = (offer: EquityFields): number | null => {
  const entered = num(offer.equity_shares);
  if (entered > 0) return entered;
  const grantPrice = num(offer.equity_grant_price);
  const grantValue = grantValueOf(offer);
  if (grantPrice > 0 && grantValue > 0) return grantValue / grantPrice;
  return null;
};

// Applied after any raise, so the figure being repriced is the grant you actually hold today.
export const withCurrentEquity = <T extends EquityFields>(offer: T, prices: PriceBySymbol): T => {
  const ratio = priceRatio(offer, prices);
  if (ratio === 1) return offer;
  const scaled = (value: number | null | undefined) => (value == null ? value : num(value) * ratio);
  // equity_buyback_value is left alone: nothing reads a repriced copy, and scaling it made a float
  return {
    ...offer,
    equity: num(offer.equity) * ratio,
    equity_total_grant: scaled(offer.equity_total_grant),
  };
};

export const pricesBySymbol = (rows: Array<{ symbol: string; price: string | number }>) =>
  rows.reduce<PriceBySymbol>((map, row) => {
    const symbol = normalizeSymbol(row.symbol);
    if (symbol) map[symbol] = num(row.price);
    return map;
  }, {});
