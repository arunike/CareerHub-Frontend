import { DollarOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons';
import type { ExperienceCompensationSnapshot } from './compensation';
import type { RoleDateLabel } from './roleTimeline';

const META_TEXT = 'text-[12.5px] leading-5';
const MONEY_PILL =
  'inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 text-[12.5px] font-semibold tabular-nums text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100/70 sm:min-h-7 sm:w-auto sm:justify-start sm:px-2.5';
const MONEY_STATIC =
  'inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-2.5 py-0.5 text-[12.5px] font-semibold tabular-nums text-emerald-700';

const Dot = ({ className = '' }: { className?: string }) => (
  <span className={`text-slate-300 ${className}`}>·</span>
);

const money = (value: number, maximumFractionDigits = 0) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;

const RoleMetaRow = ({
  dates,
  location,
  teamChip,
  comp,
  employmentType,
  hourlyRate,
  onOpenBreakdown,
  describedRole,
}: {
  dates: RoleDateLabel;
  location?: string | null;
  // Internships show the team here; longer-term roles show it on its own line under this one.
  teamChip?: string | null;
  comp: ExperienceCompensationSnapshot | null;
  employmentType?: string;
  hourlyRate?: number | string | null;
  onOpenBreakdown: () => void;
  describedRole: string;
}) => {
  const isInternship = employmentType === 'internship';
  const hourly = comp?.kind === 'hourly' ? comp : null;
  const salary = comp?.kind === 'salary' ? comp : null;

  const earnings = (total: number, title: string, maximumFractionDigits = 0) => (
    <button
      type="button"
      onClick={onOpenBreakdown}
      title={title}
      aria-label={`${title} for ${describedRole}`}
      className={MONEY_PILL}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <DollarOutlined className="shrink-0 text-emerald-500" style={{ fontSize: 11 }} />
        <span className="truncate">{money(total, maximumFractionDigits)} total earnings</span>
      </span>
      {/* antd's .anticon sets display unlayered, so Tailwind can only hide a wrapper. */}
      <span className="shrink-0 text-[9px] text-emerald-600/70 sm:hidden">
        <RightOutlined />
      </span>
    </button>
  );

  return (
    <div className="mt-1.5 space-y-1.5">
      <div
        className={`flex flex-col gap-y-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 ${META_TEXT}`}
      >
        <span className="flex min-w-0 flex-col gap-y-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
          <span className="whitespace-nowrap font-medium tabular-nums text-slate-600">
            {dates.range}
          </span>
          {dates.detail && (
            <>
              <Dot className="hidden sm:inline" />
              <span className="tabular-nums text-slate-400">{dates.detail}</span>
            </>
          )}
        </span>
        {location && (
          <>
            <Dot className="hidden sm:inline" />
            <span className="min-w-0 truncate text-slate-500">{location}</span>
          </>
        )}
        {teamChip && (
          <>
            <Dot className="hidden sm:inline" />
            <span className="inline-flex min-w-0 items-center gap-1 text-slate-500">
              <TeamOutlined className="shrink-0 text-slate-300" style={{ fontSize: 11 }} />
              <span className="truncate">{teamChip}</span>
            </span>
          </>
        )}
      </div>

      {isInternship && hourly && earnings(hourly.total, 'View internship earnings breakdown', 2)}

      {isInternship && !hourly && hourlyRate != null && (
        <div className={MONEY_STATIC}>
          <DollarOutlined className="shrink-0 text-emerald-500" style={{ fontSize: 11 }} />
          <span className="truncate">${Number(hourlyRate).toFixed(2)}/hr</span>
        </div>
      )}

      {!isInternship && salary && employmentType === 'full_time' && (
        <div className="flex min-w-0">{earnings(salary.total, 'View pay structure breakdown')}</div>
      )}

      {!isInternship && salary && employmentType !== 'full_time' && (
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${META_TEXT}`}>
          <span className="font-semibold tabular-nums text-emerald-700">
            {money(salary.base)} base
          </span>
          {salary.bonus > 0 && (
            <>
              <Dot className="hidden sm:inline" />
              <span className="tabular-nums text-slate-500">+ {money(salary.bonus)} bonus</span>
            </>
          )}
          {salary.equity > 0 && (
            <>
              <Dot className="hidden sm:inline" />
              <span className="tabular-nums text-slate-500">+ {money(salary.equity)} RSU/yr</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleMetaRow;
