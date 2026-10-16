import { DEFAULT_PALETTE_COLOR, getPaletteColor } from './colorPalette';

export const DEFAULT_HOLIDAY_TAB_COLOR = DEFAULT_PALETTE_COLOR;

export const UNTABBED_HOLIDAY_COLOR = 'green';
export const UNTABBED_HOLIDAY_LABEL = 'My Time Off';

// Same treatment as the untabbed bucket: one definition, one setting.
export const OBSERVED_HOLIDAY_COLOR = 'gray';
export const OBSERVED_HOLIDAY_LABEL = 'Observed Holidays';

export const getObservedHolidayColor = (color?: string | null) =>
  getPaletteColor(color ?? OBSERVED_HOLIDAY_COLOR);

export const getHolidayTabColor = (color?: string | null) =>
  getPaletteColor(color ?? UNTABBED_HOLIDAY_COLOR);
