import { SEGMENTS, fmtMoney } from './compensationBreakdownFormat';
import { PayPie, PayStackedBar, shadesFor } from './PayChart';
import { EditNotice } from './breakdownRows';
import type { YearEarnings } from '../Income/raiseSchedule';
import type { LedgerYear } from '../Income/useLedgerEarnings';
import { payYearsOf, payYearsTotal } from './payYears';

const round = (value: number) => Math.round(value);

export const SalaryBreakdown = ({
  total,
  base,
  bonus,
  equity,
  earningsYears,
  ledgerYears,
  totalLabel,
  totalHint,
  onEdit,
  editLabel,
}: {
  total: number;
  base: number;
  bonus: number;
  equity: number;
  earningsYears?: YearEarnings[];
  ledgerYears?: LedgerYear[];
  totalLabel?: string;
  totalHint?: string;
  onEdit?: () => void;
  editLabel?: string;
}) => {
  const years = payYearsOf(ledgerYears, earningsYears);
  // Each year is rounded before it is added, so the rows on screen sum to the totals on screen.
  const earned = years.reduce(
    (sum, year) => ({
      base: sum.base + year.byComponent.base,
      bonus: sum.bonus + year.byComponent.bonus,
      equity: sum.equity + year.byComponent.equity,
    }),
    { base: 0, bonus: 0, equity: 0 }
  );
  // With dated years the card reports money earned, not the rate it is earned at.
  const breakdown = years.length ? earned : { base, bonus, equity };
  // The same helper the role card chip uses, so the headline and the chip cannot drift apart.
  const headline = years.length ? payYearsTotal(years) : total;
  const rows = SEGMENTS.map((segment) => ({
    key: segment.key,
    label: segment.label,
    sublabel: undefined as string | undefined,
    value: breakdown[segment.key],
    color: segment.color,
  }));
  // Each part of pay splits into the years that made it up.
  const yearShades = Object.fromEntries(
    SEGMENTS.map((segment) => [segment.key, shadesFor(segment.color, years.length)])
  ) as Record<string, string[]>;
  const chartGroups = SEGMENTS.map((segment) => ({
    key: segment.key,
    label: segment.label,
    color: segment.color,
    total: breakdown[segment.key],
    children: years.map((year, index) => ({
      key: `${segment.key}-${year.year}`,
      label: String(year.year),
      value: year.byComponent[segment.key],
      color: yearShades[segment.key][index],
    })),
  }));
  // The rate is the package as it stands now, whichever source the yearly figures came from.
  const currentRate = total;
  const fromLedger = years.some((year) => year.fromLedger);

  return (
    <div className="mt-2 space-y-4">
      {onEdit && (
        <EditNotice
          title="These pay inputs are editable"
          hint="Update base, bonus, or equity on this role anytime. The breakdown will refresh from your saved values."
          actionLabel={editLabel ?? 'Edit role'}
          onEdit={onEdit}
        />
      )}

      <div className="grid gap-5 md:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            {totalLabel ??
              (years.length
                ? years.length === 1
                  ? `Earned in ${years[0].year}`
                  : `Earned ${years.at(-1)!.year}–${years[0].year}`
                : 'Total Annual Earnings')}
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{fmtMoney(headline)}</div>
          <div className="mt-1 text-sm text-gray-500">
            {totalHint ??
              (years.length
                ? `${years.at(-1)!.year}–${years[0].year} · ${fromLedger ? 'from your paycheck ledger' : 'estimated from your pay and dates'}`
                : 'Base salary + bonus + equity, at your current rate')}
          </div>

          {years.length > 0 && (
            <>
              <div className="mt-4 flex items-baseline justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <span className="text-xs font-medium text-slate-500">Current rate</span>
                <span className="text-sm font-semibold text-slate-900">
                  {fmtMoney(round(currentRate))}
                  <span className="ml-1 text-xs font-normal text-slate-500">a year</span>
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  How this adds up
                </div>
                {years.map((year) => (
                  <div key={year.year} className="mt-2">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700">{year.year}</span>
                      <span className="font-semibold text-slate-900">{fmtMoney(year.total)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {year.detail} · base {fmtMoney(year.byComponent.base)}
                      {year.byComponent.bonus > 0 && ` · bonus ${fmtMoney(year.byComponent.bonus)}`}
                      {year.byComponent.equity > 0 &&
                        ` · equity ${fmtMoney(year.byComponent.equity)}`}
                      {/* The Income tab reports the whole year, so name it here to reconcile. */}
                      {year.projected > year.total &&
                        ` · ${fmtMoney(year.projected)} for the full year`}
                    </div>
                  </div>
                ))}
                {years.length > 1 && (
                  <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-slate-200 pt-2 text-xs">
                    <span className="font-medium text-slate-600">
                      {years.length} years in this role
                    </span>
                    <span className="font-bold text-slate-900">{fmtMoney(headline)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-5 h-64">
            <PayPie groups={chartGroups} empty="No compensation data yet" />
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row) => {
            const value = row.value;
            const pct = headline > 0 ? (value / headline) * 100 : 0;

            return (
              <div
                key={row.key}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="truncate text-sm font-semibold text-gray-800">
                        {row.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {value > 0
                        ? `${pct.toFixed(1)}%${row.sublabel ? ` · ${row.sublabel}` : ''}`
                        : 'Not included'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{fmtMoney(value)}</div>
                  </div>
                </div>
                <div className="mt-3">
                  {years.length > 1 ? (
                    <PayStackedBar
                      total={value}
                      parts={years.map((year, index) => ({
                        key: `${row.key}-${year.year}`,
                        label: String(year.year),
                        value: round(year.byComponent[row.key]),
                        color: yearShades[row.key][index],
                      }))}
                    />
                  ) : (
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: value > 0 ? `${Math.max(pct, 4)}%` : '0%',
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  )}
                </div>

                {years.length > 1 && value > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                    {years.map((year, index) => {
                      const part = round(year.byComponent[row.key]);
                      if (part <= 0) return null;
                      return (
                        <div
                          key={year.year}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="flex items-center gap-2 text-gray-700">
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: yearShades[row.key][index] }}
                            />
                            {year.year}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {fmtMoney(part)}
                            <span className="ml-1.5 text-xs font-normal text-gray-400">
                              {Math.round((part / value) * 100)}%
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
