import { useTheme } from './ThemeProvider';

// Recharts takes hex props, so a chart cannot answer `dark:`; full saturation reads fluorescent.
const LIGHT_SERIES = {
  base: '#2563eb',
  bonus: '#16a34a',
  equity: '#ec4899',
  signOn: '#14b8a6',
  benefits: '#f59e0b',
  positive: '#10b981',
  negative: '#e11d48',
  neutral: '#94a3b8',
};

const DARK_SERIES = {
  base: '#5b8def',
  bonus: '#3fbf6a',
  equity: '#d2739a',
  signOn: '#4fb8a5',
  benefits: '#d9a441',
  positive: '#4fc08a',
  negative: '#e2727f',
  neutral: '#6e727b',
};

export type ChartSeries = typeof LIGHT_SERIES;

export const chartSeriesForTheme = (theme: 'light' | 'dark'): ChartSeries =>
  theme === 'dark' ? DARK_SERIES : LIGHT_SERIES;

export const useChartSeries = (): ChartSeries => chartSeriesForTheme(useTheme().resolved);

// Axes and gridlines follow the surface, not the data.
const chartAxisFor = (theme: 'light' | 'dark') =>
  theme === 'dark'
    ? { axis: '#6e727b', grid: 'rgba(255,255,255,0.10)', label: '#8a8e97' }
    : { axis: '#94a3b8', grid: 'rgba(15,23,42,0.12)', label: '#64748b' };

export const useChartAxis = () => chartAxisFor(useTheme().resolved);

const LIGHT_CATEGORICAL = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#e11d48',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
];

const DARK_CATEGORICAL = [
  '#5b8def',
  '#4fc08a',
  '#d9a441',
  '#e2727f',
  '#a98ce4',
  '#4fb8c6',
  '#d2739a',
];

export const chartCategoricalForTheme = (theme: 'light' | 'dark'): string[] =>
  theme === 'dark' ? DARK_CATEGORICAL : LIGHT_CATEGORICAL;

export const useChartCategorical = (): string[] => chartCategoricalForTheme(useTheme().resolved);
