import { extractStateAbbr } from '../taxMath';
import type { IncomeSource } from './incomeSources';
import {
  applyPayDateOverrides,
  buildPayPeriods,
  defaultFirstPayDate,
  mergePeriods,
  toIsoDate,
} from './paySchedule';
import { annualLimits, federalTable, stateTable, type TaxTableOverrides } from './tax/data';
import { buildLedger, type Ledger, type LedgerInput } from './tax/ledger';
import { compareActuals, reconcileYear } from './tax/reconcile';
import { toEffectiveRows, type EffectiveRow } from './effectiveRows';
import { summarizeRetirement } from './retirement';
import { allowanceSchedule as buildAllowanceSchedule, splitAllowances } from './allowances';
import { tiersFromOffer, type MatchTier } from './matchTiers';
import { splitCustomDeductions } from './deductions';
import { buildVestEvents } from './vestEvents';
import { backPayFor, raiseLedgerNotice, salaryByPeriod } from './raiseSchedule';
import { salaryBasisOf, type SalaryBasis } from './salaryBasis';
import { deferralOverridesFor, emptyDeferralPlan, mergeDeferralSchedule } from './deferralSchedule';
import { raiseCoverageOf, type RaiseCoverage } from './raiseCoverage';
import {
  buildBonusEvents,
  nextYearBonusEstimate,
  offCyclePeriods,
  prorationDetail,
  performanceYearOptions as performanceYearChoices,
  resolvePerformanceYear,
  totalBonus,
} from './bonusSchedule';
import { buildPeriodOverrides, type PeriodDefaults } from './periodDeductions';
import { roundCents } from './numberField';
import type { IncomeSettings } from './incomeSettings';

export interface IncomeModelInput {
  settings: IncomeSettings;
  source: IncomeSource | null;
  taxYear: number;
  stateNames: Record<string, string>;
  stateTaxRates: Record<string, number>;
  taxOverrides?: TaxTableOverrides;
  // Splits landed paychecks from projected ones. Defaults to today at the app boundary.
  todayIso?: string;
}

export interface IncomeModel {
  paychecksPerYear: number;
  // Which record produced the headline salary, so the page can show its own working.
  salaryBasis: SalaryBasis;
  // How many raises exist and how many paychecks they moved; zero of either is worth saying.
  raiseCoverage: RaiseCoverage;
  // Why a recorded raise did not move any paycheck; null when it did, or when there is none.
  raiseNotice: string | null;
  annualSalary: number;
  firstPayDate: string;
  periods: ReturnType<typeof buildPayPeriods>;
  vestingTerms: {
    totalGrant: number;
    vestingYears: number;
    cliffMonths: number;
    vestsPerYear: number;
    grantDate: string | null;
  };
  stateAbbr: string;
  targetBonus: number;
  bonusTotal: number;
  bonusEvents: ReturnType<typeof buildBonusEvents>;
  vestEvents: ReturnType<typeof buildVestEvents>;
  bonusProration: number;
  performanceYear: number;
  performanceYearOptions: number[];
  bonusProrationDetail: ReturnType<typeof prorationDetail>;
  nextYearBonus: ReturnType<typeof nextYearBonusEstimate>;
  ledgerPeriods: ReturnType<typeof buildPayPeriods>;
  deductionLines: { medical: number; dental: number; vision: number; dependent: number };
  allowanceSchedule: ReturnType<typeof buildAllowanceSchedule>;
  allowanceSplit: ReturnType<typeof splitAllowances>;
  matchTiers: MatchTier[];
  periodDefaults: PeriodDefaults;
  customSplit: ReturnType<typeof splitCustomDeductions>;
  periodOverrides: ReturnType<typeof buildPeriodOverrides>;
  ledgerInput: LedgerInput;
  ledger: Ledger;
  effectiveRows: EffectiveRow[];
  reconciliation: ReturnType<typeof reconcileYear>;
  retirement: ReturnType<typeof summarizeRetirement>;
  drift: ReturnType<typeof compareActuals>;
}

