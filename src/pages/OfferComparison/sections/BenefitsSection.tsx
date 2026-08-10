import type { BenefitItem } from '../calculations';
import { computeTaxableBenefitsTotal, computeNonTaxableBenefitsTotal } from '../calculations';
import UnitNumberInput from '../../../components/UnitNumberInput';
import { CloseOutlined } from '@ant-design/icons';
import { CONTROL_CLASS } from '../../../components/formControls';

type BenefitsSectionProps = {
  benefitItems: BenefitItem[];
  onAddBenefitItem: () => void;
  onUpdateBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  onRemoveBenefitItem: (id: string) => void;
  computeBenefitsTotal: (items: BenefitItem[]) => number;
  benefitsValue: number;
  // Paycheck Schedule
  paychecksPerYear?: number;
  onPaychecksPerYearChange?: (value: number) => void;
  // Medical
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
  // Dental
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
  // Vision
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
  // Dependent Coverage
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
  // 401(k)
  fortyOneKMatchPercent?: number | string;
  onFortyOneKMatchPercentChange?: (value: number | string) => void;
  fortyOneKMaxMatch?: number | string;
  onFortyOneKMaxMatchChange?: (value: number | string) => void;
  // Tax rate for after-tax benefit calculation
  taxRate?: number;
};

const toNum = (value: number | string | null | undefined) =>
  value === '' || value == null ? null : Number(value);

