import type { AnnualLimits, FilingStatus, JurisdictionTable } from '../../../types/tax';
import type { PayPeriod } from '../paySchedule';
import { employerPercentOfPay, matchedDeferralPercent, type MatchTier } from '../matchTiers';
import { payrollTaxForPeriod } from '../../../utils/taxMath';
import {
  EMPTY_W4,
  regularWithholding,
  supplementalWithholding,
  type W4Inputs,
} from './withholding';

export type IncomeEventKind = 'bonus' | 'vest' | 'other';

export interface IncomeEvent {
  id: string;
  kind: IncomeEventKind;
  // 1-based pay period the event is paid in.
  periodIndex: number;
  amount: number;
  label?: string;
}

export interface Elections {
  pretax401kPercent: number;
  roth401kPercent: number;
  hsaPerPeriod: number;
  fsaPerPeriod: number;
  // Section 125 premiums and FSA: reduce income tax and FICA.
  section125PerPeriod: number;
  // Reduces income tax but not FICA, the way a traditional 401(k) does.
  pretaxIncomeOnlyPerPeriod: number;
  // An allowance taxed like wages, e.g. a work-from-home stipend.
  taxableAllowancePerPeriod: number;
  // An allowance paid without tax, e.g. a qualified expense reimbursement.
  taxFreeAllowancePerPeriod: number;
  postTaxPerPeriod: number;
  hsaFamilyCoverage: boolean;
  age50Plus: boolean;
  // Many plans compute the deferral and the match on base pay, excluding stipends and
  // allowances. Leaving this off computes them on the whole gross.
  excludeAllowancesFromDeferralBase: boolean;
}

export const NO_ELECTIONS: Elections = {
  pretax401kPercent: 0,
  roth401kPercent: 0,
  hsaPerPeriod: 0,
  fsaPerPeriod: 0,
  section125PerPeriod: 0,
  pretaxIncomeOnlyPerPeriod: 0,
  taxableAllowancePerPeriod: 0,
  taxFreeAllowancePerPeriod: 0,
  postTaxPerPeriod: 0,
  hsaFamilyCoverage: false,
  age50Plus: false,
  excludeAllowancesFromDeferralBase: false,
};

export interface EmployerContributions {
  // Percent of the matched deferral, e.g. 50 for a 50% match.
  match401kPercent: number;
  // Deferral percent that is eligible for match, e.g. 6 for the first 6% of pay.
  match401kLimitPercent: number;
  // A banded formula such as 100% of the first 3% then 50% of the next 2%. When present it
  // replaces the flat pair above, which can only express one band.
  matchTiers?: MatchTier[];
  // Paid whether or not you defer, as a safe-harbor contribution is.
  nonElectivePercent?: number;
  // Dollar ceiling on the employer's contribution for the year. Zero means none.
  matchAnnualCap?: number;
  hsaAnnual: number;
}

export const NO_EMPLOYER_CONTRIBUTIONS: EmployerContributions = {
  match401kPercent: 0,
  match401kLimitPercent: 0,
  hsaAnnual: 0,
};

// A paycheck where something differs from the standing election, e.g. after open
// enrollment or a month a premium was skipped.
export interface PeriodOverride {
  section125PerPeriod?: number;
  pretaxIncomeOnlyPerPeriod?: number;
  postTaxPerPeriod?: number;
  hsaPerPeriod?: number;
  pretax401kPercent?: number;
  roth401kPercent?: number;
  // Regular pay for this period, when it differs from the usual amount.
  regularGross?: number;
  taxableAllowancePerPeriod?: number;
  taxFreeAllowancePerPeriod?: number;
  // What the employer actually contributed on this paycheck, when it differs from the
  // formula, e.g. a true-up or a bonus matched on a different base.
  employerMatch?: number;
}

export interface LedgerInput {
  filingStatus: FilingStatus;
  // Stays the full-year cadence even for a part year: payroll annualizes every paycheck as
  // if you worked all twelve months, which is why a part year over-withholds.
  periodsPerYear: number;
  // The paychecks actually paid. Defaults to every period in the year.
  periods?: PayPeriod[];
  // Keyed by period index; anything absent falls back to the standing election.
  periodOverrides?: Record<number, PeriodOverride>;
  // Which paycheck each allowance lands on. A monthly allowance is paid once a month
  // rather than as a fraction of every paycheck, so this is not a flat rate.
  allowanceByPeriod?: Record<number, { taxable: number; taxFree: number }>;
  annualSalary: number;
  incomeEvents: IncomeEvent[];
  elections: Elections;
  employer: EmployerContributions;
  w4: W4Inputs;
  federal: JurisdictionTable;
  state: JurisdictionTable;
  limits: AnnualLimits;
}

