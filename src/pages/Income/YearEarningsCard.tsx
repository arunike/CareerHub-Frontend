import { Tooltip } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { usePersistedState } from '../../hooks/usePersistedState';
import FigureMath from './FigureMath';
import {
  deductionsBreakdown,
  employee401kBreakdown,
  grossBreakdown,
  takeHomeBreakdown,
  taxBreakdown,
  totalCompBreakdown,
  type MathBreakdown,
} from './mathBreakdown';
import type { RoleEarnings, YearEarnings } from './yearSummary';
import { useMoney } from './amountPrivacy';
import { percent } from './format';

interface Props {
  summary: YearEarnings;
  history: YearEarnings[];
  taxYear: number;
  onSelectRole: (key: string) => void;
  onSelectYear: (year: number) => void;
}

const SEGMENTS = [
  { key: 'takeHome', label: 'Take-home', tone: 'bg-emerald-500' },
  { key: 'taxWithheld', label: 'Tax', tone: 'bg-rose-400' },
  { key: 'deductions', label: 'Deductions', tone: 'bg-amber-400' },
  { key: 'employerMatch', label: '401(k) match', tone: 'bg-sky-500' },
] as const;

// Only the numeric role fields can head a column, so the cells stay typed as amounts.
const ROLE_COLUMNS: Array<{
  key: 'equityVested' | 'bonus' | 'employee401k' | 'employerMatch';
  label: string;
}> = [
  { key: 'equityVested', label: 'Vested' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'employee401k', label: 'Your 401(k)' },
  { key: 'employerMatch', label: 'Match' },
];

const DEFERRAL_TONES = ['bg-amber-600', 'bg-amber-500', 'bg-amber-400', 'bg-amber-300'] as const;
const OVER_TONES = ['bg-rose-600', 'bg-rose-500', 'bg-rose-400', 'bg-rose-300'] as const;

const Figure = ({
  label,
  value,
  hint,
  breakdown,
  tone = 'text-slate-900',
}: {
  label: string;
  value: number;
  hint?: string;
  breakdown?: MathBreakdown;
  tone?: string;
}) => {
  const { money } = useMoney();
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        <FigureMath label={label} hint={hint} breakdown={breakdown} />
      </span>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{money(value)}</p>
    </div>
  );
};

