export type PaletteColor = {
  value: string;
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  tone: string;
};

export const DEFAULT_PALETTE_COLOR = 'blue';

export const USER_COLOR_PALETTE: PaletteColor[] = [
  {
    value: 'blue',
    label: 'Blue',
    bg: '#dbeafe',
    border: '#bfdbfe',
    text: '#1d4ed8',
    dot: '#3b82f6',
    tone: 'bg-blue-500',
  },
  {
    value: 'teal',
    label: 'Teal',
    bg: '#ccfbf1',
    border: '#99f6e4',
    text: '#0f766e',
    dot: '#14b8a6',
    tone: 'bg-teal-500',
  },
  {
    value: 'amber',
    label: 'Amber',
    bg: '#fef3c7',
    border: '#fde68a',
    text: '#b45309',
    dot: '#f59e0b',
    tone: 'bg-amber-500',
  },
  {
    value: 'purple',
    label: 'Purple',
    bg: '#ede9fe',
    border: '#ddd6fe',
    text: '#7c3aed',
    dot: '#8b5cf6',
    tone: 'bg-purple-500',
  },
  {
    value: 'orange',
    label: 'Orange',
    bg: '#ffedd5',
    border: '#fed7aa',
    text: '#c2410c',
    dot: '#f97316',
    tone: 'bg-orange-500',
  },
  {
    value: 'green',
    label: 'Green',
    bg: '#dcfce7',
    border: '#bbf7d0',
    text: '#15803d',
    dot: '#22c55e',
    tone: 'bg-green-500',
  },
  {
    value: 'red',
    label: 'Red',
    bg: '#fee2e2',
    border: '#fecaca',
    text: '#b91c1c',
    dot: '#ef4444',
    tone: 'bg-red-500',
  },
  {
    value: 'pink',
    label: 'Pink',
    bg: '#fce7f3',
    border: '#fbcfe8',
    text: '#be185d',
    dot: '#ec4899',
    tone: 'bg-pink-500',
  },
  {
    value: 'sky',
    label: 'Sky',
    bg: '#e0f2fe',
    border: '#bae6fd',
    text: '#0369a1',
    dot: '#0ea5e9',
    tone: 'bg-sky-500',
  },
  {
    value: 'gray',
    label: 'Gray',
    bg: '#f3f4f6',
    border: '#e5e7eb',
    text: '#374151',
    dot: '#9ca3af',
    tone: 'bg-gray-500',
  },
];

const TONE_ALIASES: Record<string, string> = {
  emerald: 'green',
  rose: 'pink',
  slate: 'gray',
  violet: 'purple',
  indigo: 'purple',
  cyan: 'sky',
};

export const normalizeHexColor = (color?: string | null) => {
  if (!color) return USER_COLOR_PALETTE[0].dot;

  const trimmed = color.trim();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((character) => character + character)
      .join('')}`.toLowerCase();
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return USER_COLOR_PALETTE[0].dot;
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

const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export const getContrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(normalizeHexColor(foreground));
  const backgroundLuminance = relativeLuminance(normalizeHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableTextColor = (background: string) => {
  const normalizedBackground = normalizeHexColor(background);
  const darkText = '#000000';
  const lightText = '#ffffff';
  return getContrastRatio(darkText, normalizedBackground) >=
    getContrastRatio(lightText, normalizedBackground)
    ? darkText
    : lightText;
};

export const isHexColor = (color?: string | null) =>
  Boolean(color?.trim().match(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i));

export const normalizePaletteColor = (color?: string | null, fallback = DEFAULT_PALETTE_COLOR) => {
  if (!color) return fallback;

  const normalized = color.trim().toLowerCase();
  if (USER_COLOR_PALETTE.some((option) => option.value === normalized)) return normalized;

  const toneMatch = normalized.match(/(?:bg|text|border)-([a-z]+)-\d+/);
  if (toneMatch) {
    const tone = TONE_ALIASES[toneMatch[1]] || toneMatch[1];
    if (USER_COLOR_PALETTE.some((option) => option.value === tone)) return tone;
  }

  const hex = normalized.startsWith('#') ? normalizeHexColor(normalized) : '';
  if (hex) {
    const match = USER_COLOR_PALETTE.find((option) => option.dot.toLowerCase() === hex);
    if (match) return match.value;
  }

  return fallback;
};

export const getPaletteColor = (color?: string | null): PaletteColor => {
  const raw = color?.trim();

  if (isHexColor(raw)) {
    const hex = normalizeHexColor(raw);
    const paletteMatch = USER_COLOR_PALETTE.find((option) => option.dot.toLowerCase() === hex);
    if (paletteMatch) return paletteMatch;

    return {
      value: hex,
      label: 'Custom',
      bg: rgb(hex, 0.13),
      border: rgb(hex, 0.28),
      text: hex,
      dot: hex,
      tone: hex,
    };
  }

  return (
    USER_COLOR_PALETTE.find((option) => option.value === normalizePaletteColor(color)) ||
    USER_COLOR_PALETTE[0]
  );
};

export const getPaletteColorFromTone = (tone?: string | null) => getPaletteColor(tone);

export const getToneForPaletteColor = (color?: string | null) => getPaletteColor(color).tone;
