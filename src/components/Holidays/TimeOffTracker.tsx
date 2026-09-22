import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, InputNumber, Popover, Select, Tooltip, message } from 'antd';
import { SettingOutlined, SunOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getExperiences, getOffers, updateOffer } from '../../api';
import { getHolidayTabColor } from '../../utils/holidayTabColors';
import { getPaletteColor } from '../../utils/colorPalette';
import {
  coverageOfYear,
  daysOffInWindow,
  ptoBalance,
  yearsOfService,
} from '../../utils/TimeOff/ptoBalance';
import type { DayOff, PtoPolicy, RoleWindow } from '../../utils/TimeOff/ptoBalance';

const rangeLabel = (dates: string[]) => {
  const first = dayjs(dates[0]);
  const last = dayjs(dates[dates.length - 1]);
  if (dates.length === 1) return first.format('D MMM');
  return first.month() === last.month()
    ? `${first.format('D')}\u2013${last.format('D MMM')}`
    : `${first.format('D MMM')}\u2013${last.format('D MMM')}`;
};

// One hue at falling opacity, so neighbouring trips separate without inventing a second colour.
const SEGMENT_FADES = [1, 0.78, 0.58, 0.42];
const OVERSPENT_COLOR = getPaletteColor('red').dot;

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface Role {
  id: number;
  offerId: number | null;
  label: string;
  window: RoleWindow;
  policy: PtoPolicy;
}

export interface HolidayLike extends DayOff {
  id: number;
  description?: string | null;
  group_id?: string | null;
}

interface Props {
  holidays: HolidayLike[];
  year: number;
  // Whatever colour the My Time Off bucket is set to; the bar has no palette of its own.
  tabColor?: string | null;
  onOpenDay: (holiday: HolidayLike) => void;
}

