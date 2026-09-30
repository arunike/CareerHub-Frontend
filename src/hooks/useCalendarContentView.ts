import { usePersistedState } from './usePersistedState';
import type { CalendarContentView } from '../components/CalendarView/CalendarViewControls';

// Remembered per page, so Events and Holidays do not share one preference.
export const useCalendarContentView = (storageKey: string) =>
  usePersistedState<CalendarContentView>(storageKey, 'calendar', {
    serialize: (value) => value,
    deserialize: (raw) => (raw === 'calendar' ? 'calendar' : 'list'),
  });
