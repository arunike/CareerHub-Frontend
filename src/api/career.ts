import type {
  ApplicationTimelineEntry,
  ApplicationTimelineAnalytics,
  GoogleOAuthStatus,
  GoogleSpreadsheetFile,
  GoogleSpreadsheetTab,
  GoogleSheetDuplicateResolution,
  GoogleSheetSyncConfig,
  GoogleSheetImportReview,
  GoogleSheetSyncPreview,
  GoogleSheetSyncRun,
  Document,
  Task,
  Experience,
  WeeklyReview,
} from '../types';
import api from './client';

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

export interface ApplicationFileImportPreview {
  headers: string[];
  rows: Array<Record<string, string>>;
  mapping: Record<string, string>;
  field_options: Array<{ key: string; label: string; required?: boolean }>;
  items: Array<{
    row: number;
    action: 'create' | 'update' | 'error';
    detail: string;
    company_name: string;
    role_title: string;
    status: string;
    local_object_id?: number | null;
    raw: Record<string, string>;
  }>;
  summary: {
    total_rows: number;
    creates: number;
    updates: number;
    errors: number;
  };
  ai_status: 'success' | 'not_configured' | 'failed';
  ai_message: string;
}

const EXPERIENCE_DECIMAL_FIELDS = [
  'hourly_rate',
  'hours_per_day',
  'working_days_per_week',
  'total_hours_worked',
  'overtime_hours',
  'overtime_rate',
  'overtime_multiplier',
  'total_earnings_override',
  'base_salary',
  'bonus',
  'equity',
] as const;

const roundExperienceDecimal = (value: unknown) => {
  if (value == null || value === '') return value;
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return value;
  return Number(parsed.toFixed(2));
};

const normalizeExperiencePayload = (data: Partial<Experience>): Partial<Experience> => {
  const normalized = { ...data } as Record<string, unknown>;

  for (const field of EXPERIENCE_DECIMAL_FIELDS) {
    if (field in normalized) {
      normalized[field] = roundExperienceDecimal(normalized[field]);
    }
  }

  if (Array.isArray(normalized.schedule_phases)) {
    normalized.schedule_phases = normalized.schedule_phases.map((phase) => {
      if (!phase || typeof phase !== 'object' || Array.isArray(phase)) return phase;
      const normalizedPhase = { ...(phase as Record<string, unknown>) };

      for (const field of EXPERIENCE_DECIMAL_FIELDS) {
        if (field in normalizedPhase) {
          normalizedPhase[field] = roundExperienceDecimal(normalizedPhase[field]);
        }
      }

      return normalizedPhase;
    });
  }

  return normalized as Partial<Experience>;
};

export const getCompanies = () => api.get('/career/companies/');
export const createCompany = (data: Record<string, unknown>) =>
  api.post('/career/companies/', data);
export const updateCompany = (id: number, data: Record<string, unknown>) =>
  api.put(`/career/companies/${id}/`, data);
export const deleteCompany = (id: number) => api.delete(`/career/companies/${id}/`);

export const getApplications = () => api.get('/career/applications/');
export const createApplication = (data: Record<string, unknown>) =>
  api.post('/career/applications/', data);
