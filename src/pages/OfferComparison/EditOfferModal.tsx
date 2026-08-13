import type { CommuteOption } from './commute';
import { useState } from 'react';
import { message } from 'antd';
import ConfirmModal from '../../components/ConfirmModal';
import ModalShell from '../../components/ModalShell';
import OfferFormFields from './OfferFormFields';
import OfferDocumentsPanel from './OfferDocumentsPanel';
import OfferFormModalFooter from './components/OfferFormModalFooter';
import {
  type ApplicationLike as Application,
  type BenefitItem,
  type OfferLike as Offer,
  computeBenefitsTotal,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';
import { normalizeEquityLiquidity } from './equityLiquidity';

type Props = {
  editingOffer: Offer | null;
  editingApp: Application | null;
  offerModalMode: 'view' | 'edit';
  allUsCityOptions: string[];
  adjustedByOfferId: Record<number, AdjustedOfferMetrics>;
  editingBenefitItems: BenefitItem[];
  patchEditingApp: (
    updates: Partial<Application> | ((prev: Application) => Partial<Application>)
  ) => void;
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
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const draftSnapshot = JSON.stringify({
    offer: editingOffer,
    application: editingApp,
    benefitItems: editingBenefitItems,
  });
  const [initialDraftSnapshot] = useState(draftSnapshot);
  const hasChanges = offerModalMode === 'edit' && draftSnapshot !== initialDraftSnapshot;

  // Errors appear only after a save attempt, so an empty new form is not pre-reddened.
  const [saveAttempted, setSaveAttempted] = useState(false);
  const missingCompanyName = !editingApp?.company_name?.trim();
  const missingRoleTitle = !editingApp?.role_title?.trim();

  const missingFields: string[] = [];
  if (missingCompanyName) missingFields.push('Company Name');
  if (missingRoleTitle) missingFields.push('Role Title');
  const hasRequiredFields = missingFields.length === 0;

  const handleSave = () => {
    if (!hasRequiredFields) {
      setSaveAttempted(true);
      message.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      const targetId = missingCompanyName ? 'offer-form-company-name' : 'offer-form-role-title';
      const el = document.getElementById(targetId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    onSave();
  };

  if (!editingOffer) return null;

  const adjusted = editingOffer.id ? adjustedByOfferId[editingOffer.id] : undefined;
  const baseTaxRate = Number(editingApp?.tax_base_rate ?? adjusted?.usedBaseTaxRate ?? 32);
  const bonusTaxRate = Number(editingApp?.tax_bonus_rate ?? adjusted?.usedBonusTaxRate ?? 40);
  const equityTaxRate = Number(editingApp?.tax_equity_rate ?? adjusted?.usedEquityTaxRate ?? 42);
  const monthlyRent = Number(editingApp?.monthly_rent_override ?? adjusted?.monthlyRent ?? 0);
  const requestClose = () => {
    if (hasChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  return (
    <>
      <ModalShell
        isOpen
        titleNode={
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-semibold text-slate-950 sm:text-lg">
                {offerModalMode === 'view' ? 'Offer details' : 'Edit offer'}
              </span>
              <span className="hidden rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline-flex">
                {offerModalMode === 'view'
                  ? 'Read only'
                  : hasChanges
                    ? 'Unsaved changes'
                    : 'Editing'}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-normal text-slate-500">
              {[editingApp?.company_name, editingApp?.role_title].filter(Boolean).join(' · ') ||
                'Offer record'}
            </p>
          </div>
        }
        onClose={requestClose}
        maxWidthClass="max-w-6xl"
        bodyClassName="flex-1 min-h-0 overflow-y-auto bg-slate-50"
        headerClassName="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4"
        titleClassName="min-w-0 flex-1 pr-4"
        footerClassName="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:flex-row sm:px-6 sm:py-3"
        footer={
          <OfferFormModalFooter
            mode={offerModalMode}
            onClose={requestClose}
            onSave={handleSave}
            saveLabel="Save Offer"
            tooltip={
              !hasRequiredFields
                ? `Missing required fields: ${missingFields.join(', ')}`
                : undefined
            }
          />
        }
      >
        <fieldset disabled={offerModalMode === 'view'} className="m-0 min-w-0 border-0 p-0">
          <OfferFormFields
            key={editingOffer.id ?? 'unsaved-offer'}
            companyName={editingApp?.company_name || ''}
            onCompanyNameChange={(value) => patchEditingApp({ company_name: value })}
            roleTitle={editingApp?.role_title || ''}
            onRoleTitleChange={(value) => patchEditingApp({ role_title: value })}
            invalidCompanyName={saveAttempted && missingCompanyName}
            invalidRoleTitle={saveAttempted && missingRoleTitle}
            level={editingApp?.level || ''}
            onLevelChange={(value) => patchEditingApp({ level: value })}
            deadline={editingOffer.deadline ?? null}
            onDeadlineChange={(value) => setEditingOfferField('deadline', value)}
            location={editingApp?.location || ''}
            onLocationChange={(value) => patchEditingApp({ location: value })}
            officeLocation={editingApp?.office_location || ''}
            onOfficeLocationChange={(value) => patchEditingApp({ office_location: value })}
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
            onEditableMonthlyRentChange={(value) =>
              patchEditingApp({ monthly_rent_override: value })
            }
            baseSalary={Number(editingOffer.base_salary) || 0}
            onBaseSalaryChange={(value) => setEditingOfferField('base_salary', value)}
            bonus={Number(editingOffer.bonus) || 0}
            onBonusChange={(value) => setEditingOfferField('bonus', value)}
            equity={Number(editingOffer.equity) || 0}
            onEquityChange={(value) => setEditingOfferField('equity', value)}
            annualRefreshValue={Number(editingOffer.annual_refresh_value) || 0}
            onAnnualRefreshValueChange={(value) =>
              setEditingOfferField('annual_refresh_value', value)
            }
            refreshStartsYear={Number(editingOffer.refresh_starts_year) || 2}
            onRefreshStartsYearChange={(value) =>
              setEditingOfferField('refresh_starts_year', value)
            }
            equityLiquidity={normalizeEquityLiquidity(editingOffer.equity_liquidity)}
            onEquityLiquidityChange={(value) => setEditingOfferField('equity_liquidity', value)}
            equityBuybackValue={Number(editingOffer.equity_buyback_value) || 0}
            onEquityBuybackValueChange={(value) =>
              setEditingOfferField('equity_buyback_value', value)
            }
            equityTotalGrant={Number(editingOffer.equity_total_grant ?? 0)}
            onEquityTotalGrantChange={(value) => setEditingOfferField('equity_total_grant', value)}
            equityVestingPercent={Number(editingOffer.equity_vesting_percent ?? 25)}
            onEquityVestingPercentChange={(value) =>
              setEditingOfferField('equity_vesting_percent', value)
            }
            equityVestingSchedule={
              Array.isArray(editingOffer.equity_vesting_schedule)
                ? (editingOffer.equity_vesting_schedule as number[])
                : undefined
            }
            onEquityVestingScheduleChange={(value) =>
              setEditingOfferField('equity_vesting_schedule', value)
            }
            defaultEquityMode={
              Number(editingOffer.equity_total_grant ?? 0) > 0 ? 'total' : 'annual'
            }
            signOn={Number(editingOffer.sign_on) || 0}
            onSignOnChange={(value) => setEditingOfferField('sign_on', value)}
            signOnSchedule={(editingOffer.sign_on_schedule as number[]) || []}
            onSignOnScheduleChange={(value) => setEditingOfferField('sign_on_schedule', value)}
            benefitsValue={Number(editingOffer.benefits_value) || 0}
            benefitItems={editingBenefitItems}
            onAddBenefitItem={addEditingBenefitItem}
            onUpdateBenefitItem={updateEditingBenefitItem}
            onRemoveBenefitItem={removeEditingBenefitItem}
            computeBenefitsTotal={computeBenefitsTotal}
            taxRate={baseTaxRate}
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
                  value === 'REMOTE' ? 0 : value === 'ONSITE' ? 5 : (prev.rto_days_per_week ?? 3),
              }))
            }
            rtoDaysPerWeek={Number(editingApp?.rto_days_per_week) || 0}
            onRtoDaysPerWeekChange={(value) => patchEditingApp({ rto_days_per_week: value })}
            commuteCostValue={Number(editingApp?.commute_cost_value) || 0}
            commuteCostFrequency={
              (editingApp?.commute_cost_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'MONTHLY'
            }
            commuteOptions={editingApp?.commute_options as CommuteOption[] | undefined}
            onCommuteOptionsChange={(value) => patchEditingApp({ commute_options: value })}
            freeFoodPerkValue={Number(editingApp?.free_food_perk_value) || 0}
            freeFoodPerkFrequency={
              (editingApp?.free_food_perk_frequency as 'DAILY' | 'MONTHLY' | 'YEARLY') || 'YEARLY'
            }
            onFreeFoodPerkValueChange={(value) => patchEditingApp({ free_food_perk_value: value })}
            onFreeFoodPerkFrequencyChange={(value) =>
              patchEditingApp({ free_food_perk_frequency: value })
            }
            showCommuteAndPerks
            showDecisionSignals
            visaSponsorship={
              editingApp?.visa_sponsorship && editingApp.visa_sponsorship !== 'UNKNOWN'
                ? editingApp.visa_sponsorship
                : ''
            }
            onVisaSponsorshipChange={(value) => patchEditingApp({ visa_sponsorship: value })}
            dayOneGc={
              editingApp?.day_one_gc && editingApp.day_one_gc !== 'UNKNOWN'
                ? editingApp.day_one_gc
                : ''
            }
            onDayOneGcChange={(value) => patchEditingApp({ day_one_gc: value })}
            growthScore={editingApp?.growth_score ?? null}
            onGrowthScoreChange={(value) => patchEditingApp({ growth_score: value })}
            workLifeScore={editingApp?.work_life_score ?? null}
            onWorkLifeScoreChange={(value) => patchEditingApp({ work_life_score: value })}
            brandScore={editingApp?.brand_score ?? null}
            onBrandScoreChange={(value) => patchEditingApp({ brand_score: value })}
            teamScore={editingApp?.team_score ?? null}
            onTeamScoreChange={(value) => patchEditingApp({ team_score: value })}
            enableCompModeToggles
            ptoDays={Number(editingOffer.pto_days) || 0}
            onPtoDaysChange={(value) => setEditingOfferField('pto_days', value)}
            isUnlimitedPto={!!editingOffer.is_unlimited_pto}
            onIsUnlimitedPtoChange={(value) => setEditingOfferField('is_unlimited_pto', value)}
            sickLeaveDays={Number(editingOffer.sick_leave_days) || 0}
            onSickLeaveDaysChange={(value) => setEditingOfferField('sick_leave_days', value)}
            sickLeaveIncludedInUnlimitedPto={
              editingOffer.sick_leave_included_in_unlimited_pto !== false
            }
            onSickLeaveIncludedInUnlimitedPtoChange={(value) =>
              setEditingOfferField('sick_leave_included_in_unlimited_pto', value)
            }
            holidayDays={Number(editingOffer.holiday_days ?? 11)}
            onHolidayDaysChange={(value) => setEditingOfferField('holiday_days', value)}
            paychecksPerYear={Number(editingOffer.paychecks_per_year) || 26}
            onPaychecksPerYearChange={(value) => setEditingOfferField('paychecks_per_year', value)}
            healthPremiumPaycheck={editingOffer.health_premium_paycheck ?? ''}
            onHealthPremiumPaycheckChange={(value) =>
              setEditingOfferField('health_premium_paycheck', value)
            }
            healthPremiumMonthly={editingOffer.health_premium_monthly ?? ''}
            onHealthPremiumMonthlyChange={(value) =>
              setEditingOfferField('health_premium_monthly', value)
            }
            hsaEmployerContribution={editingOffer.hsa_employer_contribution ?? ''}
            onHsaEmployerContributionChange={(value) =>
              setEditingOfferField('hsa_employer_contribution', value)
            }
            healthPlanType={editingOffer.health_plan_type || ''}
            onHealthPlanTypeChange={(value) => setEditingOfferField('health_plan_type', value)}
            healthOopMax={editingOffer.health_oop_max ?? ''}
            onHealthOopMaxChange={(value) => setEditingOfferField('health_oop_max', value)}
            healthDeductible={editingOffer.health_deductible ?? ''}
            onHealthDeductibleChange={(value) => setEditingOfferField('health_deductible', value)}
            healthFamilyOopMax={editingOffer.health_family_oop_max ?? ''}
            onHealthFamilyOopMaxChange={(value) =>
              setEditingOfferField('health_family_oop_max', value)
            }
            healthPcpCopay={editingOffer.health_pcp_copay ?? ''}
            onHealthPcpCopayChange={(value) => setEditingOfferField('health_pcp_copay', value)}
            healthSpecialistCopay={editingOffer.health_specialist_copay ?? ''}
            onHealthSpecialistCopayChange={(value) =>
              setEditingOfferField('health_specialist_copay', value)
            }
            dentalPlanName={editingOffer.dental_plan_name || ''}
            onDentalPlanNameChange={(value) => setEditingOfferField('dental_plan_name', value)}
            dentalPremiumPaycheck={editingOffer.dental_premium_paycheck ?? ''}
            onDentalPremiumPaycheckChange={(value) =>
              setEditingOfferField('dental_premium_paycheck', value)
            }
            dentalMonthlyPremium={editingOffer.dental_monthly_premium ?? ''}
            onDentalMonthlyPremiumChange={(value) =>
              setEditingOfferField('dental_monthly_premium', value)
            }
            dentalAnnualMax={editingOffer.dental_annual_max ?? ''}
            onDentalAnnualMaxChange={(value) => setEditingOfferField('dental_annual_max', value)}
            dentalDeductible={editingOffer.dental_deductible ?? ''}
            onDentalDeductibleChange={(value) => setEditingOfferField('dental_deductible', value)}
            visionPlanName={editingOffer.vision_plan_name || ''}
            onVisionPlanNameChange={(value) => setEditingOfferField('vision_plan_name', value)}
            visionPremiumPaycheck={editingOffer.vision_premium_paycheck ?? ''}
            onVisionPremiumPaycheckChange={(value) =>
              setEditingOfferField('vision_premium_paycheck', value)
            }
            visionMonthlyPremium={editingOffer.vision_monthly_premium ?? ''}
            onVisionMonthlyPremiumChange={(value) =>
              setEditingOfferField('vision_monthly_premium', value)
            }
            visionFramesAllowance={editingOffer.vision_frames_allowance ?? ''}
            onVisionFramesAllowanceChange={(value) =>
              setEditingOfferField('vision_frames_allowance', value)
            }
            visionContactsAllowance={editingOffer.vision_contacts_allowance ?? ''}
            onVisionContactsAllowanceChange={(value) =>
              setEditingOfferField('vision_contacts_allowance', value)
            }
            hasDependents={!!editingOffer.has_dependents}
            onHasDependentsChange={(value) => setEditingOfferField('has_dependents', value)}
            dependentCoverageTier={editingOffer.dependent_coverage_tier || 'EMPLOYEE_SPOUSE'}
            onDependentCoverageTierChange={(value) =>
              setEditingOfferField('dependent_coverage_tier', value)
            }
            healthFamilyDeductible={editingOffer.health_family_deductible ?? ''}
            onHealthFamilyDeductibleChange={(value) =>
              setEditingOfferField('health_family_deductible', value)
            }
            dependentHealthPremiumPaycheck={editingOffer.dependent_health_premium_paycheck ?? ''}
            onDependentHealthPremiumPaycheckChange={(value) =>
              setEditingOfferField('dependent_health_premium_paycheck', value)
            }
            dependentDentalPremiumPaycheck={editingOffer.dependent_dental_premium_paycheck ?? ''}
            onDependentDentalPremiumPaycheckChange={(value) =>
              setEditingOfferField('dependent_dental_premium_paycheck', value)
            }
            dependentVisionPremiumPaycheck={editingOffer.dependent_vision_premium_paycheck ?? ''}
            onDependentVisionPremiumPaycheckChange={(value) =>
              setEditingOfferField('dependent_vision_premium_paycheck', value)
            }
            fortyOneKMatchPercent={editingOffer.forty_one_k_match_percent ?? ''}
            onFortyOneKMatchPercentChange={(value) =>
              setEditingOfferField('forty_one_k_match_percent', value)
            }
            fortyOneKMaxMatch={editingOffer.forty_one_k_max_match ?? ''}
            onFortyOneKMaxMatchChange={(value) =>
              setEditingOfferField('forty_one_k_max_match', value)
            }
            relocationBonus={editingOffer.relocation_bonus ?? ''}
            onRelocationBonusChange={(value) => setEditingOfferField('relocation_bonus', value)}
            flexibleHoursPolicy={editingApp?.flexible_hours_policy || 'UNKNOWN'}
            onFlexibleHoursPolicyChange={(value) =>
              patchEditingApp({ flexible_hours_policy: value })
            }
            travelFrequency={editingApp?.travel_frequency || 'UNKNOWN'}
            onTravelFrequencyChange={(value) => patchEditingApp({ travel_frequency: value })}
            locationPlaceholder="e.g. San Jose, CA"
            // Step 1 only: it belongs with the offer's identity, not on every step.
            documentsSlot={
              <OfferDocumentsPanel
                applicationId={editingOffer.application}
                applicationLabel={
                  [editingApp?.company_name, editingApp?.role_title].filter(Boolean).join(' · ') ||
                  undefined
                }
                companyName={editingApp?.company_name || undefined}
              />
            }
          />
        </fieldset>
      </ModalShell>
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        title="Discard unsaved changes?"
        message="Your edits to this offer have not been saved."
        confirmText="Discard changes"
        cancelText="Keep editing"
        type="danger"
        onCancel={() => setIsDiscardConfirmOpen(false)}
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          onClose();
        }}
      />
    </>
  );
};

export default EditOfferModal;
