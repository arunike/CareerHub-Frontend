import type {
  ApplicationTimelineEntry,
  ApplicationStats,
  ApplicationTimelineAnalytics,
  Document,
} from '../../types';
import api from '../client';
import type { AIArtifact } from './artifacts';

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

export const getApplications = (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  employment_type?: string;
  location?: string;
  year?: number | 'all';
  [key: string]: unknown;
}) => api.get('/career/applications/', { params });

export const getApplicationOptions = (params?: {
  search?: string;
  page_size?: number;
  page?: number;
  // Comma-separated ids; returns exactly those, bypassing search and paging.
  ids?: string;
}) => api.get('/career/applications/options/', { params });

export interface CompanyListItem {
  id: number;
  name: string;
}

export const getCompanyList = () =>
  api.get<CompanyListItem[]>('/career/applications/company-list/');

export const getApplication = (id: number) => api.get(`/career/applications/${id}/`);

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

export const deleteApplicationTimelineEntry = (id: number) =>
  api.delete(`/career/application-timeline/${id}/`);

export const getInterviewDebriefs = (applicationId: number) =>
  api.get('/career/interview-debriefs/', { params: { application: applicationId } });

export const createInterviewDebrief = (data: Record<string, unknown>) =>
  api.post('/career/interview-debriefs/', data);

export const updateInterviewDebrief = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/interview-debriefs/${id}/`, data);

export const deleteInterviewDebrief = (id: number) =>
  api.delete(`/career/interview-debriefs/${id}/`);

export const getApplicationStats = (year?: number | 'all') =>
  api.get<ApplicationStats>('/career/application-stats/', {
    params: year && year !== 'all' ? { year } : undefined,
  });

export const getApplicationTimelineAnalytics = (year?: number | 'all') =>
  api.get<ApplicationTimelineAnalytics>('/career/application-timeline-analytics/', {
    params: year && year !== 'all' ? { year } : undefined,
  });

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

export const exportApplications = (format: string = 'csv') =>
  api.get('/career/applications/export/', { params: { fmt: format }, responseType: 'blob' });