export interface NamedAmount {
  label: string;
  amount: number;
}

export interface PeriodRow {
  periodIndex: number;
  payDate: string | null;
  regularGross: number;
  supplementalGross: number;
  gross: number;
  taxableAllowance: number;
  taxFreeAllowance: number;
  section125: number;
  fsa: number;
  hsa: number;
  pretax401k: number;
  pretaxIncomeOnly: number;
  roth401k: number;
  ficaWages: number;
  regularTaxable: number;
  supplementalTaxable: number;
  federalRegular: number;
  federalSupplemental: number;
  stateRegular: number;
  stateSupplemental: number;
  payrollTaxes: NamedAmount[];
  payrollTotal: number;
  taxTotal: number;
  postTax: number;
  net: number;
  employerMatch401k: number;
  // What you deferred this period, and how much of it the formula matched. Kept so the
  // match can be explained rather than just stated.
  deferralPercent: number;
  matchedDeferralPercent: number;
  // True when this paycheck used a per-paycheck deduction override.
  isAdjusted: boolean;
  // True for a payment made on its own date rather than with a paycheck.
  isOffCycle: boolean;
  // True when the pay date was moved by hand.
  isAdjustedDate: boolean;
  // True when the employer contribution was recorded rather than derived from the formula.
  isMatchAdjusted: boolean;
  events: IncomeEvent[];
  notes: string[];
}

export interface LedgerTotals {
  gross: number;
  taxableAllowance: number;
  taxFreeAllowance: number;
  section125: number;
  hsa: number;
  pretax401k: number;
  pretaxIncomeOnly: number;
  roth401k: number;
  regularTaxable: number;
  supplementalTaxable: number;
  federalWithheld: number;
  stateWithheld: number;
  payrollWithheld: number;
  taxTotal: number;
  postTax: number;
  net: number;
  employerMatch401k: number;
}

export interface Ledger {
  rows: PeriodRow[];
  totals: LedgerTotals;
  elective401kLimit: number;
  hsaLimit: number;
}

const sumBy = <T>(items: T[], pick: (item: T) => number) =>
  items.reduce((total, item) => total + pick(item), 0);

