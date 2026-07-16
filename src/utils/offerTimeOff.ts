const normalizeDayCount = (value: number | string | null | undefined) => {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatPtoLabel = (
  ptoDays: number | string | null | undefined,
  isUnlimitedPto = false,
  compact = false
) => {
  if (isUnlimitedPto) return 'Unlimited';
  const days = normalizeDayCount(ptoDays);
  return compact ? `${days}d` : `${days} days`;
};

export const getCountedSickLeaveDays = ({
  sickLeaveDays,
  isUnlimitedPto = false,
  sickLeaveIncludedInUnlimitedPto = true,
}: {
  sickLeaveDays: number | string | null | undefined;
  isUnlimitedPto?: boolean;
  sickLeaveIncludedInUnlimitedPto?: boolean;
}) => {
  if (isUnlimitedPto && sickLeaveIncludedInUnlimitedPto) return 0;
  return Math.max(0, normalizeDayCount(sickLeaveDays));
};

export const formatTimeOffSummary = ({
  ptoDays,
  sickLeaveDays,
  holidayDays,
  isUnlimitedPto = false,
  sickLeaveIncludedInUnlimitedPto = true,
}: {
  ptoDays: number | string | null | undefined;
  sickLeaveDays?: number | string | null;
  holidayDays: number | string | null | undefined;
  isUnlimitedPto?: boolean;
  sickLeaveIncludedInUnlimitedPto?: boolean;
}) => {
  const holidays = normalizeDayCount(holidayDays);
  const sickDays = getCountedSickLeaveDays({
    sickLeaveDays,
    isUnlimitedPto,
    sickLeaveIncludedInUnlimitedPto,
  });
  if (isUnlimitedPto) {
    const sickLabel = sickLeaveIncludedInUnlimitedPto
      ? 'sick leave included'
      : `${sickDays} sick days`;
    return `Unlimited PTO + ${sickLabel} + ${holidays} holidays`;
  }
  const days = normalizeDayCount(ptoDays);
  return `${days} PTO days + ${sickDays} sick days + ${holidays} holidays`;
};
