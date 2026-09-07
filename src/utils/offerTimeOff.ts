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
