import type { OfferFormFieldsProps } from './OfferFormFields';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { BenefitsSection } from './sections';
import OfferFormSection from './components/OfferFormSection';

type Props = OfferFormFieldsProps & {
  foodOfficeDaysValue: number;
  isActiveSection: (id: string) => boolean;
  sectionIds: Record<string, string>;
  legacyFoodAnnual: number;
};

const OfferBenefitsPanel = ({
  foodOfficeDaysValue,
  isActiveSection,
  sectionIds,
  legacyFoodAnnual,
  benefitItems,
  benefitsValue,
  computeBenefitsTotal,
  dentalAnnualMax,
  dentalDeductible,
  dentalMonthlyPremium,
  dentalPlanName,
  dentalPremiumPaycheck,
  dependentCoverageTier,
  dependentDentalPremiumPaycheck,
  dependentHealthPremiumPaycheck,
  dependentVisionPremiumPaycheck,
  fortyOneKMatchPercent,
  fortyOneKMaxMatch,
  freeFoodMeals,
  freeFoodValuePerMeal,
  hasDependents,
  healthDeductible,
  healthFamilyDeductible,
  healthFamilyOopMax,
  healthOopMax,
  healthPcpCopay,
  healthPlanType,
  healthPremiumMonthly,
  healthPremiumPaycheck,
  healthSpecialistCopay,
  hsaEmployerContribution,
  onAddBenefitItem,
  onDentalAnnualMaxChange,
  onDentalDeductibleChange,
  onDentalMonthlyPremiumChange,
  onDentalPlanNameChange,
  onDentalPremiumPaycheckChange,
  onDependentCoverageTierChange,
  onDependentDentalPremiumPaycheckChange,
  onDependentHealthPremiumPaycheckChange,
  onDependentVisionPremiumPaycheckChange,
  onFortyOneKMatchPercentChange,
  onFortyOneKMaxMatchChange,
  onFreeFoodMealsChange,
  onHasDependentsChange,
  onHealthDeductibleChange,
  onHealthFamilyDeductibleChange,
  onHealthFamilyOopMaxChange,
  onHealthOopMaxChange,
  onHealthPcpCopayChange,
  onHealthPlanTypeChange,
  onHealthPremiumMonthlyChange,
  onHealthPremiumPaycheckChange,
  onHealthSpecialistCopayChange,
  onHsaEmployerContributionChange,
  onPaychecksPerYearChange,
  onRemoveBenefitItem,
  onUpdateBenefitItem,
  onVisionContactsAllowanceChange,
  onVisionFramesAllowanceChange,
  onVisionMonthlyPremiumChange,
  onVisionPlanNameChange,
  onVisionPremiumPaycheckChange,
  paychecksPerYear,
  taxRate,
  visionContactsAllowance,
  visionFramesAllowance,
  visionMonthlyPremium,
  visionPlanName,
  visionPremiumPaycheck,
}: Props) => (
  <div
    role="tabpanel"
    aria-labelledby={`${sectionIds.benefits}-tab`}
    hidden={!isActiveSection(sectionIds.benefits)}
  >
    <OfferFormSection
      id={sectionIds.benefits}
      title="Benefits"
      description="Add recurring benefits, health costs, and employer retirement contributions."
      icon={<SafetyCertificateOutlined />}
    >
      <BenefitsSection
        freeFoodMeals={freeFoodMeals}
        onFreeFoodMealsChange={onFreeFoodMealsChange}
        freeFoodValuePerMeal={freeFoodValuePerMeal}
        officeDays={foodOfficeDaysValue}
        legacyFreeFoodAnnual={legacyFoodAnnual}
        benefitItems={benefitItems}
        onAddBenefitItem={onAddBenefitItem}
        onUpdateBenefitItem={onUpdateBenefitItem}
        onRemoveBenefitItem={onRemoveBenefitItem}
        computeBenefitsTotal={computeBenefitsTotal}
        benefitsValue={benefitsValue}
        paychecksPerYear={paychecksPerYear}
        onPaychecksPerYearChange={onPaychecksPerYearChange}
        healthPremiumPaycheck={healthPremiumPaycheck}
        onHealthPremiumPaycheckChange={onHealthPremiumPaycheckChange}
        healthPremiumMonthly={healthPremiumMonthly}
        onHealthPremiumMonthlyChange={onHealthPremiumMonthlyChange}
        hsaEmployerContribution={hsaEmployerContribution}
        onHsaEmployerContributionChange={onHsaEmployerContributionChange}
        healthPlanType={healthPlanType}
        onHealthPlanTypeChange={onHealthPlanTypeChange}
        healthOopMax={healthOopMax}
        onHealthOopMaxChange={onHealthOopMaxChange}
        healthDeductible={healthDeductible}
        onHealthDeductibleChange={onHealthDeductibleChange}
        healthFamilyOopMax={healthFamilyOopMax}
        onHealthFamilyOopMaxChange={onHealthFamilyOopMaxChange}
        healthPcpCopay={healthPcpCopay}
        onHealthPcpCopayChange={onHealthPcpCopayChange}
        healthSpecialistCopay={healthSpecialistCopay}
        onHealthSpecialistCopayChange={onHealthSpecialistCopayChange}
        dentalPlanName={dentalPlanName}
        onDentalPlanNameChange={onDentalPlanNameChange}
        dentalPremiumPaycheck={dentalPremiumPaycheck}
        onDentalPremiumPaycheckChange={onDentalPremiumPaycheckChange}
        dentalMonthlyPremium={dentalMonthlyPremium}
        onDentalMonthlyPremiumChange={onDentalMonthlyPremiumChange}
        dentalAnnualMax={dentalAnnualMax}
        onDentalAnnualMaxChange={onDentalAnnualMaxChange}
        dentalDeductible={dentalDeductible}
        onDentalDeductibleChange={onDentalDeductibleChange}
        visionPlanName={visionPlanName}
        onVisionPlanNameChange={onVisionPlanNameChange}
        visionPremiumPaycheck={visionPremiumPaycheck}
        onVisionPremiumPaycheckChange={onVisionPremiumPaycheckChange}
        visionMonthlyPremium={visionMonthlyPremium}
        onVisionMonthlyPremiumChange={onVisionMonthlyPremiumChange}
        visionFramesAllowance={visionFramesAllowance}
        onVisionFramesAllowanceChange={onVisionFramesAllowanceChange}
        visionContactsAllowance={visionContactsAllowance}
        onVisionContactsAllowanceChange={onVisionContactsAllowanceChange}
        hasDependents={hasDependents}
        onHasDependentsChange={onHasDependentsChange}
        dependentCoverageTier={dependentCoverageTier}
        onDependentCoverageTierChange={onDependentCoverageTierChange}
        healthFamilyDeductible={healthFamilyDeductible}
        onHealthFamilyDeductibleChange={onHealthFamilyDeductibleChange}
        dependentHealthPremiumPaycheck={dependentHealthPremiumPaycheck}
        onDependentHealthPremiumPaycheckChange={onDependentHealthPremiumPaycheckChange}
        dependentDentalPremiumPaycheck={dependentDentalPremiumPaycheck}
        onDependentDentalPremiumPaycheckChange={onDependentDentalPremiumPaycheckChange}
        dependentVisionPremiumPaycheck={dependentVisionPremiumPaycheck}
        onDependentVisionPremiumPaycheckChange={onDependentVisionPremiumPaycheckChange}
        fortyOneKMatchPercent={fortyOneKMatchPercent}
        onFortyOneKMatchPercentChange={onFortyOneKMatchPercentChange}
        fortyOneKMaxMatch={fortyOneKMaxMatch}
        onFortyOneKMaxMatchChange={onFortyOneKMaxMatchChange}
        taxRate={taxRate}
      />
    </OfferFormSection>
  </div>
);

export default OfferBenefitsPanel;
