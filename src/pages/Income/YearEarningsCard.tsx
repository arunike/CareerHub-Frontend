import { Tooltip } from 'antd';
import { DownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { usePersistedState } from '../../hooks/usePersistedState';
import type { YearEarnings } from './yearSummary';
import { useMoney } from './amountPrivacy';

interface Props {
  summary: YearEarnings;
  history: YearEarnings[];
  taxYear: number;
  onSelectRole: (key: string) => void;
  onSelectYear: (year: number) => void;
}

const Figure = ({
  label,
  value,
  hint,
  tone = 'text-slate-900',
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: string;
}) => {
  const { money } = useMoney();
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {hint ? (
          <Tooltip title={hint}>
            <InfoCircleOutlined className="text-slate-300" />
          </Tooltip>
        ) : null}
      </span>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{money(value)}</p>
    </div>
  );
};

export const YearEarningsCard = ({
  summary,
  history,
  taxYear,
  onSelectRole,
  onSelectYear,
}: Props) => {
  const { money } = useMoney();
  const [collapsed, setCollapsed] = usePersistedState<boolean>(
    'careerhub.income.yearSummaryCollapsed',
    false
  );
  if (summary.roles.length === 0) return null;

  const peak = Math.max(...history.map((year) => year.totalComp), 1);

  return (
    <div className="enterprise-card overflow-hidden">
      <div className="bg-gradient-to-br from-slate-50 to-white px-6 py-5">
        <button
          type="button"
          onClick={() => setCollapsed((previous) => !previous)}
          aria-expanded={!collapsed}
          className="flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-left"
        >
          <div className="flex items-baseline gap-2">
            <DownOutlined
              className={`text-[10px] text-slate-400 transition-transform ${
                collapsed ? '-rotate-90' : ''
              }`}
            />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                All roles in {taxYear}
              </span>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {money(summary.totalComp)}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            {summary.roles.length === 1 ? '1 role' : `${summary.roles.length} roles`} ·{' '}
            {summary.roles.reduce((total, role) => total + role.paychecks, 0)} paychecks
          </span>
        </button>

        {collapsed ? null : (
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            <Figure
              label="Gross"
              value={summary.gross}
              hint="Everything payroll reported as wages, which already includes any bonus and any equity that vested."
            />
            <Figure label="Tax withheld" value={summary.taxWithheld} tone="text-rose-600" />
            <Figure label="Take-home" value={summary.takeHome} tone="text-emerald-600" />
            <Figure
              label="401(k) match"
              value={summary.employerMatch}
              hint="Employer money, so this is the only figure here that adds on top of gross."
              tone="text-sky-600"
            />
            <Figure
              label="Total comp"
              value={summary.totalComp}
              hint="Gross plus the employer match. Bonus and vested equity are already inside gross, so adding them again would double count."
            />
          </div>
        )}
      </div>

      {collapsed ? null : (
        <div className="border-t border-slate-100 px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            By role
          </span>
          <div className="mt-2 space-y-1">
            {summary.roles.map((role) => (
              <button
                key={role.sourceKey}
                type="button"
                onClick={() => onSelectRole(role.sourceKey)}
                className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-slate-800">{role.company}</span>
                  <span className="ml-2 text-xs text-slate-500">{role.roleTitle}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-4 text-xs tabular-nums text-slate-500">
                  {role.equityVested > 0 ? <span>{money(role.equityVested)} vested</span> : null}
                  {role.bonus > 0 ? <span>{money(role.bonus)} bonus</span> : null}
                  <span>{role.paychecks} paychecks</span>
                  <span className="w-24 text-right text-sm font-semibold text-slate-900">
                    {money(role.totalComp)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!collapsed && history.length > 1 ? (
        <div className="border-t border-slate-100 px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            By year
          </span>
          <div className="mt-2 space-y-1">
            {history.map((year) => (
              <button
                key={year.taxYear}
                type="button"
                onClick={() => onSelectYear(year.taxYear)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50 ${
                  year.taxYear === taxYear ? 'bg-slate-50' : ''
                }`}
              >
                <span className="w-10 shrink-0 text-xs font-medium tabular-nums text-slate-600">
                  {year.taxYear}
                </span>
                <span className="w-16 shrink-0 text-xs text-slate-400">
                  {year.roles.length === 1 ? '1 role' : `${year.roles.length} roles`}
                </span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-slate-300"
                    style={{ width: `${Math.max(2, (year.totalComp / peak) * 100)}%` }}
                  />
                </span>
                <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">
                  {money(year.totalComp)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default YearEarningsCard;
