import type { EmploymentType } from '../../types';
import { getPaletteColor, getPaletteColorFromTone } from '../../utils/colorPalette';
import type { ApplicationStage } from './applicationTypes';

export const StatusBadge = ({ status, stages }: { status: string; stages: ApplicationStage[] }) => {
  const stage = stages.find((s) => s.key === status);
  const c = getPaletteColorFromTone(stage?.tone);
  const label = stage ? stage.label : status;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ color: c.text, background: c.bg, borderColor: c.border }}
    >
      {label}
    </span>
  );
};

export const EmploymentTypeBadge = ({
  type,
  employmentTypes,
}: {
  type?: string | null;
  employmentTypes: EmploymentType[];
}) => {
  if (!type || type === 'full_time') return null;
  const meta = employmentTypes.find((t) => t.value === type);
  if (!meta) return null;
  const c = getPaletteColor(meta.color);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ color: c.text, background: c.bg, borderColor: c.border }}
    >
      {meta.label}
    </span>
  );
};
