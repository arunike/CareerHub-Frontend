import type {
  GoogleOAuthStatus,
  GoogleSpreadsheetFile,
  GoogleSpreadsheetTab,
  GoogleSheetDuplicateResolution,
  GoogleSheetSyncConfig,
  GoogleSheetImportReview,
  GoogleSheetSyncPreview,
  GoogleSheetSyncRun,
  Task,
  WeeklyReview,
} from '../../types';
import type { AxiosRequestConfig } from 'axios';
import api from '../client';

export interface JobBoardImportResult {
  source_url: string;
  source_host: string;
  company: string;
  role_title: string;
  location: string;
  employment_type: string;
  salary_range: string;
  job_description: string;
  extraction_method?: 'ai' | 'rules';
  ai_status?: 'success' | 'not_configured' | 'failed';
  ai_message?: string;
}

export const extractJobBoardPosting = (url: string) =>
  api.post<JobBoardImportResult>('/career/job-import/', { url });

export const getGoogleSheetSyncs = () =>
  api.get<GoogleSheetSyncConfig[]>('/career/google-sheet-syncs/');

export const createGoogleSheetSync = (data: Partial<GoogleSheetSyncConfig>) =>
  api.post<GoogleSheetSyncConfig>('/career/google-sheet-syncs/', data);

export const updateGoogleSheetSync = (id: number, data: Partial<GoogleSheetSyncConfig>) =>
  api.patch<GoogleSheetSyncConfig>(`/career/google-sheet-syncs/${id}/`, data);

export const deleteGoogleSheetSync = (id: number) =>
  api.delete(`/career/google-sheet-syncs/${id}/`);

export const previewGoogleSheetSync = (
  data: Partial<GoogleSheetSyncConfig>,
  config?: AxiosRequestConfig
) =>
  api.post<{ ok: true; preview: GoogleSheetSyncPreview }>(
    '/career/google-sheet-syncs/preview/',
    data,
    config
  );

export const getGoogleOAuthStatus = () =>
  api.get<GoogleOAuthStatus>('/career/google-oauth/status/');

export const connectGoogleOAuth = (redirectUrl: string) =>
  api.post<{ authorization_url: string }>('/career/google-oauth/connect/', {
    redirect_url: redirectUrl,
  });

export const disconnectGoogleOAuth = () =>
  api.post<{ ok: true }>('/career/google-oauth/disconnect/');

export const getGoogleSpreadsheets = () =>
  api.get<{ spreadsheets: GoogleSpreadsheetFile[] }>('/career/google-oauth/spreadsheets/');

export const getGoogleSpreadsheetTabs = (spreadsheetId: string, config?: AxiosRequestConfig) =>
  api.get<{ tabs: GoogleSpreadsheetTab[] }>('/career/google-oauth/spreadsheet-tabs/', {
    params: { spreadsheet_id: spreadsheetId },
    ...config,
  });

export const testGoogleSheetSync = (id: number, config?: AxiosRequestConfig) =>
  api.post<{ ok: true; preview: GoogleSheetSyncPreview }>(
    `/career/google-sheet-syncs/${id}/test/`,
    undefined,
    config
  );

export const runGoogleSheetSync = (id: number, config?: AxiosRequestConfig) =>
  api.post<{ ok: true; result: GoogleSheetSyncConfig['last_result'] }>(
    `/career/google-sheet-syncs/${id}/sync-now/`,
    undefined,
    config
  );

export const resyncGoogleSheetSync = (id: number, config?: AxiosRequestConfig) =>
  api.post<{ ok: true; result: GoogleSheetSyncConfig['last_result'] }>(
    `/career/google-sheet-syncs/${id}/resync/`,
    undefined,
    config
  );

export const getGoogleSheetImportReview = (
  id: number,
  force = false,
  config?: AxiosRequestConfig
) =>
  api.post<{ ok: true; review: GoogleSheetImportReview }>(
    `/career/google-sheet-syncs/${id}/import-review/`,
    { force },
    config
  );

export const applyGoogleSheetImportReview = (
  id: number,
  approvedItemIds: string[],
  duplicateResolutions: Record<string, GoogleSheetDuplicateResolution> = {},
  force = false,
  config?: AxiosRequestConfig
) =>
  api.post<{ ok: true; result: GoogleSheetSyncConfig['last_result'] }>(
    `/career/google-sheet-syncs/${id}/apply-import-review/`,
    { approved_item_ids: approvedItemIds, duplicate_resolutions: duplicateResolutions, force },
    config
  );

export const getGoogleSheetSyncRuns = (id: number, config?: AxiosRequestConfig) =>
  api.get<{ ok: true; runs: GoogleSheetSyncRun[] }>(
    `/career/google-sheet-syncs/${id}/runs/`,
    config
  );

export const rollbackGoogleSheetSyncRun = (id: number, runId: number) =>
  api.post<{ ok: true }>(`/career/google-sheet-syncs/${id}/rollback/`, { run_id: runId });

