import type { FilingStatus } from '../../types/tax';
import { NO_ELECTIONS, type Elections, type IncomeEvent } from './tax/ledger';
import { EMPTY_W4, type W4Inputs } from './tax/withholding';
import type { BonusExtra, BonusPayout } from './bonusSchedule';
import type { CustomDeduction } from './deductions';
import type { Allowance } from './allowances';
import type { MatchTier } from './matchTiers';
import type { PeriodDeductionOverride } from './periodDeductions';
import type { PeriodActual } from './effectiveRows';

export interface IncomeSettings {
  filingStatus: FilingStatus;
  stateOverride: string;
  firstPayDate: string | null;
  salaryOverride: number | null;
  paychecksPerYearOverride: number | null;
  elections: Elections;
  w4: W4Inputs;
  includeBonus: boolean;
  bonusOverride: number | null;
  bonusPayouts: BonusPayout[];
  bonusMultiplierPercent: number;
  bonusExtras: BonusExtra[];
  bonusProrated: boolean;
  bonusPerformanceYear: number | null;
  includeVestEvents: boolean;
  totalGrantOverride: number | null;
  vestsPerYearOverride: number | null;
  cliffMonthsOverride: number | null;
  vestingYearsOverride: number | null;
  firstVestDate: string | null;
  medicalOverride: number | null;
  dentalOverride: number | null;
  visionOverride: number | null;
  dependentOverride: number | null;
  customDeductions: CustomDeduction[];
  allowances: Allowance[];
  matchTiers: MatchTier[] | null;
  matchNonElectivePercent: number;
  matchAnnualCap: number;
  periodDeductions: PeriodDeductionOverride[];
  retirementStartingBalance: number | null;
  retirementCurrentValue: number | null;
  extraEvents: IncomeEvent[];
  actuals: PeriodActual[];
}

export const DEFAULT_SETTINGS: IncomeSettings = {
  filingStatus: 'SINGLE',
  stateOverride: '',
  firstPayDate: null,
  salaryOverride: null,
  paychecksPerYearOverride: null,
  elections: NO_ELECTIONS,
  w4: EMPTY_W4,
  includeBonus: false,
  bonusOverride: null,
  bonusPayouts: [],
  bonusMultiplierPercent: 100,
  bonusExtras: [],
  bonusProrated: true,
  bonusPerformanceYear: null,
  includeVestEvents: false,
  totalGrantOverride: null,
  vestsPerYearOverride: null,
  cliffMonthsOverride: null,
  vestingYearsOverride: null,
  firstVestDate: null,
  medicalOverride: null,
  dentalOverride: null,
  visionOverride: null,
  dependentOverride: null,
  customDeductions: [],
  allowances: [],
  matchTiers: null,
  matchNonElectivePercent: 0,
  matchAnnualCap: 0,
  periodDeductions: [],
  retirementStartingBalance: null,
  retirementCurrentValue: null,
  extraEvents: [],
  actuals: [],
};
