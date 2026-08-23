import type { OfferLike, SimulatedOffer } from './offerTypes';
export function computeTotalAnnualHealthPremiums(
  offer: Partial<SimulatedOffer | OfferLike>
): number {
  const paychecks = Number(offer.paychecks_per_year) || 26;

  let medicalPaycheck = 0;
  if (
    offer.health_premium_paycheck !== undefined &&
    offer.health_premium_paycheck !== null &&
    Number(offer.health_premium_paycheck) > 0
  ) {
    medicalPaycheck = Number(offer.health_premium_paycheck);
  } else {
    medicalPaycheck = ((Number(offer.health_premium_monthly) || 0) * 12) / paychecks;
  }

  let dentalPaycheck = 0;
  if (
    offer.dental_premium_paycheck !== undefined &&
    offer.dental_premium_paycheck !== null &&
    Number(offer.dental_premium_paycheck) > 0
  ) {
    dentalPaycheck = Number(offer.dental_premium_paycheck);
  } else {
    dentalPaycheck = ((Number(offer.dental_monthly_premium) || 0) * 12) / paychecks;
  }

  let visionPaycheck = 0;
  if (
    offer.vision_premium_paycheck !== undefined &&
    offer.vision_premium_paycheck !== null &&
    Number(offer.vision_premium_paycheck) > 0
  ) {
    visionPaycheck = Number(offer.vision_premium_paycheck);
  } else {
    visionPaycheck = ((Number(offer.vision_monthly_premium) || 0) * 12) / paychecks;
  }

  if (offer.has_dependents) {
    medicalPaycheck += Number(offer.dependent_health_premium_paycheck) || 0;
    dentalPaycheck += Number(offer.dependent_dental_premium_paycheck) || 0;
    visionPaycheck += Number(offer.dependent_vision_premium_paycheck) || 0;
  }

  const medicalAnnual = medicalPaycheck * paychecks;
  const dentalAnnual = dentalPaycheck * paychecks;
  const visionAnnual = visionPaycheck * paychecks;

  return medicalAnnual + dentalAnnual + visionAnnual;
}

export function computeNetAnnualHealthCost(offer: Partial<SimulatedOffer | OfferLike>): number {
  const totalPremiums = computeTotalAnnualHealthPremiums(offer);
  const hsa = Number(offer.hsa_employer_contribution) || 0;
  return Math.max(0, totalPremiums - hsa);
}

export function computeMedicalWorstCaseRisk(offer: Partial<SimulatedOffer | OfferLike>): number {
  const totalPremiums = computeTotalAnnualHealthPremiums(offer);
  const oopMax = offer.has_dependents
    ? Number(offer.health_family_oop_max) || Number(offer.health_oop_max) || 0
    : Number(offer.health_oop_max) || 0;
  const hsa = Number(offer.hsa_employer_contribution) || 0;
  return Math.max(0, totalPremiums + oopMax - hsa);
}

export interface DetailedMedicalBreakdown {
  paychecks: number;
  totalMedPaycheck: number;
  annualMedPrem: number;
  totalDenPaycheck: number;
  annualDenPrem: number;
  totalVisPaycheck: number;
  annualVisPrem: number;
  totalAnnualPremiums: number;
  indDeductible: number;
  famDeductible: number;
  indOopMax: number;
  famOopMax: number;
  effectiveOopMax: number;
  hsaMatch: number;
  pcpCopay: number;
  specCopay: number;
  worstCaseRisk: number;
  hasDependents: boolean;
  dependentTier: string;
  planType: string;
  dentalPlanName: string;
  dentalAnnualMax: number;
  dentalDeductible: number;
  visionPlanName: string;
  visionFramesAllowance: number;
  visionContactsAllowance: number;
}

export function computeDetailedMedicalBreakdown(
  offer: Partial<SimulatedOffer | OfferLike>
): DetailedMedicalBreakdown {
  const paychecks = Number(offer.paychecks_per_year) || 26;

  let medPaycheck = 0;
  if (
    offer.health_premium_paycheck !== undefined &&
    offer.health_premium_paycheck !== null &&
    Number(offer.health_premium_paycheck) > 0
  ) {
    medPaycheck = Number(offer.health_premium_paycheck);
  } else {
    medPaycheck = ((Number(offer.health_premium_monthly) || 0) * 12) / paychecks;
  }

  let denPaycheck = 0;
  if (
    offer.dental_premium_paycheck !== undefined &&
    offer.dental_premium_paycheck !== null &&
    Number(offer.dental_premium_paycheck) > 0
  ) {
    denPaycheck = Number(offer.dental_premium_paycheck);
  } else {
    denPaycheck = ((Number(offer.dental_monthly_premium) || 0) * 12) / paychecks;
  }

  let visPaycheck = 0;
  if (
    offer.vision_premium_paycheck !== undefined &&
    offer.vision_premium_paycheck !== null &&
    Number(offer.vision_premium_paycheck) > 0
  ) {
    visPaycheck = Number(offer.vision_premium_paycheck);
  } else {
    visPaycheck = ((Number(offer.vision_monthly_premium) || 0) * 12) / paychecks;
  }

  if (offer.has_dependents) {
    medPaycheck += Number(offer.dependent_health_premium_paycheck) || 0;
    denPaycheck += Number(offer.dependent_dental_premium_paycheck) || 0;
    visPaycheck += Number(offer.dependent_vision_premium_paycheck) || 0;
  }

  const annualMedPrem = Math.round(medPaycheck * paychecks);
  const annualDenPrem = Math.round(denPaycheck * paychecks);
  const annualVisPrem = Math.round(visPaycheck * paychecks);
  const totalAnnualPremiums = annualMedPrem + annualDenPrem + annualVisPrem;

  const indDeductible = Number(offer.health_deductible) || 0;
  const famDeductible = Number(offer.health_family_deductible) || 0;
  const indOopMax = Number(offer.health_oop_max) || 0;
  const famOopMax = Number(offer.health_family_oop_max) || 0;
  const effectiveOopMax = offer.has_dependents ? famOopMax || indOopMax : indOopMax;

  const hsaMatch = Number(offer.hsa_employer_contribution) || 0;
  const pcpCopay = Number(offer.health_pcp_copay) || 0;
  const specCopay = Number(offer.health_specialist_copay) || 0;

  const worstCaseRisk = Math.max(0, totalAnnualPremiums + effectiveOopMax - hsaMatch);

  return {
    paychecks,
    totalMedPaycheck: Math.round(medPaycheck * 100) / 100,
    annualMedPrem,
    totalDenPaycheck: Math.round(denPaycheck * 100) / 100,
    annualDenPrem,
    totalVisPaycheck: Math.round(visPaycheck * 100) / 100,
    annualVisPrem,
    totalAnnualPremiums,
    indDeductible,
    famDeductible,
    indOopMax,
    famOopMax,
    effectiveOopMax,
    hsaMatch,
    pcpCopay,
    specCopay,
    worstCaseRisk,
    hasDependents: !!offer.has_dependents,
    dependentTier: offer.dependent_coverage_tier || 'EMPLOYEE_SPOUSE',
    planType: offer.health_plan_type || 'Standard Plan',
    dentalPlanName: offer.dental_plan_name || '',
    dentalAnnualMax: Number(offer.dental_annual_max) || 0,
    dentalDeductible: Number(offer.dental_deductible) || 0,
    visionPlanName: offer.vision_plan_name || '',
    visionFramesAllowance: Number(offer.vision_frames_allowance) || 0,
    visionContactsAllowance: Number(offer.vision_contacts_allowance) || 0,
  };
}
