import type { BenefitsSectionProps } from './BenefitsSection';
import { computeBenefitsTotal, type BenefitItem } from '../calculations';
import UnitNumberInput from '../../../components/UnitNumberInput';
import CollapsibleGroup from './CollapsibleGroup';
import { CloseOutlined } from '@ant-design/icons';
import { CONTROL_CLASS } from '../../../components/formControls';

type Props = BenefitsSectionProps & {
  nonTaxableSum: number;
  taxableSum: number;
  taxableSumAfterTax: number | null;
};

const CustomBenefitsGroup = ({
  nonTaxableSum,
  taxableSum,
  taxableSumAfterTax,
  benefitItems,
  onAddBenefitItem,
  onRemoveBenefitItem,
  onUpdateBenefitItem,
}: Props) => (
  <CollapsibleGroup
    title="5. Custom Benefits & Allowances"
    hasValue={(benefitItems?.length ?? 0) > 0}
    summary={
      benefitItems?.length
        ? `${benefitItems.length} item${benefitItems.length === 1 ? '' : 's'}`
        : undefined
    }
  >
    <div className="space-y-2">
      <div className="flex items-center justify-end">
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
        <p>Annualized total: ${Math.round(computeBenefitsTotal(benefitItems)).toLocaleString()}</p>
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
  </CollapsibleGroup>
);

export default CustomBenefitsGroup;
