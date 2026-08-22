// Every figure on the page is shown to the cent: rounding to whole dollars made the
// columns look inconsistent and hid the difference between near-identical paychecks.
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const money = (value: number) => currency.format(value);
export const moneyCents = (value: number) => currency.format(value);
export const signedMoney = (value: number) =>
  `${value >= 0 ? '+' : '-'}${currency.format(Math.abs(value))}`;
export const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
