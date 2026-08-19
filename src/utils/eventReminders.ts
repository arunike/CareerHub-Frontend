import type { Event } from '../types';

export interface ReminderSettings {
  // Start reminding this many days before the event.
  startDaysBefore: number;
  // Re-remind after this many days once dismissed.
  repeatEveryDays: number;
  // Whether the "never remind me about this" action is offered at all.
  allowForeverIgnore: boolean;
  // Seconds the corner notification stays up. 0 means it waits to be dismissed.
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

// A local-midnight parse; `new Date('2026-08-10')` is UTC and lands a day early west of GMT.
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
    // 0 is meaningful here (stay until dismissed), so the floor is 0 rather than 1.
    toastDurationSeconds: asNumber(
      source.toastDurationSeconds,
      DEFAULT_REMINDER_SETTINGS.toastDurationSeconds,
      0,
      120
    ),
  };
};

// Events close enough to remind about, minus anything dismissed or muted.
export const dueReminders = (
  events: Event[],
  settings: ReminderSettings,
  state: ReminderState,
  today: Date = new Date()
): Event[] =>
  events.filter((event) => {
    const away = daysUntil(event.date, today);
    // Past events are done with; today counts as still due.
    if (away < 0 || away > settings.startDaysBefore) return false;
    const until = state[String(event.id)];
    if (!until) return true;
    if (until === 'forever') return false;
    return toDay(today) >= until;
  });

/** Events near enough to warrant the bell drawing attention to itself.

Deliberately ignores a day-level dismissal: dismissing silences the popup for the day, it
does not make the interview any further away. Only a permanent mute stops the bell. */
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

// Dismissing hides an event until the repeat interval has elapsed.
export const dismissUntil = (settings: ReminderSettings, today: Date = new Date()) => {
  const next = new Date(today.getTime());
  next.setDate(next.getDate() + Math.max(1, settings.repeatEveryDays));
  return toDay(next);
};

// Drops entries for events that are gone or long past, so the store cannot grow forever.
export const pruneReminderState = (state: ReminderState, events: Event[]): ReminderState => {
  const live = new Set(events.map((event) => String(event.id)));
  return Object.fromEntries(Object.entries(state).filter(([id]) => live.has(id)));
};

export type ReminderUrgency = 'today' | 'tomorrow' | 'soon';

// How loudly a reminder should present itself.
export const reminderUrgency = (eventDate: string, today: Date = new Date()): ReminderUrgency => {
  const away = daysUntil(eventDate, today);
  if (away <= 0) return 'today';
  if (away === 1) return 'tomorrow';
  return 'soon';
};
