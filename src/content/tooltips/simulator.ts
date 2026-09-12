// The monthly take-home simulator, where each column is a derived figure worth explaining.
export const SIMULATOR_TOOLTIPS = {
  takeHomePerMonth:
    'Main value is after tax: base cash + bonus + first-year equity vesting, divided by 12. The small line shows the pre-tax monthly equivalent and tax rates.',
  withSignOn:
    'Take-home per month plus sign-on spread across the first 12 months. The small line compares after-tax and pre-tax sign-on.',
  rent: 'Saved monthly rent estimate or your rent override. Saved estimates scale from the reference rent by local cost-of-living index.',
  commute:
    'Saved commute cost annualized from daily, monthly or yearly, then divided by 12, or your monthly override.',
  food: 'Monthly food budget minus the value of the meals the office provides. Meals you pay for yourself are already inside this budget, so they are counted in the offer score rather than added here. Never drops below zero.',
  ptoValue:
    'Estimated pre-tax PTO value: base salary plus bonus, divided by 260 workdays, multiplied by PTO days. Unlimited PTO is shown as Unlimited.',
  leftover:
    'Take-home per month minus monthly rent, commute and net food cost. This is cash-flow leftover before other personal expenses.',
  vestYearOne: 'Year 1 vesting value after applying equity tax.',
  vestLaterYears: 'Vesting value after market scenario growth or decline and equity tax.',
} as const;
