import type { BenefitItem } from '../calculations';
import MedicalInsuranceGroup from './MedicalInsuranceGroup';
import CustomBenefitsGroup from './CustomBenefitsGroup';
import FreeFoodGroup from './FreeFoodGroup';
import { computeTaxableBenefitsTotal, computeNonTaxableBenefitsTotal } from '../calculations';
import UnitNumberInput from '../../../components/UnitNumberInput';
import CollapsibleGroup from './CollapsibleGroup';
import { freeFoodBreakdown, normalizeMealEntries, type MealEntry } from '../freeFood';
import { CONTROL_CLASS } from '../../../components/formControls';

export type BenefitsSectionProps = {
  benefitItems: BenefitItem[];
  onAddBenefitItem: () => void;
  onUpdateBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  onRemoveBenefitItem: (id: string) => void;
  computeBenefitsTotal: (items: BenefitItem[]) => number;
  benefitsValue: number;
  paychecksPerYear?: number;
  onPaychecksPerYearChange?: (value: number) => void;
  healthPremiumPaycheck?: number | string;
  onHealthPremiumPaycheckChange?: (value: number | string) => void;
  healthPremiumMonthly?: number | string;
  onHealthPremiumMonthlyChange?: (value: number | string) => void;
  hsaEmployerContribution?: number | string;
  onHsaEmployerContributionChange?: (value: number | string) => void;
  healthPlanType?: string;
  onHealthPlanTypeChange?: (value: string) => void;
  healthOopMax?: number | string;
  onHealthOopMaxChange?: (value: number | string) => void;
  healthDeductible?: number | string;
  onHealthDeductibleChange?: (value: number | string) => void;
  healthFamilyOopMax?: number | string;
  onHealthFamilyOopMaxChange?: (value: number | string) => void;
  healthPcpCopay?: number | string;
  onHealthPcpCopayChange?: (value: number | string) => void;
  healthSpecialistCopay?: number | string;
  onHealthSpecialistCopayChange?: (value: number | string) => void;
  // Valued per meal over the office days the RTO policy implies.
  freeFoodMeals?: unknown;
  onFreeFoodMealsChange?: (meals: MealEntry[]) => void;
  // Legacy shared per-meal value: read to migrate old rows, never written.
  freeFoodValuePerMeal?: number | string;
  officeDays?: number;
  legacyFreeFoodAnnual?: number;
  dentalPlanName?: string;
  onDentalPlanNameChange?: (value: string) => void;
  dentalPremiumPaycheck?: number | string;
  onDentalPremiumPaycheckChange?: (value: number | string) => void;
  dentalMonthlyPremium?: number | string;
  onDentalMonthlyPremiumChange?: (value: number | string) => void;
  dentalAnnualMax?: number | string;
  onDentalAnnualMaxChange?: (value: number | string) => void;
  dentalDeductible?: number | string;
  onDentalDeductibleChange?: (value: number | string) => void;
  visionPlanName?: string;
  onVisionPlanNameChange?: (value: string) => void;
  visionPremiumPaycheck?: number | string;
  onVisionPremiumPaycheckChange?: (value: number | string) => void;
  visionMonthlyPremium?: number | string;
  onVisionMonthlyPremiumChange?: (value: number | string) => void;
  visionFramesAllowance?: number | string;
  onVisionFramesAllowanceChange?: (value: number | string) => void;
  visionContactsAllowance?: number | string;
  onVisionContactsAllowanceChange?: (value: number | string) => void;
  hasDependents?: boolean;
  onHasDependentsChange?: (value: boolean) => void;
  dependentCoverageTier?: string;
  onDependentCoverageTierChange?: (value: string) => void;
  healthFamilyDeductible?: number | string;
  onHealthFamilyDeductibleChange?: (value: number | string) => void;
  dependentHealthPremiumPaycheck?: number | string;
  onDependentHealthPremiumPaycheckChange?: (value: number | string) => void;
  dependentDentalPremiumPaycheck?: number | string;
  onDependentDentalPremiumPaycheckChange?: (value: number | string) => void;
  dependentVisionPremiumPaycheck?: number | string;
  onDependentVisionPremiumPaycheckChange?: (value: number | string) => void;
  fortyOneKMatchPercent?: number | string;
  onFortyOneKMatchPercentChange?: (value: number | string) => void;
  fortyOneKMaxMatch?: number | string;
  onFortyOneKMaxMatchChange?: (value: number | string) => void;
  taxRate?: number;
};

