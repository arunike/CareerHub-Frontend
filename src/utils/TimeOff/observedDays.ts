import type { ObservedDays } from './ptoBalance';
import type { Holiday } from '../../types';

// An ignored holiday is a working day, so it still costs leave.
export const observedDaysOf = (observedHolidays: Holiday[]): ObservedDays =>
  new Set(observedHolidays.filter((holiday) => !holiday.is_ignored).map((holiday) => holiday.date));
