import ModalShell from '../../components/ModalShell';
import OfferFormFields from './OfferFormFields';
import OfferFormModalFooter from './components/OfferFormModalFooter';
import {
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferLike as Offer,
  computeBenefitsTotal,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';

type Props = {
  editingOffer: Offer | null;
  editingApp: Application | null;
  offerModalMode: 'view' | 'edit';
  allUsCityOptions: string[];
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
  editingBenefitItems: BenefitItem[];
  patchEditingApp: (updates: Partial<Application> | ((prev: Application) => Partial<Application>)) => void;
  setEditingOfferField: <K extends keyof Offer>(key: K, value: Offer[K]) => void;
  addEditingBenefitItem: () => void;
  updateEditingBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  removeEditingBenefitItem: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
};

const EditOfferModal = ({
  editingOffer,
  editingApp,
  offerModalMode,
  allUsCityOptions,
  adjustedByOfferId,
  editingBenefitItems,
  patchEditingApp,
  setEditingOfferField,
  addEditingBenefitItem,
  updateEditingBenefitItem,
  removeEditingBenefitItem,
  onClose,
  onSave,
}: Props) => {
  if (!editingOffer) return null;

  const adjusted = editingOffer.id ? adjustedByOfferId[editingOffer.id] : undefined;
  const baseTaxRate = Number(editingApp?.tax_base_rate ?? adjusted?.usedBaseTaxRate ?? 32);
  const bonusTaxRate = Number(editingApp?.tax_bonus_rate ?? adjusted?.usedBonusTaxRate ?? 40);
  const equityTaxRate = Number(editingApp?.tax_equity_rate ?? adjusted?.usedEquityTaxRate ?? 42);
  const monthlyRent = Number(editingApp?.monthly_rent_override ?? adjusted?.monthlyRent ?? 0);

  return (
    <ModalShell
      isOpen
      title={offerModalMode === 'view' ? 'View Offer Details' : 'Edit Offer Details'}
      onClose={onClose}
      footer={
        <OfferFormModalFooter
          mode={offerModalMode}
          onClose={onClose}
          onSave={onSave}
          saveLabel="Save Offer"
        />
      }
    >
      <fieldset disabled={offerModalMode === 'view'} className="m-0 min-w-0 border-0 p-0">
        <OfferFormFields
              companyName={editingApp?.company_name || ''}
              onCompanyNameChange={(value) => patchEditingApp({ company_name: value })}
              roleTitle={editingApp?.role_title || ''}
              onRoleTitleChange={(value) => patchEditingApp({ role_title: value })}
              location={editingApp?.location || ''}
              onLocationChange={(value) => patchEditingApp({ location: value })}
              locationOptions={allUsCityOptions}
              taxRatePreview={{
                baseTaxRate,
                bonusTaxRate,
                equityTaxRate,
                note: 'Per-offer manual',
              }}
              editableTaxRates={{ baseTaxRate, bonusTaxRate, equityTaxRate }}
              onEditableTaxRatesChange={(next) =>
                patchEditingApp({
                  tax_base_rate: next.baseTaxRate,
                  tax_bonus_rate: next.bonusTaxRate,
                  tax_equity_rate: next.equityTaxRate,
                })
              }
              editableMonthlyRent={monthlyRent}
              onEditableMonthlyRentChange={(value) => patchEditingApp({ monthly_rent_override: value })}
              baseSalary={Number(editingOffer.base_salary) || 0}
              onBaseSalaryChange={(value) => setEditingOfferField('base_salary', value)}
              bonus={Number(editingOffer.bonus) || 0}
              onBonusChange={(value) => setEditingOfferField('bonus', value)}
              equity={Number(editingOffer.equity) || 0}
              onEquityChange={(value) => setEditingOfferField('equity', value)}
              equityTotalGrant={Number(editingOffer.equity_total_grant ?? 0)}
              onEquityTotalGrantChange={(value) => setEditingOfferField('equity_total_grant', value)}
              equityVestingPercent={Number(editingOffer.equity_vesting_percent ?? 25)}
              onEquityVestingPercentChange={(value) => setEditingOfferField('equity_vesting_percent', value)}
              defaultEquityMode={Number(editingOffer.equity_total_grant ?? 0) > 0 ? 'total' : 'annual'}
              signOn={Number(editingOffer.sign_on) || 0}
              onSignOnChange={(value) => setEditingOfferField('sign_on', value)}
              benefitsValue={Number(editingOffer.benefits_value) || 0}
              benefitItems={editingBenefitItems}
              onAddBenefitItem={addEditingBenefitItem}
              onUpdateBenefitItem={updateEditingBenefitItem}
              onRemoveBenefitItem={removeEditingBenefitItem}
              computeBenefitsTotal={computeBenefitsTotal}
              workMode={
                editingApp?.rto_policy === 'REMOTE'
                  ? 'REMOTE'
                  : editingApp?.rto_policy === 'ONSITE'
                    ? 'ONSITE'
                    : 'HYBRID'
              }
              onWorkModeChange={(value) =>
                patchEditingApp((prev) => ({
                  rto_policy: value,
                  rto_days_per_week:
                    value === 'REMOTE' ? 0 : value === 'ONSITE' ? 5 : prev.rto_days_per_week ?? 3,
                }))
              }
              rtoDaysPerWeek={Number(editingApp?.rto_days_per_week) || 0}
              onRtoDaysPerWeekChange={(value) => patchEditingApp({ rto_days_per_week: value })}
              commuteCostValue={Number(editingApp?.commute_cost_value) || 0}
              commuteCostFrequency={
                (editingApp?.commute_cost_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'MONTHLY'
              }
              onCommuteCostValueChange={(value) => patchEditingApp({ commute_cost_value: value })}
              onCommuteCostFrequencyChange={(value) => patchEditingApp({ commute_cost_frequency: value })}
              freeFoodPerkValue={Number(editingApp?.free_food_perk_value) || 0}
              freeFoodPerkFrequency={
                (editingApp?.free_food_perk_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'YEARLY'
              }
              onFreeFoodPerkValueChange={(value) => patchEditingApp({ free_food_perk_value: value })}
              onFreeFoodPerkFrequencyChange={(value) => patchEditingApp({ free_food_perk_frequency: value })}
              showCommuteAndPerks
              enableCompModeToggles
              ptoDays={Number(editingOffer.pto_days) || 0}
              onPtoDaysChange={(value) => setEditingOfferField('pto_days', value)}
              holidayDays={Number(editingOffer.holiday_days ?? 11)}
              onHolidayDaysChange={(value) => setEditingOfferField('holiday_days', value)}
              locationPlaceholder="e.g. San Jose, CA"
        />
      </fieldset>
    </ModalShell>
  );
};

export default EditOfferModal;
