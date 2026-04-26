import React, { useState } from 'react';
import type { BenefitItem, DayOneGcStatus, VisaSponsorshipStatus } from './calculations';
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
  equityVestingPercent,
  onEquityVestingPercentChange,
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
  holidayDays,
  onHolidayDaysChange,
  companyPlaceholder = 'e.g. Google',
  rolePlaceholder = 'e.g. Software Engineer',
  locationPlaceholder = 'e.g. San Jose, CA, United States',
}) => {
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

  return (
    <div className="p-6 space-y-4">
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
      />

      <CompensationSection
        baseSalary={baseSalary}
        onBaseSalaryChange={onBaseSalaryChange}
        bonus={bonus}
        onBonusChange={onBonusChange}
        equity={equity}
        onEquityChange={onEquityChange}
        effectiveEquityVestingPercent={effectiveEquityVestingPercent}
        setEquityVestingPercentInternal={setEquityVestingPercentInternal}
        onEquityVestingPercentChange={onEquityVestingPercentChange}
        signOn={signOn}
        onSignOnChange={onSignOnChange}
      />

      <BenefitsSection
        benefitItems={benefitItems}
        onAddBenefitItem={onAddBenefitItem}
        onUpdateBenefitItem={onUpdateBenefitItem}
        onRemoveBenefitItem={onRemoveBenefitItem}
        computeBenefitsTotal={computeBenefitsTotal}
        benefitsValue={benefitsValue}
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
      />

      {decisionSignalHandlers && (
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
      )}

      <TimeOffSection
        ptoDays={ptoDays}
        onPtoDaysChange={onPtoDaysChange}
        isUnlimitedPto={isUnlimitedPto}
        onIsUnlimitedPtoChange={onIsUnlimitedPtoChange}
        holidayDays={holidayDays}
        onHolidayDaysChange={onHolidayDaysChange}
      />
    </div>
  );
};

export default OfferFormFields;
