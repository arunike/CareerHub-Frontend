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

const hexToRgb = (hex: string) => {
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

export const getEventCategoryColor = (
  category?: Pick<EventCategory, 'color'> | null,
  fallbackColor?: string | null
): EventCategoryColor => {
  const color = normalizeHexColor(category?.color || fallbackColor);

  return {
    bg: rgb(color, 0.14),
    border: rgb(color, 0.24),
    text: color,
    dot: color,
    hoverBg: rgb(color, 0.2),
    focusRing: rgb(color, 0.34),
  };
};

export const getEventColor = (event: Event) =>
  getEventCategoryColor(event.category_details, event.color);
