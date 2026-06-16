import {
  DEFAULT_PALETTE_COLOR,
  getPaletteColor,
  USER_COLOR_PALETTE,
  type PaletteColor,
} from './colorPalette';

export type HolidayTabColor = PaletteColor;

export const HOLIDAY_TAB_COLOR_OPTIONS = USER_COLOR_PALETTE;

export const DEFAULT_HOLIDAY_TAB_COLOR = DEFAULT_PALETTE_COLOR;

export const getHolidayTabColor = (color?: string | null) => getPaletteColor(color);
