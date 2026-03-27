import type { Event, Holiday, RecurrenceRule, ShareLink, UserSettings } from '../types';
import api from './client';

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
export const updateHoliday = (id: number, data: Partial<Holiday>) => api.patch(`/holidays/${id}/`, data);
export const deleteHoliday = (id: number) => api.delete(`/holidays/${id}/`);
export const deleteAllHolidays = () => api.delete('/holidays/delete_all/');

export const getAvailability = (startDate?: string, timezone?: string) =>
  api.get('/availability/generate/', { params: { start_date: startDate, timezone } });
export const createOverride = (data: { date: string; availability_text: string }) =>
  api.post('/overrides/', data);

export const importData = (formData: FormData) =>
  api.post('/import/', formData, { headers: { 'Content-Type': undefined } });

export const getSettings = () => api.get('/settings/');
export const updateSettings = (key: string, value: string) => api.put(`/settings/${key}/`, { key, value });
export const createSetting = (data: { key: string; value: string }) => api.post('/settings/', data);

export const getCategories = () => api.get('/categories/');
export const createCategory = (data: { name: string; color: string; icon?: string }) =>
  api.post('/categories/', data);
export const updateCategory = (id: number, data: { name: string; color: string; icon?: string; is_locked?: boolean }) =>
  api.put(`/categories/${id}/`, data);
export const patchCategory = (id: number, data: Partial<{ name: string; color: string; icon: string; is_locked: boolean }>) =>
  api.patch(`/categories/${id}/`, data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}/`);

export const getUserSettings = () => api.get('/user-settings/current/');
export const updateUserSettings = (data: Partial<UserSettings>) => api.put('/user-settings/current/', data);

export const getRecurringInstances = (startDate: string, endDate: string) =>
  api.get('/events/recurring_instances/', { params: { start_date: startDate, end_date: endDate } });
export const setRecurrence = (eventId: number, recurrenceRule: RecurrenceRule) =>
  api.post(`/events/${eventId}/set_recurrence/`, { recurrence_rule: recurrenceRule });
export const updateRecurringSeries = (eventId: number, updates: Partial<Event>) =>
  api.put(`/events/${eventId}/update_series/`, updates);
export const deleteRecurringSeries = (eventId: number) => api.delete(`/events/${eventId}/delete_series/`);
export const deleteRecurringInstance = (eventId: number, date: string) =>
  api.post(`/events/${eventId}/delete_instance/`, { date });

export const getCurrentShareLink = () => api.get<{ active: ShareLink | null }>('/share-links/current/');
export const generateShareLink = (data: {
  title?: string;
  duration_days?: number;
  booking_block_minutes?: number;
}) =>
  api.post<ShareLink>('/share-links/generate/', data);
export const deactivateShareLink = () => api.post('/share-links/deactivate/');
export const getPublicBookingSlots = (uuid: string, date?: string, timezone: string = 'PT') =>
  api.get<{
    title: string;
    expires_at: string;
    timezone: string;
    booking_block_minutes: number;
    days: Array<{
      date: string;
      day_name: string;
      readable_date: string;
      slots: Array<{ start_time: string; end_time: string; label: string }>;
    }>;
  }>(`/booking/${uuid}/slots/`, { params: { date, timezone } });
export const createPublicBooking = (
  uuid: string,
  data: {
    name: string;
    email: string;
    date: string;
    start_time: string;
    end_time: string;
    timezone?: string;
    notes?: string;
  },
) => api.post(`/booking/${uuid}/book/`, data);

export const exportEvents = (format: string = 'csv') =>
  api.get('/events/export/', { params: { fmt: format }, responseType: 'blob' });
export const exportHolidays = (format: string = 'csv') =>
  api.get('/holidays/export/', { params: { fmt: format }, responseType: 'blob' });
export const exportAllData = (format: string = 'json') =>
  api.get('/user-settings/export_all/', { params: { fmt: format }, responseType: 'blob' });
