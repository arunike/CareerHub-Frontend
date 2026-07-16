export type EquityLiquidity = 'LIQUID' | 'BUYBACK' | 'ILLIQUID';

export type EquityLiquidityOffer = {
  equity?: number | string | null;
  equity_liquidity?: EquityLiquidity | string | null;
  equity_buyback_value?: number | string | null;
};

export const normalizeEquityLiquidity = (value: unknown): EquityLiquidity => {
  if (value === 'BUYBACK' || value === 'ILLIQUID') return value;
  return 'LIQUID';
};

export const getRealizableEquity = (offer: EquityLiquidityOffer) => {
  const liquidity = normalizeEquityLiquidity(offer.equity_liquidity);
  if (liquidity === 'ILLIQUID') return 0;
  if (liquidity === 'BUYBACK') return Math.max(0, Number(offer.equity_buyback_value) || 0);
  return Math.max(0, Number(offer.equity) || 0);
};

export const getEquityLiquidityCopy = (offer: EquityLiquidityOffer) => {
  const granted = Math.max(0, Number(offer.equity) || 0);
  const realizable = getRealizableEquity(offer);
  const liquidity = normalizeEquityLiquidity(offer.equity_liquidity);

  if (liquidity === 'ILLIQUID') {
    return {
      label: 'Paper equity',
      detail: '$0 counted until a liquidity event',
      granted,
      realizable,
    };
  }
  if (liquidity === 'BUYBACK') {
    return {
      label: 'Company buyback',
      detail: `${realizable.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} realizable / yr`,
      granted,
      realizable,
    };
  }
  return {
    label: 'Liquid equity',
    detail: 'Full annual value counted',
    granted,
    realizable,
  };
};
