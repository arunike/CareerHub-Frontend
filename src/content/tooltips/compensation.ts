// Pay components as the scorecard presents them, before any scoring is applied.
export const COMPENSATION_TOOLTIPS = {
  baseSalary:
    'Your fixed annual salary before tax, the main guaranteed component of compensation. The after-tax amount applies your estimated tax rate.',
  bonus:
    'Annual performance bonus, typically a percentage of base and treated as a target amount. The after-tax estimate uses the supplemental bonus rate.',
  relocation:
    'One-time relocation or signing perk cash value. The after-tax estimate uses the supplemental W2 bonus rate.',
  signOnClawback:
    'One-time signing bonus paid when you join. Often subject to a clawback period, typically one to two years.',
  healthSummary: 'Monthly premium and annual HSA contribution details.',
  retirementSummary: 'Employer retirement match percentage and the maximum contribution matched.',
  timeOff:
    'PTO covers vacation and personal time. Sick leave is tracked separately. Holidays are company-observed days off. Unlimited PTO policies vary by company culture.',
  diffVsCurrent:
    'Total comp difference using base, bonus, realizable equity and sign-on, compared with your current job. Paper equity is excluded.',
  trajectoryPair:
    'Growth and the team that produces it, averaged. They move together, so they share one weight rather than counting the same judgement twice.',
} as const;
