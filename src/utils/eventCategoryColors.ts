import type { Event, EventCategory } from '../types';

export type EventCategoryColor = {
  bg: string;
  border: string;
  text: string;
  dot: string;
  hoverBg: string;
  focusRing: string;
};

const DEFAULT_EVENT_COLOR = '#2563eb';

const CHIP_BG_ALPHA = 0.28;
const CHIP_HOVER_BG_ALPHA = 0.36;
const CHIP_BORDER_ALPHA = 0.5;
const CHIP_FOCUS_RING_ALPHA = 0.55;

const MIN_TEXT_CONTRAST = 7;

type Rgb = { r: number; g: number; b: number };

// Flattened onto white and painted opaque, so a chip reads the same in either theme.
const CHIP_SURFACE: Rgb = { r: 255, g: 255, b: 255 };

const normalizeHexColor = (color?: string | null) => {
  if (!color) return DEFAULT_EVENT_COLOR;

  const trimmed = color.trim();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((character) => character + character)
      .join('')}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  return DEFAULT_EVENT_COLOR;
};

const hexToRgb = (hex: string): Rgb => {
  const normalized = normalizeHexColor(hex).slice(1);
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgb = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const toRgbString = ({ r, g, b }: Rgb) =>
  `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;

// Flattens a translucent fill onto an opaque surface, as the browser would.
const compositeOver = (foreground: Rgb, alpha: number, background: Rgb): Rgb => ({
  r: foreground.r * alpha + background.r * (1 - alpha),
  g: foreground.g * alpha + background.g * (1 - alpha),
  b: foreground.b * alpha + background.b * (1 - alpha),
});

const channelLuminance = (channel: number) => {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ({ r, g, b }: Rgb) =>
  0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);

const contrastRatio = (a: Rgb, b: Rgb) => {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

const rgbToHsl = ({ r, g, b }: Rgb) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return { h: (hue * 60 + 360) % 360, s: saturation, l: lightness };
};

const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }): Rgb => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = h / 60;
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
  const match = l - chroma / 2;

  let [red, green, blue] = [0, 0, 0];
  if (sector < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (sector < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (sector < 3) [red, green, blue] = [0, chroma, secondary];
  else if (sector < 4) [red, green, blue] = [0, secondary, chroma];
  else if (sector < 5) [red, green, blue] = [secondary, 0, chroma];
  else [red, green, blue] = [chroma, 0, secondary];

  return { r: (red + match) * 255, g: (green + match) * 255, b: (blue + match) * 255 };
};

const readableTextColor = (
  hex: string,
  background: Rgb,
  minimumContrast = MIN_TEXT_CONTRAST
): string => {
  const normalized = normalizeHexColor(hex);
  const base = hexToRgb(normalized);
  if (contrastRatio(base, background) >= minimumContrast) return normalized;

  const { h, s, l } = rgbToHsl(base);
  for (let lightness = l; lightness >= 0; lightness -= 0.02) {
    // Test the rounded hex: rounding can drop a 7.001 result to 6.98.
    const candidate = toHex(hslToRgb({ h, s, l: Math.max(lightness, 0) }));
    if (contrastRatio(hexToRgb(candidate), background) >= minimumContrast) return candidate;
  }

  // Bright saturated hues can run out of headroom before the target; black always clears it.
  return '#000000';
};

export const getEventCategoryColor = (
  category?: Pick<EventCategory, 'color'> | null,
  fallbackColor?: string | null
): EventCategoryColor => {
  const color = normalizeHexColor(category?.color || fallbackColor);
  const chipBackground = compositeOver(hexToRgb(color), CHIP_BG_ALPHA, CHIP_SURFACE);

  return {
    bg: toRgbString(chipBackground),
    border: rgb(color, CHIP_BORDER_ALPHA),
    text: readableTextColor(color, chipBackground),
    dot: color,
    hoverBg: toRgbString(compositeOver(hexToRgb(color), CHIP_HOVER_BG_ALPHA, CHIP_SURFACE)),
    focusRing: rgb(color, CHIP_FOCUS_RING_ALPHA),
  };
};

export const getEventColor = (event: Event) =>
  getEventCategoryColor(event.category_details, event.color);
