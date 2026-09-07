import { describe, expect, it } from 'vitest';
import { getEquityLiquidityCopy, getRealizableEquity } from './equityLiquidity';

describe('getRealizableEquity', () => {
  it('counts the annual equity for a listed grant', () => {
    expect(getRealizableEquity({ equity: 50000, equity_liquidity: 'LIQUID' })).toBe(50000);
  });

  it('counts the same annual equity for a buyback, priced by share pricing', () => {
    expect(getRealizableEquity({ equity: 50000, equity_liquidity: 'BUYBACK' })).toBe(50000);
  });

  it('counts nothing when the grant cannot be sold', () => {
    expect(getRealizableEquity({ equity: 50000, equity_liquidity: 'ILLIQUID' })).toBe(0);
  });

  it('never returns a negative figure', () => {
    expect(getRealizableEquity({ equity: -100, equity_liquidity: 'LIQUID' })).toBe(0);
  });
});

describe('getEquityLiquidityCopy', () => {
  it('still separates paper equity from what is granted', () => {
    const copy = getEquityLiquidityCopy({ equity: 30000, equity_liquidity: 'ILLIQUID' });
    expect(copy.granted).toBe(30000);
    expect(copy.realizable).toBe(0);
    expect(copy.label).toBe('Paper equity');
  });

  it('says a buyback realises at the buyback price', () => {
    const copy = getEquityLiquidityCopy({ equity: 40000, equity_liquidity: 'BUYBACK' });
    expect(copy.detail).toContain('buyback price');
    expect(copy.realizable).toBe(40000);
  });
});
