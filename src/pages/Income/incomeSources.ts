import { parseIsoDate } from './paySchedule';
import type { EmployerContributions } from './tax/ledger';

export interface IncomeSource {
  key: string;
  kind: 'offer' | 'experience';
  isCurrent: boolean;
  company: string;
  roleTitle: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  annualSalary: number;
  bonus: number;
  totalGrant: number;
  paychecksPerYear: number;
  premiumsPerPeriod: number;
  medicalPerPeriod: number;
  dentalPerPeriod: number;
  visionPerPeriod: number;
  dependentPerPeriod: number;
  employer: EmployerContributions;
  cliffMonths: number;
  vestsPerYear: number;
  vestingYears: number;
  // False when a past role has no linked offer, so benefits and match are unknown.
  hasBenefitData: boolean;
}

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const premiumsOf = (offer: Record<string, any> | null) => {
  if (!offer) {
    return { medical: 0, dental: 0, vision: 0, dependent: 0, total: 0 };
  }
  const medical = num(offer.health_premium_paycheck);
  const dental = num(offer.dental_premium_paycheck);
  const vision = num(offer.vision_premium_paycheck);
  const dependent = offer.has_dependents
    ? num(offer.dependent_health_premium_paycheck) +
      num(offer.dependent_dental_premium_paycheck) +
      num(offer.dependent_vision_premium_paycheck)
    : 0;
  return { medical, dental, vision, dependent, total: medical + dental + vision + dependent };
};

// equity holds the annualized value, so the grant is recoverable from the vest percent.
const grantOf = (offer: Record<string, any> | null, fallbackEquity = 0) => {
  const equity = offer ? num(offer.equity) : fallbackEquity;
  const explicit = offer ? num(offer.equity_total_grant) : 0;
  if (explicit > 0) return explicit;
  const vestPercent = offer ? num(offer.equity_vesting_percent) : 25;
  return vestPercent > 0 ? equity / (vestPercent / 100) : equity * 4;
};

const employerOf = (offer: Record<string, any> | null): EmployerContributions => ({
  match401kPercent: offer ? num(offer.forty_one_k_match_percent) : 0,
  match401kLimitPercent: offer ? num(offer.forty_one_k_max_match) : 0,
  hsaAnnual: offer ? num(offer.hsa_employer_contribution) : 0,
});

// Hourly roles state a rate rather than a salary, so it is annualized to drive the ledger.
const annualizedHourly = (experience: Record<string, any>) => {
  const rate = num(experience.hourly_rate);
  if (rate <= 0) return 0;
  const hoursPerDay = num(experience.hours_per_day) || 8;
  const daysPerWeek = num(experience.working_days_per_week) || 5;
  return rate * hoursPerDay * daysPerWeek * 52;
};

const vestingOf = (offer: Record<string, any> | null) => ({
  cliffMonths: offer ? num(offer.equity_cliff_months) || 12 : 12,
  vestsPerYear: offer ? num(offer.equity_vests_per_year) || 4 : 4,
  vestingYears: offer ? num(offer.equity_vesting_years) || 4 : 4,
});

const spreadPremiums = (premiums: ReturnType<typeof premiumsOf>) => ({
  premiumsPerPeriod: premiums.total,
  medicalPerPeriod: premiums.medical,
  dentalPerPeriod: premiums.dental,
  visionPerPeriod: premiums.vision,
  dependentPerPeriod: premiums.dependent,
});

export const buildIncomeSources = (
  offers: Array<Record<string, any>>,
  experiences: Array<Record<string, any>>
): IncomeSource[] => {
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));
  const usedOfferIds = new Set<number>();

  const fromExperiences = experiences.map((experience) => {
    const offer = experience.offer ? (offerById.get(experience.offer) ?? null) : null;
    if (offer) usedOfferIds.add(offer.id);

    return {
      key: `experience-${experience.id}`,
      kind: 'experience' as const,
      isCurrent: Boolean(experience.is_current),
      company: experience.company || 'Role',
      roleTitle: experience.title || '',
      location: experience.location || offer?.application_details?.location || '',
      startDate: experience.start_date ?? null,
      endDate: experience.end_date ?? null,
      annualSalary: num(experience.base_salary) || annualizedHourly(experience),
      bonus: num(experience.bonus),
      totalGrant: grantOf(offer, num(experience.equity)),
      paychecksPerYear: offer ? num(offer.paychecks_per_year) || 26 : 26,
      ...spreadPremiums(premiumsOf(offer)),
      employer: employerOf(offer),
      ...vestingOf(offer),
      hasBenefitData: Boolean(offer),
    };
  });

  // Only the offer you are on is income; the rest are hypotheticals with no dates.
  const fromOffers = offers
    .filter((offer) => !usedOfferIds.has(offer.id) && Boolean(offer.is_current))
    .map((offer) => {
      const details = (offer.application_details ?? {}) as Record<string, string>;
      return {
        key: `offer-${offer.id}`,
        kind: 'offer' as const,
        isCurrent: Boolean(offer.is_current),
        company: details.company || 'Offer',
        roleTitle: details.role_title || '',
        location: details.location || '',
        startDate: null,
        endDate: null,
        annualSalary: num(offer.base_salary),
        bonus: num(offer.bonus),
        totalGrant: grantOf(offer),
        paychecksPerYear: num(offer.paychecks_per_year) || 26,
        ...spreadPremiums(premiumsOf(offer)),
        employer: employerOf(offer),
        ...vestingOf(offer),
        hasBenefitData: true,
      };
    });

  return [...fromExperiences, ...fromOffers].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return (b.startDate ?? '').localeCompare(a.startDate ?? '');
  });
};

// Overlap decides the tax year; a source with no dates always qualifies.
export const activeInYear = (source: IncomeSource, taxYear: number) => {
  const start = parseIsoDate(source.startDate);
  const end = parseIsoDate(source.endDate);
  if (start && start.getFullYear() > taxYear) return false;
  if (end && end.getFullYear() < taxYear) return false;
  return true;
};

// Never removes the last option: an empty picker reads as a broken page.
export const applyIncomeVisibility = <T>(items: T[], hidden: (item: T) => boolean): T[] => {
  const visible = items.filter((item) => !hidden(item));
  return visible.length > 0 ? visible : items;
};

export const visibleSources = (sources: IncomeSource[], hiddenKeys: string[] = []) => {
  const hidden = new Set(hiddenKeys);
  return applyIncomeVisibility(sources, (source) => hidden.has(source.key));
};

export const visibleYears = (years: number[], hiddenYears: number[] = []) => {
  const hidden = new Set(hiddenYears);
  return applyIncomeVisibility(years, (year) => hidden.has(year));
};

// Every year any role covers, so a year shows only the roles held then.
export const yearsForSources = (sources: IncomeSource[], latestYear: number): number[] => {
  const years = new Set<number>([latestYear]);
  for (const source of sources) {
    for (const year of yearsForSource(source, latestYear)) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
};

export const yearsForSource = (source: IncomeSource | null, latestYear: number): number[] => {
  const start = parseIsoDate(source?.startDate);
  if (!start) return [latestYear];
  const startYear = start.getFullYear();
  const endYear = parseIsoDate(source?.endDate)?.getFullYear() ?? latestYear;

  const years: number[] = [];
  for (let year = Math.max(startYear, 1990); year <= Math.max(startYear, endYear); year += 1) {
    years.push(year);
  }
  return years.length > 0 ? years.reverse() : [latestYear];
};
