export type HourlyInputUpdate = {
  hourly_rate: number | null;
  hours_per_day: number | null;
  working_days_per_week: number | null;
  total_hours_worked: number | null;
  overtime_hours: number | null;
  overtime_rate: number | null;
  overtime_multiplier: number | null;
  total_earnings_override: number | null;
};

export const SEGMENTS = [
  { key: 'base', label: 'Base Salary', color: '#2563eb' },
  { key: 'bonus', label: 'Bonus', color: '#10b981' },
  { key: 'equity', label: 'Equity / RSU', color: '#60a5fa' },
] as const;

export const fmtMoney = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const fmtNumber = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toInputValue = (value: number | null | undefined) =>
  value == null ? '' : String(value);

export const normalizeEditableNumber = (value: string | number | null | undefined) => {
  const parsed = toNullableNumber(value);
  if (parsed == null) return null;
  return Number(parsed.toFixed(2));
};

export const numbersMatch = (
  a: string | number | null | undefined,
  b: string | number | null | undefined
) => {
  if (a == null && b == null) return true;
  return normalizeEditableNumber(a) === normalizeEditableNumber(b);
};

export const getHourlyFieldLabel = (field: string | null) => {
  switch (field) {
    case 'hourly_rate':
      return 'hourly rate';
    case 'hours_per_day':
      return 'hours per day';
    case 'working_days_per_week':
      return 'working days per week';
    case 'total_hours_worked':
      return 'total hours worked';
    case 'overtime_hours':
      return 'overtime hours';
    case 'overtime_rate':
      return 'overtime rate';
    case 'overtime_multiplier':
      return 'OT multiplier';
    case 'total_earnings_override':
      return 'direct total override';
    default:
      return null;
  }
};
