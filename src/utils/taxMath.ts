import type { PayrollTax, TaxBracket } from '../types/tax';

export const calculateProgressiveTax = (income: number, brackets: TaxBracket[]) => {
  let tax = 0;
  let previousCap = 0;
  for (const bracket of brackets) {
    if (income <= previousCap) break;
    const taxableAmount = Math.min(income, bracket.cap) - previousCap;
    tax += taxableAmount * bracket.rate;
    previousCap = bracket.cap;
  }
  return tax;
};

export const extractStateAbbr = (city: string, stateNameToAbbr: Record<string, string>) => {
  const abbrMatch = city.match(/,\s*([A-Z]{2})(?:\b|$)/);
  if (abbrMatch?.[1]) return abbrMatch[1];
  const stateName = Object.keys(stateNameToAbbr).find((name) => city.includes(name));
  return stateName ? stateNameToAbbr[stateName] : '';
};

// Wage bases are annual, so year-to-date wages decide how much of this period still applies.
export const payrollTaxForPeriod = (tax: PayrollTax, periodWages: number, ytdWages: number) => {
  if (periodWages <= 0) return 0;

  if (tax.appliesAbove !== null) {
    const aboveAfter = Math.max(0, ytdWages + periodWages - tax.appliesAbove);
    const aboveBefore = Math.max(0, ytdWages - tax.appliesAbove);
    return (aboveAfter - aboveBefore) * tax.rate;
  }

  if (tax.wageBase !== null) {
    const remaining = Math.max(0, tax.wageBase - ytdWages);
    return Math.min(periodWages, remaining) * tax.rate;
  }

  return periodWages * tax.rate;
};
