export type HolidayTabColor = {
  value: string;
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
};

export const HOLIDAY_TAB_COLOR_OPTIONS: HolidayTabColor[] = [
  {
    value: 'green',
    label: 'Green',
    bg: '#dcfce7',
    border: '#bbf7d0',
    text: '#15803d',
    dot: '#22c55e',
  },
  {
    value: 'blue',
    label: 'Blue',
    bg: '#dbeafe',
    border: '#bfdbfe',
    text: '#1d4ed8',
    dot: '#3b82f6',
  },
  {
    value: 'teal',
    label: 'Teal',
    bg: '#ccfbf1',
    border: '#99f6e4',
    text: '#0f766e',
    dot: '#14b8a6',
  },
  {
    value: 'amber',
    label: 'Amber',
    bg: '#fef3c7',
    border: '#fde68a',
    text: '#b45309',
    dot: '#f59e0b',
  },
  {
    value: 'purple',
    label: 'Purple',
    bg: '#ede9fe',
    border: '#ddd6fe',
    text: '#7c3aed',
    dot: '#8b5cf6',
  },
  {
    value: 'orange',
    label: 'Orange',
    bg: '#ffedd5',
    border: '#fed7aa',
    text: '#c2410c',
    dot: '#f97316',
  },
  { value: 'red', label: 'Red', bg: '#fee2e2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' },
  {
    value: 'pink',
    label: 'Pink',
    bg: '#fce7f3',
    border: '#fbcfe8',
    text: '#be185d',
    dot: '#ec4899',
  },
  { value: 'sky', label: 'Sky', bg: '#e0f2fe', border: '#bae6fd', text: '#0369a1', dot: '#0ea5e9' },
  {
    value: 'gray',
    label: 'Gray',
    bg: '#f3f4f6',
    border: '#e5e7eb',
    text: '#374151',
    dot: '#9ca3af',
  },
];

export const DEFAULT_HOLIDAY_TAB_COLOR = 'green';

export const getHolidayTabColor = (color?: string | null) =>
  HOLIDAY_TAB_COLOR_OPTIONS.find((option) => option.value === color) ??
  HOLIDAY_TAB_COLOR_OPTIONS.find((option) => option.value === DEFAULT_HOLIDAY_TAB_COLOR)!;