const toNum = (value: number | string | null | undefined) =>
  value === '' || value == null ? null : Number(value);

const BenefitsSection = (props: BenefitsSectionProps) => {
  const {
    freeFoodMeals,
    onFreeFoodMealsChange,
    freeFoodValuePerMeal,
    officeDays,
    benefitItems,
    benefitsValue: _benefitsValue,
    paychecksPerYear = 26,
    healthPremiumPaycheck,
    healthPremiumMonthly,
    hsaEmployerContribution,
    healthOopMax,
    healthDeductible,
    healthFamilyOopMax,
    healthPcpCopay,
    healthSpecialistCopay,
    dentalPlanName,
    onDentalPlanNameChange,
    dentalPremiumPaycheck,
    onDentalPremiumPaycheckChange,
    dentalMonthlyPremium,
    onDentalMonthlyPremiumChange,
    dentalAnnualMax,
    onDentalAnnualMaxChange,
    dentalDeductible,
    onDentalDeductibleChange,
    visionPlanName,
    onVisionPlanNameChange,
    visionPremiumPaycheck,
    onVisionPremiumPaycheckChange,
    visionMonthlyPremium,
    onVisionMonthlyPremiumChange,
    visionFramesAllowance,
    onVisionFramesAllowanceChange,
    visionContactsAllowance,
    onVisionContactsAllowanceChange,
    hasDependents = false,
    dependentHealthPremiumPaycheck,
    dependentDentalPremiumPaycheck,
    onDependentDentalPremiumPaycheckChange,
    dependentVisionPremiumPaycheck,
    onDependentVisionPremiumPaycheckChange,
    fortyOneKMatchPercent,
    onFortyOneKMatchPercentChange,
    fortyOneKMaxMatch,
    onFortyOneKMaxMatchChange,
    taxRate = 0,
  } = props;
  const taxableSum = computeTaxableBenefitsTotal(benefitItems);
  const nonTaxableSum = computeNonTaxableBenefitsTotal(benefitItems);
  const taxableSumAfterTax = taxRate > 0 ? taxableSum * (1 - taxRate / 100) : null;
  const numPaychecks = Number(paychecksPerYear) || 26;

  const rawMedicalPaycheck = Number(healthPremiumPaycheck) || 0;
  const healthMonthlyPremNum = Number(healthPremiumMonthly) || 0;
  const medicalPaycheckVal =
    rawMedicalPaycheck > 0
      ? rawMedicalPaycheck
      : healthMonthlyPremNum
        ? Math.round(((healthMonthlyPremNum * 12) / numPaychecks) * 100) / 100
        : 0;

  const rawDentalPaycheck = Number(dentalPremiumPaycheck) || 0;
  const dentalMonthlyPremNum = Number(dentalMonthlyPremium) || 0;
  const dentalPaycheckVal =
    rawDentalPaycheck > 0
      ? rawDentalPaycheck
      : dentalMonthlyPremNum
        ? Math.round(((dentalMonthlyPremNum * 12) / numPaychecks) * 100) / 100
        : 0;

  const rawVisionPaycheck = Number(visionPremiumPaycheck) || 0;
  const visionMonthlyPremNum = Number(visionMonthlyPremium) || 0;
  const visionPaycheckVal =
    rawVisionPaycheck > 0
      ? rawVisionPaycheck
      : visionMonthlyPremNum
        ? Math.round(((visionMonthlyPremNum * 12) / numPaychecks) * 100) / 100
        : 0;

  const depMedicalPaycheckVal = hasDependents ? Number(dependentHealthPremiumPaycheck) || 0 : 0;
  const depDentalPaycheckVal = hasDependents ? Number(dependentDentalPremiumPaycheck) || 0 : 0;
  const depVisionPaycheckVal = hasDependents ? Number(dependentVisionPremiumPaycheck) || 0 : 0;

  const totalMedicalPaycheck = medicalPaycheckVal + depMedicalPaycheckVal;
  const totalDentalPaycheck = dentalPaycheckVal + depDentalPaycheckVal;
  const totalVisionPaycheck = visionPaycheckVal + depVisionPaycheckVal;

  const annualHealthPremium = totalMedicalPaycheck * numPaychecks;
  const annualDentalPremium = totalDentalPaycheck * numPaychecks;
  const annualVisionPremium = totalVisionPaycheck * numPaychecks;
  const monthlyHealthEquiv = annualHealthPremium / 12;

  const totalAnnualPremiums = annualHealthPremium + annualDentalPremium + annualVisionPremium;
  const effectiveOopMax = hasDependents
    ? Number(healthFamilyOopMax) || Number(healthOopMax) || 0
    : Number(healthOopMax) || 0;
  const hsaContribution = Number(hsaEmployerContribution) || 0;
  const worstCaseAnnualRisk = Math.max(0, totalAnnualPremiums + effectiveOopMax - hsaContribution);

  const filled = (...values: Array<number | string | undefined | null>) =>
    values.some(
      (value) => value !== undefined && value !== null && value !== '' && Number(value) !== 0
    );
  const medicalHasValue = filled(
    healthPremiumPaycheck,
    healthDeductible,
    healthOopMax,
    healthPcpCopay,
    healthSpecialistCopay,
    hsaEmployerContribution
  );
  const dentalHasValue = filled(
    dentalPlanName,
    dentalPremiumPaycheck,
    dentalMonthlyPremium,
    dentalAnnualMax,
    dentalDeductible
  );
  const visionHasValue = filled(
    visionPlanName,
    visionPremiumPaycheck,
    visionMonthlyPremium,
    visionFramesAllowance,
    visionContactsAllowance
  );
  const retirementHasValue = filled(fortyOneKMatchPercent, fortyOneKMaxMatch);
  const mealEntries = normalizeMealEntries(freeFoodMeals, Number(freeFoodValuePerMeal) || 0);
  const setMealEntries = (next: MealEntry[]) => onFreeFoodMealsChange?.(normalizeMealEntries(next));
  const food = freeFoodBreakdown({ meals: mealEntries, officeDays: officeDays ?? 0 });

  return (
    <div className="space-y-3">
      {/* 1. Medical Insurance & Risk Analysis */}
      <MedicalInsuranceGroup
        {...props}
        medicalPaycheckVal={medicalPaycheckVal}
        toNum={toNum}
        annualHealthPremium={annualHealthPremium}
        effectiveOopMax={effectiveOopMax}
        hsaContribution={hsaContribution}
        medicalHasValue={medicalHasValue}
        monthlyHealthEquiv={monthlyHealthEquiv}
        numPaychecks={numPaychecks}
        totalAnnualPremiums={totalAnnualPremiums}
        worstCaseAnnualRisk={worstCaseAnnualRisk}
      />

      {/* 2. Dental Insurance */}
      <CollapsibleGroup title="2. Dental Insurance" hasValue={dentalHasValue}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Dental Plan Name
              </label>
              <input
                type="text"
                value={dentalPlanName || ''}
                onChange={(e) => onDentalPlanNameChange?.(e.target.value)}
                placeholder="e.g. Delta Dental Plus"
                className={CONTROL_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Dental Premium per Paycheck
              </label>
              <UnitNumberInput
                unit="$"
                min={0}
                value={toNum(dentalPaycheckVal)}
                onChange={(value) => {
                  onDentalPremiumPaycheckChange?.(value ?? '');
                  onDentalMonthlyPremiumChange?.(((value ?? 0) * numPaychecks) / 12);
                }}
                placeholder="e.g. 10"
              />
              <p className="text-[11px] text-gray-400 dark:text-ink-500 mt-1">
                = ${Math.round(annualDentalPremium).toLocaleString()}/yr
              </p>
            </div>
            {hasDependents && (
              <div>
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide mb-1">
                  Dependent Dental Add-on per Paycheck
                </label>
                <UnitNumberInput
                  unit="$"
                  min={0}
                  value={toNum(dependentDentalPremiumPaycheck)}
                  onChange={(value) => onDependentDentalPremiumPaycheckChange?.(value ?? '')}
                  placeholder="e.g. 15"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Annual Max Benefit
              </label>
              <UnitNumberInput
                unit="$"
                min={0}
                value={toNum(dentalAnnualMax)}
                onChange={(value) => onDentalAnnualMaxChange?.(value ?? '')}
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Deductible
              </label>
              <UnitNumberInput
                unit="$"
                min={0}
                value={toNum(dentalDeductible)}
                onChange={(value) => onDentalDeductibleChange?.(value ?? '')}
                placeholder="e.g. 50"
              />
            </div>
          </div>
        </div>
      </CollapsibleGroup>

      {/* 3. Vision Insurance */}
      <CollapsibleGroup title="3. Vision Insurance" hasValue={visionHasValue}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Vision Plan Name
              </label>
              <input
                type="text"
                value={visionPlanName || ''}
                onChange={(e) => onVisionPlanNameChange?.(e.target.value)}
                placeholder="e.g. VSP Vision Plus"
                className={CONTROL_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Vision Premium per Paycheck
              </label>
              <UnitNumberInput
                unit="$"
                min={0}
                value={toNum(visionPaycheckVal)}
                onChange={(value) => {
                  onVisionPremiumPaycheckChange?.(value ?? '');
                  onVisionMonthlyPremiumChange?.(((value ?? 0) * numPaychecks) / 12);
                }}
                placeholder="e.g. 4"
              />
              <p className="text-[11px] text-gray-400 dark:text-ink-500 mt-1">
                = ${Math.round(annualVisionPremium).toLocaleString()}/yr
              </p>
            </div>
            {hasDependents && (
              <div>
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide mb-1">
                  Dependent Vision Add-on per Paycheck
                </label>
                <UnitNumberInput
                  unit="$"
                  min={0}
                  value={toNum(dependentVisionPremiumPaycheck)}
                  onChange={(value) => onDependentVisionPremiumPaycheckChange?.(value ?? '')}
                  placeholder="e.g. 5"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Frames Allowance
              </label>
              <UnitNumberInput
                unit="$"
                min={0}
                value={toNum(visionFramesAllowance)}
                onChange={(value) => onVisionFramesAllowanceChange?.(value ?? '')}
                placeholder="e.g. 250"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Contacts Allowance
              </label>
              <UnitNumberInput
                unit="$"
                min={0}
                value={toNum(visionContactsAllowance)}
                onChange={(value) => onVisionContactsAllowanceChange?.(value ?? '')}
                placeholder="e.g. 250"
              />
            </div>
          </div>
        </div>
      </CollapsibleGroup>

      {/* 4. 401(k) Retirement Matching */}
      <CollapsibleGroup title="4. 401(k) Retirement Matching" hasValue={retirementHasValue}>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Employer Match
              </label>
              <UnitNumberInput
                unit="%"
                min={0}
                max={100}
                value={toNum(fortyOneKMatchPercent)}
                onChange={(value) => onFortyOneKMatchPercentChange?.(value ?? '')}
                placeholder="e.g. 50% or 100%"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-ink-400 uppercase tracking-wide mb-1">
                Max Employee Contribution Matched
              </label>
              <UnitNumberInput
                unit="%"
                min={0}
                max={100}
                value={toNum(fortyOneKMaxMatch)}
                onChange={(value) => onFortyOneKMaxMatchChange?.(value ?? '')}
                placeholder="e.g. 6% of salary"
              />
            </div>
          </div>
        </div>
      </CollapsibleGroup>

      {/* Custom Benefits Table */}
      <CustomBenefitsGroup
        {...props}
        nonTaxableSum={nonTaxableSum}
        taxableSum={taxableSum}
        taxableSumAfterTax={taxableSumAfterTax}
      />

      {/* Each meal carries its own amount, so a $6 breakfast and a $20 dinner do not average. */}
      <FreeFoodGroup
        {...props}
        food={food}
        mealEntries={mealEntries}
        setMealEntries={setMealEntries}
      />
    </div>
  );
};

export default BenefitsSection;