export const buildLedger = (input: LedgerInput): Ledger => {
  const {
    filingStatus,
    periodsPerYear,
    periods,
    periodOverrides,
    allowanceByPeriod,
    annualSalary,
    incomeEvents,
    elections,
    employer,
    w4,
    federal,
    state,
    limits,
  } = input;

  const rows: PeriodRow[] = [];
  if (periodsPerYear <= 0) {
    return { rows, totals: emptyTotals(), elective401kLimit: 0, hsaLimit: 0 };
  }

  const salaryPerPeriod = annualSalary / periodsPerYear;
  const elective401kLimit = limits.elective401k + (elections.age50Plus ? limits.catchUp401k : 0);
  // An employer contribution counts against the same HSA cap the employee shares.
  const hsaLimit = Math.max(
    0,
    (elections.hsaFamilyCoverage ? limits.hsaFamily : limits.hsaSelf) - employer.hsaAnnual
  );

  let ytdFicaWages = 0;
  let ytdElective401k = 0;
  let ytdHsa = 0;
  let ytdFsa = 0;
  let ytdSupplementalTaxable = 0;
  let ytdEmployerMatch = 0;

  const paidPeriods: PayPeriod[] =
    periods ??
    Array.from({ length: periodsPerYear }, (_, index) => ({
      periodIndex: index + 1,
      payDate: '',
    }));

  for (const period of paidPeriods) {
    const periodIndex = period.periodIndex;
    const events = incomeEvents.filter((event) => event.periodIndex === periodIndex);
    const override = periodOverrides?.[periodIndex];
    const recurringForPay = period.isOffCycle ? 0 : 1;
    const recurring = recurringForPay;
    const notes: string[] = [];

    // An explicit per-paycheck override wins, then the schedule, then the flat election.
    const scheduledAllowance = allowanceByPeriod?.[periodIndex];
    const taxableAllowance =
      recurringForPay *
      (override?.taxableAllowancePerPeriod ??
        scheduledAllowance?.taxable ??
        elections.taxableAllowancePerPeriod);
    const taxFreeAllowance =
      recurringForPay *
      (override?.taxFreeAllowancePerPeriod ??
        scheduledAllowance?.taxFree ??
        elections.taxFreeAllowancePerPeriod);

    // A taxable allowance is wages, so it joins regular pay before anything is withheld.
    // An off-cycle payment carries no salary, so only supplemental pay is withheld on it.
    const regularGross =
      recurringForPay * (override?.regularGross ?? salaryPerPeriod) + taxableAllowance;
    const supplementalGross = sumBy(events, (event) => event.amount);
    const gross = regularGross + supplementalGross;

    const fsa = recurring * Math.min(elections.fsaPerPeriod, Math.max(0, limits.fsa - ytdFsa));
    const section125 =
      recurring * (override?.section125PerPeriod ?? elections.section125PerPeriod) + fsa;
    const hsaElected = recurring * (override?.hsaPerPeriod ?? elections.hsaPerPeriod);
    const hsa = Math.min(hsaElected, Math.max(0, hsaLimit - ytdHsa));

    // Deferral rates can be overridden for a single paycheck.
    const pretaxPercent = override?.pretax401kPercent ?? elections.pretax401kPercent;
    const rothPercent = override?.roth401kPercent ?? elections.roth401kPercent;
    const deferralPercent = pretaxPercent + rothPercent;

    // Pay the plan actually counts when computing deferrals and the match.
    const deferralBase = elections.excludeAllowancesFromDeferralBase
      ? Math.max(0, gross - taxableAllowance)
      : gross;

    // The 402(g) limit is shared between traditional and Roth deferrals.
    const room401k = Math.max(0, elective401kLimit - ytdElective401k);
    const pretax401k = Math.min(deferralBase * (pretaxPercent / 100), room401k);
    const roth401k = Math.min(
      deferralBase * (rothPercent / 100),
      Math.max(0, room401k - pretax401k)
    );
    if (deferralPercent > 0 && room401k <= 0) {
      notes.push('401(k) contribution limit reached');
    }

    // Traditional 401(k) does not reduce FICA wages; Section 125 and payroll HSA do.
    const ficaWages = Math.max(0, gross - section125 - hsa);

    const pretaxIncomeOnly =
      recurring * (override?.pretaxIncomeOnlyPerPeriod ?? elections.pretaxIncomeOnlyPerPeriod);
    const preTaxAgainstIncome = section125 + hsa + pretax401k + pretaxIncomeOnly;
    const regularTaxable = Math.max(0, regularGross - preTaxAgainstIncome);
    const supplementalTaxable = Math.max(
      0,
      supplementalGross - Math.max(0, preTaxAgainstIncome - regularGross)
    );

    const federalRegular = regularWithholding(
      regularTaxable,
      periodsPerYear,
      federal,
      filingStatus,
      w4
    );
    const federalSupplemental = supplementalWithholding(
      supplementalTaxable,
      federal,
      ytdSupplementalTaxable
    );
    // W-4 inputs are federal, so state withholding uses the plain percentage method.
    const stateRegular = regularWithholding(
      regularTaxable,
      periodsPerYear,
      state,
      filingStatus,
      EMPTY_W4
    );
    const stateSupplemental = supplementalWithholding(
      supplementalTaxable,
      state,
      ytdSupplementalTaxable
    );

    const payrollTaxes: NamedAmount[] = [];
    for (const tax of [...federal.payrollTaxes, ...state.payrollTaxes]) {
      const amount = payrollTaxForPeriod(tax, ficaWages, ytdFicaWages);
      payrollTaxes.push({ label: tax.label, amount });
      if (
        tax.wageBase !== null &&
        ytdFicaWages < tax.wageBase &&
        ytdFicaWages + ficaWages >= tax.wageBase
      ) {
        notes.push(`${tax.label} wage base reached`);
      }
    }
    const payrollTotal = sumBy(payrollTaxes, (tax) => tax.amount);

    const taxTotal =
      federalRegular + federalSupplemental + stateRegular + stateSupplemental + payrollTotal;
    const postTax =
      roth401k + recurring * (override?.postTaxPerPeriod ?? elections.postTaxPerPeriod);
    // A tax-free allowance never enters gross, so it is added straight to take-home.
    const net =
      gross -
      section125 -
      hsa -
      pretax401k -
      pretaxIncomeOnly -
      postTax -
      taxTotal +
      taxFreeAllowance;

    const matchedOfPay = employer.matchTiers?.length
      ? employerPercentOfPay(deferralPercent, {
          tiers: employer.matchTiers,
          nonElectivePercent: employer.nonElectivePercent ?? 0,
          annualCap: 0,
        })
      : Math.min(deferralPercent, employer.match401kLimitPercent) *
          (employer.match401kPercent / 100) +
        (employer.nonElectivePercent ?? 0);
    const uncappedMatch = deferralBase * (matchedOfPay / 100);
    // A dollar cap applies across the year, so it needs the running total.
    const capRoom =
      employer.matchAnnualCap && employer.matchAnnualCap > 0
        ? Math.max(0, employer.matchAnnualCap - ytdEmployerMatch)
        : Number.POSITIVE_INFINITY;
    const employerMatch401k = override?.employerMatch ?? Math.min(uncappedMatch, capRoom);
    // A recorded figure still counts against the annual cap.
    if (override?.employerMatch === undefined && capRoom <= 0 && uncappedMatch > 0) {
      notes.push('Employer match cap reached');
    }
    if (override?.employerMatch !== undefined) {
      notes.push('Match adjusted');
    }

    for (const event of events) {
      notes.push(`${event.label ?? event.kind} paid this period`);
    }

    rows.push({
      periodIndex,
      payDate: period.payDate || null,
      regularGross,
      supplementalGross,
      gross,
      taxableAllowance,
      taxFreeAllowance,
      section125,
      fsa,
      hsa,
      pretax401k,
      pretaxIncomeOnly,
      roth401k,
      ficaWages,
      regularTaxable,
      supplementalTaxable,
      federalRegular,
      federalSupplemental,
      stateRegular,
      stateSupplemental,
      isAdjusted: override !== undefined,
      isOffCycle: Boolean(period.isOffCycle),
      isAdjustedDate: Boolean(period.isAdjustedDate),
      isMatchAdjusted: override?.employerMatch !== undefined,
      payrollTaxes,
      payrollTotal,
      taxTotal,
      postTax,
      net,
      employerMatch401k,
      deferralPercent,
      matchedDeferralPercent: employer.matchTiers?.length
        ? matchedDeferralPercent(deferralPercent, employer.matchTiers)
        : Math.min(deferralPercent, employer.match401kLimitPercent),
      events,
      notes,
    });

    ytdFicaWages += ficaWages;
    ytdElective401k += pretax401k + roth401k;
    ytdHsa += hsa;
    ytdFsa += fsa;
    ytdSupplementalTaxable += supplementalTaxable;
    ytdEmployerMatch += employerMatch401k;
  }

  return { rows, totals: totalsOf(rows), elective401kLimit, hsaLimit };
};

