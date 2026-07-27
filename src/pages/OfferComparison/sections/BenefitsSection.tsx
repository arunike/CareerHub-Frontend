import type { BenefitItem } from '../calculations';
import { computeTaxableBenefitsTotal, computeNonTaxableBenefitsTotal } from '../calculations';

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
                Medical Premium per Paycheck ($)
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={
                  medicalPaycheckVal === undefined || medicalPaycheckVal === null
                    ? ''
                    : medicalPaycheckVal
                }
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  onHealthPremiumPaycheckChange?.(val);
                  const numVal = val === '' ? 0 : Number(val);
                  onHealthPremiumMonthlyChange?.(
                    Math.round(((numVal * numPaychecks) / 12) * 100) / 100
                  );
                }}
                placeholder="e.g. 54"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
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
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
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
                  className="w-full rounded-md border border-indigo-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="EMPLOYEE_SPOUSE">Employee + Spouse</option>
                  <option value="EMPLOYEE_CHILDREN">Employee + Child(ren)</option>
                  <option value="FAMILY">Family (Employee + Spouse + Children)</option>
                </select>
              </div>

              <div className="md:col-span-1 flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Dependent Medical Premium Add-on per Paycheck ($)
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={
                      dependentHealthPremiumPaycheck === undefined ||
                      dependentHealthPremiumPaycheck === null
                        ? ''
                        : dependentHealthPremiumPaycheck
                    }
                    onChange={(e) =>
                      onDependentHealthPremiumPaycheckChange?.(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 140"
                    className="w-full rounded-md border border-indigo-300 bg-indigo-50/30 px-2 py-1.5 pl-5 text-sm focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Individual / Base Deductible ($)
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={
                  healthDeductible === undefined || healthDeductible === null
                    ? ''
                    : healthDeductible
                }
                onChange={(e) =>
                  onHealthDeductibleChange?.(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 1500"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Individual Out-of-Pocket Max ($)
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={healthOopMax === undefined || healthOopMax === null ? '' : healthOopMax}
                onChange={(e) =>
                  onHealthOopMaxChange?.(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 3300"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>

          {/* Conditional Family Deductible & Family OOP Max */}
          {hasDependents && (
            <>
              <div className="flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Family Deductible ($)
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={
                      healthFamilyDeductible === undefined || healthFamilyDeductible === null
                        ? ''
                        : healthFamilyDeductible
                    }
                    onChange={(e) =>
                      onHealthFamilyDeductibleChange?.(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 3000"
                    className="w-full rounded-md border border-indigo-200 bg-indigo-50/30 px-2 py-1.5 pl-5 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="h-8 flex items-end mb-1">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                    Family Out-of-Pocket Max ($)
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={
                      healthFamilyOopMax === undefined || healthFamilyOopMax === null
                        ? ''
                        : healthFamilyOopMax
                    }
                    onChange={(e) =>
                      onHealthFamilyOopMaxChange?.(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 6600"
                    className="w-full rounded-md border border-indigo-200 bg-indigo-50/30 px-2 py-1.5 pl-5 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                HSA Employer Contribution ($/yr)
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={
                  hsaEmployerContribution === undefined || hsaEmployerContribution === null
                    ? ''
                    : hsaEmployerContribution
                }
                onChange={(e) =>
                  onHsaEmployerContributionChange?.(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                placeholder="e.g. 1000"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Primary Care Copay ($)
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={
                  healthPcpCopay === undefined || healthPcpCopay === null ? '' : healthPcpCopay
                }
                onChange={(e) =>
                  onHealthPcpCopayChange?.(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 20"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="h-8 flex items-end mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Specialist Copay ($)
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={
                  healthSpecialistCopay === undefined || healthSpecialistCopay === null
                    ? ''
                    : healthSpecialistCopay
                }
                onChange={(e) =>
                  onHealthSpecialistCopayChange?.(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                placeholder="e.g. 45"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
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
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Dental Premium per Paycheck ($)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={
                  dentalPaycheckVal === undefined || dentalPaycheckVal === null
                    ? ''
                    : dentalPaycheckVal
                }
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  onDentalPremiumPaycheckChange?.(val);
                  const numVal = val === '' ? 0 : Number(val);
                  onDentalMonthlyPremiumChange?.((numVal * numPaychecks) / 12);
                }}
                placeholder="e.g. 10"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              = ${Math.round(annualDentalPremium).toLocaleString()}/yr
            </p>
          </div>
          {hasDependents && (
            <div>
              <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide mb-1">
                Dependent Dental Add-on per Paycheck ($)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={
                    dependentDentalPremiumPaycheck === undefined ||
                    dependentDentalPremiumPaycheck === null
                      ? ''
                      : dependentDentalPremiumPaycheck
                  }
                  onChange={(e) =>
                    onDependentDentalPremiumPaycheckChange?.(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  placeholder="e.g. 15"
                  className="w-full rounded-md border border-indigo-200 bg-indigo-50/40 px-2 py-1.5 pl-5 text-sm"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Annual Max Benefit ($)
            </label>
            <input
              type="number"
              min={0}
              value={
                dentalAnnualMax === undefined || dentalAnnualMax === null ? '' : dentalAnnualMax
              }
              onChange={(e) =>
                onDentalAnnualMaxChange?.(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="e.g. 2500"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Deductible ($)
            </label>
            <input
              type="number"
              min={0}
              value={
                dentalDeductible === undefined || dentalDeductible === null ? '' : dentalDeductible
              }
              onChange={(e) =>
                onDentalDeductibleChange?.(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="e.g. 50"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Vision Premium per Paycheck ($)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={
                  visionPaycheckVal === undefined || visionPaycheckVal === null
                    ? ''
                    : visionPaycheckVal
                }
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  onVisionPremiumPaycheckChange?.(val);
                  const numVal = val === '' ? 0 : Number(val);
                  onVisionMonthlyPremiumChange?.((numVal * numPaychecks) / 12);
                }}
                placeholder="e.g. 4"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              = ${Math.round(annualVisionPremium).toLocaleString()}/yr
            </p>
          </div>
          {hasDependents && (
            <div>
              <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wide mb-1">
                Dependent Vision Add-on per Paycheck ($)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={
                    dependentVisionPremiumPaycheck === undefined ||
                    dependentVisionPremiumPaycheck === null
                      ? ''
                      : dependentVisionPremiumPaycheck
                  }
                  onChange={(e) =>
                    onDependentVisionPremiumPaycheckChange?.(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  placeholder="e.g. 5"
                  className="w-full rounded-md border border-indigo-200 bg-indigo-50/40 px-2 py-1.5 pl-5 text-sm"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Frames Allowance ($)
            </label>
            <input
              type="number"
              min={0}
              value={
                visionFramesAllowance === undefined || visionFramesAllowance === null
                  ? ''
                  : visionFramesAllowance
              }
              onChange={(e) =>
                onVisionFramesAllowanceChange?.(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="e.g. 250"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Contacts Allowance ($)
            </label>
            <input
              type="number"
              min={0}
              value={
                visionContactsAllowance === undefined || visionContactsAllowance === null
                  ? ''
                  : visionContactsAllowance
              }
              onChange={(e) =>
                onVisionContactsAllowanceChange?.(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              placeholder="e.g. 250"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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
                Employer Match %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={
                    fortyOneKMatchPercent === undefined || fortyOneKMatchPercent === null
                      ? ''
                      : fortyOneKMatchPercent
                  }
                  onChange={(e) =>
                    onFortyOneKMatchPercentChange?.(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  placeholder="e.g. 50% or 100%"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 pr-6 text-sm"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Max Employee Contribution Matched
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={
                    fortyOneKMaxMatch === undefined || fortyOneKMaxMatch === null
                      ? ''
                      : fortyOneKMaxMatch
                  }
                  onChange={(e) =>
                    onFortyOneKMaxMatchChange?.(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="e.g. 6% of salary"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 pr-6 text-sm"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  %
                </span>
              </div>
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
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => onUpdateBenefitItem(item.id, { label: e.target.value })}
                  placeholder="e.g. Gym reimbursement"
                  className="col-span-12 sm:col-span-4 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={item.amount === 0 ? '' : item.amount}
                  placeholder="0"
                  onChange={(e) =>
                    onUpdateBenefitItem(item.id, {
                      amount: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  className="col-span-5 sm:col-span-3 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <select
                  value={item.frequency}
                  onChange={(e) =>
                    onUpdateBenefitItem(item.id, {
                      frequency: e.target.value as BenefitItem['frequency'],
                    })
                  }
                  className="col-span-3 sm:col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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
                  className={`col-span-3 sm:col-span-2 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    item.is_taxable
                      ? 'bg-amber-400/20 text-amber-800 ring-1 ring-amber-300 hover:bg-amber-400/30'
                      : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 hover:bg-slate-200 hover:text-slate-600'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      item.is_taxable ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  />
                  {item.is_taxable ? 'Taxable' : 'Tax-free'}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveBenefitItem(item.id)}
                  className="col-span-1 text-red-500 text-sm font-bold flex items-center justify-center hover:bg-red-50 rounded-md py-1.5"
                  aria-label="Remove benefit item"
                >
                  ×
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