// Pure, so the page runs it for one role and the year summary runs it for every role.
export const buildIncomeModel = ({
  settings,
  source,
  taxYear,
  stateNames,
  stateTaxRates,
  taxOverrides,
  todayIso = toIsoDate(new Date()),
}: IncomeModelInput): IncomeModel => {
  const paychecksPerYear = settings.paychecksPerYearOverride ?? source?.paychecksPerYear ?? 26;
  const annualSalary = settings.salaryOverride ?? source?.annualSalary ?? 0;
  const firstPayDate = settings.firstPayDate ?? defaultFirstPayDate(taxYear, paychecksPerYear);

  const periods = applyPayDateOverrides(
    buildPayPeriods(taxYear, paychecksPerYear, {
      firstPayDate,
      startDate: source?.startDate ?? null,
      endDate: source?.endDate ?? null,
    }),
    settings.actuals
  );

  const vestingTerms = {
    totalGrant: settings.totalGrantOverride ?? source?.totalGrant ?? 0,
    vestingYears: settings.vestingYearsOverride ?? source?.vestingYears ?? 4,
    cliffMonths: settings.cliffMonthsOverride ?? source?.cliffMonths ?? 12,
    vestsPerYear: settings.vestsPerYearOverride ?? source?.vestsPerYear ?? 4,
    grantDate: settings.firstVestDate ?? source?.startDate ?? null,
  };

  const targetBonus = settings.bonusOverride ?? source?.bonus ?? 0;
  const performanceYearOptions = performanceYearChoices(
    taxYear,
    source?.startDate,
    source?.endDate
  );
  const performanceYear = resolvePerformanceYear(
    settings.bonusPerformanceYear,
    taxYear,
    performanceYearOptions
  );
  const bonusProrationDetail = prorationDetail(performanceYear, source?.startDate, source?.endDate);
  const bonusProration = bonusProrationDetail.factor;
  const bonusTotal = totalBonus(
    targetBonus,
    settings.bonusMultiplierPercent,
    settings.bonusExtras,
    settings.bonusProrated ? bonusProration : 1
  );
  // Quoted at target: assuming this year's rating again would be a guess, not a forecast.
  const nextYearBonus = nextYearBonusEstimate(
    taxYear,
    targetBonus,
    source?.startDate,
    source?.endDate
  );

  // A bonus paid on its own date becomes an extra period, interleaved by date.
  const ledgerPeriods = settings.includeBonus
    ? mergePeriods(periods, offCyclePeriods(settings.bonusPayouts, taxYear))
    : periods;

  const bonusEvents = settings.includeBonus
    ? buildBonusEvents(bonusTotal, settings.bonusPayouts, ledgerPeriods)
    : [];

  // A raise payroll applied late is settled on the first paycheck that carries the new rate.
  const backPayEvents = backPayFor(source?.raises ?? [], {
    paychecksPerYear,
    payDates: ledgerPeriods.map((entry) => entry.payDate).filter(Boolean) as string[],
    payLagDays: settings.payLagDays,
  }).flatMap((owed) => {
    const period = ledgerPeriods.find((entry) => entry.payDate && entry.payDate >= owed.paidFrom);
    if (!period) return [];
    return [
      {
        id: `backpay-${owed.raiseId}`,
        kind: 'other' as const,
        periodIndex: period.periodIndex,
        amount: owed.amount,
        label: `Back pay from ${owed.effectiveFrom}`,
      },
    ];
  });

  const vestEvents = settings.includeVestEvents
    ? buildVestEvents({ ...vestingTerms, taxYear, paychecksPerYear, periods })
    : [];

  const stateAbbr = settings.stateOverride || extractStateAbbr(source?.location ?? '', stateNames);

  const coversDependents = settings.hasDependentsOverride ?? source?.hasDependents ?? false;
  const deductionLines = {
    medical: settings.medicalOverride ?? source?.medicalPerPeriod ?? 0,
    dental: settings.dentalOverride ?? source?.dentalPerPeriod ?? 0,
    vision: settings.visionOverride ?? source?.visionPerPeriod ?? 0,
    // Summed from its three lines, so the ledger keeps one figure while the form shows the parts.
    dependent: coversDependents
      ? (settings.dependentMedicalOverride ?? source?.dependentMedicalPerPeriod ?? 0) +
        (settings.dependentDentalOverride ?? source?.dependentDentalPerPeriod ?? 0) +
        (settings.dependentVisionOverride ?? source?.dependentVisionPerPeriod ?? 0)
      : 0,
  };

  const customSplit = splitCustomDeductions(settings.customDeductions);

  // The offer records one band; editing here can express several.
  const matchTiers =
    settings.matchTiers ??
    tiersFromOffer(
      source?.employer.match401kPercent ?? 0,
      source?.employer.match401kLimitPercent ?? 0
    );

  const allowanceSplit = splitAllowances(settings.allowances, paychecksPerYear);
  // Which paycheck each allowance actually lands on, rather than an average.
  const allowanceSchedule = buildAllowanceSchedule(settings.allowances, periods);

  // A recorded raise re-rates every paycheck from its effective date; earlier ones keep the old pay.
  const raiseSalaries = salaryByPeriod(
    periods,
    source?.raises ?? [],
    annualSalary,
    paychecksPerYear
  );

  const periodDefaults: PeriodDefaults = {
    ...deductionLines,
    pretax401kPercent: settings.elections.pretax401kPercent,
    roth401kPercent: settings.elections.roth401kPercent,
    regularGross: paychecksPerYear > 0 ? roundCents(annualSalary / paychecksPerYear) : 0,
  };

  // Laid under the manual overrides, so a rate typed on one paycheck still wins over the schedule.
  const scheduledDeferrals = deferralOverridesFor(
    periods,
    settings.deferralPlan ?? emptyDeferralPlan(),
    {
      pretaxPercent: settings.elections.pretax401kPercent,
      rothPercent: settings.elections.roth401kPercent,
    },
    firstPayDate
  );
  const periodOverrides = buildPeriodOverrides(
    mergeDeferralSchedule(settings.periodDeductions, scheduledDeferrals),
    periodDefaults,
    settings.customDeductions,
    {
      postTaxPerPeriod: settings.elections.postTaxPerPeriod,
      pretaxIncomeOnlyPerPeriod: settings.elections.pretaxIncomeOnlyPerPeriod,
      allowances: settings.allowances,
      allowanceSchedule,
    }
  );

  const ledgerInput: LedgerInput = {
    filingStatus: settings.filingStatus,
    periodsPerYear: paychecksPerYear,
    periods: ledgerPeriods,
    periodOverrides,
    allowanceByPeriod: allowanceSchedule,
    annualSalary,
    salaryPerPeriodByIndex: raiseSalaries,
    incomeEvents: [...bonusEvents, ...vestEvents, ...backPayEvents, ...settings.extraEvents],
    elections: {
      ...settings.elections,
      section125PerPeriod:
        deductionLines.medical +
        deductionLines.dental +
        deductionLines.vision +
        deductionLines.dependent +
        customSplit.section125,
      pretaxIncomeOnlyPerPeriod:
        settings.elections.pretaxIncomeOnlyPerPeriod + customSplit.pretaxIncomeOnly,
      taxableAllowancePerPeriod: allowanceSplit.taxable,
      taxFreeAllowancePerPeriod: allowanceSplit.taxFree,
      postTaxPerPeriod: settings.elections.postTaxPerPeriod + customSplit.postTax,
    },
    employer: {
      ...(source?.employer ?? { match401kPercent: 0, match401kLimitPercent: 0, hsaAnnual: 0 }),
      // Null means the offer's single-band formula is still in force.
      matchTiers,
      nonElectivePercent: settings.matchNonElectivePercent,
      matchAnnualCap: settings.matchAnnualCap,
    },
    w4: settings.w4,
    federal: federalTable(taxYear, taxOverrides),
    state: stateTable(stateAbbr, taxYear, stateTaxRates),
    limits: annualLimits(taxYear, taxOverrides),
  };

  const ledger = buildLedger(ledgerInput);

  return {
    paychecksPerYear,
    annualSalary,
    salaryBasis: salaryBasisOf(settings.salaryOverride, source?.annualSalary, source?.payFrom),
    raiseCoverage: raiseCoverageOf(source?.raises ?? [], Object.keys(raiseSalaries).length),
    // Non-null when a logged raise changed nothing, so a flat ledger explains itself.
    raiseNotice: raiseLedgerNotice({
      raises: source?.raises ?? [],
      periods,
      fallbackSalary: annualSalary,
      hasLinkedOffer: Boolean(source?.hasBenefitData),
    }),
    firstPayDate,
    periods,
    vestingTerms,
    stateAbbr,
    targetBonus,
    bonusTotal,
    bonusEvents,
    vestEvents,
    bonusProration,
    performanceYear,
    performanceYearOptions,
    bonusProrationDetail,
    nextYearBonus,
    ledgerPeriods,
    deductionLines,
    allowanceSchedule,
    allowanceSplit,
    matchTiers,
    periodDefaults,
    customSplit,
    periodOverrides,
    ledgerInput,
    ledger,
    effectiveRows: toEffectiveRows(ledger.rows, settings.actuals),
    reconciliation: reconcileYear(
      ledger.totals,
      ledgerInput.federal,
      ledgerInput.state,
      ledgerInput.filingStatus,
      ledgerInput.w4
    ),
    retirement: summarizeRetirement(
      ledger.rows,
      ledgerInput.employer,
      settings.retirementStartingBalance,
      settings.retirementCurrentValue,
      ledger.elective401kLimit,
      todayIso
    ),
    drift: compareActuals(ledger.rows, settings.actuals),
  };
};
