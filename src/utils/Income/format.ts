// To the cent: whole dollars hid the difference between near-identical paychecks.
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const money = (value: number) => currency.format(value);
export const moneyCents = (value: number) => currency.format(value);

// Whole dollars, for a figure where the cents are noise rather than the point.
const wholeCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const moneyWhole = (value: number) => wholeCurrency.format(Math.round(value));
export const signedMoney = (value: number) =>
  `${value >= 0 ? '+' : '-'}${currency.format(Math.abs(value))}`;
export const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
