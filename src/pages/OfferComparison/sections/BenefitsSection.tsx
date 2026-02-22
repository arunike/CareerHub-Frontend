import type { BenefitItem } from '../calculations';

type BenefitsSectionProps = {
  benefitItems: BenefitItem[];
  onAddBenefitItem: () => void;
  onUpdateBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  onRemoveBenefitItem: (id: string) => void;
  computeBenefitsTotal: (items: BenefitItem[]) => number;
  benefitsValue: number;
};

const BenefitsSection = ({
  benefitItems,
  onAddBenefitItem,
  onUpdateBenefitItem,
  onRemoveBenefitItem,
  computeBenefitsTotal,
  benefitsValue,
}: BenefitsSectionProps) => {
  return (
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
      <p className="text-xs text-gray-500">Benefits Value (Auto): ${Math.round(benefitsValue || 0).toLocaleString()}</p>
    </div>
  );
};

export default BenefitsSection;
