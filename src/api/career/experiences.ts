import type { Experience } from '../../types';
import api from '../client';

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

export const getExperiences = () => api.get<Experience[]>('/career/experiences/');

export const reorderExperiences = (order: { id: number; position: number }[]) =>
  api.post('/career/experiences/reorder/', { order });

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