export const updateApplication = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/applications/${id}/`, data);
export const deleteApplication = (id: number) => api.delete(`/career/applications/${id}/`);
export const deleteAllApplications = () => api.delete('/career/applications/delete_all/');
export const getApplicationTimeline = (applicationId: number) =>
  api.get<ApplicationTimelineEntry[]>('/career/application-timeline/', {
    params: { application: applicationId },
  });
export const createApplicationTimelineEntry = (data: Partial<ApplicationTimelineEntry>) =>
  api.post<ApplicationTimelineEntry>('/career/application-timeline/', data);
export const updateApplicationTimelineEntry = (
  id: number,
  data: Partial<ApplicationTimelineEntry>
) => api.patch<ApplicationTimelineEntry>(`/career/application-timeline/${id}/`, data);
export const getApplicationTimelineAnalytics = () =>
  api.get<ApplicationTimelineAnalytics>('/career/application-timeline-analytics/');

export interface ApplicationPrepWorkspace {
  application: Record<string, unknown>;
  notes: string;
  documents: Document[];
  timeline: ApplicationTimelineEntry[];
  jd_reports: AIArtifact[];
  cover_letters: AIArtifact[];
  latest_jd_report: AIArtifact | null;
  evidence: {
    best_experiences: Array<Record<string, unknown>>;
    tailored_bullets: Array<Record<string, unknown>>;
    matched_skills: unknown[];
    missing_skills: unknown[];
  };
  readiness: {
    linked_documents: number;
    timeline_entries: number;
    jd_reports: number;
    cover_letters: number;
    has_notes: boolean;
    has_job_link: boolean;
  };
}

export const getApplicationPrepWorkspace = (applicationId: number) =>
  api.get<ApplicationPrepWorkspace>(`/career/applications/${applicationId}/prep_workspace/`);
export const previewImportApplications = (formData: FormData) =>
  api.post<{ ok: true; preview: ApplicationFileImportPreview }>('/career/import/', formData, {
    headers: { 'Content-Type': undefined },
  });
export const applyImportApplications = (
  rows: Array<Record<string, string>>,
  mapping: Record<string, string>
) =>
  api.post<{
    ok: boolean;
    result: { created: number; updated: number; errors: Array<{ row?: number; error: string }> };
  }>('/career/import/apply/', { rows, mapping });
export const extractJobBoardPosting = (url: string) =>
  api.post<JobBoardImportResult>('/career/job-import/', { url });
export const exportApplications = (format: string = 'csv') =>
  api.get('/career/applications/export/', { params: { fmt: format }, responseType: 'blob' });

export const getGoogleSheetSyncs = () =>
  api.get<GoogleSheetSyncConfig[]>('/career/google-sheet-syncs/');
export const createGoogleSheetSync = (data: Partial<GoogleSheetSyncConfig>) =>
  api.post<GoogleSheetSyncConfig>('/career/google-sheet-syncs/', data);
export const updateGoogleSheetSync = (id: number, data: Partial<GoogleSheetSyncConfig>) =>
  api.patch<GoogleSheetSyncConfig>(`/career/google-sheet-syncs/${id}/`, data);
export const deleteGoogleSheetSync = (id: number) =>
  api.delete(`/career/google-sheet-syncs/${id}/`);
export const previewGoogleSheetSync = (data: Partial<GoogleSheetSyncConfig>) =>
  api.post<{ ok: true; preview: GoogleSheetSyncPreview }>(
    '/career/google-sheet-syncs/preview/',
    data
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
export const getGoogleSpreadsheetTabs = (spreadsheetId: string) =>
  api.get<{ tabs: GoogleSpreadsheetTab[] }>('/career/google-oauth/spreadsheet-tabs/', {
    params: { spreadsheet_id: spreadsheetId },
  });
export const testGoogleSheetSync = (id: number) =>
  api.post<{ ok: true; preview: GoogleSheetSyncPreview }>(`/career/google-sheet-syncs/${id}/test/`);
export const runGoogleSheetSync = (id: number) =>
  api.post<{ ok: true; result: GoogleSheetSyncConfig['last_result'] }>(
    `/career/google-sheet-syncs/${id}/sync-now/`
  );
export const resyncGoogleSheetSync = (id: number) =>
  api.post<{ ok: true; result: GoogleSheetSyncConfig['last_result'] }>(
    `/career/google-sheet-syncs/${id}/resync/`
  );
export const getGoogleSheetImportReview = (id: number, force = false) =>
  api.post<{ ok: true; review: GoogleSheetImportReview }>(
    `/career/google-sheet-syncs/${id}/import-review/`,
    { force }
  );
export const applyGoogleSheetImportReview = (
  id: number,
  approvedItemIds: string[],
  duplicateResolutions: Record<string, GoogleSheetDuplicateResolution> = {},
  force = false
) =>
  api.post<{ ok: true; result: GoogleSheetSyncConfig['last_result'] }>(
    `/career/google-sheet-syncs/${id}/apply-import-review/`,
    { approved_item_ids: approvedItemIds, duplicate_resolutions: duplicateResolutions, force }
  );
export const getGoogleSheetSyncRuns = (id: number) =>
  api.get<{ ok: true; runs: GoogleSheetSyncRun[] }>(`/career/google-sheet-syncs/${id}/runs/`);
export const rollbackGoogleSheetSyncRun = (id: number, runId: number) =>
  api.post<{ ok: true }>(`/career/google-sheet-syncs/${id}/rollback/`, { run_id: runId });

export const getOffers = () => api.get('/career/offers/');
export const createOffer = (data: Record<string, unknown>) => api.post('/career/offers/', data);
export const updateOffer = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/offers/${id}/`, data);
export const deleteOffer = (id: number) => api.delete(`/career/offers/${id}/`);

