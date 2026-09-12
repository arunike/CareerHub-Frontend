// Health cover terms, asked for in the offer form and shown on the scorecard.
export const HEALTH_TOOLTIPS = {
  healthPlanType:
    'PPO lets you see any doctor and costs most. HMO is cheapest but needs referrals and stays in-network. EPO is in-network only, no referrals. HDHP has a high deductible and low premium, and is the only kind that can pair with an HSA.',
  coverageTier:
    'Who the premium covers: just you, you and a spouse, or the whole family. Each step up costs more per paycheck.',
  premiumPerPaycheck:
    'What comes out of each paycheck for this cover. It is normally pre-tax, so it lowers your taxable income as well as your take-home.',
  dependentPremiumAddOn: 'The extra per paycheck to cover dependants, on top of your own premium.',
  deductibleIndividual:
    'What you pay yourself before the insurer starts paying: the first slice of care each year is on you, up to this amount.',
  deductibleFamily: 'The same thing counted across everyone on the plan, rather than per person.',
  outOfPocketMaxIndividual:
    'The most you can possibly pay in a year, including the deductible and copays. Past this the insurer pays everything, so it is the number that caps a bad year.',
  outOfPocketMaxFamily:
    'The worst case for the whole family combined, whatever any one person has already spent.',
  primaryCareCopay:
    'The flat fee for a routine GP visit, paid each time rather than counting towards the premium.',
  specialistCopay: 'The flat fee to see a specialist. Usually higher than a GP visit.',
  hsaEmployerContribution:
    'Money the employer puts into a Health Savings Account for you each year. It is yours to keep, rolls over, and is not taxed, so it counts in full here.',
} as const;
