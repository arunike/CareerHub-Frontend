import type {
  ApplicationLike,
  MaritalStatus,
  MaritalStatusOption,
  OfferLike,
  SimulatedOffer,
} from './calculations';
import type { AdjustedOfferMetrics } from './types';

export interface CareerReferenceData {
  marital_status_options?: MaritalStatusOption[];
  city_cost_of_living?: Record<string, number>;
  state_col_base?: Record<string, number>;
  state_tax_rate?: Record<string, number>;
  state_name_to_abbr?: Record<string, string>;
}

export interface RentEstimateData {
  provider?: string;
  matched_area?: string;
  monthly_rent_estimate?: number | null;
  fmr_year?: number | string | null;
  last_updated?: string;
  error?: string;
}

export interface ScenarioRow {
  kind: 'real' | 'simulated';
  offer: { id?: number | string; is_current?: boolean };
  appName: string;
  locationLabel: string;
  colIndex: number;
  monthlyRent: number;
  work_mode: string;
  rto_days_per_week: number;
  pto_days: number;
  is_unlimited_pto: boolean;
  holiday_days: number;
  pto_holiday_days: number | null;
  total_comp: number;
  adjustedValue: number;
  lifestyleAdjustment: number;
  deltaVsCurrent: number;
  deltaTotalComp: number;
  deltaBaseAfterTax: number;
  deltaBonusAfterTax: number;
  deltaEquityAfterTax: number;
  deltaPtoHolidayDays: number | null;
  afterTaxBase: number;
  afterTaxBonus: number;
  afterTaxEquity: number;
  usedBaseTaxRate: number;
  usedBonusTaxRate: number;
  usedEquityTaxRate: number;
}

export interface SavedOfferAdjustmentSettings {
  maritalStatus: MaritalStatus;
  simulatedOffers: SimulatedOffer[];
  savedAt: string;
}

export interface OfferAdjustmentsPanelProps {
  isOpen: boolean;
  filteredOffers: OfferLike[];
  applications: ApplicationLike[];
  getApplicationName: (appId: number) => string;
  onViewRealOffer?: (offerId: number) => void;
  onEditRealOffer?: (offerId: number) => void;
  onRealAdjustedChange?: (data: Record<number, AdjustedOfferMetrics>) => void;
}
