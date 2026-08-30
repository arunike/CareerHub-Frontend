import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { RetirementSummary } from './retirement';
import { Button, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  defaultTier,
  describeFormula,
  employerPercentOfPay,
  maxEmployerPercentOfPay,
  type MatchFormula,
  type MatchTier,
} from './matchTiers';
import MoneyInput from './MoneyInput';
import PercentInput from './PercentInput';
import dayjs from 'dayjs';
import { formatPayDate } from './paySchedule';
import { percent } from './format';
import { useMoney } from './amountPrivacy';
import { DEFERRAL_BASE_HINTS, DEFERRAL_BASE_LABELS, type DeferralBase } from './tax/ledger';

const DEFERRAL_BASE_ORDER: DeferralBase[] = ['ALL', 'NO_ALLOWANCES', 'SALARY_ONLY'];

interface Props {
  summary: RetirementSummary;
  perPeriodMatch: number;
  paidPeriodCount: number;
  taxYear: number;
  matchTiers: MatchTier[];
  formula: MatchFormula;
  pretaxPercent: number;
  rothPercent: number;
  elective401kLimit: number;
  onDeferralChange: (patch: { pretax401kPercent?: number; roth401kPercent?: number }) => void;
  deferralBase: DeferralBase;
  // Per-year totals, so the copy can say what the choice is actually worth.
  excludableAllowances: number;
  excludableSupplemental: number;
  onDeferralBaseChange: (value: DeferralBase) => void;
  onStartingBalanceChange: (value: number | null) => void;
  onCurrentValueChange: (value: number | null) => void;
  onMatchTiersChange: (tiers: MatchTier[]) => void;
  onNonElectiveChange: (value: number) => void;
  onAnnualCapChange: (value: number | null) => void;
}

const Row = ({
  label,
  value,
  hint,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  tone?: 'good' | 'bad';
}) => (
  <div className="flex items-baseline justify-between gap-3 py-2">
    <span className="flex items-center gap-1.5 text-sm text-slate-600">
      {label}
      {hint ? (
        <Tooltip title={hint}>
          <InfoCircleOutlined className="text-[11px] text-slate-300" />
        </Tooltip>
      ) : null}
    </span>
    <span
      className={`tabular-nums text-sm ${
        tone === 'good'
          ? 'font-semibold text-emerald-600'
          : tone === 'bad'
            ? 'font-semibold text-rose-600'
            : emphasis
              ? 'font-semibold text-slate-900'
              : 'text-slate-700'
      }`}
    >
      {value}
    </span>
  </div>
);

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      {label}
      {hint ? (
        <Tooltip title={hint}>
          <InfoCircleOutlined className="text-slate-400" />
        </Tooltip>
      ) : null}
    </span>
    <div className="mt-1.5">{children}</div>
  </label>
);

