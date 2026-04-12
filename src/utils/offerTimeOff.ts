const normalizeDayCount = (value: number | string | null | undefined) => {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatPtoLabel = (
  ptoDays: number | string | null | undefined,
  isUnlimitedPto = false,
  compact = false,
) => {
  if (isUnlimitedPto) return 'Unlimited';
  const days = normalizeDayCount(ptoDays);
  return compact ? `${days}d` : `${days} days`;
};

export const formatTimeOffSummary = ({
  ptoDays,
  holidayDays,
  isUnlimitedPto = false,
}: {
  ptoDays: number | string | null | undefined;
  holidayDays: number | string | null | undefined;
  isUnlimitedPto?: boolean;
}) => {
  const holidays = normalizeDayCount(holidayDays);
  if (isUnlimitedPto) {
    return `Unlimited PTO + ${holidays} holidays`;
  }
  const days = normalizeDayCount(ptoDays);
  return `${days} PTO days + ${holidays} holidays`;
};
