import type { EditableTaxRates, TaxRatePreview } from './types';

type LocationTaxSectionProps = {
  location: string;
  onLocationChange: (value: string) => void;
  locationOptions: string[];
  locationPlaceholder: string;
  taxRatePreview?: TaxRatePreview;
  editableTaxRates?: EditableTaxRates;
  onEditableTaxRatesChange?: (next: EditableTaxRates) => void;
  editableMonthlyRent?: number;
  onEditableMonthlyRentChange?: (value: number) => void;
};

const LocationTaxSection = ({
  location,
  onLocationChange,
  locationOptions,
  locationPlaceholder,
  taxRatePreview,
  editableTaxRates,
  onEditableTaxRatesChange,
  editableMonthlyRent,
  onEditableMonthlyRentChange,
}: LocationTaxSectionProps) => {
  return (
    <>
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
                  } as EditableTaxRates)
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
    </>
  );
};

export default LocationTaxSection;
