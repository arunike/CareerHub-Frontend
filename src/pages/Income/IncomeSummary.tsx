import { Select, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { LedgerTotals } from './tax/ledger';
import type { IncomeSource } from './incomeSources';
import { formatPayDate } from './paySchedule';
import { useMoney } from './amountPrivacy';

interface RoleOption {
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface Props {
  source: IncomeSource | null;
  totals: LedgerTotals;
  paidPeriodCount: number;
  paychecksPerYear: number;
  stateAbbr: string;
  stateLabel: string;
  taxYear: number;
  rates: { calculated: number; actual: number | null; comparedCount: number };
  roleOptions: RoleOption[];
  onSelectRole: (key: string) => void;
}

const LEGEND = [
  { key: 'net', label: 'Take-home', tone: 'bg-emerald-500' },
  { key: 'tax', label: 'Tax', tone: 'bg-rose-400' },
  { key: 'pretax', label: 'Pre-tax', tone: 'bg-sky-500' },
  { key: 'posttax', label: 'Post-tax', tone: 'bg-amber-400' },
] as const;

const Meta = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center gap-1.5 text-xs text-slate-500">{children}</span>
);

export const IncomeSummary = ({
  source,
  totals,
  paidPeriodCount,
  paychecksPerYear,
  stateAbbr,
  stateLabel,
  taxYear,
  rates,
  roleOptions,
  onSelectRole,
}: Props) => {
  const { money } = useMoney();
  const gross = Math.max(totals.gross, 1);
  const preTax = totals.section125 + totals.hsa + totals.pretax401k + totals.pretaxIncomeOnly;
  const shares = {
    net: totals.net / gross,
    tax: totals.taxTotal / gross,
    pretax: preTax / gross,
    posttax: totals.postTax / gross,
  };

  const window = source?.startDate
    ? `${formatPayDate(source.startDate)} — ${source.endDate ? formatPayDate(source.endDate) : 'present'}`
    : null;

  return (
    <div className="enterprise-card overflow-hidden">
      <div className="bg-gradient-to-br from-slate-50 to-white px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {source?.company ?? 'No role'}
              </span>
              {source?.roleTitle ? (
                <span className="truncate text-[11px] uppercase tracking-wider text-slate-400">
                  · {source.roleTitle}
                </span>
              ) : null}
              {source && !source.isCurrent ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Past role
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-xs font-medium text-slate-500">Take-home in {taxYear}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                {money(totals.net)}
              </span>
              <span className="text-sm text-slate-500">of {money(totals.gross)} gross</span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Role
              <Tooltip title="Every role from your Experience page is listed here, alongside your current offer.">
                <InfoCircleOutlined className="text-slate-300" />
              </Tooltip>
            </span>
            <Select
              className="w-full sm:w-[280px]"
              value={source?.key}
              options={roleOptions}
              onChange={onSelectRole}
            />
          </div>
        </div>

        <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          {LEGEND.map((item) =>
            shares[item.key] > 0.002 ? (
              <div
                key={item.key}
                className={item.tone}
                style={{ width: `${shares[item.key] * 100}%` }}
              />
            ) : null
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {LEGEND.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${item.tone}`} />
              {item.label}
              <span className="font-medium tabular-nums text-slate-700">
                {(shares[item.key] * 100).toFixed(0)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 bg-white px-6 py-3">
        <Meta>
          <span className="font-medium text-slate-700">{paidPeriodCount}</span> of{' '}
          {paychecksPerYear} paychecks
        </Meta>
        {window ? <Meta>{window}</Meta> : null}
        <Meta>
          <span className="font-medium text-slate-700">{(rates.calculated * 100).toFixed(1)}%</span>{' '}
          effective tax rate
          {rates.actual !== null ? (
            <span
              className={rates.actual > rates.calculated ? 'text-rose-600' : 'text-emerald-600'}
            >
              {' '}
              · {(rates.actual * 100).toFixed(1)}% on {rates.comparedCount} recorded
            </span>
          ) : null}
        </Meta>
        <Meta>{stateAbbr ? stateLabel : 'No residence state set'}</Meta>
      </div>
    </div>
  );
};

export default IncomeSummary;
