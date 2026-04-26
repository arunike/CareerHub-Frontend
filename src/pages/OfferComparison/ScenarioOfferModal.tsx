import type React from 'react';
import ModalShell from '../../components/ModalShell';
import OfferFormFields from './OfferFormFields';
import OfferFormModalFooter from './components/OfferFormModalFooter';
import type { ApplicationLike, BenefitItem, MaritalStatus, SimulatedOffer } from './calculations';
import {
  computeBenefitsTotal,
} from './calculations';
import { buildScenarioFromLinkedApplication } from './scenarioDraft';

type Props = {
  isOpen: boolean;
  scenarioModalMode: 'add' | 'view' | 'edit';
  editingScenarioId: string | null;
  newScenario: SimulatedOffer;
  applications: ApplicationLike[];
  scenarioBenefitItems: BenefitItem[];
  customFormTaxPreview: {
    baseTaxRate: number;
    bonusTaxRate: number;
    equityTaxRate: number;
    note: string;
  };
  maritalStatus: MaritalStatus;
  stateTaxRate: Record<string, number>;
  stateNameToAbbr: Record<string, string>;
  cityCostOfLiving: Record<string, number>;
  stateColBase: Record<string, number>;
  effectiveMonthlyRent: number;
  referenceColIndex: number;
  referenceLocation: string;
  allUsCityOptions: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setNewScenario: React.Dispatch<React.SetStateAction<SimulatedOffer>>;
  patchNewScenario: (updates: Partial<SimulatedOffer> | ((prev: SimulatedOffer) => Partial<SimulatedOffer>)) => void;
  setNewScenarioField: <K extends keyof SimulatedOffer>(key: K, value: SimulatedOffer[K]) => void;
  addScenarioBenefitItem: () => void;
  updateScenarioBenefitItem: (id: string, patch: Partial<BenefitItem>) => void;
  removeScenarioBenefitItem: (id: string) => void;
};

