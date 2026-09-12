// Paychecks, the year ledger and the deferral limits behind them.
export const INCOME_TOOLTIPS = {
  bonusEarnedYear:
    'A bonus is usually earned in one year and paid in the next, so proration is measured against the year it was earned, not the year the money arrives. Defaults to the year before this one.',
  bonusProration:
    'A target bonus is earned across the performance year, so a part year earns part of it. Extra bonuses are never prorated.',
  rolesListed: 'Every role from your Experience page is listed here, alongside your current offer.',
  waterfallScaling:
    'Scaled so the lines add up to your recorded take-home. Social Security and Medicare are statutory, so the difference is attributed to income tax.',
  takeHomeExceedsGross:
    'The recorded take-home is more than this gross can pay. Record the gross too, or check the role\u2019s salary.',
  paycheckOverrides: 'Change insurance, other deductions or 401(k) rates for this paycheck only.',
  employerMatchNotTakeHome:
    'Real compensation, but it goes straight to your 401(k) rather than through your paycheck, so it is not part of take-home.',
  deferralLimit:
    'The 402(g) elective deferral limit covers your traditional and Roth contributions together. The employer match does not count against it.',
  payDate:
    'When the money lands. Adjust it when payday shifts, for example a federal holiday moving it earlier.',
  recordedActual:
    'What landed. Click a figure to record what your payslip actually says; clear it to go back to the modelled number.',
  ledgerEmployerMatch:
    'Employer 401(k) match. Paid on your behalf, so it is not part of take-home.',
  effectiveTaxRate: 'Tax as a share of gross pay.',
  paycheckFlags: 'Automatic flags for why a paycheck differs, plus any note you add.',
} as const;
