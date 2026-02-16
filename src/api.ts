import axios from 'axios';
import type { Event, Holiday, UserSettings, RecurrenceRule } from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getEvents = (startDate?: string, endDate?: string) =>
  api.get('/events/', { params: { start_date: startDate, end_date: endDate } });

export const createEvent = (data: Partial<Event>, params?: Record<string, unknown>) =>
  api.post('/events/', data, { params });
export const deleteEvent = (id: number) => api.delete(`/events/${id}/`);
export const deleteAllEvents = () => api.delete('/events/delete_all/');
export const updateEvent = (id: number, data: Partial<Event>, params?: Record<string, unknown>) =>
  api.patch(`/events/${id}/`, data, { params });

export const getHolidays = () => api.get('/holidays/');
export const getFederalHolidays = () => api.get('/holidays/federal/');
export const createHoliday = (data: Partial<Holiday>) => api.post('/holidays/', data);
export const updateHoliday = (id: number, data: Partial<Holiday>) =>
  api.patch(`/holidays/${id}/`, data);
export const deleteHoliday = (id: number) => api.delete(`/holidays/${id}/`);
export const deleteAllHolidays = () => api.delete('/holidays/delete_all/');

export const getAvailability = (startDate?: string, timezone?: string) =>
  api.get('/availability/generate/', { params: { start_date: startDate, timezone } });

export const createOverride = (data: { date: string; availability_text: string }) =>
  api.post('/overrides/', data);

export const importData = (formData: FormData) =>
  api.post('/import/', formData, {
    headers: { 'Content-Type': undefined },
  });

export const getSettings = () => api.get('/settings/');
export const updateSettings = (key: string, value: string) =>
  api.put(`/settings/${key}/`, { key, value });

export const createSetting = (data: { key: string; value: string }) => api.post('/settings/', data);

// Categories
export const getCategories = () => api.get('/categories/');
export const createCategory = (data: { name: string; color: string; icon?: string }) =>
  api.post('/categories/', data);
export const updateCategory = (id: number, data: { name: string; color: string; icon?: string }) =>
  api.put(`/categories/${id}/`, data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}/`);

// User Settings
export const getUserSettings = () => api.get('/user-settings/current/');
export const updateUserSettings = (data: Partial<UserSettings>) =>
  api.put('/user-settings/current/', data);

// Recurring Events
export const getRecurringInstances = (startDate: string, endDate: string) =>
  api.get('/events/recurring_instances/', { params: { start_date: startDate, end_date: endDate } });

export const setRecurrence = (eventId: number, recurrenceRule: RecurrenceRule) =>
  api.post(`/events/${eventId}/set_recurrence/`, { recurrence_rule: recurrenceRule });

export const updateRecurringSeries = (eventId: number, updates: Partial<Event>) =>
  api.put(`/events/${eventId}/update_series/`, updates);

export const deleteRecurringSeries = (eventId: number) =>
  api.delete(`/events/${eventId}/delete_series/`);

export const deleteRecurringInstance = (eventId: number, date: string) =>
  api.post(`/events/${eventId}/delete_instance/`, { date });

// Career - Companies
export const getCompanies = () => api.get('/career/companies/');
export const createCompany = (data: Record<string, unknown>) =>
  api.post('/career/companies/', data);
export const updateCompany = (id: number, data: Record<string, unknown>) =>
  api.put(`/career/companies/${id}/`, data);
export const deleteCompany = (id: number) => api.delete(`/career/companies/${id}/`);

// Career - Applications
export const getApplications = () => api.get('/career/applications/');
export const createApplication = (data: Record<string, unknown>) =>
  api.post('/career/applications/', data);
export const updateApplication = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/applications/${id}/`, data);
export const deleteApplication = (id: number) => api.delete(`/career/applications/${id}/`);
export const deleteAllApplications = () => api.delete('/career/applications/delete_all/');

export const importApplications = (formData: FormData) =>
  api.post('/career/import/', formData, {
    headers: { 'Content-Type': undefined }, // Unset manual header to let browser set multipart/form-data with boundary
  });

// Career - Offers
export const getOffers = () => api.get('/career/offers/');
export const createOffer = (data: Record<string, unknown>) => api.post('/career/offers/', data);
export const updateOffer = (id: number, data: Record<string, unknown>) =>
  api.put(`/career/offers/${id}/`, data);
export const deleteOffer = (id: number) => api.delete(`/career/offers/${id}/`);

// Conflicts
export const detectConflicts = () => api.post('/events/detect_conflicts/');
export const getUnresolvedConflicts = () => api.get('/conflicts/unresolved/');
export const resolveConflict = (id: number) => api.post(`/conflicts/${id}/resolve/`);

export const exportEvents = (format: string = 'csv') =>
  api.get('/events/export/', {
    params: { fmt: format },
    responseType: 'blob',
  });

export const exportHolidays = (format: string = 'csv') =>
  api.get('/holidays/export/', {
    params: { fmt: format },
    responseType: 'blob',
  });

export const exportApplications = (format: string = 'csv') =>
  api.get('/career/applications/export/', {
    params: { fmt: format },
    responseType: 'blob',
  });

export const exportAllData = (format: string = 'json') =>
  api.get('/user-settings/export_all/', {
    params: { fmt: format },
    responseType: 'blob',
  });

export default api;