const emptyTotals = (): LedgerTotals => ({
  gross: 0,
  taxableAllowance: 0,
  taxFreeAllowance: 0,
  section125: 0,
  hsa: 0,
  pretax401k: 0,
  pretaxIncomeOnly: 0,
  roth401k: 0,
  regularTaxable: 0,
  supplementalTaxable: 0,
  federalWithheld: 0,
  stateWithheld: 0,
  payrollWithheld: 0,
  taxTotal: 0,
  postTax: 0,
  net: 0,
  employerMatch401k: 0,
});

export const totalsOf = (rows: PeriodRow[]): LedgerTotals => ({
  gross: sumBy(rows, (row) => row.gross),
  taxableAllowance: sumBy(rows, (row) => row.taxableAllowance),
  taxFreeAllowance: sumBy(rows, (row) => row.taxFreeAllowance),
  section125: sumBy(rows, (row) => row.section125),
  hsa: sumBy(rows, (row) => row.hsa),
  pretax401k: sumBy(rows, (row) => row.pretax401k),
  pretaxIncomeOnly: sumBy(rows, (row) => row.pretaxIncomeOnly),
  roth401k: sumBy(rows, (row) => row.roth401k),
  regularTaxable: sumBy(rows, (row) => row.regularTaxable),
  supplementalTaxable: sumBy(rows, (row) => row.supplementalTaxable),
  federalWithheld: sumBy(rows, (row) => row.federalRegular + row.federalSupplemental),
  stateWithheld: sumBy(rows, (row) => row.stateRegular + row.stateSupplemental),
  payrollWithheld: sumBy(rows, (row) => row.payrollTotal),
  taxTotal: sumBy(rows, (row) => row.taxTotal),
  postTax: sumBy(rows, (row) => row.postTax),
  net: sumBy(rows, (row) => row.net),
  employerMatch401k: sumBy(rows, (row) => row.employerMatch401k),
});
