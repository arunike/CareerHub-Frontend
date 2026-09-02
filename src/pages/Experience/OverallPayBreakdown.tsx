import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import SegmentedToggle from '../../components/SegmentedToggle';
import { PayPartsPanel } from './PayPartsPanel';
import { fmtMoney } from './compensationBreakdownFormat';
import { buildComponentBreakdown, totalOf, yearsIn, type YearGroup } from './earningsByYear';

const money = (value: number) => fmtMoney(Math.round(value));

export const OverallPayBreakdown = ({
  groups,
  skipped = [],
}: {
  groups: YearGroup[];
  skipped?: { company: string; roleTitle: string; reason: string }[];
}) => {
  const years = yearsIn(groups);
  const [scope, setScope] = useState<string>('all');
  const selected = scope === 'all' ? 'all' : Number(scope);

  const parts = useMemo(() => buildComponentBreakdown(groups, selected), [groups, selected]);
  const panelParts = parts.map((part) => ({
    key: part.key,
    label: part.label,
    color: part.color,
    total: part.total,
    members: part.roles.map((role) => ({
      key: role.key,
      label: role.company,
      sublabel: role.roleTitle,
      value: role.value,
      color: role.color,
    })),
  }));
  const allTime = totalOf(groups);
  const scoped = parts.reduce((sum, part) => sum + part.total, 0);

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-gray-500">
        Add a start date and pay to a role to see what you earned.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          Earned all time
        </div>
        <div className="mt-2 text-3xl font-bold text-gray-900">{money(allTime)}</div>
        <div className="mt-1 text-sm text-gray-500">
          Every full-time year on record{years.length > 0 && `, ${years.at(-1)}–${years[0]}`}
        </div>

        {years.length > 1 && (
          <div className="mt-4 overflow-x-auto">
            <SegmentedToggle
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'All years' },
                ...years.map((year) => ({ value: String(year), label: String(year) })),
              ]}
              wrapperClassName="w-max"
            />
          </div>
        )}

        {selected !== 'all' && (
          <div className="mt-3 flex items-baseline justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
            <span className="text-xs font-medium text-slate-500">
              Earned in {selected}
              {/* A year still running is paid to date, not a full year, so say which. */}
              {selected === dayjs().year() && (
                <span className="text-slate-400"> · to {dayjs().format('D MMM')}</span>
              )}
            </span>
            <span className="text-sm font-semibold text-slate-900">{money(scoped)}</span>
          </div>
        )}

        <div className="mt-5">
          <PayPartsPanel
            parts={panelParts}
            total={scoped}
            chartEmpty={
              selected === 'all' ? 'No pay recorded yet' : `Nothing earned in ${selected}`
            }
            memberNoun="role"
          />
        </div>
      </div>

      {skipped.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800">
          Not counted:{' '}
          {skipped
            .map(
              (role) =>
                `${role.company}${role.roleTitle ? ` · ${role.roleTitle}` : ''} (${role.reason})`
            )
            .join(', ')}
        </div>
      )}
    </div>
  );
};

export default OverallPayBreakdown;
