import React, { useEffect, useState } from 'react';
import type { BenefitItem } from './calculations';
import {
  BenefitsSection,
  CompensationSection,
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

  ptoDays?: number;
  onPtoDaysChange?: (value: number) => void;
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
  equityTotalGrant,
  onEquityTotalGrantChange,
  equityVestingPercent,
  onEquityVestingPercentChange,
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
  enableCompModeToggles = false,
  ptoDays,
  onPtoDaysChange,
  holidayDays,
  onHolidayDaysChange,
  companyPlaceholder = 'e.g. Google',
  rolePlaceholder = 'e.g. Senior SWE',
  locationPlaceholder = 'e.g. San Jose, CA, United States',
}) => {
  const shouldShowCompanyRole = !(hideCompanyRoleWhenLinked && linkedApplicationId);
  const showRtoDays = workMode === 'HYBRID' || workMode === 'ONSITE';

  const [bonusMode, setBonusMode] = useState<'$' | '%'>('$');
  const [bonusPercentInput, setBonusPercentInput] = useState<string>('');
  const [equityMode, setEquityMode] = useState<'annual' | 'total'>(
    defaultEquityMode || (Number(equityTotalGrant || 0) > 0 ? 'total' : 'annual')
  );
  const [equityTotalGrantInput, setEquityTotalGrantInput] = useState<string>(
    Number(equityTotalGrant || 0) > 0 ? String(Number(equityTotalGrant || 0)) : ''
  );
  const [equityVestingPercentInternal, setEquityVestingPercentInternal] = useState<number>(
    Number.isFinite(Number(equityVestingPercent)) ? Number(equityVestingPercent) : 25
  );
  const effectiveEquityVestingPercent = equityVestingPercentInternal;

  useEffect(() => {
    setEquityVestingPercentInternal(
      Number.isFinite(Number(equityVestingPercent)) ? Number(equityVestingPercent) : 25
    );
    if (Number(equityTotalGrant || 0) > 0) {
      setEquityTotalGrantInput(String(Number(equityTotalGrant || 0)));
    } else {
      setEquityTotalGrantInput('');
    }
  }, [equityTotalGrant, equityVestingPercent]);

  useEffect(() => {
    if (defaultEquityMode) {
      setEquityMode(defaultEquityMode);
      return;
    }
    setEquityMode(Number(equityTotalGrant || 0) > 0 ? 'total' : 'annual');
  }, [defaultEquityMode, equityTotalGrant]);

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
        bonusMode={bonusMode}
        setBonusMode={setBonusMode}
        bonusPercentInput={bonusPercentInput}
        setBonusPercentInput={setBonusPercentInput}
        equity={equity}
        onEquityChange={onEquityChange}
        equityMode={equityMode}
        setEquityMode={setEquityMode}
        equityTotalGrantInput={equityTotalGrantInput}
        setEquityTotalGrantInput={setEquityTotalGrantInput}
        onEquityTotalGrantChange={onEquityTotalGrantChange}
        effectiveEquityVestingPercent={effectiveEquityVestingPercent}
        setEquityVestingPercentInternal={setEquityVestingPercentInternal}
        onEquityVestingPercentChange={onEquityVestingPercentChange}
        signOn={signOn}
        onSignOnChange={onSignOnChange}
        enableCompModeToggles={enableCompModeToggles}
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

      <TimeOffSection
        ptoDays={ptoDays}
        onPtoDaysChange={onPtoDaysChange}
        holidayDays={holidayDays}
        onHolidayDaysChange={onHolidayDaysChange}
      />
    </div>
  );
};

export default OfferFormFields;
