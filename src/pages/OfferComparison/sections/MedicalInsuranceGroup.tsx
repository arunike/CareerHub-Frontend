import type { BenefitsSectionProps } from './BenefitsSection';
import UnitNumberInput from '../../../components/UnitNumberInput';
import CollapsibleGroup from './CollapsibleGroup';
import { CONTROL_CLASS } from '../../../components/formControls';

type Props = BenefitsSectionProps & {
  annualHealthPremium: number;
  effectiveOopMax: number;
  hsaContribution: number;
  medicalHasValue: boolean;
  monthlyHealthEquiv: number;
  numPaychecks: number;
  totalAnnualPremiums: number;
  worstCaseAnnualRisk: number;
  medicalPaycheckVal: number;
  toNum: (value: number | string | null | undefined) => number | null;
};

const MedicalInsuranceGroup = ({
  annualHealthPremium,
  effectiveOopMax,
  hsaContribution,
  medicalHasValue,
  monthlyHealthEquiv,
  numPaychecks,
  totalAnnualPremiums,
  worstCaseAnnualRisk,
  medicalPaycheckVal,
  toNum,
  dependentCoverageTier,
  dependentHealthPremiumPaycheck,
  hasDependents,
  healthDeductible,
  healthFamilyDeductible,
  healthFamilyOopMax,
  healthOopMax,
  healthPcpCopay,
  healthPlanType,
  healthSpecialistCopay,
  hsaEmployerContribution,
  onDependentCoverageTierChange,
  onDependentHealthPremiumPaycheckChange,
  onHasDependentsChange,
  onHealthDeductibleChange,
  onHealthFamilyDeductibleChange,
  onHealthFamilyOopMaxChange,
  onHealthOopMaxChange,
  onHealthPcpCopayChange,
  onHealthPlanTypeChange,
  onHealthPremiumMonthlyChange,
  onHealthPremiumPaycheckChange,
  onHealthSpecialistCopayChange,
  onHsaEmployerContributionChange,
  onPaychecksPerYearChange,
}: Props) => (
  <CollapsibleGroup
    title="1. Medical Insurance & Healthcare Risk"
    hasValue={medicalHasValue}
    summary={
      worstCaseAnnualRisk > 0
        ? `$${Math.round(worstCaseAnnualRisk).toLocaleString()} worst case`
        : undefined
    }
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/[0.08] pb-2">
        <label className="sr-only">1. Medical Insurance & Healthcare Risk</label>
        {worstCaseAnnualRisk > 0 && (
          <span className="rounded-full bg-blue-100 dark:bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-200">
            Worst-case risk: ${Math.round(worstCaseAnnualRisk).toLocaleString()}/yr
          </span>
        )}
      </div>

      {/* Paycheck Frequency Selector Bar */}
      <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700 dark:text-ink-100">
          Paycheck Schedule & Frequency:
        </span>
        <select
          value={numPaychecks}
          onChange={(e) => onPaychecksPerYearChange?.(Number(e.target.value))}
          className="rounded border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-ink-900 px-2 py-1 text-xs text-slate-800 dark:text-ink-50 font-medium focus:ring-1 focus:ring-blue-500"
        >
          <option value={26}>26 paychecks/yr (Bi-weekly standard)</option>
          <option value={27}>27 paychecks/yr (Bi-weekly year with an extra payday)</option>
          <option value={24}>24 paychecks/yr (Semi-monthly: 1st & 15th)</option>
          <option value={12}>12 paychecks/yr (Monthly)</option>
          <option value={52}>52 paychecks/yr (Weekly)</option>
        </select>
      </div>

      {/* Financial Risk Banner */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/25 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-3.5 space-y-1.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
            Worst-Case Annual Financial Exposure
          </span>
          <span className="text-base font-extrabold text-blue-700 dark:text-blue-300">
            ${Math.round(worstCaseAnnualRisk).toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-blue-900 dark:text-blue-200 border-t border-blue-200/60 dark:border-blue-500/25 pt-2 mt-1">
          <div>
            <span className="text-blue-600 dark:text-blue-300 block">
              Total Insurance Premiums:
            </span>
            <span className="font-semibold">
              ${Math.round(totalAnnualPremiums).toLocaleString()}/yr
            </span>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-300 block">Max Out-of-Pocket Risk:</span>
            <span className="font-semibold">${effectiveOopMax.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-300 block">Employer HSA Credit:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              -${hsaContribution.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Dependent Coverage Toggle Bar */}
      <div className="flex items-center justify-between rounded-lg border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/10 px-3 py-2">
        <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-xs text-indigo-950">
          <input
            type="checkbox"
            checked={hasDependents}
            onChange={(e) => onHasDependentsChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-indigo-300 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 focus:ring-indigo-500"
          />
          Include Dependent / Family Coverage (Spouse, Children)
        </label>
        {hasDependents && (
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            Dependent options active
          </span>
        )}
      </div>

      {/* Medical Insurance Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        <div className="flex flex-col">
          <div className="h-8 flex items-end mb-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
          <p className="text-[11px] text-gray-400 dark:text-ink-500 mt-1">
            = ${Math.round(annualHealthPremium).toLocaleString()}/yr ($
            {Math.round(monthlyHealthEquiv).toLocaleString()}/mo equiv)
          </p>
        </div>

        <div className="flex flex-col">
          <div className="h-8 flex items-end mb-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
                  Coverage Tier
                </label>
              </div>
              <select
                value={dependentCoverageTier || 'EMPLOYEE_SPOUSE'}
                onChange={(e) => onDependentCoverageTierChange?.(e.target.value)}
                className={`${CONTROL_CLASS} border-indigo-200 dark:border-indigo-500/25 bg-indigo-50/30 dark:bg-indigo-500/10`}
              >
                <option value="EMPLOYEE_SPOUSE">Employee + Spouse</option>
                <option value="EMPLOYEE_CHILDREN">Employee + Child(ren)</option>
                <option value="FAMILY">Family (Employee + Spouse + Children)</option>
              </select>
            </div>

            <div className="md:col-span-1 flex flex-col">
              <div className="h-8 flex items-end mb-1">
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
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
                <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-ink-100 uppercase tracking-wide">
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
  </CollapsibleGroup>
);

export default MedicalInsuranceGroup;
