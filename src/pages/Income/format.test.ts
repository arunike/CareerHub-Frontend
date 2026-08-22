import { describe, expect, it } from 'vitest';
import { money, moneyCents, percent, signedMoney } from './format';

describe('money', () => {
  it('always shows two decimal places', () => {
    expect(money(3444)).toBe('$3,444.00');
    expect(money(3444.2)).toBe('$3,444.20');
    expect(money(3444.235)).toBe('$3,444.24');
  });

  it('groups thousands', () => {
    expect(money(108048.32)).toBe('$108,048.32');
    expect(money(30000000)).toBe('$30,000,000.00');
  });

  it('formats zero and negatives', () => {
    expect(money(0)).toBe('$0.00');
    expect(money(-161.2)).toBe('-$161.20');
  });

  it('matches moneyCents, so the two cannot drift apart', () => {
    for (const value of [0, 1.005, 153.46, 3444.23, 108048.32]) {
      expect(money(value)).toBe(moneyCents(value));
    }
  });
});

describe('signedMoney', () => {
  it('carries an explicit sign to the cent', () => {
    expect(signedMoney(25.5)).toBe('+$25.50');
    expect(signedMoney(-25.5)).toBe('-$25.50');
    expect(signedMoney(0)).toBe('+$0.00');
  });
});

describe('percent', () => {
  it('defaults to one decimal place', () => {
    expect(percent(0.3012)).toBe('30.1%');
  });

  it('honours a requested precision', () => {
    expect(percent(0.3012, 0)).toBe('30%');
    expect(percent(0.3012, 2)).toBe('30.12%');
  });
});