const ScenarioOfferModal = ({
  isOpen,
  scenarioModalMode,
  editingScenarioId,
  newScenario,
  applications,
  scenarioBenefitItems,
  customFormTaxPreview,
  maritalStatus,
  stateTaxRate,
  stateNameToAbbr,
  cityCostOfLiving,
  stateColBase,
  effectiveMonthlyRent,
  referenceColIndex,
  referenceLocation,
  allUsCityOptions,
  onClose,
  onSubmit,
  setNewScenario,
  patchNewScenario,
  setNewScenarioField,
  addScenarioBenefitItem,
  updateScenarioBenefitItem,
  removeScenarioBenefitItem,
}: Props) => {
  return (
    <ModalShell
      isOpen={isOpen}
      title={
        scenarioModalMode === 'view'
          ? 'View Custom Offer'
          : editingScenarioId
            ? 'Edit Custom Offer'
            : 'Add Custom Offer'
      }
      onClose={onClose}
      footer={
        <OfferFormModalFooter
          mode={scenarioModalMode === 'view' ? 'view' : editingScenarioId ? 'edit' : 'add'}
          onClose={onClose}
          submitFormId="scenario-offer-form"
          saveLabel={editingScenarioId ? 'Save Changes' : 'Add Custom Offer'}
        />
      }
    >
      <form id="scenario-offer-form" onSubmit={onSubmit} className="flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <fieldset disabled={scenarioModalMode === 'view'} className="m-0 min-w-0 border-0 p-0">
            <OfferFormFields
                key={`${editingScenarioId ?? 'new'}-${newScenario.application ?? 'custom'}`}
                showLinkApplication
                linkedApplicationId={newScenario.application ?? null}
                onLinkedApplicationChange={(nextAppId) =>
                  setNewScenario((prev) =>
                    buildScenarioFromLinkedApplication({
                      prev,
                      nextAppId,
                      applications,
                      scenarioBenefitItems,
                      maritalStatus,
                      stateTaxRate,
                      stateNameToAbbr,
                      cityCostOfLiving,
                      stateColBase,
                      effectiveMonthlyRent,
                      referenceColIndex,
                      referenceLocation,
                    }),
                  )
                }
                applicationOptions={applications.map((app) => ({
                  id: app.id,
                  label: `${app.company_name} - ${app.role_title}`,
                }))}
                hideCompanyRoleWhenLinked
                companyName={newScenario.custom_company_name || ''}
                onCompanyNameChange={(value) => setNewScenarioField('custom_company_name', value)}
                roleTitle={newScenario.custom_role_title || ''}
                onRoleTitleChange={(value) => setNewScenarioField('custom_role_title', value)}
                location={newScenario.location || ''}
                onLocationChange={(value) => setNewScenarioField('location', value)}
                officeLocation={newScenario.office_location || ''}
                onOfficeLocationChange={(value) => setNewScenarioField('office_location', value)}
                locationOptions={allUsCityOptions}
                taxRatePreview={customFormTaxPreview}
                editableTaxRates={{
                  baseTaxRate: Number(newScenario.tax_base_rate ?? 32),
                  bonusTaxRate: Number(newScenario.tax_bonus_rate ?? 40),
                  equityTaxRate: Number(newScenario.tax_equity_rate ?? 42),
                }}
                onEditableTaxRatesChange={(next) =>
                  patchNewScenario({
                    tax_base_rate: next.baseTaxRate,
                    tax_bonus_rate: next.bonusTaxRate,
                    tax_equity_rate: next.equityTaxRate,
                  })
                }
                editableMonthlyRent={Number(newScenario.monthly_rent ?? Math.round(effectiveMonthlyRent || 0))}
                onEditableMonthlyRentChange={(value) => setNewScenarioField('monthly_rent', value)}
                baseSalary={Number(newScenario.base_salary) || 0}
                onBaseSalaryChange={(value) => setNewScenarioField('base_salary', value)}
                bonus={Number(newScenario.bonus) || 0}
                onBonusChange={(value) => setNewScenarioField('bonus', value)}
                equity={Number(newScenario.equity) || 0}
                onEquityChange={(value) => setNewScenarioField('equity', value)}
                equityTotalGrant={Number(newScenario.equity_total_grant ?? 0)}
                onEquityTotalGrantChange={(value) => setNewScenarioField('equity_total_grant', value)}
                equityVestingPercent={Number(newScenario.equity_vesting_percent ?? 25)}
                onEquityVestingPercentChange={(value) => setNewScenarioField('equity_vesting_percent', value)}
                defaultEquityMode={Number(newScenario.equity_total_grant ?? 0) > 0 ? 'total' : 'annual'}
                signOn={Number(newScenario.sign_on) || 0}
                onSignOnChange={(value) => setNewScenarioField('sign_on', value)}
                benefitsValue={computeBenefitsTotal(scenarioBenefitItems)}
                benefitItems={scenarioBenefitItems}
                onAddBenefitItem={addScenarioBenefitItem}
                onUpdateBenefitItem={updateScenarioBenefitItem}
                onRemoveBenefitItem={removeScenarioBenefitItem}
                computeBenefitsTotal={computeBenefitsTotal}
                workMode={newScenario.work_mode}
                onWorkModeChange={(value) => setNewScenarioField('work_mode', value)}
                rtoDaysPerWeek={Number(newScenario.rto_days_per_week) || 0}
                onRtoDaysPerWeekChange={(value) => setNewScenarioField('rto_days_per_week', value)}
                commuteCostValue={Number(newScenario.commute_cost_value) || 0}
                commuteCostFrequency={newScenario.commute_cost_frequency || 'MONTHLY'}
                onCommuteCostValueChange={(value) => setNewScenarioField('commute_cost_value', value)}
                onCommuteCostFrequencyChange={(value) => setNewScenarioField('commute_cost_frequency', value)}
                freeFoodPerkValue={Number(newScenario.free_food_perk_value) || 0}
                freeFoodPerkFrequency={newScenario.free_food_perk_frequency || 'YEARLY'}
                onFreeFoodPerkValueChange={(value) => setNewScenarioField('free_food_perk_value', value)}
                onFreeFoodPerkFrequencyChange={(value) => setNewScenarioField('free_food_perk_frequency', value)}
                enableCompModeToggles
                ptoDays={Number(newScenario.pto_days) || 0}
                onPtoDaysChange={(value) => setNewScenarioField('pto_days', value)}
                isUnlimitedPto={!!newScenario.is_unlimited_pto}
                onIsUnlimitedPtoChange={(value) => setNewScenarioField('is_unlimited_pto', value)}
                holidayDays={Number(newScenario.holiday_days ?? 11)}
                onHolidayDaysChange={(value) => setNewScenarioField('holiday_days', value)}
            />
          </fieldset>
        </div>
      </form>
    </ModalShell>
  );
};

export default ScenarioOfferModal;
