import React, { useEffect, useState } from 'react';
import type { BenefitItem } from './calculations';

interface ApplicationOption {
  id: number;
  label: string;
}

interface OfferFormFieldsProps {
  showLinkApplication?: boolean;
  linkedApplicationId?: number | null;
  onLinkedApplicationChange?: (value: number | null) => void;
  applicationOptions?: ApplicationOption[];
  hideCompanyRoleWhenLinked?: boolean;

  companyName: string;
  onCompanyNameChange: (value: string) => void;
  roleTitle: string;
  onRoleTitleChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  locationOptions?: string[];
  taxRatePreview?: {
    baseTaxRate: number;
    bonusTaxRate: number;
    equityTaxRate: number;
    note?: string;
  };
  editableTaxRates?: {
    baseTaxRate: number;
    bonusTaxRate: number;
    equityTaxRate: number;
  };
  onEditableTaxRatesChange?: (next: {
    baseTaxRate: number;
    bonusTaxRate: number;
    equityTaxRate: number;
  }) => void;
  editableMonthlyRent?: number;
  onEditableMonthlyRentChange?: (value: number) => void;

  baseSalary: number;
  onBaseSalaryChange: (value: number) => void;
  bonus: number;
  onBonusChange: (value: number) => void;
  equity: number;
  onEquityChange: (value: number) => void;
  equityTotalGrant?: number;
  onEquityTotalGrantChange?: (value: number) => void;
  equityVestingPercent?: number;
  onEquityVestingPercentChange?: (value: number) => void;
  defaultEquityMode?: 'annual' | 'total';
  signOn: number;
  onSignOnChange: (value: number) => void;

  benefitsValue: number;
  benefitItems: BenefitItem[];
  onAddBenefitItem: () => void;
  onUpdateBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  onRemoveBenefitItem: (id: string) => void;
  computeBenefitsTotal: (items: BenefitItem[]) => number;

  workMode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  onWorkModeChange: (value: 'REMOTE' | 'HYBRID' | 'ONSITE') => void;
  rtoDaysPerWeek: number;
  onRtoDaysPerWeekChange: (value: number) => void;
  commuteCostValue: number;
  commuteCostFrequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  onCommuteCostValueChange: (value: number) => void;
  onCommuteCostFrequencyChange: (value: 'DAILY' | 'MONTHLY' | 'YEARLY') => void;
  freeFoodPerkValue: number;
  freeFoodPerkFrequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  onFreeFoodPerkValueChange: (value: number) => void;
  onFreeFoodPerkFrequencyChange: (value: 'DAILY' | 'MONTHLY' | 'YEARLY') => void;
  showCommuteAndPerks?: boolean;
  enableCompModeToggles?: boolean;

  ptoDays?: number;
  onPtoDaysChange?: (value: number) => void;
  holidayDays?: number;
  onHolidayDaysChange?: (value: number) => void;

  companyPlaceholder?: string;
  rolePlaceholder?: string;
  locationPlaceholder?: string;
}

