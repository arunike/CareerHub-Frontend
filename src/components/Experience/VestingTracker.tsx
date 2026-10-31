import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Button, DatePicker } from 'antd';
import { CalendarOutlined, LoadingOutlined, UndoOutlined } from '@ant-design/icons';
import { fmtMoney } from '../../utils/Experience/compensationBreakdownFormat';
import { countdownLabel } from '../../utils/eventReminders';
import { STATUS_BADGE_CLASS } from '../../utils/Experience/experienceBadgeClasses';
import { useChartSeries } from '../../theme/chartColors';
import { addDays } from '../../utils/localDay';
import {
  retainedGrant,
  type EquityVest,
  type EquityVestingPlan,
} from '../../utils/Experience/equityVesting';
import type { VestDateOverride } from '../../utils/Income/vestEvents';

const VESTED_CHIP =
  'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
const NEXT_CHIP =
  'border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300';

const shareLabel = (shares: number | null) =>
  shares == null ? null : `${Math.round(shares).toLocaleString()} shares`;

// 6.25% of a grant reads better than 6.3%, and a whole quarter must not print as 25.00%.
const grantShare = (value: number, total: number) =>
  total > 0 ? `${Number(((value / total) * 100).toFixed(2))}%` : '';

const dateLabel = (iso: string) => dayjs(iso).format('MMM D, YYYY');

const yearOf = (vest: EquityVest) => Math.max(1, Math.ceil(vest.monthsFromGrant / 12));

interface VestYear {
  year: number;
  vests: EquityVest[];
  value: number;
}

const byGrantYear = (vests: EquityVest[]): VestYear[] =>
  vests.reduce<VestYear[]>((years, vest) => {
    const year = years.find((entry) => entry.year === yearOf(vest));
    if (year) {
      year.vests.push(vest);
      year.value += vest.value;
      return years;
    }
    return [...years, { year: yearOf(vest), vests: [vest], value: vest.value }];
  }, []);

export const overridesOf = (plan: EquityVestingPlan): VestDateOverride[] =>
  plan.vests
    .filter((vest) => vest.moved)
    .map((vest) => ({ months: vest.monthsFromGrant, date: vest.date }));

