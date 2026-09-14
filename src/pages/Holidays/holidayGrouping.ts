import type { Holiday } from '../../types';
import dayjs from 'dayjs';

export type EventFormValues = {
  date: dayjs.Dayjs;
  start_time: dayjs.Dayjs;
  end_time: dayjs.Dayjs;
  is_all_day?: boolean;
  is_multi_day?: boolean;
  end_date?: dayjs.Dayjs | null;
  [key: string]: unknown;
};

export type ApiError = { response?: { status?: number; data?: { conflict?: boolean } } };

export const createHolidayGroupId = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

export const getInclusiveHolidayDates = (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
  const dates: dayjs.Dayjs[] = [];
  let current = start.startOf('day');

  while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
    dates.push(current);
    current = current.add(1, 'day');
  }

  return dates;
};

interface HolidayRangeRequest {
  // Named like the event form's fields, because the two date sections are now the same shape.
  date?: dayjs.Dayjs | null;
  end_date?: dayjs.Dayjs | null;
  is_multi_day?: boolean;
  // Either 'all' or the ISO date of the one day of the run being edited.
  scope?: string;
  description?: string;
  is_recurring?: boolean;
  tab?: string | null;
}

const resolveRange = (values: HolidayRangeRequest, fallback: dayjs.Dayjs) => {
  const start = values.date ?? fallback;
  // Multi-day off means the end is ignored, exactly as the event form treats its own end date.
  const end = values.is_multi_day ? (values.end_date ?? start) : start;
  return { start, end };
};

// One row per day sharing a group id, shared so both calendars agree on what a range means.
export const buildHolidayRangePayloads = (
  values: HolidayRangeRequest,
  fallbackDate: dayjs.Dayjs,
  fallbackLabel: string
) => {
  const { start, end } = resolveRange(values, fallbackDate);
  if (end.isBefore(start, 'day')) return null;
  const days = getInclusiveHolidayDates(start, end);
  const groupId = days.length > 1 ? createHolidayGroupId() : undefined;
  return days.map((day) => ({
    date: day.format('YYYY-MM-DD'),
    description: values.description?.trim() || fallbackLabel,
    is_recurring: !!values.is_recurring,
    tab: values.tab || null,
    ...(groupId ? { group_id: groupId } : {}),
  }));
};

// A grouped trip is edited as a whole, so its other days have to be found before anything changes.
export const holidayGroupMembers = (all: Holiday[], holiday?: Holiday | null): Holiday[] => {
  if (!holiday) return [];
  if (!holiday.group_id) return [holiday];
  const members = all.filter((row) => row.group_id === holiday.group_id);
  return (members.length ? members : [holiday])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
};

interface HolidayGroupEdit {
  create: Partial<Holiday>[];
  update: { id: number; patch: Partial<Holiday> }[];
  deleteIds: number[];
}

type HolidayGroupEditResult =
  | { ok: true; plan: HolidayGroupEdit }
  | { ok: false; reason: 'backwards' | 'locked' | 'occupied' };

// Moving a range means keeping the days it still covers, adding the new ones and dropping the rest.
export const planHolidayGroupEdit = (
  members: Holiday[],
  values: HolidayRangeRequest,
  fallbackLabel: string
): HolidayGroupEditResult | null => {
  if (members.length === 0) return null;
  const sorted = [...members].sort((a, b) => a.date.localeCompare(b.date));
  const { start, end } = resolveRange(values, dayjs(sorted[0].date));
  if (end.isBefore(start, 'day')) return { ok: false, reason: 'backwards' };

  // The chosen day is named by its own date, so which row it is needs no separate argument.
  const target =
    values.scope && values.scope !== 'all'
      ? sorted.find((row) => row.date === values.scope)
      : undefined;

  // One day out of a trip leaves the group, so the remaining days still draw as one run.
  if (target && members.length > 1) {
    if (target.is_locked) return { ok: false, reason: 'locked' };
    const moved = start.format('YYYY-MM-DD');
    const clash = members.some((row) => row.id !== target.id && row.date === moved);
    if (clash) return { ok: false, reason: 'occupied' };
    return {
      ok: true,
      plan: {
        create: [],
        update: [
          {
            id: target.id,
            patch: {
              date: moved,
              description: values.description?.trim() || target.description || fallbackLabel,
              is_recurring: !!values.is_recurring,
              tab: values.tab || null,
              group_id: null,
            },
          },
        ],
        deleteIds: [],
      },
    };
  }

  const days = getInclusiveHolidayDates(start, end).map((day) => day.format('YYYY-MM-DD'));
  const wanted = new Set(days);
  const removed = sorted.filter((row) => !wanted.has(row.date));
  // A pinned day exists to stay put, so the whole edit is refused rather than partly applied.
  if (removed.some((row) => row.is_locked)) return { ok: false, reason: 'locked' };

  // Days beyond the first need a group to belong to, reusing the trip's own id where there is one.
  const existingGroupId = sorted.find((row) => row.group_id)?.group_id;
  const groupId = existingGroupId ?? (days.length > 1 ? createHolidayGroupId() : undefined);
  const shared = {
    description: values.description?.trim() || sorted[0].description || fallbackLabel,
    is_recurring: !!values.is_recurring,
    tab: values.tab || null,
    ...(groupId ? { group_id: groupId } : {}),
  };

  const byDate = new Map(sorted.map((row) => [row.date, row]));
  const plan: HolidayGroupEdit = {
    create: [],
    update: [],
    deleteIds: removed.map((row) => row.id),
  };
  for (const date of days) {
    const existing = byDate.get(date);
    if (existing) plan.update.push({ id: existing.id, patch: shared });
    else plan.create.push({ date, ...shared });
  }
  return { ok: true, plan };
};