const OfferFormFields: React.FC<OfferFormFieldsProps> = ({
  showLinkApplication = false,
  linkedApplicationId = null,
  onLinkedApplicationChange,
  applicationOptions = [],
  hideCompanyRoleWhenLinked = false,
  companyName,
  onCompanyNameChange,
  roleTitle,
  onRoleTitleChange,
  location,
  onLocationChange,
  locationOptions = [],
  taxRatePreview,
  editableTaxRates,
  onEditableTaxRatesChange,
  editableMonthlyRent,
  onEditableMonthlyRentChange,
  baseSalary,
  onBaseSalaryChange,
  bonus,
  onBonusChange,
  equity,
  onEquityChange,
  equityTotalGrant,
  onEquityTotalGrantChange,
  equityVestingPercent,
  onEquityVestingPercentChange,
  defaultEquityMode,
  signOn,
  onSignOnChange,
  benefitsValue,
  benefitItems,
  onAddBenefitItem,
  onUpdateBenefitItem,
  onRemoveBenefitItem,
  computeBenefitsTotal,
  workMode,
  onWorkModeChange,
  rtoDaysPerWeek,
  onRtoDaysPerWeekChange,
  commuteCostValue,
  commuteCostFrequency,
  onCommuteCostValueChange,
  onCommuteCostFrequencyChange,
  freeFoodPerkValue,
  freeFoodPerkFrequency,
  onFreeFoodPerkValueChange,
  onFreeFoodPerkFrequencyChange,
  showCommuteAndPerks = true,
  enableCompModeToggles = false,
  ptoDays,
  onPtoDaysChange,
  holidayDays,
  onHolidayDaysChange,
  companyPlaceholder = 'e.g. Google',
  rolePlaceholder = 'e.g. Senior SWE',
  locationPlaceholder = 'e.g. San Jose, CA, United States',
}) => {
  const shouldShowCompanyRole = !(hideCompanyRoleWhenLinked && linkedApplicationId);
  const showRtoDays = workMode === 'HYBRID' || workMode === 'ONSITE';
  const [bonusMode, setBonusMode] = useState<'$' | '%'>('$');
  const [bonusPercentInput, setBonusPercentInput] = useState<string>('');
  const [equityMode, setEquityMode] = useState<'annual' | 'total'>(
    defaultEquityMode || (Number(equityTotalGrant || 0) > 0 ? 'total' : 'annual')
  );
  const [equityTotalGrantInput, setEquityTotalGrantInput] = useState<string>(
    Number(equityTotalGrant || 0) > 0 ? String(Number(equityTotalGrant || 0)) : ''
  );
  const [equityVestingPercentInternal, setEquityVestingPercentInternal] = useState<number>(
    Number.isFinite(Number(equityVestingPercent)) ? Number(equityVestingPercent) : 25
  );
  const effectiveEquityVestingPercent = equityVestingPercentInternal;

  useEffect(() => {
    setEquityVestingPercentInternal(
      Number.isFinite(Number(equityVestingPercent)) ? Number(equityVestingPercent) : 25
    );
    if (Number(equityTotalGrant || 0) > 0) {
      setEquityTotalGrantInput(String(Number(equityTotalGrant || 0)));
    } else {
      setEquityTotalGrantInput('');
    }
  }, [equityTotalGrant, equityVestingPercent]);

  useEffect(() => {
    if (defaultEquityMode) {
      setEquityMode(defaultEquityMode);
      return;
    }
    setEquityMode(Number(equityTotalGrant || 0) > 0 ? 'total' : 'annual');
  }, [defaultEquityMode]);
  const annualizedCommute =
    commuteCostFrequency === 'DAILY'
      ? (Number(commuteCostValue) || 0) * 260
      : commuteCostFrequency === 'MONTHLY'
        ? (Number(commuteCostValue) || 0) * 12
        : Number(commuteCostValue) || 0;
  const annualizedFoodPerk =
    freeFoodPerkFrequency === 'DAILY'
      ? (Number(freeFoodPerkValue) || 0) * 260
      : freeFoodPerkFrequency === 'MONTHLY'
        ? (Number(freeFoodPerkValue) || 0) * 12
        : Number(freeFoodPerkValue) || 0;

  return (
    <div className="p-6 space-y-4">
      {showLinkApplication && onLinkedApplicationChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Existing Application (Optional)
          </label>
          <select
            value={linkedApplicationId ?? ''}
            onChange={(e) => onLinkedApplicationChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">No link (custom)</option>
            {applicationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {shouldShowCompanyRole && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={companyPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => onRoleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={rolePlaceholder}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          list={locationOptions.length ? 'offer-form-location-options' : undefined}
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder={locationPlaceholder}
        />
        {locationOptions.length > 0 ? (
          <datalist id="offer-form-location-options">
            {locationOptions.slice(0, 500).map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        ) : null}
        {taxRatePreview && (
          <p className="text-xs text-gray-500 mt-1">
            Tax estimate (B/Bn/Eq): {Math.round(taxRatePreview.baseTaxRate)}% /{' '}
            {Math.round(taxRatePreview.bonusTaxRate)}% / {Math.round(taxRatePreview.equityTaxRate)}%
            {taxRatePreview.note ? ` • ${taxRatePreview.note}` : ''}
          </p>
        )}
      </div>

      {editableTaxRates && onEditableTaxRatesChange && (
        <div className="rounded-lg border border-gray-200 p-3 space-y-3">
          <div className="text-sm font-medium text-gray-700">Tax Rates (for this offer)</div>
          {[
            ['Base', editableTaxRates.baseTaxRate, 'baseTaxRate'],
            ['Bonus', editableTaxRates.bonusTaxRate, 'bonusTaxRate'],
            ['Equity', editableTaxRates.equityTaxRate, 'equityTaxRate'],
          ].map(([label, value, key]) => (
            <div key={String(key)}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">{String(label)}</span>
                <span className="text-xs font-semibold text-gray-900">{Math.round(Number(value))}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={55}
                value={Number(value)}
                onChange={(e) =>
                  onEditableTaxRatesChange({
                    ...editableTaxRates,
                    [key]: Number(e.target.value),
                  } as { baseTaxRate: number; bonusTaxRate: number; equityTaxRate: number })
                }
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}

      {typeof editableMonthlyRent === 'number' && onEditableMonthlyRentChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (for this offer)</label>
          <input
            type="number"
            min={0}
            value={editableMonthlyRent}
            onChange={(e) => onEditableMonthlyRentChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
          <input
            type="number"
            value={baseSalary}
            onChange={(e) => {
              const nextBase = Number(e.target.value) || 0;
              onBaseSalaryChange(nextBase);
              if (enableCompModeToggles && bonusMode === '%') {
                const pct = Number(bonusPercentInput) || 0;
                onBonusChange((pct / 100) * nextBase);
              }
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Bonus</label>
            {enableCompModeToggles && (
              <button
                type="button"
                onClick={() => {
                  if (bonusMode === '$') {
                    const pct = baseSalary > 0 ? (Number(bonus || 0) / Number(baseSalary)) * 100 : 0;
                    setBonusPercentInput(pct.toFixed(2).replace(/\.00$/, ''));
                    setBonusMode('%');
                  } else {
                    setBonusMode('$');
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Use {bonusMode === '$' ? '%' : '$'}
              </button>
            )}
          </div>
          {enableCompModeToggles && bonusMode === '%' ? (
            <div>
              <div className="relative">
                <input
                  type="number"
                  value={bonusPercentInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBonusPercentInput(next);
                    const pct = Number(next) || 0;
                    onBonusChange((pct / 100) * Number(baseSalary || 0));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm"
                  placeholder="%"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">≈ ${Math.round(bonus || 0).toLocaleString()}</p>
            </div>
          ) : (
            <input
              type="number"
              value={bonus}
              onChange={(e) => onBonusChange(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Equity</label>
            {enableCompModeToggles && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (equityMode !== 'total') {
                      const total =
                        effectiveEquityVestingPercent > 0
                          ? Number(equity || 0) / (Number(effectiveEquityVestingPercent) / 100)
                          : 0;
                      setEquityTotalGrantInput(total.toFixed(0));
                      onEquityTotalGrantChange?.(total);
                    }
                    setEquityMode('total');
                  }}
                  className={equityMode === 'total' ? 'text-blue-700 underline font-semibold' : 'text-gray-500 underline'}
                >
                  Total
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setEquityMode('annual')}
                  className={equityMode === 'annual' ? 'text-blue-700 underline font-semibold' : 'text-gray-500 underline'}
                >
                  /Yr
                </button>
              </div>
            )}
          </div>
          {enableCompModeToggles && equityMode === 'total' ? (
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <input
                type="number"
                value={equityTotalGrantInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setEquityTotalGrantInput(next);
                  const total = Number(next) || 0;
                  onEquityTotalGrantChange?.(total);
                  const annual = total * ((Number(effectiveEquityVestingPercent) || 0) / 100);
                  onEquityChange(annual);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Total grant"
              />
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={effectiveEquityVestingPercent}
                  onChange={(e) => {
                    const pct = Number(e.target.value) || 0;
                    setEquityVestingPercentInternal(pct);
                    onEquityVestingPercentChange?.(pct);
                    const total = Number(equityTotalGrantInput) || 0;
                    onEquityChange(total * (pct / 100));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-7 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
              </div>
              <p className="col-span-2 text-xs text-gray-500">≈ ${Math.round(equity || 0).toLocaleString()} / yr</p>
            </div>
          ) : (
            <input
              type="number"
              value={equity}
              onChange={(e) => onEquityChange(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Annual value"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sign-On</label>
          <input
            type="number"
            value={signOn}
            onChange={(e) => onSignOnChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Benefit Items</label>
          <button type="button" onClick={onAddBenefitItem} className="text-xs text-blue-600 hover:text-blue-700">
            + Add Item
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
                className="col-span-5 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={item.amount}
                onChange={(e) => onUpdateBenefitItem(item.id, { amount: Number(e.target.value) || 0 })}
                className="col-span-3 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
              <select
                value={item.frequency}
                onChange={(e) =>
                  onUpdateBenefitItem(item.id, {
                    frequency: e.target.value as BenefitItem['frequency'],
                  })
                }
                className="col-span-3 rounded-md border border-gray-300 px-2 py-2 text-sm"
              >
                <option value="MONTHLY">/month</option>
                <option value="YEARLY">/year</option>
              </select>
              <button
                type="button"
                onClick={() => onRemoveBenefitItem(item.id)}
                className="col-span-1 text-red-500 text-sm"
                aria-label="Remove benefit item"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Annualized benefits value used in adjusted comparison: ${Math.round(computeBenefitsTotal(benefitItems)).toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">
          Benefits Value (Auto): ${Math.round(benefitsValue || 0).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
          <select
            value={workMode}
            onChange={(e) => onWorkModeChange(e.target.value as 'REMOTE' | 'HYBRID' | 'ONSITE')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>
        </div>
        {showRtoDays && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RTO Days / Week</label>
            <input
              type="number"
              min={0}
              max={5}
              value={rtoDaysPerWeek}
              onChange={(e) => onRtoDaysPerWeekChange(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        {showCommuteAndPerks && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commute Cost</label>
            <div className="grid grid-cols-[1fr_132px] gap-2">
              <input
                type="number"
                min={0}
                value={commuteCostValue}
                onChange={(e) => onCommuteCostValueChange(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={commuteCostFrequency}
                onChange={(e) =>
                  onCommuteCostFrequencyChange(e.target.value as 'DAILY' | 'MONTHLY' | 'YEARLY')
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="DAILY">/day</option>
                <option value="MONTHLY">/month</option>
                <option value="YEARLY">/year</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">
              Annualized total: ${Math.round(annualizedCommute).toLocaleString()}
            </p>
          </div>
        )}
        {showCommuteAndPerks && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Free Food Perk Value</label>
            <div className="grid grid-cols-[1fr_132px] gap-2">
              <input
                type="number"
                min={0}
                value={freeFoodPerkValue}
                onChange={(e) => onFreeFoodPerkValueChange(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={freeFoodPerkFrequency}
                onChange={(e) =>
                  onFreeFoodPerkFrequencyChange(e.target.value as 'DAILY' | 'MONTHLY' | 'YEARLY')
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="DAILY">/day</option>
                <option value="MONTHLY">/month</option>
                <option value="YEARLY">/year</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">
              Annualized total: ${Math.round(annualizedFoodPerk).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {(typeof ptoDays === 'number' && onPtoDaysChange) ||
      (typeof holidayDays === 'number' && onHolidayDaysChange) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {typeof ptoDays === 'number' && onPtoDaysChange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PTO Days</label>
              <input
                type="number"
                value={ptoDays}
                onChange={(e) => onPtoDaysChange(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
          {typeof holidayDays === 'number' && onHolidayDaysChange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Days</label>
              <input
                type="number"
                value={holidayDays}
                onChange={(e) => onHolidayDaysChange(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      ) : null}

    </div>
  );
};

export default OfferFormFields;