export interface OfferDecisionSnapshot {
  id: number;
  offer: number;
  company_name: string;
  role_title: string;
  title: string;
  notes: string;
  decision_score: number | null;
  rank: number | null;
  total_comp: string;
  adjusted_value: string | null;
  monthly_rent: string | null;
  commute_cost_annual: string | null;
  tax_snapshot: Record<string, unknown>;
  score_categories: Array<Record<string, unknown>>;
  offer_snapshot: Record<string, unknown>;
  adjustment_snapshot: Record<string, unknown>;
  is_locked: boolean;
  captured_at: string;
  updated_at: string;
}

export type OfferDecisionSnapshotPayload = Omit<
  OfferDecisionSnapshot,
  'id' | 'company_name' | 'role_title' | 'captured_at' | 'updated_at'
>;

export const getOfferDecisionSnapshots = (offerId?: number) =>
  api.get<OfferDecisionSnapshot[]>('/career/offer-decision-snapshots/', {
    params: { offer: offerId },
  });
export const createOfferDecisionSnapshot = (data: Partial<OfferDecisionSnapshotPayload>) =>
  api.post<OfferDecisionSnapshot>('/career/offer-decision-snapshots/', data);
export const updateOfferDecisionSnapshot = (
  id: number,
  data: Partial<OfferDecisionSnapshotPayload>
) => api.patch<OfferDecisionSnapshot>(`/career/offer-decision-snapshots/${id}/`, data);
export const deleteOfferDecisionSnapshot = (id: number) =>
  api.delete(`/career/offer-decision-snapshots/${id}/`);

export const getDocuments = () => api.get('/career/documents/');
export const deleteAllDocuments = () => api.delete('/career/documents/delete_all/');
export const exportDocuments = (format: string = 'csv') =>
  api.get('/career/documents/export/', { params: { fmt: format }, responseType: 'blob' });
export const createDocument = (formData: FormData) =>
  api.post('/career/documents/', formData, { headers: { 'Content-Type': undefined } });
export const updateDocument = (id: number, formData: FormData) =>
  api.put(`/career/documents/${id}/`, formData, { headers: { 'Content-Type': undefined } });
