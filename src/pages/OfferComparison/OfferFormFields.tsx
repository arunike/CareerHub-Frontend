import {
  officeDaysPerYear,
  seedFromLegacyCost,
  type CommuteOption,
  type DrivingDefaults,
} from './commute';
import type { MealEntry } from './freeFood';
import type { ReactNode } from 'react';
import {
  BankOutlined,
  CalendarOutlined,
  CarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import React, { useId, useState } from 'react';
import type { BenefitItem, DayOneGcStatus, VisaSponsorshipStatus } from './calculations';
import type { EquityLiquidity } from './equityLiquidity';
import {
  DecisionSignalsSection,
  LocationTaxSection,
  TimeOffSection,
  WorkSetupSection,
  type EditableTaxRates,
  type TaxRatePreview,
} from './sections';
import OfferFormSection from './components/OfferFormSection';
import OfferFormSidebar from './OfferFormSidebar';
import OfferBenefitsPanel from './OfferBenefitsPanel';
import OfferCompensationPanel from './OfferCompensationPanel';
import OfferBasicsPanel from './OfferBasicsPanel';

export interface OfferFormFieldsProps {
  showLinkApplication?: boolean;
  linkedApplicationId?: number | null;
  onLinkedApplicationChange?: (value: number | null) => void;
  hideCompanyRoleWhenLinked?: boolean;

  companyName: string;
  onCompanyNameChange: (value: string) => void;
  roleTitle: string;
  onRoleTitleChange: (value: string) => void;
  level?: string;
  onLevelChange?: (value: string) => void;
  invalidCompanyName?: boolean;
  invalidRoleTitle?: boolean;
  deadline?: string | null;
  onDeadlineChange?: (value: string | null) => void;
  location: string;
  onLocationChange: (value: string) => void;
  officeLocation?: string;
  onOfficeLocationChange?: (value: string) => void;
  locationOptions?: string[];
  taxRatePreview?: TaxRatePreview;
  editableTaxRates?: EditableTaxRates;
  onEditableTaxRatesChange?: (next: EditableTaxRates) => void;
  editableMonthlyRent?: number;
  onEditableMonthlyRentChange?: (value: number) => void;

  baseSalary: number;
  onBaseSalaryChange: (value: number) => void;
  bonus: number;
  onBonusChange: (value: number) => void;
  equity: number;
  onEquityChange: (value: number) => void;
  equityLiquidity: EquityLiquidity;
  onEquityLiquidityChange: (value: EquityLiquidity) => void;
  equityBuybackValue: number;
  onEquityBuybackValueChange: (value: number) => void;
  equityTotalGrant?: number;
  annualRefreshValue?: number;
  onAnnualRefreshValueChange?: (value: number) => void;
  refreshStartsYear?: number;
  onRefreshStartsYearChange?: (value: number) => void;
  onEquityTotalGrantChange?: (value: number) => void;
  equityVestingPercent?: number;
  onEquityVestingPercentChange?: (value: number) => void;
  equityVestingSchedule?: number[];
  onEquityVestingScheduleChange?: (value: number[]) => void;
  defaultEquityMode?: 'annual' | 'total';
  signOn: number;
  onSignOnChange: (value: number) => void;
  // Rendered inside step 1 only, so it does not repeat on every step.
  documentsSlot?: ReactNode;
  signOnSchedule?: number[];
  onSignOnScheduleChange?: (value: number[]) => void;

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
  commuteOptions?: CommuteOption[];
  onCommuteOptionsChange?: (value: CommuteOption[]) => void;
  freeFoodMeals?: unknown;
  onFreeFoodMealsChange?: (meals: MealEntry[]) => void;
  freeFoodValuePerMeal?: number | string;
  freeFoodPerkValue: number;
  freeFoodPerkFrequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
  // Read-only: kept as a fallback for offers saved before per-meal valuing.
  showCommuteAndPerks?: boolean;
  enableCompModeToggles?: boolean;

  showDecisionSignals?: boolean;
  visaSponsorship?: VisaSponsorshipStatus;
  onVisaSponsorshipChange?: (value: VisaSponsorshipStatus) => void;
  dayOneGc?: DayOneGcStatus;
  onDayOneGcChange?: (value: DayOneGcStatus) => void;
  growthScore?: number | null;
  onGrowthScoreChange?: (value: number | null) => void;
  workLifeScore?: number | null;
  onWorkLifeScoreChange?: (value: number | null) => void;
  brandScore?: number | null;
  onBrandScoreChange?: (value: number | null) => void;
  teamScore?: number | null;
  onTeamScoreChange?: (value: number | null) => void;

  ptoDays?: number;
  onPtoDaysChange?: (value: number) => void;
  isUnlimitedPto?: boolean;
  onIsUnlimitedPtoChange?: (value: boolean) => void;
  sickLeaveDays?: number;
  onSickLeaveDaysChange?: (value: number) => void;
  sickLeaveIncludedInUnlimitedPto?: boolean;
  onSickLeaveIncludedInUnlimitedPtoChange?: (value: boolean) => void;
  holidayDays?: number;
  onHolidayDaysChange?: (value: number) => void;

  companyPlaceholder?: string;
  rolePlaceholder?: string;
  locationPlaceholder?: string;

  // New Fields
  paychecksPerYear?: number;
  onPaychecksPerYearChange?: (value: number) => void;
  healthPremiumPaycheck?: number | string;
  onHealthPremiumPaycheckChange?: (value: number | string) => void;
  healthPremiumMonthly?: number | string;
  onHealthPremiumMonthlyChange?: (value: number | string) => void;
  hsaEmployerContribution?: number | string;
  onHsaEmployerContributionChange?: (value: number | string) => void;
  healthPlanType?: string;
  onHealthPlanTypeChange?: (value: string) => void;
  healthOopMax?: number | string;
  onHealthOopMaxChange?: (value: number | string) => void;
  healthDeductible?: number | string;
  onHealthDeductibleChange?: (value: number | string) => void;
  healthFamilyOopMax?: number | string;
  onHealthFamilyOopMaxChange?: (value: number | string) => void;
  healthPcpCopay?: number | string;
  onHealthPcpCopayChange?: (value: number | string) => void;
  healthSpecialistCopay?: number | string;
  onHealthSpecialistCopayChange?: (value: number | string) => void;
  dentalPlanName?: string;
  onDentalPlanNameChange?: (value: string) => void;
  dentalPremiumPaycheck?: number | string;
  onDentalPremiumPaycheckChange?: (value: number | string) => void;
  dentalMonthlyPremium?: number | string;
  onDentalMonthlyPremiumChange?: (value: number | string) => void;
  dentalAnnualMax?: number | string;
  onDentalAnnualMaxChange?: (value: number | string) => void;
  dentalDeductible?: number | string;
  onDentalDeductibleChange?: (value: number | string) => void;
  visionPlanName?: string;
  onVisionPlanNameChange?: (value: string) => void;
  visionPremiumPaycheck?: number | string;
  onVisionPremiumPaycheckChange?: (value: number | string) => void;
  visionMonthlyPremium?: number | string;
  onVisionMonthlyPremiumChange?: (value: number | string) => void;
  visionFramesAllowance?: number | string;
  onVisionFramesAllowanceChange?: (value: number | string) => void;
  visionContactsAllowance?: number | string;
  onVisionContactsAllowanceChange?: (value: number | string) => void;
  // Dependent Coverage
  hasDependents?: boolean;
  onHasDependentsChange?: (value: boolean) => void;
  dependentCoverageTier?: string;
  onDependentCoverageTierChange?: (value: string) => void;
  healthFamilyDeductible?: number | string;
  onHealthFamilyDeductibleChange?: (value: number | string) => void;
  dependentHealthPremiumPaycheck?: number | string;
  onDependentHealthPremiumPaycheckChange?: (value: number | string) => void;
  dependentDentalPremiumPaycheck?: number | string;
  onDependentDentalPremiumPaycheckChange?: (value: number | string) => void;
  dependentVisionPremiumPaycheck?: number | string;
  onDependentVisionPremiumPaycheckChange?: (value: number | string) => void;
  fortyOneKMatchPercent?: number | string;
  onFortyOneKMatchPercentChange?: (value: number | string) => void;
  fortyOneKMaxMatch?: number | string;
  onFortyOneKMaxMatchChange?: (value: number | string) => void;
  relocationBonus?: number | string;
  onRelocationBonusChange?: (value: number | string) => void;
  flexibleHoursPolicy?: string;
  onFlexibleHoursPolicyChange?: (value: string) => void;
  travelFrequency?: string;
  onTravelFrequencyChange?: (value: string) => void;
  // Tax rate for after-tax custom benefit display
  taxRate?: number;
  // Shared MPG and gas price from user settings; each offer only stores overrides.
  drivingDefaults?: Partial<DrivingDefaults> | null;
}

const OfferFormFields: React.FC<OfferFormFieldsProps> = (props) => {
  const {
    linkedApplicationId = null,
    hideCompanyRoleWhenLinked = false,
    location,
    onLocationChange,
    officeLocation,
    onOfficeLocationChange,
    locationOptions = [],
    taxRatePreview,
    editableTaxRates,
    onEditableTaxRatesChange,
    editableMonthlyRent,
    onEditableMonthlyRentChange,
    equityVestingPercent,
    workMode,
    onWorkModeChange,
    rtoDaysPerWeek,
    onRtoDaysPerWeekChange,
    commuteCostValue,
    commuteCostFrequency,
    commuteOptions,
    onCommuteOptionsChange,
    freeFoodPerkValue,
    freeFoodPerkFrequency,
    showCommuteAndPerks = true,
    showDecisionSignals = false,
    visaSponsorship = '',
    onVisaSponsorshipChange,
    dayOneGc = '',
    onDayOneGcChange,
    growthScore,
    onGrowthScoreChange,
    workLifeScore,
    onWorkLifeScoreChange,
    brandScore,
    onBrandScoreChange,
    teamScore,
    onTeamScoreChange,
    ptoDays,
    onPtoDaysChange,
    isUnlimitedPto,
    onIsUnlimitedPtoChange,
    sickLeaveDays,
    onSickLeaveDaysChange,
    sickLeaveIncludedInUnlimitedPto,
    onSickLeaveIncludedInUnlimitedPtoChange,
    holidayDays,
    onHolidayDaysChange,
    locationPlaceholder = 'e.g. San Jose, CA, United States',
    flexibleHoursPolicy = 'UNKNOWN',
    onFlexibleHoursPolicyChange,
    travelFrequency = 'UNKNOWN',
    onTravelFrequencyChange,
    drivingDefaults,
  } = props;
  const formId = useId().replace(/:/g, '');
  const shouldShowCompanyRole = !(hideCompanyRoleWhenLinked && linkedApplicationId);
  const showRtoDays = workMode === 'HYBRID' || workMode === 'ONSITE';

  const decisionSignalHandlers =
    showDecisionSignals &&
    onVisaSponsorshipChange &&
    onDayOneGcChange &&
    onGrowthScoreChange &&
    onWorkLifeScoreChange &&
    onBrandScoreChange &&
    onTeamScoreChange
      ? {
          onVisaSponsorshipChange,
          onDayOneGcChange,
          onGrowthScoreChange,
          onWorkLifeScoreChange,
          onBrandScoreChange,
          onTeamScoreChange,
        }
      : null;

  const [equityVestingPercentInternal, setEquityVestingPercentInternal] = useState<number>(
    Number.isFinite(Number(equityVestingPercent)) ? Number(equityVestingPercent) : 25
  );
  const effectiveEquityVestingPercent = equityVestingPercentInternal;

  const sectionIds = {
    basics: `${formId}-basics`,
    location: `${formId}-location`,
    compensation: `${formId}-compensation`,
    workSetup: `${formId}-work-setup`,
    benefits: `${formId}-benefits`,
    timeOff: `${formId}-time-off`,
    signals: `${formId}-signals`,
  };
  const navigationItems = [
    { id: sectionIds.basics, label: 'Offer details', meta: 'Role, level, deadline' },
    { id: sectionIds.workSetup, label: 'Work & commute', meta: 'Mode, RTO, travel, commute' },
    { id: sectionIds.location, label: 'Location & tax', meta: 'Home, office, assumptions' },
    { id: sectionIds.compensation, label: 'Compensation', meta: 'Cash and equity' },
    { id: sectionIds.benefits, label: 'Benefits', meta: 'Health and retirement' },
    { id: sectionIds.timeOff, label: 'Time off', meta: 'PTO, sick leave, holidays' },
    ...(decisionSignalHandlers
      ? [{ id: sectionIds.signals, label: 'Decision signals', meta: 'Optional quality inputs' }]
      : []),
  ];
  // Same office-day count as the commute, so the two cannot disagree.
  const foodOfficeDaysValue = officeDaysPerYear({
    workMode,
    rtoDaysPerWeek,
    ptoDays: Number(ptoDays) || 0,
    holidayDays: Number(holidayDays) || 0,
  });
  const legacyFoodAnnual =
    freeFoodPerkFrequency === 'DAILY'
      ? (Number(freeFoodPerkValue) || 0) * 260
      : freeFoodPerkFrequency === 'MONTHLY'
        ? (Number(freeFoodPerkValue) || 0) * 12
        : Number(freeFoodPerkValue) || 0;

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  // Resolved from the id: hard-coded indices showed the wrong panel when a section was added.
  const isActiveSection = (id: string) => navigationItems[activeSectionIndex]?.id === id;

  const showSection = (index: number) => {
    setActiveSectionIndex(index);
    window.requestAnimationFrame(() => {
      document.getElementById(navigationItems[index]?.id)?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <div className="offer-form-workspace grid min-h-full min-w-0 w-full overflow-x-hidden bg-slate-50/80 lg:grid-cols-[220px_minmax(0,1fr)]">
      <OfferFormSidebar
        activeSectionIndex={activeSectionIndex}
        navigationItems={navigationItems}
        showSection={showSection}
      />

      <div className="min-w-0 p-3 sm:p-5 lg:p-6">
        <div className="mx-auto mb-3 flex w-full max-w-3xl items-center justify-end gap-2">
          <a
            href={
              activeSectionIndex > 0 ? `#${navigationItems[activeSectionIndex - 1].id}` : undefined
            }
            aria-disabled={activeSectionIndex === 0}
            tabIndex={activeSectionIndex === 0 ? -1 : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (activeSectionIndex > 0) showSection(activeSectionIndex - 1);
            }}
            className={`inline-flex min-h-10 min-w-20 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeSectionIndex === 0
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            Back
          </a>
          <a
            href={
              activeSectionIndex < navigationItems.length - 1
                ? `#${navigationItems[activeSectionIndex + 1].id}`
                : undefined
            }
            aria-disabled={activeSectionIndex === navigationItems.length - 1}
            tabIndex={activeSectionIndex === navigationItems.length - 1 ? -1 : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (activeSectionIndex < navigationItems.length - 1) {
                showSection(activeSectionIndex + 1);
              }
            }}
            className={`inline-flex min-h-10 min-w-20 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              activeSectionIndex === navigationItems.length - 1
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Next
          </a>
        </div>
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_-38px_rgba(15,23,42,0.45)]">
          <OfferBasicsPanel
            {...props}
            isActiveSection={isActiveSection}
            sectionIds={sectionIds}
            shouldShowCompanyRole={shouldShowCompanyRole}
          />

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.workSetup}-tab`}
            hidden={!isActiveSection(sectionIds.workSetup)}
          >
            <OfferFormSection
              id={sectionIds.workSetup}
              title="Work & commute"
              description="How often you are in the office, and what getting there costs in time and money. Both feed the Location score and the commute comparison."
              icon={<CarOutlined />}
            >
              <WorkSetupSection
                workMode={workMode}
                onWorkModeChange={onWorkModeChange}
                showRtoDays={showRtoDays}
                rtoDaysPerWeek={rtoDaysPerWeek}
                onRtoDaysPerWeekChange={onRtoDaysPerWeekChange}
                showCommuteAndPerks={showCommuteAndPerks}
                commuteOptions={
                  commuteOptions?.length
                    ? commuteOptions
                    : seedFromLegacyCost(commuteCostValue, commuteCostFrequency)
                }
                onCommuteOptionsChange={onCommuteOptionsChange}
                ptoDays={ptoDays}
                holidayDays={holidayDays}
                flexibleHoursPolicy={flexibleHoursPolicy}
                onFlexibleHoursPolicyChange={onFlexibleHoursPolicyChange}
                travelFrequency={travelFrequency}
                onTravelFrequencyChange={onTravelFrequencyChange}
                drivingDefaults={drivingDefaults}
              />
            </OfferFormSection>
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.location}-tab`}
            hidden={!isActiveSection(sectionIds.location)}
          >
            <OfferFormSection
              id={sectionIds.location}
              title="Location and tax assumptions"
              description="These inputs drive tax, cost-of-living, rent, and commute comparisons. Keep them specific to this offer."
              icon={<EnvironmentOutlined />}
            >
              <LocationTaxSection
                location={location}
                onLocationChange={onLocationChange}
                officeLocation={officeLocation}
                onOfficeLocationChange={onOfficeLocationChange}
                locationOptions={locationOptions}
                locationPlaceholder={locationPlaceholder}
                taxRatePreview={taxRatePreview}
                editableTaxRates={editableTaxRates}
                onEditableTaxRatesChange={onEditableTaxRatesChange}
                editableMonthlyRent={editableMonthlyRent}
                onEditableMonthlyRentChange={onEditableMonthlyRentChange}
                workMode={workMode}
              />
            </OfferFormSection>
          </div>

          <OfferCompensationPanel
            {...props}
            effectiveEquityVestingPercent={effectiveEquityVestingPercent}
            isActiveSection={isActiveSection}
            sectionIds={sectionIds}
            setEquityVestingPercentInternal={setEquityVestingPercentInternal}
          />

          <OfferBenefitsPanel
            {...props}
            legacyFoodAnnual={legacyFoodAnnual}
            foodOfficeDaysValue={foodOfficeDaysValue}
            isActiveSection={isActiveSection}
            sectionIds={sectionIds}
          />

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.timeOff}-tab`}
            hidden={!isActiveSection(sectionIds.timeOff)}
          >
            <OfferFormSection
              id={sectionIds.timeOff}
              title="Time off"
              description="Record the policy as written. Unlimited PTO includes sick leave unless the company lists a separate sick leave policy."
              icon={<CalendarOutlined />}
            >
              <TimeOffSection
                ptoDays={ptoDays}
                onPtoDaysChange={onPtoDaysChange}
                isUnlimitedPto={isUnlimitedPto}
                onIsUnlimitedPtoChange={onIsUnlimitedPtoChange}
                sickLeaveDays={sickLeaveDays}
                onSickLeaveDaysChange={onSickLeaveDaysChange}
                sickLeaveIncludedInUnlimitedPto={sickLeaveIncludedInUnlimitedPto}
                onSickLeaveIncludedInUnlimitedPtoChange={onSickLeaveIncludedInUnlimitedPtoChange}
                holidayDays={holidayDays}
                onHolidayDaysChange={onHolidayDaysChange}
              />
            </OfferFormSection>
          </div>

          {decisionSignalHandlers && (
            <div
              role="tabpanel"
              aria-labelledby={`${sectionIds.signals}-tab`}
              hidden={!isActiveSection(sectionIds.signals)}
            >
              <OfferFormSection
                id={sectionIds.signals}
                title="Decision signals"
                description="Optional evidence-based inputs for factors that compensation alone cannot represent."
                icon={<BankOutlined />}
              >
                <DecisionSignalsSection
                  visaSponsorship={visaSponsorship}
                  onVisaSponsorshipChange={decisionSignalHandlers.onVisaSponsorshipChange}
                  dayOneGc={dayOneGc}
                  onDayOneGcChange={decisionSignalHandlers.onDayOneGcChange}
                  growthScore={growthScore}
                  onGrowthScoreChange={decisionSignalHandlers.onGrowthScoreChange}
                  workLifeScore={workLifeScore}
                  onWorkLifeScoreChange={decisionSignalHandlers.onWorkLifeScoreChange}
                  brandScore={brandScore}
                  onBrandScoreChange={decisionSignalHandlers.onBrandScoreChange}
                  teamScore={teamScore}
                  onTeamScoreChange={decisionSignalHandlers.onTeamScoreChange}
                />
              </OfferFormSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferFormFields;
