import type { BenefitItem } from '../calculations';

type BenefitsSectionProps = {
  benefitItems: BenefitItem[];
  onAddBenefitItem: () => void;
  onUpdateBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  onRemoveBenefitItem: (id: string) => void;
  computeBenefitsTotal: (items: BenefitItem[]) => number;
  benefitsValue: number;
  healthPremiumMonthly?: number;
  onHealthPremiumMonthlyChange?: (value: number) => void;
  hsaEmployerContribution?: number;
  onHsaEmployerContributionChange?: (value: number) => void;
  healthPlanType?: string;
  onHealthPlanTypeChange?: (value: string) => void;
  healthOopMax?: number;
  onHealthOopMaxChange?: (value: number) => void;
  fortyOneKMatchPercent?: number;
  onFortyOneKMatchPercentChange?: (value: number) => void;
  fortyOneKMaxMatch?: number;
  onFortyOneKMaxMatchChange?: (value: number) => void;
};

const BenefitsSection = ({
  benefitItems,
  onAddBenefitItem,
  onUpdateBenefitItem,
  onRemoveBenefitItem,
  computeBenefitsTotal,
  benefitsValue,
  healthPremiumMonthly,
  onHealthPremiumMonthlyChange,
  hsaEmployerContribution,
  onHsaEmployerContributionChange,
  healthPlanType,
  onHealthPlanTypeChange,
  healthOopMax,
  onHealthOopMaxChange,
  fortyOneKMatchPercent,
  onFortyOneKMatchPercentChange,
  fortyOneKMaxMatch,
  onFortyOneKMaxMatchChange,
}: BenefitsSectionProps) => {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">Benefit Items</label>
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
            <div key={item.id} className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={item.label}
                onChange={(e) => onUpdateBenefitItem(item.id, { label: e.target.value })}
                placeholder="e.g. Gym reimbursement"
                className="col-span-5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={0}
                value={item.amount}
                onChange={(e) =>
                  onUpdateBenefitItem(item.id, { amount: Number(e.target.value) || 0 })
                }
                className="col-span-3 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select
                value={item.frequency}
                onChange={(e) =>
                  onUpdateBenefitItem(item.id, {
                    frequency: e.target.value as BenefitItem['frequency'],
                  })
                }
                className="col-span-3 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="MONTHLY">/month</option>
                <option value="YEARLY">/year</option>
              </select>
              <button
                type="button"
                onClick={() => onRemoveBenefitItem(item.id)}
                className="col-span-1 text-red-500 text-sm font-bold flex items-center justify-center hover:bg-red-50 rounded-md"
                aria-label="Remove benefit item"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Annualized custom benefits: $
          {Math.round(computeBenefitsTotal(benefitItems)).toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">
          Total benefits used in comparison: ${Math.round(benefitsValue || 0).toLocaleString()}
        </p>
      </div>

      {/* Structured Health & Retirement Benefits */}
      <div className="pt-3 border-t border-gray-200 space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Health Insurance & HSA</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 md:h-8 md:flex md:items-end">
              Monthly Premium
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={healthPremiumMonthly || 0}
                onChange={(e) => onHealthPremiumMonthlyChange?.(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 md:h-8 md:flex md:items-end">
              Plan Type
            </label>
            <input
              type="text"
              value={healthPlanType || ''}
              onChange={(e) => onHealthPlanTypeChange?.(e.target.value)}
              placeholder="e.g. PPO, HDHP"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 md:h-8 md:flex md:items-end">
              Annual Out-of-Pocket Max
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={healthOopMax || 0}
                onChange={(e) => onHealthOopMaxChange?.(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 md:h-8 md:flex md:items-end">
              HSA Employer Contribution
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                $
              </span>
              <input
                type="number"
                min={0}
                value={hsaEmployerContribution || 0}
                onChange={(e) => onHsaEmployerContributionChange?.(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pl-5 text-sm"
              />
            </div>
          </div>
        </div>

        <label className="block text-sm font-semibold text-gray-700 pt-2">
          401(k) Retirement Matching
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 md:h-8 md:flex md:items-end">
              Employer Match %
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={fortyOneKMatchPercent || 0}
                onChange={(e) => onFortyOneKMatchPercentChange?.(Number(e.target.value) || 0)}
                placeholder="e.g. 50% or 100%"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 pr-6 text-sm"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                %
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 md:h-8 md:flex md:items-end">
              Max Employee Contribution Matched
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={fortyOneKMaxMatch || 0}
                onChange={(e) => onFortyOneKMaxMatchChange?.(Number(e.target.value) || 0)}
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
    </div>
  );
};

export default BenefitsSection;