export const getTransitionAdvice = (data: {
  current_pain_points: string[];
  custom_pain_points?: string;
  promotion_timeline: string;
  include_job_hunting: boolean;
  simulated_offers: any[];
}) => api.post('/career/offers/transition-advisor/', data);

export const getTasks = () => api.get('/career/tasks/');

export const createTask = (data: Partial<Task>) => api.post('/career/tasks/', data);

export const updateTask = (id: number, data: Partial<Task>) =>
  api.patch(`/career/tasks/${id}/`, data);

export const deleteTask = (id: number) => api.delete(`/career/tasks/${id}/`);

export const reorderTasks = (
  updates: Array<{ id: number; status: 'TODO' | 'IN_PROGRESS' | 'DONE'; position: number }>
) => api.post('/career/tasks/reorder/', { updates });

export const getWeeklyReview = (startDate?: string, endDate?: string) =>
  api.get<WeeklyReview>('/career/weekly-review/', {
    params: { start_date: startDate, end_date: endDate },
  });

export const getCareerReferenceData = () => api.get('/career/reference-data/');

export const getCareerRentEstimate = (city: string) =>
  api.get('/career/rent-estimate/', { params: { city } });

export interface TaxProfilePayload {
  id?: number;
  tax_year: number;
  filing_status: string;
  state?: string;
  locality?: string;
  w4_dependents_credit?: number | string;
  w4_other_income?: number | string;
  w4_deductions?: number | string;
  w4_extra_withholding_per_period?: number | string;
  state_flat_rate_override?: number | string | null;
}

export interface PaycheckActualPayload {
  id?: number;
  income_year?: number;
  period_index: number;
  pay_date?: string | null;
  actual_gross?: number | string | null;
  actual_federal_tax?: number | string | null;
  actual_state_tax?: number | string | null;
  actual_social_security?: number | string | null;
  actual_medicare?: number | string | null;
  actual_net?: number | string | null;
  note?: string;
}

export interface IncomeYearPayload {
  id?: number;
  tax_year: number;
  source_key?: string;
  offer?: number | null;
  experience?: number | null;
  first_pay_date?: string | null;
  salary_override?: number | string | null;
  paychecks_per_year_override?: number | null;
  pretax_401k_percent?: number | string;
  roth_401k_percent?: number | string;
  hsa_per_period?: number | string;
  fsa_per_period?: number | string;
  post_tax_deductions_per_period?: number | string;
  hsa_family_coverage?: boolean;
  age_50_plus?: boolean;
  include_bonus?: boolean;
  bonus_override?: number | string | null;
  bonus_payouts?: Array<Record<string, unknown>>;
  bonus_multiplier_percent?: number | string;
  bonus_extras?: Array<Record<string, unknown>>;
  bonus_prorated?: boolean;
  bonus_performance_year?: number | null;
  include_vest_events?: boolean;
  total_grant_override?: number | string | null;
  vests_per_year_override?: number | null;
  cliff_months_override?: number | null;
  vesting_years_override?: number | null;
  first_vest_date?: string | null;
  medical_premium_override?: number | string | null;
  dental_premium_override?: number | string | null;
  vision_premium_override?: number | string | null;
  dependent_premium_override?: number | string | null;
  custom_deductions?: Array<Record<string, unknown>>;
  period_deductions?: Array<Record<string, unknown>>;
  exclude_allowances_from_deferral_base?: boolean;
  match_tiers?: Array<Record<string, unknown>>;
  match_non_elective_percent?: number | string;
  match_annual_cap?: number | string;
  allowances?: Array<Record<string, unknown>>;
  retirement_starting_balance?: number | string | null;
  retirement_current_value?: number | string | null;
  income_events?: Array<Record<string, unknown>>;
  actuals?: PaycheckActualPayload[];
}

export const getTaxProfiles = () => api.get<TaxProfilePayload[]>('/career/tax-profiles/');

export const createTaxProfile = (data: TaxProfilePayload) =>
  api.post<TaxProfilePayload>('/career/tax-profiles/', data);

export const updateTaxProfile = (id: number, data: Partial<TaxProfilePayload>) =>
  api.patch<TaxProfilePayload>(`/career/tax-profiles/${id}/`, data);

export const getIncomeYears = () => api.get<IncomeYearPayload[]>('/career/income-years/');

export const createIncomeYear = (data: IncomeYearPayload) =>
  api.post<IncomeYearPayload>('/career/income-years/', data);

export const updateIncomeYear = (id: number, data: Partial<IncomeYearPayload>) =>
  api.patch<IncomeYearPayload>(`/career/income-years/${id}/`, data);

export const createPaycheckActual = (data: PaycheckActualPayload) =>
  api.post<PaycheckActualPayload>('/career/paycheck-actuals/', data);

export const updatePaycheckActual = (id: number, data: Partial<PaycheckActualPayload>) =>
  api.patch<PaycheckActualPayload>(`/career/paycheck-actuals/${id}/`, data);

export const deletePaycheckActual = (id: number) => api.delete(`/career/paycheck-actuals/${id}/`);