const BenefitsSection = ({
  benefitItems,
  onAddBenefitItem,
  onUpdateBenefitItem,
  onRemoveBenefitItem,
  computeBenefitsTotal,
  benefitsValue: _benefitsValue,
  // Paycheck Schedule
  paychecksPerYear = 26,
  onPaychecksPerYearChange,
  // Medical
  healthPremiumPaycheck,
  onHealthPremiumPaycheckChange,
  healthPremiumMonthly,
  onHealthPremiumMonthlyChange,
  hsaEmployerContribution,
  onHsaEmployerContributionChange,
  healthPlanType,
  onHealthPlanTypeChange,
  healthOopMax,
  onHealthOopMaxChange,
  healthDeductible,
  onHealthDeductibleChange,
  healthFamilyOopMax,
  onHealthFamilyOopMaxChange,
  healthPcpCopay,
  onHealthPcpCopayChange,
  healthSpecialistCopay,
  onHealthSpecialistCopayChange,
  // Dental
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
  // Vision
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
  // Dependent Coverage
  hasDependents = false,
  onHasDependentsChange,
  dependentCoverageTier = 'EMPLOYEE_SPOUSE',
  onDependentCoverageTierChange,
  healthFamilyDeductible,
  onHealthFamilyDeductibleChange,
  dependentHealthPremiumPaycheck,
  onDependentHealthPremiumPaycheckChange,
  dependentDentalPremiumPaycheck,
  onDependentDentalPremiumPaycheckChange,
  dependentVisionPremiumPaycheck,
  onDependentVisionPremiumPaycheckChange,
  // 401(k)
  fortyOneKMatchPercent,
  onFortyOneKMatchPercentChange,
  fortyOneKMaxMatch,
  onFortyOneKMaxMatchChange,
  taxRate = 0,
}: BenefitsSectionProps) => {
  const taxableSum = computeTaxableBenefitsTotal(benefitItems);
  const nonTaxableSum = computeNonTaxableBenefitsTotal(benefitItems);
  const taxableSumAfterTax = taxRate > 0 ? taxableSum * (1 - taxRate / 100) : null;
  const numPaychecks = Number(paychecksPerYear) || 26;

  // Calculate base employee premiums cleanly without floating point precision issues
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

  // Dependent add-on premiums
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

  return (
    <div className="space-y-6">
      {/* 1. Medical Insurance & Risk Analysis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
            1. Medical Insurance & Healthcare Risk
          </label>
          {worstCaseAnnualRisk > 0 && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Worst-case risk: ${Math.round(worstCaseAnnualRisk).toLocaleString()}/yr
            </span>
          )}
        </div>

        {/* Paycheck Frequency Selector Bar */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700">Paycheck Schedule & Frequency:</span>
          <select
            value={numPaychecks}
            onChange={(e) => onPaychecksPerYearChange?.(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
          >
            <option value={26}>26 paychecks/yr (Bi-weekly standard)</option>
            <option value={27}>
              27 paychecks/yr (Bi-weekly 27-paycheck year, e.g. Adobe 2026)
            </option>
            <option value={24}>24 paychecks/yr (Semi-monthly: 1st & 15th)</option>
            <option value={12}>12 paychecks/yr (Monthly)</option>
            <option value={52}>52 paychecks/yr (Weekly)</option>
          </select>
        </div>

        {/* Financial Risk Banner */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-3.5 space-y-1.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Worst-Case Annual Financial Exposure
            </span>
            <span className="text-base font-extrabold text-blue-700">
              ${Math.round(worstCaseAnnualRisk).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-blue-900 border-t border-blue-200/60 pt-2 mt-1">
            <div>
              <span className="text-blue-600 block">Total Insurance Premiums:</span>
              <span className="font-semibold">
                ${Math.round(totalAnnualPremiums).toLocaleString()}/yr
              </span>
            </div>
            <div>
              <span className="text-blue-600 block">Max Out-of-Pocket Risk:</span>
              <span className="font-semibold">${effectiveOopMax.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-blue-600 block">Employer HSA Credit:</span>
              <span className="font-semibold text-emerald-700">
                -${hsaContribution.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Dependent Coverage Toggle Bar */}
        <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2">
          <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-xs text-indigo-950">
            <input
              type="checkbox"
              checked={hasDependents}
              onChange={(e) => onHasDependentsChange?.(e.target.checked)}
              className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
            />
            Include Dependent / Family Coverage (Spouse, Children)
          </label>
          {hasDependents && (
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
              Dependent options active
            </span>
          )}
        </div>

        {/* Medical Insurance Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Medical Premium per Paycheck
              </label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              step={0.01}
              value={toNum(medicalPaycheckVal)}
              onChange={(value) => {
                onHealthPremiumPaycheckChange?.(value ?? '');
                const numVal = value ?? 0;
                onHealthPremiumMonthlyChange?.(
                  Math.round(((numVal * numPaychecks) / 12) * 100) / 100
                );
              }}
              placeholder="e.g. 54"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              = ${Math.round(annualHealthPremium).toLocaleString()}/yr ($
              {Math.round(monthlyHealthEquiv).toLocaleString()}/mo equiv)
            </p>
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Plan Type / Name
              </label>
            </div>
            <input
              type="text"
              value={healthPlanType || ''}
              onChange={(e) => onHealthPlanTypeChange?.(e.target.value)}
              placeholder="e.g. HealthSelect EPO, Kaiser HMO, HDHP"
              className={CONTROL_CLASS}
            />
          </div>

          {/* Conditional Dependent Medical Fields */}
          {hasDependents && (
            <>
              <div className="md:col-span-1 flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Coverage Tier
                  </label>
                </div>
                <select
                  value={dependentCoverageTier || 'EMPLOYEE_SPOUSE'}
                  onChange={(e) => onDependentCoverageTierChange?.(e.target.value)}
                  className={`${CONTROL_CLASS} border-indigo-200 bg-indigo-50/30`}
                >
                  <option value="EMPLOYEE_SPOUSE">Employee + Spouse</option>
                  <option value="EMPLOYEE_CHILDREN">Employee + Child(ren)</option>
                  <option value="FAMILY">Family (Employee + Spouse + Children)</option>
                </select>
              </div>

              <div className="md:col-span-1 flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Dependent Medical Premium Add-on per Paycheck
                  </label>
                </div>
                <UnitNumberInput
                  unit="$"
                  min={0}
                  step={0.01}
                  value={toNum(dependentHealthPremiumPaycheck)}
                  onChange={(value) => onDependentHealthPremiumPaycheckChange?.(value ?? '')}
                  placeholder="e.g. 140"
                />
              </div>
            </>
          )}

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Individual / Base Deductible
              </label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              value={toNum(healthDeductible)}
              onChange={(value) => onHealthDeductibleChange?.(value ?? '')}
              placeholder="e.g. 1500"
            />
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Individual Out-of-Pocket Max
              </label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              value={toNum(healthOopMax)}
              onChange={(value) => onHealthOopMaxChange?.(value ?? '')}
              placeholder="e.g. 3300"
            />
          </div>

          {/* Conditional Family Deductible & Family OOP Max */}
          {hasDependents && (
            <>
              <div className="flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Family Deductible
                  </label>
                </div>
                <UnitNumberInput
                  unit="$"
                  min={0}
                  value={toNum(healthFamilyDeductible)}
                  onChange={(value) => onHealthFamilyDeductibleChange?.(value ?? '')}
                  placeholder="e.g. 3000"
                />
              </div>

              <div className="flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Family Out-of-Pocket Max
                  </label>
                </div>
                <UnitNumberInput
                  unit="$"
                  min={0}
                  value={toNum(healthFamilyOopMax)}
                  onChange={(value) => onHealthFamilyOopMaxChange?.(value ?? '')}
                  placeholder="e.g. 6600"
                />
              </div>
            </>
          )}

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                HSA Employer Contribution / yr
              </label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              value={toNum(hsaEmployerContribution)}
              onChange={(value) => onHsaEmployerContributionChange?.(value ?? '')}
              placeholder="e.g. 1000"
            />
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Primary Care Copay
              </label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              value={toNum(healthPcpCopay)}
              onChange={(value) => onHealthPcpCopayChange?.(value ?? '')}
              placeholder="e.g. 20"
            />
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Specialist Copay
              </label>
            </div>
            <UnitNumberInput
              unit="$"
              min={0}
              value={toNum(healthSpecialistCopay)}
              onChange={(value) => onHealthSpecialistCopayChange?.(value ?? '')}
              placeholder="e.g. 45"
            />
          </div>
        </div>
      </div>

      {/* 2. Dental Insurance */}
      <div className="space-y-3 pt-3 border-t border-gray-200">
        <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
          2. Dental Insurance
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
            <p className="text-[11px] text-gray-400 mt-1">
              = ${Math.round(annualDentalPremium).toLocaleString()}/yr
            </p>
          </div>
          {hasDependents && (
            <div>
              <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide mb-1">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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

      {/* 3. Vision Insurance */}
      <div className="space-y-3 pt-3 border-t border-gray-200">
        <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
          3. Vision Insurance
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
            <p className="text-[11px] text-gray-400 mt-1">
              = ${Math.round(annualVisionPremium).toLocaleString()}/yr
            </p>
          </div>
          {hasDependents && (
            <div>
              <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide mb-1">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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

      {/* 4. 401(k) Retirement & Custom Benefit Perks */}
      <div className="pt-3 border-t border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">
            4. 401(k) Retirement Matching
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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

        {/* Custom Benefits Table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
              5. Custom Benefits & Allowances
            </label>
            <button
              type="button"
              onClick={onAddBenefitItem}
              className="inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-9 sm:rounded-lg"
            >
              + Add Custom Item
            </button>
          </div>
          <div className="space-y-2">
            {benefitItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px_118px_120px_32px]"
              >
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => onUpdateBenefitItem(item.id, { label: e.target.value })}
                  placeholder="e.g. Gym reimbursement"
                  className={CONTROL_CLASS}
                />
                <UnitNumberInput
                  unit="$"
                  min={0}
                  value={item.amount || null}
                  placeholder="0"
                  onChange={(value) => onUpdateBenefitItem(item.id, { amount: value ?? 0 })}
                />
                <select
                  value={item.frequency}
                  onChange={(e) =>
                    onUpdateBenefitItem(item.id, {
                      frequency: e.target.value as BenefitItem['frequency'],
                    })
                  }
                  className={CONTROL_CLASS}
                >
                  <option value="MONTHLY">/month</option>
                  <option value="YEARLY">/year</option>
                </select>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.is_taxable || false}
                  title={
                    item.is_taxable
                      ? 'Taxable — click to mark as tax-free'
                      : 'Tax-free — click to mark as taxable'
                  }
                  onClick={() => onUpdateBenefitItem(item.id, { is_taxable: !item.is_taxable })}
                  className={`flex h-[38px] items-center justify-center gap-1.5 rounded-[9px] border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    item.is_taxable
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.is_taxable ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  />
                  {item.is_taxable ? 'Taxable' : 'Tax-free'}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveBenefitItem(item.id)}
                  className="flex h-[38px] items-center justify-center rounded-[9px] text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove benefit item"
                >
                  <CloseOutlined className="text-xs" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-gray-500">
            <p>
              Annualized total: ${Math.round(computeBenefitsTotal(benefitItems)).toLocaleString()}
            </p>
            {taxableSum > 0 && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  <span className="h-1 w-1 rounded-full bg-amber-400" />
                  Taxable: ${Math.round(taxableSum).toLocaleString()}
                  {taxableSumAfterTax !== null && (
                    <span className="text-amber-600 font-normal">
                      → ${Math.round(taxableSumAfterTax).toLocaleString()} after-tax
                    </span>
                  )}
                </span>
                {nonTaxableSum > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                    Tax-free: ${Math.round(nonTaxableSum).toLocaleString()}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsSection;
