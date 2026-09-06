import { useTheme } from './ThemeProvider';

// Recharts takes hex props, so a chart cannot answer `dark:`; full saturation reads fluorescent.
const LIGHT_SERIES = {
  base: '#2563eb',
  bonus: '#60a5fa',
  equity: '#ec4899',
  signOn: '#14b8a6',
  benefits: '#f59e0b',
  positive: '#10b981',
  negative: '#e11d48',
  neutral: '#94a3b8',
};

const DARK_SERIES = {
  base: '#5b8def',
  bonus: '#8fb6ff',
  equity: '#d2739a',
  signOn: '#4fb8a5',
  benefits: '#d9a441',
  positive: '#4fc08a',
  negative: '#e2727f',
  neutral: '#6e727b',
};

export type ChartSeries = typeof LIGHT_SERIES;

export const chartSeriesFor = (theme: 'light' | 'dark'): ChartSeries =>
  theme === 'dark' ? DARK_SERIES : LIGHT_SERIES;

export const useChartSeries = (): ChartSeries => chartSeriesFor(useTheme().resolved);

// Axes and gridlines follow the surface, not the data.
export const chartAxisFor = (theme: 'light' | 'dark') =>
  theme === 'dark'
    ? { axis: '#6e727b', grid: 'rgba(255,255,255,0.10)', label: '#8a8e97' }
    : { axis: '#94a3b8', grid: 'rgba(15,23,42,0.12)', label: '#64748b' };

export const useChartAxis = () => chartAxisFor(useTheme().resolved);
