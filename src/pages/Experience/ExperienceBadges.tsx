import type { EmploymentType } from '../../types';
import { BADGE_CLASSES } from './experienceUtils';

export const EmploymentBadge = ({
  type,
  empTypes,
}: {
  type?: string;
  empTypes: EmploymentType[];
}) => {
  if (!type) return null;
  const meta = empTypes.find((t) => t.value === type);
  if (!meta) return null;

  if (type === empTypes[0]?.value) return null;
  const cls =
    BADGE_CLASSES[meta.color] ??
    'bg-gray-50 dark:bg-ink-900 text-gray-700 dark:text-ink-100 border-gray-200 dark:border-white/[0.08]';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {meta.label}
    </span>
  );
};