const TimeOffTracker = ({ holidays, year, tabColor, onOpenDay }: Props) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [experiences, offers] = await Promise.all([getExperiences(), getOffers()]);
        const byOffer = new Map(
          (offers.data as unknown as Array<Record<string, unknown>>).map((offer) => [
            offer.id as number,
            offer,
          ])
        );
        const built = (experiences.data as unknown as Array<Record<string, unknown>>)
          // Internships and contracts carry no PTO, so they are not roles to track.
          .filter((experience) => (experience.employment_type ?? 'full_time') === 'full_time')
          .map((experience) => {
            const offer = byOffer.get(experience.offer as number) ?? {};
            return {
              id: experience.id as number,
              offerId: (experience.offer as number) ?? null,
              label: `${experience.company as string} · ${experience.title as string}`,
              window: {
                startDate: (experience.start_date as string) ?? null,
                endDate: (experience.end_date as string) ?? null,
              },
              policy: {
                ptoDays: num(offer.pto_days),
                isUnlimited: Boolean(offer.is_unlimited_pto),
                unlimitedPlanningDays: num(offer.unlimited_pto_planning_days),
                rolloverMaxDays: num(offer.pto_rollover_max_days),
                accrualDaysPerYear: num(offer.pto_accrual_days_per_year),
                accrualMaxDays: num(offer.pto_accrual_max_days),
                hoursPerDay: num(offer.pto_hours_per_day) || 8,
                paychecksPerYear: num(offer.paychecks_per_year) || 26,
              },
            };
          });
        setRoles(built);
        setRoleId((current) => current ?? built[0]?.id ?? null);
      } catch {
        message.error('Could not load your roles.');
      }
    })();
  }, []);

  // Only roles the year actually contains: a 2025 view should not offer a job that started in 2026.
  const rolesInYear = useMemo(
    () => roles.filter((entry) => coverageOfYear(entry.window, year) > 0),
    [roles, year]
  );

  const role = rolesInYear.find((entry) => entry.id === roleId) ?? rolesInYear[0] ?? null;

  const taken = useMemo(
    () => (role ? daysOffInWindow(holidays, role.window, year, role.id) : []),
    [holidays, role, year]
  );

  const balance = useMemo(() => {
    if (!role) return null;
    const asEntries = [
      ...daysOffInWindow(holidays, role.window, year, role.id),
      ...daysOffInWindow(holidays, role.window, year - 1, role.id),
    ].map((date) => ({ date, days: 1, kind: 'PTO' }));
    return ptoBalance({ policy: role.policy, window: role.window, year, entries: asEntries });
  }, [holidays, role, year]);

  // Written back to the offer it came from: these are the employer's policy, not view settings.
  const savePolicy = async (patch: Partial<Role['policy']>, payload: Record<string, number>) => {
    if (!role?.offerId) return;
    setRoles((current) =>
      current.map((entry) =>
        entry.id === role.id ? { ...entry, policy: { ...entry.policy, ...patch } } : entry
      )
    );
    try {
      await updateOffer(role.offerId, payload);
    } catch {
      message.error('Could not save the policy.');
    }
  };

  // A trip is one line, not one line per day: its label and its range say everything.
  const rows = useMemo(() => {
    const counted = new Set(taken);
    const groups = new Map<string, { label: string; dates: string[]; holiday: HolidayLike }>();
    for (const holiday of holidays) {
      if (!counted.has(holiday.date)) continue;
      const key = holiday.group_id || String(holiday.id);
      const existing = groups.get(key);
      if (existing) existing.dates.push(holiday.date);
      else
        groups.set(key, {
          label: holiday.description || 'Time off',
          dates: [holiday.date],
          holiday,
        });
    }
    const todayIso = dayjs().format('YYYY-MM-DD');
    return (
      [...groups.values()]
        .map((group) => {
          const dates = [...group.dates].sort();
          return { ...group, dates, upcoming: dates[dates.length - 1] >= todayIso };
        })
        // Upcoming first and soonest-first; what is already spent reads newest-first below it.
        .sort((a, b) =>
          a.upcoming === b.upcoming
            ? a.upcoming
              ? a.dates[0].localeCompare(b.dates[0])
              : b.dates[0].localeCompare(a.dates[0])
            : a.upcoming
              ? -1
              : 1
        )
    );
  }, [taken, holidays]);

  // Across every role, because a job change splits the year and the whole year still matters.
  const yearTotal = useMemo(
    () => daysOffInWindow(holidays, { startDate: null, endDate: null }, year).length,
    [holidays, year]
  );

  if (rolesInYear.length === 0 || !balance) return null;

  const total = balance.entitled + balance.rolledOver;
  // Overspending is the one case that overrides the tab's colour, because it is a warning.
  const segmentColor = balance.remaining < 0 ? OVERSPENT_COLOR : getHolidayTabColor(tabColor).dot;

  // Unlimited has no hour value to quote, so it stays in days alone.
  const inHours = (days: number) =>
    balance.unlimited || !role ? '' : `${Math.round(days * role.policy.hoursPerDay)}h`;
  // The working has to reconcile with the headline, so tenure is named rather than folded in silently.
  const annualWorking = (() => {
    if (!role) return '';
    const headline = balance.unlimited ? role.policy.unlimitedPlanningDays : role.policy.ptoDays;
    const annual = headline + balance.accrued;
    const tenure = balance.accrued > 0 ? ` (${headline}d + ${balance.accrued}d for tenure)` : '';
    if (!balance.prorated) return balance.accrued > 0 ? `${annual}d a year${tenure}` : '';
    const share = Math.round(coverageOfYear(role.window, year) * 100);
    return `${annual}d a year${tenure}, prorated to the ${share}% of ${year} this role covered`;
  })();

  // Hours per paycheck, which is how an accrual policy is usually quoted.
  const perPaycheck =
    role && role.policy.paychecksPerYear > 0
      ? (balance.entitled * role.policy.hoursPerDay) / role.policy.paychecksPerYear
      : 0;

  const body = (
    <div className="w-full sm:w-[340px]">
      {/* The resolved role, not the remembered id: that id may not exist in this year. */}
      <Select
        value={role?.id}
        onChange={setRoleId}
        options={rolesInYear.map((entry) => ({ value: entry.id, label: entry.label }))}
        size="small"
        className="w-full"
      />

      <div className="mt-3 flex items-baseline justify-between">
        <span
          className={`text-2xl font-semibold tabular-nums ${
            balance.remaining < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-900 dark:text-ink-50'
          }`}
        >
          {balance.remaining}d
          {inHours(balance.remaining) ? (
            <span className="ml-1.5 text-base font-medium text-slate-400 dark:text-ink-500">
              {inHours(balance.remaining)}
            </span>
          ) : null}
        </span>
        <span className="text-[12px] text-slate-500 dark:text-ink-400">
          left of {total}d{balance.unlimited ? ' budget' : ''}
          {inHours(total) ? ` \u00b7 ${inHours(total)}` : ''}
        </span>
      </div>
      {/* One segment per trip rather than one bar: the point is seeing what took what. */}
      <div className="mt-1.5 flex h-2 w-full gap-px overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
        {rows.map((group, index) => (
          <Tooltip
            key={group.holiday.group_id || group.holiday.id}
            title={`${group.label} \u00b7 ${group.dates.length}d`}
          >
            <span
              style={{
                width: `${total > 0 ? Math.min(100, (group.dates.length / total) * 100) : 0}%`,
                backgroundColor: segmentColor,
                opacity: SEGMENT_FADES[index % SEGMENT_FADES.length],
              }}
            />
          </Tooltip>
        ))}
      </div>
      <p className="mt-1 text-[11.5px] text-slate-500 dark:text-ink-400">
        {balance.taken}d{inHours(balance.taken) ? ` (${inHours(balance.taken)})` : ''} taken at this
        role · {yearTotal}d{inHours(yearTotal) ? ` (${inHours(yearTotal)})` : ''} across {year}
        {annualWorking ? ` · ${annualWorking}` : ''}
      </p>

      {/* Policy lives behind the gear: it is set once, while the balance is read every time. */}
      {!balance.unlimited && (
        <div className="mt-2">
          {role?.offerId == null ? (
            <span className="text-[12px] text-slate-400 dark:text-ink-500">
              Link an offer to this role to set its leave policy.
            </span>
          ) : (
            <Popover
              trigger="click"
              placement="bottom"
              title="Leave policy"
              content={
                <div className="w-[264px] space-y-3 text-[12px]">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 dark:text-ink-300">Carry over, at most</span>
                    <InputNumber
                      value={role.policy.rolloverMaxDays}
                      onChange={(value) =>
                        void savePolicy(
                          { rolloverMaxDays: value ?? 0 },
                          { pto_rollover_max_days: value ?? 0 }
                        )
                      }
                      min={0}
                      max={90}
                      size="small"
                      className="w-16"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 dark:text-ink-300">
                      Extra days per year worked
                    </span>
                    <InputNumber
                      value={role.policy.accrualDaysPerYear}
                      onChange={(value) =>
                        void savePolicy(
                          { accrualDaysPerYear: value ?? 0 },
                          { pto_accrual_days_per_year: value ?? 0 }
                        )
                      }
                      min={0}
                      max={30}
                      size="small"
                      className="w-16"
                    />
                  </label>

                  {role.policy.accrualDaysPerYear > 0 && (
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-slate-600 dark:text-ink-300">
                        Stop once extras reach
                      </span>
                      <InputNumber
                        value={role.policy.accrualMaxDays}
                        onChange={(value) =>
                          void savePolicy(
                            { accrualMaxDays: value ?? 0 },
                            { pto_accrual_max_days: value ?? 0 }
                          )
                        }
                        min={0}
                        max={60}
                        size="small"
                        placeholder="No cap"
                        className="w-16"
                      />
                    </label>
                  )}

                  <label className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 dark:text-ink-300">Hours in a day</span>
                    <InputNumber
                      value={role.policy.hoursPerDay}
                      onChange={(value) =>
                        void savePolicy(
                          { hoursPerDay: value ?? 8 },
                          { pto_hours_per_day: value ?? 8 }
                        )
                      }
                      min={1}
                      max={24}
                      step={0.5}
                      size="small"
                      className="w-16"
                    />
                  </label>

                  <p className="border-t border-slate-100 pt-2 text-slate-400 dark:border-white/[0.07] dark:text-ink-500">
                    Accrues {perPaycheck.toFixed(2)}h per paycheck over{' '}
                    {role.policy.paychecksPerYear} paychecks.
                    {role.policy.accrualDaysPerYear > 0
                      ? ` ${yearsOfService(role.window, year)} year${yearsOfService(role.window, year) === 1 ? '' : 's'} worked has added ${balance.accrued}d${
                          role.policy.accrualMaxDays > 0 &&
                          balance.accrued >= role.policy.accrualMaxDays
                            ? ', which is the cap'
                            : ''
                        }.`
                      : ''}
                  </p>
                </div>
              }
            >
              <Button size="small" icon={<SettingOutlined />}>
                Policy
              </Button>
            </Popover>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-2 dark:border-white/[0.07]">
        {rows.length === 0 ? (
          <p className="py-2 text-[12px] text-slate-400 dark:text-ink-500">
            Nothing taken in {year}.
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {rows.map((group, index) => (
              <li key={group.holiday.group_id || group.holiday.id}>
                {(index === 0 || rows[index - 1].upcoming !== group.upcoming) && (
                  <p className="px-2 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-ink-500">
                    {group.upcoming ? 'Booked' : 'Taken'}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenDay(group.holiday);
                  }}
                  className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                >
                  <span className="truncate text-[12.5px] text-slate-700 dark:text-ink-100">
                    {group.label}
                    <span className="ml-1.5 text-slate-400 dark:text-ink-500">
                      {group.dates.length}d
                      {inHours(group.dates.length) ? ` · ${inHours(group.dates.length)}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-slate-400 dark:text-ink-500">
                    {rangeLabel(group.dates)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // Popover supplies its own onClick; passing one as well made each click toggle twice and close it.
  const trigger = (onClick?: () => void) => (
    <Button icon={<SunOutlined />} className="toolbar-select h-11 sm:h-9" onClick={onClick}>
      <span className="tabular-nums">{balance.remaining}d</span>
      <span className="hidden sm:inline"> left</span>
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger(() => setOpen(true))}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          placement="bottom"
          height="auto"
          title={`Time off · ${year}`}
        >
          {body}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      title={`Time off · ${year}`}
      content={body}
    >
      {trigger()}
    </Popover>
  );
};

export default TimeOffTracker;