export const RetirementForm = ({
  summary,
  perPeriodMatch,
  paidPeriodCount,
  taxYear,
  matchTiers,
  formula,
  pretaxPercent,
  rothPercent,
  elective401kLimit,
  onDeferralChange,
  deferralBase,
  excludableAllowances,
  excludableSupplemental,
  onDeferralBaseChange,
  onStartingBalanceChange,
  onCurrentValueChange,
  onMatchTiersChange,
  onNonElectiveChange,
  onAnnualCapChange,
}: Props) => {
  const { money, moneyCents } = useMoney();
  const excludableTotal = excludableAllowances + excludableSupplemental;
  const excludedTotal =
    deferralBase === 'NO_ALLOWANCES'
      ? excludableAllowances
      : deferralBase === 'SALARY_ONLY'
        ? excludableTotal
        : 0;

  return (
    <div>
      <p className="text-xs leading-relaxed text-slate-500">
        The employer match is pay you receive without it passing through your paycheck. Add balances
        to separate what you put in from what the market did.
      </p>

      <div className="mt-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Your contribution
        </span>
        <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label="Traditional 401(k) %"
            hint={`Pre-tax. Stops at the ${money(elective401kLimit)} annual limit, shared with Roth.`}
          >
            <PercentInput
              value={pretaxPercent}
              onChange={(value) => onDeferralChange({ pretax401kPercent: Number(value ?? 0) })}
            />
          </Field>
          <Field label="Roth 401(k) %" hint="Post-tax. Shares the same annual limit.">
            <PercentInput
              value={rothPercent}
              onChange={(value) => onDeferralChange({ roth401kPercent: Number(value ?? 0) })}
            />
          </Field>
        </div>

        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <Field
            label="Deferred and matched on"
            hint="Check your payslip: divide the contribution by your rate and see whether it lands on your gross or on something lower."
          >
            <Select
              size="small"
              style={{ width: '100%' }}
              value={deferralBase}
              onChange={onDeferralBaseChange}
              options={DEFERRAL_BASE_ORDER.map((base) => ({
                value: base,
                label: DEFERRAL_BASE_LABELS[base],
              }))}
              optionRender={(option) => (
                <span className="flex flex-col">
                  <span>{DEFERRAL_BASE_LABELS[option.data.value as DeferralBase]}</span>
                  <span className="text-[11px] leading-snug text-slate-400">
                    {DEFERRAL_BASE_HINTS[option.data.value as DeferralBase]}
                  </span>
                </span>
              )}
            />
          </Field>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {excludableTotal > 0.005 ? (
              <>
                {DEFERRAL_BASE_HINTS[deferralBase]}{' '}
                {deferralBase === 'ALL' ? (
                  <>
                    <span className="font-medium text-slate-600">{money(excludableTotal)}</span> of
                    this year&rsquo;s pay could be carved out.
                  </>
                ) : (
                  <>
                    Keeps <span className="font-medium text-slate-600">{money(excludedTotal)}</span>{' '}
                    out of the base this year.
                  </>
                )}
              </>
            ) : (
              // Nothing to carve out, so the choice cannot change a figure.
              <>
                No stipends, allowances or bonus this year, so every option defers on the same pay.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            Toward the {taxYear} limit
            <Tooltip title="The 402(g) elective deferral limit covers your traditional and Roth contributions together. The employer match does not count against it.">
              <InfoCircleOutlined className="text-slate-400" />
            </Tooltip>
          </span>
          <span className="text-xs tabular-nums text-slate-500">
            {money(summary.employeeTotal)} of {money(summary.electiveLimit)}
          </span>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className={`h-full rounded-full ${
              summary.percentOfLimit >= 1 ? 'bg-emerald-500' : 'bg-sky-500'
            }`}
            style={{ width: `${Math.min(100, summary.percentOfLimit * 100)}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <span className="font-medium tabular-nums text-slate-700">
            {percent(summary.percentOfLimit, 1)} used
          </span>
          <span className="tabular-nums text-slate-500">
            {summary.remainingToLimit > 0 ? (
              <>
                <span className="font-medium text-slate-700">
                  {money(summary.remainingToLimit)}
                </span>{' '}
                left to contribute
              </>
            ) : (
              <span className="font-medium text-emerald-600">Limit reached</span>
            )}
          </span>
        </div>

        {summary.limitReachedOnPeriod !== null ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            At this rate you reach the limit on{' '}
            <span className="font-medium text-slate-700">
              {summary.limitReachedOnDate
                ? formatPayDate(summary.limitReachedOnDate)
                : `paycheck ${summary.limitReachedOnPeriod}`}
            </span>
            , and contributions stop for the rest of the year.
          </p>
        ) : summary.remainingToLimit > 0 && summary.employeeTotal > 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            At this rate you finish the year {money(summary.remainingToLimit)} under the limit.
            Raising your percentage puts more in before the year closes.
          </p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Contributed in {taxYear}
          </span>
          {/* A year still running is reporting a subtotal, so it has to say where it stops. */}
          {summary.hasUnpaidPeriods && summary.paidThroughDate ? (
            <span className="text-[11px] text-slate-400">
              through {dayjs(summary.paidThroughDate).format('MMM D')} · {summary.paidPeriodsToDate}{' '}
              of {summary.periodCount} paychecks
            </span>
          ) : null}
        </div>
        <div className="mt-2 divide-y divide-slate-100">
          <Row label="Your traditional 401(k)" value={money(summary.employeePretaxToDate)} />
          <Row label="Your Roth 401(k)" value={money(summary.employeeRothToDate)} />
          <Row
            label="Employer match"
            value={money(summary.employerMatchToDate)}
            hint="Not part of take-home, because it never reaches your paycheck."
          />
          <Row label="Total into the account" value={money(summary.contributedToDate)} emphasis />
        </div>

        {summary.hasUnpaidPeriods ? (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Paid in so far. On the current rate the year finishes at{' '}
            <span className="font-medium text-slate-500">{money(summary.totalContributed)}</span>.
          </p>
        ) : null}

        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">Match formula</span>
            <span className="max-w-[60%] text-right font-medium text-slate-700">
              {describeFormula(formula)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">
              At your {pretaxPercent + rothPercent}% deferral you earn
            </span>
            <span className="font-medium tabular-nums text-slate-700">
              {employerPercentOfPay(pretaxPercent + rothPercent, formula).toFixed(2)}% of pay
              <span className="text-slate-400">
                {' '}
                of {maxEmployerPercentOfPay(formula).toFixed(2)}% available
              </span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">Per paycheck</span>
            <span className="tabular-nums font-medium text-slate-700">
              {moneyCents(perPeriodMatch)} × {paidPeriodCount} paychecks
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label="Paid regardless of deferral"
            hint="A safe-harbor or profit-sharing contribution the employer pays whether or not you contribute."
          >
            <PercentInput
              max={50}
              value={formula.nonElectivePercent}
              onChange={(value) => onNonElectiveChange(Number(value ?? 0))}
            />
          </Field>
          <Field
            label="Annual dollar cap"
            hint="Some plans cap the employer contribution in dollars, e.g. $2,000 a year. Leave at zero for no cap."
          >
            <MoneyInput value={formula.annualCap} onChange={onAnnualCapChange} />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Match bands
            </span>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                onMatchTiersChange([
                  ...matchTiers,
                  defaultTier(`tier-${Date.now()}`, (matchTiers.at(-1)?.uptoPercent ?? 0) + 2),
                ])
              }
            >
              Add band
            </Button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Each band matches only the deferral above the one before it. Two bands express
            &ldquo;100% of the first 3%, then 50% of the next 2%&rdquo;.
          </p>
          {matchTiers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No employer match on this role.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {matchTiers.map((tier, index) => (
                <div key={tier.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">match</span>
                  <PercentInput
                    size="small"
                    max={300}
                    value={tier.matchPercent}
                    onChange={(value) =>
                      onMatchTiersChange(
                        matchTiers.map((other) =>
                          other.id === tier.id
                            ? { ...other, matchPercent: Number(value ?? 0) }
                            : other
                        )
                      )
                    }
                  />
                  <span className="text-xs text-slate-500">
                    {index === 0 ? 'up to' : 'up to a cumulative'}
                  </span>
                  <PercentInput
                    size="small"
                    max={100}
                    value={tier.uptoPercent}
                    onChange={(value) =>
                      onMatchTiersChange(
                        matchTiers.map((other) =>
                          other.id === tier.id
                            ? { ...other, uptoPercent: Number(value ?? 0) }
                            : other
                        )
                      )
                    }
                  />
                  <span className="text-xs text-slate-400">of pay</span>
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      onMatchTiersChange(matchTiers.filter((other) => other.id !== tier.id))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {summary.unclaimedMatch > 0.5 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
            You left <span className="font-semibold">{money(summary.unclaimedMatch)}</span> of match
            unclaimed by deferring below the matched percent. Raising your contribution captures it.
          </p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Account value
        </span>
        <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label={`Balance on 1 Jan ${taxYear}`}
            hint="Needed to separate investment gains from the money you paid in this year."
          >
            <MoneyInput
              value={summary.startingBalance}
              max={100_000_000}
              placeholder="Not set"
              onChange={onStartingBalanceChange}
            />
          </Field>
          <Field
            label="Balance today"
            hint="Compared against contributions to date, not the whole year."
          >
            <MoneyInput
              value={summary.currentValue}
              max={100_000_000}
              placeholder="Not set"
              onChange={onCurrentValueChange}
            />
          </Field>
        </div>

        {summary.gains === null ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Enter both balances and the gain appears here. Contributions alone say nothing about how
            the investments performed.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            <Row
              label="Balance growth"
              value={money(summary.currentValue! - summary.startingBalance!)}
            />
            <Row
              label={`Less paid in over ${summary.paidPeriodsToDate} paycheck${summary.paidPeriodsToDate === 1 ? '' : 's'}`}
              value={`−${money(summary.contributedToDate)}`}
              hint="Only the paychecks that have already been paid. Today's balance cannot hold a contribution the year has not made yet, so counting the whole year against it would report a loss that never happened."
            />
            <Row
              label="Investment gain"
              value={`${summary.gains >= 0 ? '+' : '−'}${money(Math.abs(summary.gains))}${
                summary.gainPercent !== null ? ` · ${percent(summary.gainPercent, 1)}` : ''
              }`}
              tone={summary.gains >= 0 ? 'good' : 'bad'}
              hint="Balance change less every contribution, over the starting balance plus contributions."
            />
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          This is a simple return, not time-weighted. Contributions arrive through the year, so
          money paid in during December has had far less time to grow than January&rsquo;s.
        </p>
      </div>
    </div>
  );
};

export default RetirementForm;
