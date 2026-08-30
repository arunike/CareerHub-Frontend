import {
  DEFAULT_PALETTE_COLOR,
  getPaletteColor,
  USER_COLOR_PALETTE,
  type PaletteColor,
} from './colorPalette';

export type HolidayTabColor = PaletteColor;

export const HOLIDAY_TAB_COLOR_OPTIONS = USER_COLOR_PALETTE;

export const DEFAULT_HOLIDAY_TAB_COLOR = DEFAULT_PALETTE_COLOR;

export const UNTABBED_HOLIDAY_COLOR = 'green';
export const UNTABBED_HOLIDAY_LABEL = 'My Time Off';

// Same treatment as the untabbed bucket: one definition, one setting.
export const FEDERAL_HOLIDAY_COLOR = 'gray';
export const FEDERAL_HOLIDAY_LABEL = 'Observed Holidays';

export const getFederalHolidayColor = (color?: string | null) =>
  getPaletteColor(color ?? FEDERAL_HOLIDAY_COLOR);

export const getHolidayTabColor = (color?: string | null) =>
  getPaletteColor(color ?? UNTABBED_HOLIDAY_COLOR);
