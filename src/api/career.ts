import type { Task, Document, Experience } from '../types';
import api from './client';

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
export const importApplications = (formData: FormData) =>
  api.post('/career/import/', formData, { headers: { 'Content-Type': undefined } });
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
export const createExperience = (data: Partial<Experience>) => api.post<Experience>('/career/experiences/', data);
export const updateExperience = (id: number, data: Partial<Experience>) =>
  api.patch<Experience>(`/career/experiences/${id}/`, data);
export const deleteExperience = (id: number) => api.delete(`/career/experiences/${id}/`);

export interface JDMatchResult {
  score: number;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

export const matchJobDescription = (text: string) => api.post<JDMatchResult>('/career/match-jd/', { text });

export const generateCoverLetter = (applicationId: number, jdText: string) =>
  api.post<{ cover_letter: string }>(`/career/applications/${applicationId}/generate-cover-letter/`, { jd_text: jdText });

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

export const getNegotiationAdvice = (offerId: number) =>
  api.post<NegotiationAdvice>(`/career/offers/${offerId}/negotiation-advice/`);