export const patchDocument = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/documents/${id}/`, data);
export const deleteDocument = (id: number) => api.delete(`/career/documents/${id}/`);
export const getDocumentVersions = (id: number) => api.get(`/career/documents/${id}/versions/`);
export const createDocumentVersion = (id: number, formData: FormData) =>
  api.post(`/career/documents/${id}/add_version/`, formData, {
    headers: { 'Content-Type': undefined },
  });
export const downloadDocument = (id: number) =>
  api.get(`/career/documents/${id}/download/`, { responseType: 'blob' });

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

export type AIArtifactType = 'JD_REPORT' | 'COVER_LETTER' | 'NEGOTIATION_RESULT';

export interface AIArtifact {
  id: number;
  artifact_type: AIArtifactType;
  client_id: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  source_application: number | null;
  source_offer: number | null;
  is_locked: boolean;
  saved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AIArtifactPayload = Omit<AIArtifact, 'id' | 'created_at' | 'updated_at'>;

export const getAIArtifacts = (artifactType?: AIArtifactType, search?: string) =>
  api.get<AIArtifact[]>('/career/ai-artifacts/', {
    params: {
      artifact_type: artifactType,
      search,
    },
  });
export const createAIArtifact = (data: Partial<AIArtifactPayload>) =>
  api.post<AIArtifact>('/career/ai-artifacts/', data);
export const updateAIArtifact = (id: number, data: Partial<AIArtifactPayload>) =>
  api.patch<AIArtifact>(`/career/ai-artifacts/${id}/`, data);
export const deleteAIArtifact = (id: number) => api.delete(`/career/ai-artifacts/${id}/`);
export const deleteAllAIArtifacts = () => api.delete('/career/ai-artifacts/delete_all/');

export const getExperiences = () => api.get<Experience[]>('/career/experiences/');
export const createExperience = (data: Partial<Experience>) =>
  api.post<Experience>('/career/experiences/', normalizeExperiencePayload(data));
export const updateExperience = (id: number, data: Partial<Experience>) =>
  api.patch<Experience>(`/career/experiences/${id}/`, normalizeExperiencePayload(data));
export const deleteExperience = (id: number) => api.delete(`/career/experiences/${id}/`);
export const deleteAllExperiences = () => api.delete('/career/experiences/delete_all/');
export const importExperiences = (formData: FormData) =>
  api.post('/career/experiences/import/', formData, { headers: { 'Content-Type': undefined } });
export const exportExperiences = (format: string = 'csv') =>
  api.get('/career/experiences/export/', { params: { fmt: format }, responseType: 'blob' });
export const uploadExperienceLogo = (id: number, formData: FormData) =>
  api.post<Experience>(`/career/experiences/${id}/upload-logo/`, formData, {
    headers: { 'Content-Type': undefined },
  });
export const removeExperienceLogo = (id: number) =>
  api.delete<Experience>(`/career/experiences/${id}/remove-logo/`);

export interface JDMatchResult {
  score: number;
  score_label?: 'Strong match' | 'Good fit with minor gaps' | 'Partial match' | 'Poor match';
  summary: string;
  matched_skills: Array<
    | string
    | {
        skill: string;
        support_level: 'directly_supported' | 'reasonably_supported';
        evidence: string;
      }
  >;
  missing_skills: Array<
    | string
    | {
        skill: string;
        severity: 'high' | 'medium' | 'low';
        reason: string;
        resume_evidence_status: 'not mentioned' | 'weakly implied' | 'unclear';
      }
  >;
  recommendations: string[];
  resume_gaps?: Array<
    | string
    | {
        gap: string;
        why_it_matters: string;
        fix: string;
      }
  >;
  keyword_suggestions?: Array<
    | string
    | {
        keyword: string;
        support_level: 'directly_supported' | 'reasonably_supported';
        where_to_use: string;
      }
  >;
  tailored_bullets?: Array<{
    original?: string | null;
    revised: string;
    support_level?: 'directly_supported' | 'reasonably_supported';
    reason: string;
    experience?: string | null;
    risk_note?: string | null;
  }>;
  best_experiences?: Array<{
    title: string;
    company: string;
    relevance: string;
    matched_requirements?: Array<
      | string
      | {
          requirement: string;
          support_level: 'directly_supported' | 'reasonably_supported';
          evidence: string;
        }
    >;
  }>;
  overall_risk_assessment?: {
    seniority_risk: 'low' | 'medium' | 'high';
    domain_risk: 'low' | 'medium' | 'high';
    technical_stack_risk: 'low' | 'medium' | 'high';
    resume_positioning_risk: 'low' | 'medium' | 'high';
  };
}

export interface NegotiationAdvice {
  talking_points: string[];
  leverage_points: string[];
  caution_points: string[];
  suggested_ask: {
    base_salary: number | null;
    sign_on: number | null;
    equity: number | null;
    pto_days: number | null;
    notes: string;
  };
}
