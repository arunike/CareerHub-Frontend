import { AutoComplete } from 'antd';
import { useMemo } from 'react';
import type { EditableTaxRates, TaxRatePreview } from './types';

type LocationTaxSectionProps = {
  location: string;
  onLocationChange: (value: string) => void;
  officeLocation?: string;
  onOfficeLocationChange?: (value: string) => void;
  locationOptions: string[];
  locationPlaceholder: string;
  taxRatePreview?: TaxRatePreview;
  editableTaxRates?: EditableTaxRates;
  onEditableTaxRatesChange?: (next: EditableTaxRates) => void;
  editableMonthlyRent?: number;
  onEditableMonthlyRentChange?: (value: number) => void;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE';
};

const LocationTaxSection = ({
  location,
  onLocationChange,
  officeLocation = '',
  onOfficeLocationChange,
  locationOptions,
  locationPlaceholder,
  taxRatePreview,
  editableTaxRates,
  onEditableTaxRatesChange,
  editableMonthlyRent,
  onEditableMonthlyRentChange,
  workMode,
}: LocationTaxSectionProps) => {
  const buildLocationDropdownOptions = useMemo(() => (inputValue: string) => {
    const locationQuery = inputValue.trim().toLowerCase();
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9,\s]/g, '');
    const query = normalize(inputValue).trim();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    const scored = locationOptions
      .map((raw) => {
        const candidate = normalize(raw);
        let score = 0;

        if (query.length === 0) score += 1;
        if (candidate.startsWith(query) && query.length > 0) score += 10;
        if (candidate.includes(query) && query.length > 0) score += 6;
        if (queryTokens.length && queryTokens.every((token) => candidate.includes(token))) score += 4;
        if (candidate === query && query.length > 0) score += 12;

        return { value: raw, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
      .slice(0, 80)
      .map((item) => ({ value: item.value, label: item.value }));

    if (inputValue.trim() && !scored.some((item) => item.value.toLowerCase() === locationQuery)) {
      scored.unshift({ value: inputValue, label: inputValue });
    }

    return scored;
  }, [locationOptions]);

  const homeLocationOptions = useMemo(
    () => buildLocationDropdownOptions(location),
    [buildLocationDropdownOptions, location],
  );
  const officeLocationOptions = useMemo(
    () => buildLocationDropdownOptions(officeLocation),
    [buildLocationDropdownOptions, officeLocation],
  );

  return (
    <>
      {onOfficeLocationChange && workMode !== 'REMOTE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
          <AutoComplete
            className="w-full"
            value={officeLocation}
            options={officeLocationOptions}
            onChange={onOfficeLocationChange}
            onSearch={onOfficeLocationChange}
            placeholder="e.g. San Jose, CA"
            allowClear
            filterOption={false}
          />
          <p className="text-xs text-gray-500 mt-1">
            Used for work location context and display. Commute impact is configured separately below.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Home Location</label>
        <AutoComplete
          className="w-full"
          value={location}
          options={homeLocationOptions}
          onChange={onLocationChange}
          onSearch={onLocationChange}
          placeholder={locationPlaceholder}
          allowClear
          filterOption={false}
        />
        {taxRatePreview && (
          <p className="text-xs text-gray-500 mt-1">
            Tax estimate (B/Bn/Eq): {Math.round(taxRatePreview.baseTaxRate)}% /{' '}
            {Math.round(taxRatePreview.bonusTaxRate)}% / {Math.round(taxRatePreview.equityTaxRate)}%
            {taxRatePreview.note ? ` • ${taxRatePreview.note}` : ''}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Used for tax, cost-of-living, and rent assumptions.
        </p>
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
                min={0}
                max={55}
                value={Number(value)}
                onChange={(e) =>
                  onEditableTaxRatesChange({
                    ...editableTaxRates,
                    [key]: Number(e.target.value),
                  } as EditableTaxRates)
                }
                className="w-full"
              />
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Set a rate to `0%` when that pay type does not apply, like offers with no bonus or no equity.
          </p>
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
    </>
  );
};

export default LocationTaxSection;