// Labels once in a header, one column per value; a column no role uses is dropped.
const RoleBreakdown = ({
  roles,
  onSelectRole,
}: {
  roles: RoleEarnings[];
  onSelectRole: (key: string) => void;
}) => {
  const { money } = useMoney();
  const columns = ROLE_COLUMNS.filter((column) => roles.some((role) => role[column.key] > 0));

  const template = `minmax(0,2.2fr) repeat(${columns.length + 1}, minmax(0,1fr)) minmax(6rem,1.1fr)`;

  return (
    <div className="border-t border-slate-100 px-6 py-4">
      <div
        className="hidden items-baseline gap-x-4 px-2 pb-2 sm:grid"
        style={{ gridTemplateColumns: template }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          By role
        </span>
        {columns.map((column) => (
          <span
            key={column.key}
            className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500"
          >
            {column.label}
          </span>
        ))}
        <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Paychecks
        </span>
        <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Total comp
        </span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:hidden">
        By role
      </span>

      <div className="mt-1 space-y-1 sm:mt-0 sm:space-y-0">
        {roles.map((role) => (
          <button
            key={role.sourceKey}
            type="button"
            onClick={() => onSelectRole(role.sourceKey)}
            style={{ gridTemplateColumns: template }}
            className="flex w-full flex-col gap-1 rounded-lg border border-slate-100 px-3 py-2.5 text-left transition hover:bg-slate-50 sm:grid sm:items-baseline sm:gap-x-4 sm:gap-y-0 sm:rounded-md sm:border-0 sm:px-2 sm:py-2"
          >
            <span className="min-w-0 sm:truncate">
              <span className="text-sm font-medium text-slate-800">{role.company}</span>
              <span className="ml-2 text-xs text-slate-500">{role.roleTitle}</span>
            </span>
            {columns.map((column) => {
              const value = role[column.key];
              return (
                <span
                  key={column.key}
                  // The dash keeps the desktop column aligned; the phone has its own label.
                  className={`items-baseline justify-between gap-2 text-xs tabular-nums text-slate-700 sm:flex sm:justify-end ${
                    value > 0 ? 'flex' : 'hidden'
                  }`}
                >
                  <span className="text-slate-500 sm:hidden">{column.label}</span>
                  {value > 0 ? money(value) : <span className="text-slate-400">—</span>}
                </span>
              );
            })}
            <span className="flex items-baseline justify-between gap-2 text-xs tabular-nums text-slate-500 sm:justify-end">
              <span className="text-slate-500 sm:hidden">Paychecks</span>
              {role.paychecks}
            </span>
            <span className="mt-0.5 flex items-baseline justify-between gap-2 border-t border-slate-100 pt-1.5 sm:mt-0 sm:justify-end sm:border-0 sm:pt-0">
              <span className="text-xs text-slate-500 sm:hidden">Total comp</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {money(role.totalComp)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// The 402(g) limit follows the person across every employer, so it belongs on the year.
const ElectiveLimitBar = ({ summary }: { summary: YearEarnings }) => {
  const { money } = useMoney();
  const share = Math.min(1, summary.employee401k / summary.electiveLimit);
  const remaining = summary.electiveLimit - summary.employee401k;
  const isOver = remaining < -0.005;
  // Biggest deferral first, so the bar and its legend read in the same order.
  const deferrals = summary.roles
    .filter((role) => role.employee401k > 0)
    .sort((a, b) => b.employee401k - a.employee401k);
  const roleCount = deferrals.length;
  // A finished year cannot be topped up, so it reports what went unused rather than what is left.
  const isClosedYear = summary.taxYear < new Date().getFullYear();

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Your 401(k)
          <FigureMath
            label="Your 401(k)"
            breakdown={employee401kBreakdown(
              summary,
              deferrals.map((role) => ({ label: role.company, parts: role }))
            )}
            hint="Traditional and Roth together, which is what the annual elective deferral limit counts. The employer match sits outside it."
          />
        </span>
        <span className="text-xs tabular-nums text-slate-500">
          <span className="font-semibold text-amber-700">{money(summary.employee401k)}</span> of{' '}
          {money(summary.electiveLimit)} limit
        </span>
      </div>
      {/* One segment per payroll, the split the limit cannot see; over it, all rose. */}
      <div className="mt-2 flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-slate-100">
        {deferrals.map((role, index) => (
          <Tooltip
            key={role.sourceKey}
            title={`${role.company} ${money(role.employee401k)}`}
            placement="top"
          >
            <span
              className={`h-full ${(isOver ? OVER_TONES : DEFERRAL_TONES)[index % DEFERRAL_TONES.length]}`}
              style={{
                width: `${(role.employee401k / Math.max(summary.employee401k, 1)) * share * 100}%`,
                minWidth: 3,
              }}
            />
          </Tooltip>
        ))}
      </div>
      {deferrals.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {deferrals.map((role, index) => (
            <span
              key={role.sourceKey}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
            >
              <span
                className={`h-2 w-2 rounded-full ${(isOver ? OVER_TONES : DEFERRAL_TONES)[index % DEFERRAL_TONES.length]}`}
              />
              {role.company}
              <span className="tabular-nums text-slate-500">{money(role.employee401k)}</span>
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {isOver ? (
          <span className="font-semibold text-rose-600">
            {money(-remaining)} over the limit — the excess has to be returned before April 15 or it
            is taxed twice.
          </span>
        ) : remaining < 0.005 ? (
          <span className="font-semibold text-amber-700">Limit reached.</span>
        ) : isClosedYear ? (
          <>{money(remaining)} of the limit went unused.</>
        ) : (
          <>{money(remaining)} left to defer this year.</>
        )}
        {roleCount > 1
          ? ` The limit is per person, not per employer, and ${roleCount} payrolls paid into it — one payroll cannot see another's deferrals.`
          : ''}
      </p>

      <RetirementGain summary={summary} />
    </div>
  );
};

// Contributions say what went in; only the balances say what the market did with it.
const RetirementGain = ({ summary }: { summary: YearEarnings }) => {
  const { money } = useMoney();
  const performance = summary.retirement;

  if (!performance) {
    return (
      <p className="mt-3 border-t border-dashed border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
        Record the opening and closing balances on the 401(k) tab and this year&rsquo;s investment
        gain appears here, separated from the money you paid in.
      </p>
    );
  }

  const up = performance.gain >= 0;
  return (
    <div className="mt-3 border-t border-dashed border-slate-100 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Investment gain
        </span>
        <span className="text-xs tabular-nums">
          <span className={`font-semibold ${up ? 'text-emerald-700' : 'text-rose-600'}`}>
            {up ? '+' : '−'}
            {money(Math.abs(performance.gain))}
          </span>
          {performance.gainPercent !== null ? (
            <span className="text-slate-500">
              {' '}
              · {percent(Math.abs(performance.gainPercent), 1)}
            </span>
          ) : null}
        </span>
      </div>
      {performance.roles.length > 1 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {performance.roles.map((role) => (
            <span
              key={role.sourceKey}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
            >
              {role.company}
              <span
                className={`tabular-nums ${role.gain >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
              >
                {role.gain >= 0 ? '+' : '−'}
                {money(Math.abs(role.gain))}
              </span>
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        {money(performance.currentValue)} today, less {money(performance.startingBalance)} at the
        start and {money(performance.contributed)} paid in so far — contributions still to come this
        year are left out, since today&rsquo;s balance cannot hold them. A simple return, not
        time-weighted: December&rsquo;s contribution has had far less time to grow than
        January&rsquo;s.
        {performance.uncountedRoles > 0
          ? ` ${performance.uncountedRoles} more ${performance.uncountedRoles === 1 ? 'payroll' : 'payrolls'} contributed but recorded no balances, so ${performance.uncountedRoles === 1 ? 'it is' : 'they are'} left out entirely.`
          : ''}
      </p>
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

  // Built once so a line and its attribution always read the same field off the same role.
  const sources = summary.roles.map((role) => ({ label: role.company, parts: role }));

  const peak = Math.max(...history.map((year) => year.totalComp), 1);
  // Summed rather than reusing totalComp, so a tax-free allowance cannot leave a gap.
  const segmentTotal = (year: YearEarnings) =>
    year.takeHome + year.taxWithheld + year.deductions + year.employerMatch;

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
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            <Figure
              label="Gross"
              value={summary.gross}
              breakdown={grossBreakdown(summary, sources)}
            />
            <Figure
              label="Tax withheld"
              value={summary.taxWithheld}
              breakdown={taxBreakdown(summary, sources)}
              tone="text-rose-600"
            />
            <Figure
              label="Deductions"
              value={summary.deductions}
              breakdown={deductionsBreakdown(summary, sources)}
              tone="text-amber-600"
            />
            <Figure
              label="Take-home"
              value={summary.takeHome}
              breakdown={takeHomeBreakdown(summary, sources)}
              tone="text-emerald-600"
            />
            <Figure
              label="401(k) match"
              value={summary.employerMatch}
              hint="Employer money, so this is the only figure here that adds on top of gross."
              tone="text-sky-600"
            />
            <Figure
              label="Total comp"
              value={summary.totalComp}
              breakdown={totalCompBreakdown(summary, sources)}
            />
          </div>
        )}

        {collapsed ||
        summary.electiveLimit <= 0 ||
        (summary.employee401k <= 0 && summary.employerMatch <= 0) ? null : (
          <ElectiveLimitBar summary={summary} />
        )}
      </div>

      {collapsed ? null : <RoleBreakdown roles={summary.roles} onSelectRole={onSelectRole} />}

      {!collapsed && history.length > 1 ? (
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              By year
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {SEGMENTS.map((segment) => (
                <span
                  key={segment.key}
                  className="flex items-center gap-1.5 text-[11px] text-slate-500"
                >
                  <span className={`h-2 w-2 rounded-full ${segment.tone}`} />
                  {segment.label}
                </span>
              ))}
            </div>
          </div>
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
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="flex h-full overflow-hidden rounded-full"
                    style={{ width: `${(year.totalComp / peak) * 100}%` }}
                  >
                    {SEGMENTS.map((segment) => {
                      const amount = year[segment.key];
                      if (amount <= 0) return null;
                      const share = segmentTotal(year) > 0 ? amount / segmentTotal(year) : 0;
                      return (
                        <Tooltip key={segment.key} title={`${segment.label} ${money(amount)}`}>
                          <span
                            className={`h-full ${segment.tone}`}
                            style={{ width: `${share * 100}%`, minWidth: 2 }}
                          />
                        </Tooltip>
                      );
                    })}
                  </span>
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
