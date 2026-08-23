import type { Event } from '../types';

export interface ReminderSettings {
  startDaysBefore: number;
  repeatEveryDays: number;
  allowForeverIgnore: boolean;
  // 0 means it waits to be dismissed.
  toastDurationSeconds: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  startDaysBefore: 7,
  repeatEveryDays: 1,
  allowForeverIgnore: true,
  toastDurationSeconds: 12,
};

export const REMINDER_STATE_KEY = 'careerhub.eventReminders.state';

export interface ReminderState {
  // event id -> ISO date it may reappear on, or 'forever' when muted for good.
  [eventId: string]: string;
}

export const readReminderState = (): ReminderState => {
  try {
    return JSON.parse(window.localStorage.getItem(REMINDER_STATE_KEY) || '{}') as ReminderState;
  } catch {
    return {};
  }
};

export const writeReminderState = (state: ReminderState) => {
  window.localStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(state));
};

const toDay = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

// Local midnight: `new Date('2026-08-10')` is UTC and lands a day early west of GMT.
const parseDay = (value: string) => new Date(`${value}T00:00:00`);

export const daysUntil = (eventDate: string, today: Date) =>
  Math.round((parseDay(eventDate).getTime() - parseDay(toDay(today)).getTime()) / 86400000);

export const resolveSettings = (raw: unknown): ReminderSettings => {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const asNumber = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  };
  return {
    startDaysBefore: asNumber(
      source.startDaysBefore,
      DEFAULT_REMINDER_SETTINGS.startDaysBefore,
      1,
      60
    ),
    repeatEveryDays: asNumber(
      source.repeatEveryDays,
      DEFAULT_REMINDER_SETTINGS.repeatEveryDays,
      1,
      30
    ),
    allowForeverIgnore:
      typeof source.allowForeverIgnore === 'boolean'
        ? source.allowForeverIgnore
        : DEFAULT_REMINDER_SETTINGS.allowForeverIgnore,
    // 0 is meaningful here, so the floor is 0 rather than 1.
    toastDurationSeconds: asNumber(
      source.toastDurationSeconds,
      DEFAULT_REMINDER_SETTINGS.toastDurationSeconds,
      0,
      120
    ),
  };
};

export const dueReminders = (
  events: Event[],
  settings: ReminderSettings,
  state: ReminderState,
  today: Date = new Date()
): Event[] =>
  events.filter((event) => {
    const away = daysUntil(event.date, today);
    // Today still counts as due.
    if (away < 0 || away > settings.startDaysBefore) return false;
    const until = state[String(event.id)];
    if (!until) return true;
    if (until === 'forever') return false;
    return toDay(today) >= until;
  });

// Ignores a day-level dismissal on purpose: only a permanent mute stops the bell.
export const urgentReminders = (
  events: Event[],
  settings: ReminderSettings,
  state: ReminderState,
  today: Date = new Date()
): Event[] =>
  events.filter((event) => {
    const away = daysUntil(event.date, today);
    if (away < 0 || away > settings.startDaysBefore) return false;
    return state[String(event.id)] !== 'forever';
  });

export const dismissUntil = (settings: ReminderSettings, today: Date = new Date()) => {
  const next = new Date(today.getTime());
  next.setDate(next.getDate() + Math.max(1, settings.repeatEveryDays));
  return toDay(next);
};

export const pruneReminderState = (state: ReminderState, events: Event[]): ReminderState => {
  const live = new Set(events.map((event) => String(event.id)));
  return Object.fromEntries(Object.entries(state).filter(([id]) => live.has(id)));
};

export type ReminderUrgency = 'today' | 'tomorrow' | 'soon';

export const reminderUrgency = (eventDate: string, today: Date = new Date()): ReminderUrgency => {
  const away = daysUntil(eventDate, today);
  if (away <= 0) return 'today';
  if (away === 1) return 'tomorrow';
  return 'soon';
};
