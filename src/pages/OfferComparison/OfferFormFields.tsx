import {
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import React, { useId, useState } from 'react';
import type { BenefitItem, DayOneGcStatus, VisaSponsorshipStatus } from './calculations';
import type { EquityLiquidity } from './equityLiquidity';
import {
  BenefitsSection,
  CompensationSection,
  DecisionSignalsSection,
  IdentitySection,
  LocationTaxSection,
  TimeOffSection,
  WorkSetupSection,
  type ApplicationOption,
  type EditableTaxRates,
  type TaxRatePreview,
} from './sections';
import OfferFormSection from './components/OfferFormSection';

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
  onEquityTotalGrantChange?: (value: number) => void;
  equityVestingPercent?: number;
  onEquityVestingPercentChange?: (value: number) => void;
  equityVestingSchedule?: number[];
  onEquityVestingScheduleChange?: (value: number[]) => void;
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
  relocationBonus?: number;
  onRelocationBonusChange?: (value: number) => void;
  flexibleHoursPolicy?: string;
  onFlexibleHoursPolicyChange?: (value: string) => void;
  travelFrequency?: string;
  onTravelFrequencyChange?: (value: string) => void;
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
  officeLocation,
  onOfficeLocationChange,
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
  equityLiquidity,
  onEquityLiquidityChange,
  equityBuybackValue,
  onEquityBuybackValueChange,
  equityTotalGrant,
  onEquityTotalGrantChange,
  equityVestingPercent,
  onEquityVestingPercentChange,
  equityVestingSchedule,
  onEquityVestingScheduleChange,
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
  companyPlaceholder = 'e.g. Google',
  rolePlaceholder = 'e.g. Software Engineer',
  locationPlaceholder = 'e.g. San Jose, CA, United States',

  // New Fields
  healthPremiumMonthly = 0,
  onHealthPremiumMonthlyChange,
  hsaEmployerContribution = 0,
  onHsaEmployerContributionChange,
  healthPlanType = '',
  onHealthPlanTypeChange,
  healthOopMax = 0,
  onHealthOopMaxChange,
  fortyOneKMatchPercent = 0,
  onFortyOneKMatchPercentChange,
  fortyOneKMaxMatch = 0,
  onFortyOneKMaxMatchChange,
  relocationBonus = 0,
  onRelocationBonusChange,
  flexibleHoursPolicy = 'UNKNOWN',
  onFlexibleHoursPolicyChange,
  travelFrequency = 'UNKNOWN',
  onTravelFrequencyChange,
}) => {
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
    benefits: `${formId}-benefits`,
    timeOff: `${formId}-time-off`,
    signals: `${formId}-signals`,
  };
  const navigationItems = [
    { id: sectionIds.basics, label: 'Offer details', meta: 'Role and work setup' },
    { id: sectionIds.location, label: 'Location & tax', meta: 'Home, office, assumptions' },
    { id: sectionIds.compensation, label: 'Compensation', meta: 'Cash and equity' },
    { id: sectionIds.benefits, label: 'Benefits', meta: 'Health and retirement' },
    { id: sectionIds.timeOff, label: 'Time off', meta: 'PTO, sick leave, holidays' },
    ...(decisionSignalHandlers
      ? [{ id: sectionIds.signals, label: 'Decision signals', meta: 'Optional quality inputs' }]
      : []),
  ];
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const showSection = (index: number) => {
    setActiveSectionIndex(index);
    window.requestAnimationFrame(() => {
      document.getElementById(navigationItems[index]?.id)?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <div className="offer-form-workspace grid min-h-full min-w-0 w-full overflow-x-hidden bg-slate-50/80 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-slate-200 bg-white px-4 py-3 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
        <div className="lg:sticky lg:top-0">
          <p className="hidden px-3 text-xs font-semibold text-slate-950 lg:block">Offer record</p>
          <p className="mt-1 hidden px-3 text-xs leading-5 text-slate-500 lg:block">
            Enter only what you can verify. Blank optional signals are excluded from scoring.
          </p>
          <nav
            aria-label="Offer form sections"
            role="tablist"
            className="mt-0 flex gap-2 overflow-x-auto lg:mt-5 lg:flex-col lg:overflow-visible"
          >
            {navigationItems.map((item, index) => (
              <a
                key={item.id}
                id={`${item.id}-tab`}
                href={`#${item.id}`}
                role="tab"
                aria-selected={activeSectionIndex === index}
                aria-controls={item.id}
                onClick={(event) => {
                  event.preventDefault();
                  showSection(index);
                }}
                className={`group flex min-w-max items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:min-w-0 ${
                  activeSectionIndex === index
                    ? 'bg-blue-50 text-blue-800 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.8)]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white text-[11px] font-semibold ${
                    activeSectionIndex === index
                      ? 'border-blue-200 text-blue-700'
                      : 'border-slate-200 text-slate-500 group-hover:border-blue-200 group-hover:text-blue-700'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold group-hover:text-slate-950">
                    {item.label}
                  </span>
                  <span className="mt-0.5 hidden truncate text-[11px] text-slate-500 lg:block">
                    {item.meta}
                  </span>
                </span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

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
          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.basics}-tab`}
            hidden={activeSectionIndex !== 0}
          >
            <OfferFormSection
              id={sectionIds.basics}
              title="Offer details"
              description="Identify the role and capture the working conditions that affect your day-to-day experience."
              icon={<UserOutlined />}
            >
              <IdentitySection
                showLinkApplication={showLinkApplication}
                linkedApplicationId={linkedApplicationId}
                onLinkedApplicationChange={onLinkedApplicationChange}
                applicationOptions={applicationOptions}
                shouldShowCompanyRole={shouldShowCompanyRole}
                companyName={companyName}
                onCompanyNameChange={onCompanyNameChange}
                roleTitle={roleTitle}
                onRoleTitleChange={onRoleTitleChange}
                companyPlaceholder={companyPlaceholder}
                rolePlaceholder={rolePlaceholder}
              />

              <WorkSetupSection
                workMode={workMode}
                onWorkModeChange={onWorkModeChange}
                showRtoDays={showRtoDays}
                rtoDaysPerWeek={rtoDaysPerWeek}
                onRtoDaysPerWeekChange={onRtoDaysPerWeekChange}
                showCommuteAndPerks={showCommuteAndPerks}
                commuteCostValue={commuteCostValue}
                commuteCostFrequency={commuteCostFrequency}
                onCommuteCostValueChange={onCommuteCostValueChange}
                onCommuteCostFrequencyChange={onCommuteCostFrequencyChange}
                freeFoodPerkValue={freeFoodPerkValue}
                freeFoodPerkFrequency={freeFoodPerkFrequency}
                onFreeFoodPerkValueChange={onFreeFoodPerkValueChange}
                onFreeFoodPerkFrequencyChange={onFreeFoodPerkFrequencyChange}
                flexibleHoursPolicy={flexibleHoursPolicy}
                onFlexibleHoursPolicyChange={onFlexibleHoursPolicyChange}
                travelFrequency={travelFrequency}
                onTravelFrequencyChange={onTravelFrequencyChange}
              />
            </OfferFormSection>
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.location}-tab`}
            hidden={activeSectionIndex !== 1}
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

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.compensation}-tab`}
            hidden={activeSectionIndex !== 2}
          >
            <OfferFormSection
              id={sectionIds.compensation}
              title="Compensation"
              description="Separate guaranteed cash from equity you can actually realize. The score uses these values differently."
              icon={<DollarOutlined />}
            >
              <CompensationSection
                baseSalary={baseSalary}
                onBaseSalaryChange={onBaseSalaryChange}
                bonus={bonus}
                onBonusChange={onBonusChange}
                equity={equity}
                onEquityChange={onEquityChange}
                equityLiquidity={equityLiquidity}
                onEquityLiquidityChange={onEquityLiquidityChange}
                equityBuybackValue={equityBuybackValue}
                onEquityBuybackValueChange={onEquityBuybackValueChange}
                equityTotalGrant={equityTotalGrant}
                onEquityTotalGrantChange={onEquityTotalGrantChange}
                effectiveEquityVestingPercent={effectiveEquityVestingPercent}
                setEquityVestingPercentInternal={setEquityVestingPercentInternal}
                onEquityVestingPercentChange={onEquityVestingPercentChange}
                equityVestingSchedule={equityVestingSchedule}
                onEquityVestingScheduleChange={onEquityVestingScheduleChange}
                defaultEquityMode={defaultEquityMode}
                signOn={signOn}
                onSignOnChange={onSignOnChange}
                relocationBonus={relocationBonus}
                onRelocationBonusChange={onRelocationBonusChange}
              />
            </OfferFormSection>
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.benefits}-tab`}
            hidden={activeSectionIndex !== 3}
          >
            <OfferFormSection
              id={sectionIds.benefits}
              title="Benefits"
              description="Add recurring benefits, health costs, and employer retirement contributions."
              icon={<SafetyCertificateOutlined />}
            >
              <BenefitsSection
                benefitItems={benefitItems}
                onAddBenefitItem={onAddBenefitItem}
                onUpdateBenefitItem={onUpdateBenefitItem}
                onRemoveBenefitItem={onRemoveBenefitItem}
                computeBenefitsTotal={computeBenefitsTotal}
                benefitsValue={benefitsValue}
                healthPremiumMonthly={healthPremiumMonthly}
                onHealthPremiumMonthlyChange={onHealthPremiumMonthlyChange}
                hsaEmployerContribution={hsaEmployerContribution}
                onHsaEmployerContributionChange={onHsaEmployerContributionChange}
                healthPlanType={healthPlanType}
                onHealthPlanTypeChange={onHealthPlanTypeChange}
                healthOopMax={healthOopMax}
                onHealthOopMaxChange={onHealthOopMaxChange}
                fortyOneKMatchPercent={fortyOneKMatchPercent}
                onFortyOneKMatchPercentChange={onFortyOneKMatchPercentChange}
                fortyOneKMaxMatch={fortyOneKMaxMatch}
                onFortyOneKMaxMatchChange={onFortyOneKMaxMatchChange}
              />
            </OfferFormSection>
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`${sectionIds.timeOff}-tab`}
            hidden={activeSectionIndex !== 4}
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
              hidden={activeSectionIndex !== 5}
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
