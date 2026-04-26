import type { ApplicationTimelineEntry, Task, Experience, WeeklyReview } from '../types';
import api from './client';

export interface JobBoardImportResult {
  source_url: string;
  source_host: string;
  company: string;
  role_title: string;
  location: string;
  job_description: string;
  extraction_method?: 'ai' | 'rules';
  ai_status?: 'success' | 'not_configured' | 'failed';
  ai_message?: string;
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
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
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
export const createCompany = (data: Record<string, unknown>) => api.post('/career/companies/', data);
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
  api.get<ApplicationTimelineEntry[]>('/career/application-timeline/', { params: { application: applicationId } });
export const createApplicationTimelineEntry = (data: Partial<ApplicationTimelineEntry>) =>
  api.post<ApplicationTimelineEntry>('/career/application-timeline/', data);
export const updateApplicationTimelineEntry = (id: number, data: Partial<ApplicationTimelineEntry>) =>
  api.patch<ApplicationTimelineEntry>(`/career/application-timeline/${id}/`, data);
export const importApplications = (formData: FormData) =>
  api.post('/career/import/', formData, { headers: { 'Content-Type': undefined } });
export const extractJobBoardPosting = (url: string) =>
  api.post<JobBoardImportResult>('/career/job-import/', { url });
export const exportApplications = (format: string = 'csv') =>
  api.get('/career/applications/export/', { params: { fmt: format }, responseType: 'blob' });

export const getOffers = () => api.get('/career/offers/');
export const createOffer = (data: Record<string, unknown>) => api.post('/career/offers/', data);
export const updateOffer = (id: number, data: Record<string, unknown>) =>
  api.put(`/career/offers/${id}/`, data);
export const deleteOffer = (id: number) => api.delete(`/career/offers/${id}/`);

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
export const updateTask = (id: number, data: Partial<Task>) => api.patch(`/career/tasks/${id}/`, data);
export const deleteTask = (id: number) => api.delete(`/career/tasks/${id}/`);
export const reorderTasks = (
  updates: Array<{ id: number; status: 'TODO' | 'IN_PROGRESS' | 'DONE'; position: number }>,
) => api.post('/career/tasks/reorder/', { updates });
export const getWeeklyReview = (startDate?: string, endDate?: string) =>
  api.get<WeeklyReview>('/career/weekly-review/', { params: { start_date: startDate, end_date: endDate } });

export const getCareerReferenceData = () => api.get('/career/reference-data/');
export const getCareerRentEstimate = (city: string) =>
  api.get('/career/rent-estimate/', { params: { city } });

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
  api.post<Experience>(`/career/experiences/${id}/upload-logo/`, formData, { headers: { 'Content-Type': undefined } });
export const removeExperienceLogo = (id: number) =>
  api.delete<Experience>(`/career/experiences/${id}/remove-logo/`);

export interface JDMatchResult {
  score: number;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  resume_gaps?: string[];
  keyword_suggestions?: string[];
  tailored_bullets?: Array<{
    original?: string | null;
    revised: string;
    reason: string;
    experience?: string | null;
  }>;
  best_experiences?: Array<{
    title: string;
    company: string;
    relevance: string;
    matched_requirements?: string[];
  }>;
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