export const VestingTracker = ({
  plan,
  onSaveVestDates,
  vestDatesLockedReason,
}: {
  plan: EquityVestingPlan;
  onSaveVestDates?: (overrides: VestDateOverride[]) => Promise<void>;
  // Why the dates cannot be moved, so a missing control is never silent.
  vestDatesLockedReason?: string;
}) => {
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const series = useChartSeries();
  const list = useRef<HTMLDivElement>(null);
  const nextRow = useRef<HTMLDivElement>(null);
  const nextHeading = useRef<HTMLDivElement>(null);

  // Scrolled inside the list, not with scrollIntoView, which would move the modal behind it.
  useEffect(() => {
    const container = list.current;
    const row = nextRow.current;
    if (!container || !row) return;
    const heading = nextHeading.current?.offsetTop ?? 0;
    // Its own year heading when that sits directly above it, else the row itself, at the top.
    const leadsItsYear = row.offsetTop - heading <= 48;
    container.scrollTop = Math.max(0, leadsItsYear ? heading : row.offsetTop - 8);
  }, []);

  const nextVest = plan.vests.find((vest) => !vest.vested) ?? null;
  const lastVest = plan.vests.at(-1) ?? null;
  const vestedCount = plan.vests.filter((vest) => vest.vested).length;
  // The grant the role lasted long enough to earn; the forfeited part is no longer a denominator.
  const kept = retainedGrant(plan);
  const vestedShare = kept > 0 ? plan.vestedToDate / kept : 0;
  const movedCount = plan.vests.filter((vest) => vest.moved).length;

  const save = async (months: number, overrides: VestDateOverride[]) => {
    if (!onSaveVestDates) return;
    setSaving(months);
    try {
      await onSaveVestDates(overrides.sort((a, b) => a.months - b.months));
      setEditing(null);
    } catch {
      // The caller reports it; the row stays open so the date can be picked again.
    } finally {
      setSaving(null);
    }
  };

  const moveTo = (vest: EquityVest, iso: string) =>
    save(vest.monthsFromGrant, [
      ...overridesOf(plan).filter((override) => override.months !== vest.monthsFromGrant),
      { months: vest.monthsFromGrant, date: iso },
    ]);

  const reset = (vest: EquityVest) =>
    save(
      vest.monthsFromGrant,
      overridesOf(plan).filter((override) => override.months !== vest.monthsFromGrant)
    );

  // A vest cannot be moved behind the one before it: every reader takes the list as dated in order.
  const earliestFor = (vest: EquityVest) => {
    const index = plan.vests.indexOf(vest);
    return index <= 0 ? plan.grantDate : addDays(plan.vests[index - 1].date, 1);
  };

  // Not a component: a nested one is a new type on every render, which remounts the open picker.
  const renderVest = (vest: EquityVest) => {
    const isNext = vest === nextVest;
    const isEditing = editing === vest.monthsFromGrant;
    const isSaving = saving === vest.monthsFromGrant;
    return (
      <div
        key={vest.monthsFromGrant}
        ref={isNext ? nextRow : undefined}
        className="relative py-1 pl-6"
      >
        {/* The rail runs behind every row, so the list reads as one schedule, not a stack. */}
        <span
          className="absolute bottom-0 left-[7px] top-0 w-px bg-slate-200 dark:bg-ink-700"
          aria-hidden
        />
        <span
          className={`absolute left-[3px] top-[13px] h-[9px] w-[9px] rounded-full border-2 ${
            isNext
              ? 'border-blue-500 bg-white dark:border-blue-400 dark:bg-ink-900'
              : vest.vested
                ? 'border-transparent'
                : 'border-slate-300 bg-white dark:border-ink-600 dark:bg-ink-900'
          }`}
          style={vest.vested && !isNext ? { backgroundColor: series.equity } : undefined}
          aria-hidden
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            {onSaveVestDates && isEditing ? (
              <DatePicker
                size="small"
                open
                autoFocus
                allowClear={false}
                value={dayjs(vest.date)}
                disabledDate={(day) => day.isBefore(dayjs(earliestFor(vest)), 'day')}
                onOpenChange={(open) => !open && setEditing(null)}
                onChange={(day) => day && void moveTo(vest, day.format('YYYY-MM-DD'))}
              />
            ) : onSaveVestDates ? (
              <button
                type="button"
                disabled={saving != null}
                onClick={() => setEditing(vest.monthsFromGrant)}
                title="Move this vest to the date it actually landed on"
                className="-my-1 inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-semibold tabular-nums text-slate-700 underline decoration-slate-300 decoration-dashed underline-offset-4 transition-colors hover:text-blue-600 hover:decoration-blue-400 disabled:opacity-60 lg:min-h-0 dark:text-ink-100 dark:decoration-white/25 dark:hover:text-blue-300 dark:hover:decoration-blue-400"
              >
                {dateLabel(vest.date)}
                {isSaving ? (
                  <LoadingOutlined style={{ fontSize: 11 }} />
                ) : (
                  <CalendarOutlined
                    style={{ fontSize: 11 }}
                    className="text-slate-400 dark:text-ink-500"
                  />
                )}
              </button>
            ) : (
              <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-ink-100">
                {dateLabel(vest.date)}
              </span>
            )}
            {isNext && <span className={`${STATUS_BADGE_CLASS} ${NEXT_CHIP}`}>Next</span>}
            {vest.vested && <span className={`${STATUS_BADGE_CLASS} ${VESTED_CHIP}`}>Vested</span>}
            <span className="text-[11px] text-slate-400 dark:text-ink-500">
              {[grantShare(vest.value, plan.totalGrant), shareLabel(vest.shares)]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-ink-100">
            {fmtMoney(vest.value)}
          </span>
        </div>
        {vest.moved && (
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-amber-700 dark:text-amber-300">
            <span>Moved from {dateLabel(vest.scheduledDate)}</span>
            {onSaveVestDates && (
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                loading={isSaving}
                onClick={() => void reset(vest)}
                // A plain button in a modal body is outside the global 44px floor.
                className="min-h-11 !px-1.5 text-[11px] font-semibold !text-slate-500 lg:min-h-0 dark:!text-ink-400"
              >
                Undo
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-slate-700 dark:text-ink-100">
          {fmtMoney(plan.vestedToDate)}
          <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-ink-400">
            vested of {fmtMoney(kept)}
          </span>
        </span>
        <span className="text-xs text-slate-500 dark:text-ink-400">
          {vestedCount} of {plan.vests.length} vests · {Math.round(vestedShare * 100)}%
        </span>
      </div>

      <div className="mt-2 flex gap-[2px]" aria-hidden>
        {plan.vests.map((vest) => (
          <span
            key={vest.monthsFromGrant}
            title={`${dateLabel(vest.date)} · ${fmtMoney(vest.value)}`}
            className="h-2 rounded-[2px] bg-slate-100 dark:bg-ink-800"
            style={{
              flexGrow: Math.max(vest.value, 1),
              flexBasis: 0,
              backgroundColor: vest.vested ? series.equity : undefined,
            }}
          />
        ))}
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-[11px] text-slate-500 dark:text-ink-400">
        <span>Granted {dateLabel(plan.grantDate)}</span>
        {lastVest && (
          <span>
            {plan.forfeited > 0 ? 'Last vest' : 'Fully vested'} {dateLabel(lastVest.date)}
          </span>
        )}
      </div>

      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-white/[0.04] dark:text-ink-200">
        {nextVest ? (
          <>
            Next vest {dateLabel(nextVest.date)}
            <span className="font-normal text-slate-500 dark:text-ink-400">
              {' '}
              · {countdownLabel(nextVest.date).toLowerCase()} · {fmtMoney(nextVest.value)}
            </span>
          </>
        ) : plan.forfeited > 0 && plan.lastDay ? (
          <>
            Vesting stopped {dateLabel(plan.lastDay)}, when the role ended
            <span className="font-normal text-slate-500 dark:text-ink-400">
              {' '}
              · {fmtMoney(plan.forfeited)} forfeited over {plan.forfeitedVests.length}{' '}
              {plan.forfeitedVests.length === 1 ? 'vest' : 'vests'}
            </span>
          </>
        ) : (
          'Every vest in this grant has landed.'
        )}
      </div>

      <div
        ref={list}
        className="relative mt-2 max-h-[280px] overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-1.5 sm:max-h-[340px] dark:[&::-webkit-scrollbar-thumb]:bg-ink-700"
      >
        {byGrantYear(plan.vests).map((group) => (
          <div key={group.year} className="mt-2 first:mt-0">
            <div
              ref={group.vests.includes(nextVest as EquityVest) ? nextHeading : undefined}
              className="flex items-baseline justify-between gap-3 px-6 py-1"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
                Year {group.year}
              </span>
              <span className="text-[11px] tabular-nums text-slate-400 dark:text-ink-500">
                {fmtMoney(group.value)} · {group.vests.length}{' '}
                {group.vests.length === 1 ? 'vest' : 'vests'}
              </span>
            </div>
            {group.vests.map(renderVest)}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-ink-400">
        {onSaveVestDates ? (
          <>
            Tap a date to move a vest to the day it actually landed on; the ones after it follow,
            keeping the cadence. These dates drive the vested totals, the Equity row and the Income
            ledger.
            {movedCount > 0
              ? ` ${movedCount} date${movedCount === 1 ? '' : 's'} moved off the generated schedule.`
              : ''}
          </>
        ) : (
          (vestDatesLockedReason ??
          'Dates follow the cadence on the linked offer: the cliff, the vests per year and the grant date.')
        )}
      </p>
    </div>
  );
};

export default VestingTracker;
